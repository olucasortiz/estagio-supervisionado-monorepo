package com.lionfitness.backend.auth;

import java.util.Optional;
import java.util.UUID;

import com.lionfitness.backend.auth.dto.ForgotPasswordRequest;
import com.lionfitness.backend.auth.repository.PasswordResetTokenRepository;
import com.lionfitness.backend.user.model.User;
import com.lionfitness.backend.user.repository.UserRepository;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.crypto.password.PasswordEncoder;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class PasswordResetUrlConfigurationTest {

    @Mock
    private UserRepository userRepository;

    @Mock
    private PasswordResetTokenRepository tokenRepository;

    @Mock
    private EmailService emailService;

    @Mock
    private PasswordEncoder passwordEncoder;

    private final User user = new User(
            UUID.randomUUID(),
            "Lucas",
            "aluno@lionfitness.com",
            "hashed",
            "STUDENT",
            true,
            null,
            false
    );

    @Test
    @DisplayName("Gera link correto com base na URL configurada válida")
    void sendsEmailWithCorrectLinkWhenFrontendUrlIsValid() {
        PasswordResetService service = new PasswordResetService(
                userRepository,
                tokenRepository,
                emailService,
                passwordEncoder,
                "https://lionfitness-sa.duckdns.org,http://localhost:3000"
        );

        when(userRepository.findActiveByEmail("aluno@lionfitness.com")).thenReturn(Optional.of(user));

        service.requestPasswordReset(new ForgotPasswordRequest("aluno@lionfitness.com"));

        ArgumentCaptor<String> linkCaptor = ArgumentCaptor.forClass(String.class);
        verify(emailService).sendPasswordResetEmail(eq("aluno@lionfitness.com"), linkCaptor.capture());

        String generatedLink = linkCaptor.getValue();
        assertThat(generatedLink).startsWith("https://lionfitness-sa.duckdns.org/reset-password?token=");
        assertThat(generatedLink).doesNotContain("//reset-password");
    }

    @Test
    @DisplayName("Falha ao gerar link quando URL de frontend está ausente")
    void failsWhenFrontendUrlIsMissing() {
        PasswordResetService service = new PasswordResetService(
                userRepository,
                tokenRepository,
                emailService,
                passwordEncoder,
                ""
        );

        when(userRepository.findActiveByEmail("aluno@lionfitness.com")).thenReturn(Optional.of(user));

        assertThatThrownBy(() -> service.requestPasswordReset(new ForgotPasswordRequest("aluno@lionfitness.com")))
                .isInstanceOf(IllegalStateException.class)
                .hasMessageContaining("Configuração app.frontend.url ausente ou inválida");
    }

    @Test
    @DisplayName("Falha ao gerar link quando URL de frontend é inválida")
    void failsWhenFrontendUrlIsInvalid() {
        PasswordResetService service = new PasswordResetService(
                userRepository,
                tokenRepository,
                emailService,
                passwordEncoder,
                "javascript:evil()"
        );

        when(userRepository.findActiveByEmail("aluno@lionfitness.com")).thenReturn(Optional.of(user));

        assertThatThrownBy(() -> service.requestPasswordReset(new ForgotPasswordRequest("aluno@lionfitness.com")))
                .isInstanceOf(IllegalStateException.class)
                .hasMessageContaining("não contém nenhuma URL válida e segura");
    }
}
