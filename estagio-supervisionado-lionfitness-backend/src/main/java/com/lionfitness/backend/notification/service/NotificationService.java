package com.lionfitness.backend.notification.service;

import java.time.Clock;
import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;

import com.lionfitness.backend.auth.EmailService;
import com.lionfitness.backend.member.model.Member;
import com.lionfitness.backend.member.repository.MemberRepository;
import com.lionfitness.backend.notification.dto.MarkAllNotificationsReadResponse;
import com.lionfitness.backend.notification.dto.NotificationReplyRequest;
import com.lionfitness.backend.notification.dto.NotificationResponse;
import com.lionfitness.backend.notification.dto.StudentNotificationCreateRequest;
import com.lionfitness.backend.notification.dto.UnreadNotificationCountResponse;
import com.lionfitness.backend.notification.model.Notification;
import com.lionfitness.backend.notification.model.NotificationType;
import com.lionfitness.backend.notification.repository.NotificationRepository;
import com.lionfitness.backend.personaltrainer.model.PersonalTrainer;
import com.lionfitness.backend.personaltrainer.repository.PersonalTrainerRepository;
import com.lionfitness.backend.user.model.User;
import com.lionfitness.backend.user.repository.UserRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

@Service
public class NotificationService {

    private static final Logger logger = LoggerFactory.getLogger(NotificationService.class);

    private final NotificationRepository notificationRepository;
    private final UserRepository userRepository;
    private final MemberRepository memberRepository;
    private final PersonalTrainerRepository personalTrainerRepository;
    private final EmailService emailService;
    private final Clock clock;
    private final boolean emailEnabled;

    public NotificationService(NotificationRepository notificationRepository,
                               UserRepository userRepository,
                               MemberRepository memberRepository,
                               PersonalTrainerRepository personalTrainerRepository,
                               EmailService emailService,
                               Clock applicationClock,
                               @Value("${notifications.email.enabled:false}") boolean emailEnabled) {
        this.notificationRepository = notificationRepository;
        this.userRepository = userRepository;
        this.memberRepository = memberRepository;
        this.personalTrainerRepository = personalTrainerRepository;
        this.emailService = emailService;
        this.clock = applicationClock;
        this.emailEnabled = emailEnabled;
    }

    @Transactional
    public NotificationResponse sendStudentMessage(String authenticatedEmail,
                                                    StudentNotificationCreateRequest request) {
        if (request.type() == NotificationType.PERSONAL_TRAINER_REPLY) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Assunto de mensagem inválido.");
        }
        User studentUser = currentUser(authenticatedEmail);
        Member member = memberRepository.findByUserId(studentUser.id())
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.FORBIDDEN,
                        "Somente o aluno vinculado pode enviar mensagens ao personal."));
        if (member.personalTrainerId() == null) {
            throw new ResponseStatusException(HttpStatus.CONFLICT,
                    "Você ainda não possui um personal trainer vinculado.");
        }
        PersonalTrainer trainer = personalTrainerRepository.findActiveById(member.personalTrainerId())
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.CONFLICT,
                        "O personal trainer vinculado não está disponível."));

        Notification notification = notificationRepository.save(
                trainer.userId(), studentUser.id(), request.type(), titleFor(request.type()),
                request.message().trim(), LocalDateTime.now(clock));
        deliverEmailSafely(trainer.userId(), notification.title(), notification.message());
        return toResponse(notification, studentUser.name());
    }

    public List<NotificationResponse> findMine(String authenticatedEmail) {
        User user = currentUser(authenticatedEmail);
        return notificationRepository.findByRecipientUserId(user.id()).stream()
                .map(this::toResponse)
                .toList();
    }

    public UnreadNotificationCountResponse unreadCount(String authenticatedEmail) {
        User user = currentUser(authenticatedEmail);
        return new UnreadNotificationCountResponse(notificationRepository.countUnreadByRecipientUserId(user.id()));
    }

    @Transactional
    public NotificationResponse markAsRead(String authenticatedEmail, UUID notificationId) {
        User user = currentUser(authenticatedEmail);
        Notification notification = notificationRepository.findByIdAndRecipientUserId(notificationId, user.id())
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Notificação não encontrada."));
        if (!notification.read()) {
            LocalDateTime readAt = LocalDateTime.now(clock);
            notificationRepository.markAsRead(notificationId, user.id(), readAt);
            notification = new Notification(notification.id(), notification.recipientUserId(), notification.senderUserId(),
                    notification.senderName(), notification.type(), notification.title(), notification.message(),
                    true, notification.createdAt(), readAt);
        }
        return toResponse(notification);
    }

    @Transactional
    public MarkAllNotificationsReadResponse markAllAsRead(String authenticatedEmail) {
        User user = currentUser(authenticatedEmail);
        int updated = notificationRepository.markAllAsRead(user.id(), LocalDateTime.now(clock));
        return new MarkAllNotificationsReadResponse(updated);
    }

    @Transactional
    public NotificationResponse replyAsPersonal(String authenticatedEmail, UUID notificationId,
                                                NotificationReplyRequest request) {
        User trainerUser = currentUser(authenticatedEmail);
        personalTrainerRepository.findActiveByUserId(trainerUser.id())
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.FORBIDDEN,
                        "Apenas o personal trainer vinculado pode responder mensagens."));
        Notification original = notificationRepository.findByIdAndRecipientUserId(notificationId, trainerUser.id())
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Notificação não encontrada."));
        if (original.senderUserId() == null) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Esta notificação não permite resposta.");
        }
        User studentUser = userRepository.findActiveById(original.senderUserId())
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Aluno remetente não encontrado."));
        notificationRepository.markAsRead(original.id(), trainerUser.id(), LocalDateTime.now(clock));
        Notification response = notificationRepository.save(
                studentUser.id(), trainerUser.id(), NotificationType.PERSONAL_TRAINER_REPLY,
                "Resposta do seu personal", request.message().trim(), LocalDateTime.now(clock));
        deliverEmailSafely(studentUser.id(), response.title(), response.message());
        return toResponse(response, trainerUser.name());
    }

    private User currentUser(String email) {
        return userRepository.findActiveByEmail(email)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Usuário autenticado não encontrado."));
    }

    private String titleFor(NotificationType type) {
        return switch (type) {
            case EXERCISE_QUESTION -> "Dúvida sobre exercício";
            case WORKOUT_CHANGE_REQUEST -> "Solicitação de alteração de treino";
            case EXERCISE_DIFFICULTY -> "Dificuldade com exercício";
            case OTHER -> "Mensagem do aluno";
            case PERSONAL_TRAINER_REPLY -> "Resposta do seu personal";
        };
    }

    private void deliverEmailSafely(UUID recipientUserId, String title, String message) {
        if (!emailEnabled) {
            return;
        }
        userRepository.findActiveById(recipientUserId).ifPresent(user -> {
            try {
                emailService.sendNotificationEmail(user.email(), title, message);
            } catch (Exception exception) {
                logger.warn("Falha ao enviar e-mail de notificação para userId={}", recipientUserId, exception);
            }
        });
    }

    private NotificationResponse toResponse(Notification notification) {
        return toResponse(notification, notification.senderName());
    }

    private NotificationResponse toResponse(Notification notification, String senderName) {
        return new NotificationResponse(notification.id(), senderName, notification.type().name(), notification.title(),
                notification.message(), notification.read(), notification.createdAt(), notification.readAt());
    }
}
