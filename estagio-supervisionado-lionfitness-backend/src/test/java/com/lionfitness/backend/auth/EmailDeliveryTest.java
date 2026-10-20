package com.lionfitness.backend.auth;

import org.junit.jupiter.api.Test;
import org.springframework.mail.MailAuthenticationException;
import org.springframework.mail.SimpleMailMessage;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.web.server.ResponseStatusException;
import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

class EmailDeliveryTest {
    @Test void resetRequiresConfiguredSender() {
        JavaMailSender sender = mock(JavaMailSender.class);
        var error = assertThrows(ResponseStatusException.class,
                () -> new EmailService(sender, "").sendPasswordResetEmail("member@example.test", "https://example.test/reset"));
        assertEquals(503, error.getStatusCode().value());
        verifyNoInteractions(sender);
    }
    @Test void smtpAuthenticationFailureIsExplicitAndDoesNotExposeProviderError() {
        JavaMailSender sender = mock(JavaMailSender.class);
        doThrow(new MailAuthenticationException("Private provider detail")).when(sender).send(any(SimpleMailMessage.class));
        var error = assertThrows(ResponseStatusException.class,
                () -> new EmailService(sender, "sender@example.test").sendPasswordResetEmail("member@example.test", "https://example.test/reset"));
        assertEquals(503, error.getStatusCode().value());
        assertFalse(error.getReason().contains("Private provider detail"));
    }
    @Test void configuredSenderPassesRecoveryMessageToSmtp() {
        JavaMailSender sender = mock(JavaMailSender.class);
        new EmailService(sender, "sender@example.test").sendPasswordResetEmail("member@example.test", "https://example.test/reset");
        verify(sender).send(argThat((SimpleMailMessage message) ->
                "member@example.test".equals(message.getTo()[0]) && message.getText().contains("https://example.test/reset")));
    }
}
