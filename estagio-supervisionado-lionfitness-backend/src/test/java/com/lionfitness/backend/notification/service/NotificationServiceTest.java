package com.lionfitness.backend.notification.service;

import java.time.Clock;
import java.time.Instant;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.ZoneOffset;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

import com.lionfitness.backend.auth.EmailService;
import com.lionfitness.backend.member.model.Member;
import com.lionfitness.backend.member.repository.MemberRepository;
import com.lionfitness.backend.notification.dto.NotificationReplyRequest;
import com.lionfitness.backend.notification.dto.StudentNotificationCreateRequest;
import com.lionfitness.backend.notification.model.Notification;
import com.lionfitness.backend.notification.model.NotificationType;
import com.lionfitness.backend.notification.repository.NotificationRepository;
import com.lionfitness.backend.personaltrainer.model.PersonalTrainer;
import com.lionfitness.backend.personaltrainer.repository.PersonalTrainerRepository;
import com.lionfitness.backend.user.model.User;
import com.lionfitness.backend.user.repository.UserRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.http.HttpStatus;
import org.springframework.web.server.ResponseStatusException;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.doThrow;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class NotificationServiceTest {

    private static final Clock CLOCK = Clock.fixed(Instant.parse("2026-10-26T12:00:00Z"), ZoneOffset.UTC);

    @Mock NotificationRepository notificationRepository;
    @Mock UserRepository userRepository;
    @Mock MemberRepository memberRepository;
    @Mock PersonalTrainerRepository personalTrainerRepository;
    @Mock EmailService emailService;

    private NotificationService service;
    private final UUID studentUserId = UUID.randomUUID();
    private final UUID trainerUserId = UUID.randomUUID();
    private final UUID trainerId = UUID.randomUUID();
    private final User student = user(studentUserId, "Aluno", "student@example.com", "OPERATIONAL");
    private final User trainerUser = user(trainerUserId, "Personal", "trainer@example.com", "PERSONAL_TRAINER");

    @BeforeEach
    void setUp() {
        service = new NotificationService(notificationRepository, userRepository, memberRepository,
                personalTrainerRepository, emailService, CLOCK, false);
    }

    @Test
    void studentSendsMessageOnlyToTheirAssignedTrainer() {
        Notification notification = notification(trainerUserId, studentUserId, NotificationType.EXERCISE_QUESTION, false);
        when(userRepository.findActiveByEmail(student.email())).thenReturn(Optional.of(student));
        when(memberRepository.findByUserId(studentUserId)).thenReturn(Optional.of(member(trainerId)));
        when(personalTrainerRepository.findActiveById(trainerId)).thenReturn(Optional.of(trainer()));
        when(notificationRepository.save(eq(trainerUserId), eq(studentUserId), eq(NotificationType.EXERCISE_QUESTION),
                any(), eq("Preciso de ajuda"), any())).thenReturn(notification);

        var response = service.sendStudentMessage(student.email(),
                new StudentNotificationCreateRequest(NotificationType.EXERCISE_QUESTION, "  Preciso de ajuda  "));

        assertThat(response.type()).isEqualTo("EXERCISE_QUESTION");
        verify(notificationRepository).save(eq(trainerUserId), eq(studentUserId), eq(NotificationType.EXERCISE_QUESTION),
                any(), eq("Preciso de ajuda"), any());
    }

    @Test
    void studentWithoutAssignedTrainerIsBlockedAndCannotChooseAnotherTrainer() {
        when(userRepository.findActiveByEmail(student.email())).thenReturn(Optional.of(student));
        when(memberRepository.findByUserId(studentUserId)).thenReturn(Optional.of(member(null)));

        assertThatThrownBy(() -> service.sendStudentMessage(student.email(),
                new StudentNotificationCreateRequest(NotificationType.OTHER, "Mensagem")))
                .isInstanceOfSatisfying(ResponseStatusException.class,
                        exception -> assertThat(exception.getStatusCode()).isEqualTo(HttpStatus.CONFLICT));
        verifyNoInteractions(personalTrainerRepository, notificationRepository);
    }

    @Test
    void personalGetsOwnUnreadNotificationsAndCorrectCount() {
        Notification notification = notification(trainerUserId, studentUserId, NotificationType.EXERCISE_DIFFICULTY, false);
        when(userRepository.findActiveByEmail(trainerUser.email())).thenReturn(Optional.of(trainerUser));
        when(notificationRepository.findByRecipientUserId(trainerUserId)).thenReturn(List.of(notification));
        when(notificationRepository.countUnreadByRecipientUserId(trainerUserId)).thenReturn(1L);

        assertThat(service.findMine(trainerUser.email())).hasSize(1);
        assertThat(service.unreadCount(trainerUser.email()).count()).isEqualTo(1);
    }

    @Test
    void recipientCanMarkNotificationAndAllNotificationsAsRead() {
        UUID notificationId = UUID.randomUUID();
        Notification unread = notificationWithId(notificationId, trainerUserId, studentUserId, NotificationType.OTHER, false);
        when(userRepository.findActiveByEmail(trainerUser.email())).thenReturn(Optional.of(trainerUser));
        when(notificationRepository.findByIdAndRecipientUserId(notificationId, trainerUserId)).thenReturn(Optional.of(unread));
        when(notificationRepository.markAsRead(eq(notificationId), eq(trainerUserId), any())).thenReturn(true);
        when(notificationRepository.markAllAsRead(eq(trainerUserId), any())).thenReturn(3);

        assertThat(service.markAsRead(trainerUser.email(), notificationId).read()).isTrue();
        assertThat(service.markAllAsRead(trainerUser.email()).updated()).isEqualTo(3);
    }

    @Test
    void userCannotReadAnotherUsersNotification() {
        UUID otherNotificationId = UUID.randomUUID();
        when(userRepository.findActiveByEmail(student.email())).thenReturn(Optional.of(student));
        when(notificationRepository.findByIdAndRecipientUserId(otherNotificationId, studentUserId)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> service.markAsRead(student.email(), otherNotificationId))
                .isInstanceOfSatisfying(ResponseStatusException.class,
                        exception -> assertThat(exception.getStatusCode()).isEqualTo(HttpStatus.NOT_FOUND));
        verify(notificationRepository, never()).markAsRead(any(), any(), any());
    }

    @Test
    void emailFailureDoesNotDiscardInternalNotification() {
        service = new NotificationService(notificationRepository, userRepository, memberRepository,
                personalTrainerRepository, emailService, CLOCK, true);
        Notification notification = notification(trainerUserId, studentUserId, NotificationType.OTHER, false);
        when(userRepository.findActiveByEmail(student.email())).thenReturn(Optional.of(student));
        when(memberRepository.findByUserId(studentUserId)).thenReturn(Optional.of(member(trainerId)));
        when(personalTrainerRepository.findActiveById(trainerId)).thenReturn(Optional.of(trainer()));
        when(notificationRepository.save(any(), any(), any(), any(), any(), any())).thenReturn(notification);
        when(userRepository.findActiveById(trainerUserId)).thenReturn(Optional.of(trainerUser));
        doThrow(new RuntimeException("SMTP indisponível")).when(emailService)
                .sendNotificationEmail(eq(trainerUser.email()), any(), any());

        assertThat(service.sendStudentMessage(student.email(),
                new StudentNotificationCreateRequest(NotificationType.OTHER, "Mensagem interna"))).isNotNull();
        verify(notificationRepository).save(eq(trainerUserId), eq(studentUserId), eq(NotificationType.OTHER),
                any(), any(), any());
    }

    @Test
    void personalReplyCreatesNotificationForOriginalStudent() {
        UUID originalId = UUID.randomUUID();
        Notification original = notificationWithId(originalId, trainerUserId, studentUserId,
                NotificationType.EXERCISE_QUESTION, false);
        Notification reply = notification(studentUserId, trainerUserId, NotificationType.PERSONAL_TRAINER_REPLY, false);
        when(userRepository.findActiveByEmail(trainerUser.email())).thenReturn(Optional.of(trainerUser));
        when(personalTrainerRepository.findActiveByUserId(trainerUserId)).thenReturn(Optional.of(trainer()));
        when(notificationRepository.findByIdAndRecipientUserId(originalId, trainerUserId)).thenReturn(Optional.of(original));
        when(userRepository.findActiveById(studentUserId)).thenReturn(Optional.of(student));
        when(notificationRepository.save(eq(studentUserId), eq(trainerUserId), eq(NotificationType.PERSONAL_TRAINER_REPLY),
                any(), eq("Ajustarei seu treino"), any())).thenReturn(reply);

        assertThat(service.replyAsPersonal(trainerUser.email(), originalId,
                new NotificationReplyRequest("Ajustarei seu treino")).type()).isEqualTo("PERSONAL_TRAINER_REPLY");
    }

    private User user(UUID id, String name, String email, String role) {
        return new User(id, name, email, "hash", role, true, LocalDateTime.now(CLOCK), false);
    }

    private Member member(UUID assignedTrainerId) {
        return new Member(UUID.randomUUID(), studentUserId, assignedTrainerId, "Aluno", "00000000000", student.email(),
                LocalDate.of(2000, 1, 1), null, true, LocalDateTime.now(CLOCK));
    }

    private PersonalTrainer trainer() {
        return new PersonalTrainer(trainerId, trainerUserId, "Personal", "11111111111", trainerUser.email(),
                null, "Musculação", true, LocalDateTime.now(CLOCK), null);
    }

    private Notification notification(UUID recipient, UUID sender, NotificationType type, boolean read) {
        return notificationWithId(UUID.randomUUID(), recipient, sender, type, read);
    }

    private Notification notificationWithId(UUID id, UUID recipient, UUID sender, NotificationType type, boolean read) {
        return new Notification(id, recipient, sender, "Aluno", type, "Assunto", "Mensagem", read,
                LocalDateTime.now(CLOCK), read ? LocalDateTime.now(CLOCK) : null);
    }
}
