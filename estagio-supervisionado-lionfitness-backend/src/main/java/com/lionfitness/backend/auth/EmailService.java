package com.lionfitness.backend.auth;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.mail.SimpleMailMessage;
import org.springframework.mail.MailException;
import org.springframework.http.HttpStatus;
import org.springframework.web.server.ResponseStatusException;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.stereotype.Service;

@Service
public class EmailService {

    private static final Logger logger = LoggerFactory.getLogger(EmailService.class);
    private final JavaMailSender mailSender;
    private final String mailUsername;

    public EmailService(
            JavaMailSender mailSender,
            @Value("${spring.mail.username:}") String mailUsername
    ) {
        this.mailSender = mailSender;
        this.mailUsername = mailUsername;
    }

    public void sendPasswordResetEmail(String to, String resetLink) {
        if (mailUsername == null || mailUsername.isBlank()) {
            logger.error("Password reset delivery unavailable: SMTP sender is not configured.");
            throw new ResponseStatusException(HttpStatus.SERVICE_UNAVAILABLE,
                    "Recuperação de senha temporariamente indisponível. Tente novamente mais tarde.");
        }
        SimpleMailMessage message = new SimpleMailMessage();
        if (mailUsername != null && !mailUsername.isBlank()) {
            message.setFrom(mailUsername);
        }
        message.setTo(to);
        message.setSubject("Redefinição de senha - Lion Fitness");
        message.setText("""
                Olá,

                Recebemos uma solicitação para redefinir sua senha no Lion Fitness.

                Clique no link abaixo para criar uma nova senha:

                %s

                Este link expira em 30 minutos.

                Se você não solicitou essa alteração, ignore este email.
                """.formatted(resetLink));

        try {
            mailSender.send(message);
        } catch (MailException exception) {
            logger.error("Password reset SMTP delivery failed: {}", exception.getClass().getSimpleName());
            throw new ResponseStatusException(HttpStatus.SERVICE_UNAVAILABLE,
                    "Recuperação de senha temporariamente indisponível. Tente novamente mais tarde.");
        }
    }

    public void sendNotificationEmail(String to, String title, String body) {
        SimpleMailMessage message = new SimpleMailMessage();
        if (mailUsername != null && !mailUsername.isBlank()) {
            message.setFrom(mailUsername);
        }
        message.setTo(to);
        message.setSubject(title + " - Lion Fitness");
        message.setText("""
                Olá,

                Você recebeu uma nova notificação no Lion Fitness:

                %s

                Acesse o sistema para acompanhar a conversa.
                """.formatted(body));
        mailSender.send(message);
    }
}
