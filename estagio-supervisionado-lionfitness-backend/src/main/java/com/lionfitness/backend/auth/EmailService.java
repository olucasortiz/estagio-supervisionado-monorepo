package com.lionfitness.backend.auth;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.mail.SimpleMailMessage;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.stereotype.Service;

@Service
public class EmailService {

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

        mailSender.send(message);
    }
}
