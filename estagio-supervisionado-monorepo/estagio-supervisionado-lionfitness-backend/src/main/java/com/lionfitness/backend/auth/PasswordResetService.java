package com.lionfitness.backend.auth;

import com.lionfitness.backend.auth.dto.ForgotPasswordRequest;
import com.lionfitness.backend.auth.dto.ResetPasswordRequest;
import com.lionfitness.backend.auth.model.PasswordResetToken;
import com.lionfitness.backend.auth.repository.PasswordResetTokenRepository;
import com.lionfitness.backend.user.model.User;
import com.lionfitness.backend.user.repository.UserRepository;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.util.UriComponentsBuilder;

import java.time.LocalDateTime;
import java.util.UUID;

@Service
public class PasswordResetService {

    public static final String GENERIC_FORGOT_PASSWORD_MESSAGE =
            "Se o email estiver cadastrado, enviaremos instruções para redefinir sua senha.";

    private static final int EXPIRATION_MINUTES = 30;
    private static final int MIN_PASSWORD_LENGTH = 6;

    private final UserRepository userRepository;
    private final PasswordResetTokenRepository tokenRepository;
    private final EmailService emailService;
    private final PasswordEncoder passwordEncoder;
    private final String frontendUrl;

    public PasswordResetService(
            UserRepository userRepository,
            PasswordResetTokenRepository tokenRepository,
            EmailService emailService,
            PasswordEncoder passwordEncoder,
            @Value("${app.frontend.url:http://localhost:3000}") String frontendUrl
    ) {
        this.userRepository = userRepository;
        this.tokenRepository = tokenRepository;
        this.emailService = emailService;
        this.passwordEncoder = passwordEncoder;
        this.frontendUrl = frontendUrl;
    }

    @Transactional
    public String requestPasswordReset(ForgotPasswordRequest request) {
        userRepository.findActiveByEmail(request.email().trim())
                .ifPresent(this::createTokenAndSendEmail);

        return GENERIC_FORGOT_PASSWORD_MESSAGE;
    }

    @Transactional
    public void resetPassword(ResetPasswordRequest request) {
        validatePassword(request);

        PasswordResetToken resetToken = tokenRepository.findValidByToken(request.token().trim())
                .orElseThrow(() -> new IllegalArgumentException("Token invalido, expirado ou ja utilizado."));

        String passwordHash = passwordEncoder.encode(request.newPassword());
        userRepository.updatePassword(resetToken.userId(), passwordHash);
        tokenRepository.markAsUsed(resetToken.id());
    }

    private void createTokenAndSendEmail(User user) {
        tokenRepository.invalidateActiveTokensByUserId(user.id());

        String rawToken = UUID.randomUUID().toString();
        PasswordResetToken resetToken = new PasswordResetToken(
                UUID.randomUUID(),
                user.id(),
                rawToken,
                LocalDateTime.now().plusMinutes(EXPIRATION_MINUTES),
                false,
                LocalDateTime.now()
        );

        tokenRepository.save(resetToken);
        emailService.sendPasswordResetEmail(user.email(), buildResetLink(rawToken));
    }

    private String buildResetLink(String token) {
        return UriComponentsBuilder
                .fromUriString(frontendUrl)
                .path("/reset-password")
                .queryParam("token", token)
                .build()
                .toUriString();
    }

    private void validatePassword(ResetPasswordRequest request) {
        String newPassword = request.newPassword();
        String confirmPassword = request.confirmPassword();

        if (newPassword == null || newPassword.length() < MIN_PASSWORD_LENGTH) {
            throw new IllegalArgumentException("A senha deve ter pelo menos 6 caracteres.");
        }

        if (!newPassword.equals(confirmPassword)) {
            throw new IllegalArgumentException("A confirmacao de senha deve ser igual a nova senha.");
        }
    }
}
