package com.lionfitness.backend.auth;

import com.lionfitness.backend.auth.dto.LoginRequest;
import com.lionfitness.backend.auth.dto.LoginResponse;
import com.lionfitness.backend.auth.exception.InactiveUserException;
import com.lionfitness.backend.auth.exception.InvalidCredentialsException;
import com.lionfitness.backend.user.model.User;
import com.lionfitness.backend.user.repository.UserRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.crypto.password.PasswordEncoder;

import java.time.LocalDateTime;
import java.util.Optional;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class AuthServiceLoginTest {

    @Mock private UserRepository userRepository;
    @Mock private PasswordEncoder passwordEncoder;
    @Mock private JwtService jwtService;

    private AuthService authService;

    @BeforeEach
    void setUp() {
        authService = new AuthService(userRepository, passwordEncoder, jwtService);
    }

    @Test
    @DisplayName("BUG-07: Login com e-mail inexistente deve lançar InvalidCredentialsException (sem revelar inexistência da conta)")
    void shouldThrowInvalidCredentialsExceptionWhenEmailDoesNotExist() {
        LoginRequest request = new LoginRequest("naoexiste@lionfitness.com", "qualquerSenha123");
        when(userRepository.findByEmail("naoexiste@lionfitness.com")).thenReturn(Optional.empty());

        assertThatThrownBy(() -> authService.login(request))
                .isInstanceOf(InvalidCredentialsException.class)
                .hasMessage("Invalid credentials");

        verifyNoInteractions(passwordEncoder);
        verifyNoInteractions(jwtService);
    }

    @Test
    @DisplayName("BUG-07: Login com senha incorreta deve lançar exatamente a mesma InvalidCredentialsException")
    void shouldThrowInvalidCredentialsExceptionWhenPasswordIsIncorrect() {
        User user = new User(
                UUID.randomUUID(), "Lucas Admin", "admin@lionfitness.com", "hash123", "ADMIN", true, LocalDateTime.now(), false
        );
        when(userRepository.findByEmail("admin@lionfitness.com")).thenReturn(Optional.of(user));
        when(passwordEncoder.matches("senhaErrada", "hash123")).thenReturn(false);

        LoginRequest request = new LoginRequest("admin@lionfitness.com", "senhaErrada");

        assertThatThrownBy(() -> authService.login(request))
                .isInstanceOf(InvalidCredentialsException.class)
                .hasMessage("Invalid credentials");

        verifyNoInteractions(jwtService);
    }

    @Test
    @DisplayName("Login com credenciais válidas deve retornar LoginResponse com JWT e dados de usuário")
    void shouldReturnLoginResponseOnValidCredentials() {
        UUID userId = UUID.randomUUID();
        User user = new User(
                userId, "Personal Lucas", "lucassas@outlook.com", "hash123", "PERSONAL_TRAINER", true, LocalDateTime.now(), false
        );
        when(userRepository.findByEmail("lucassas@outlook.com")).thenReturn(Optional.of(user));
        when(passwordEncoder.matches("123456", "hash123")).thenReturn(true);
        when(jwtService.generateToken(user)).thenReturn("mocked.jwt.token");

        LoginRequest request = new LoginRequest("lucassas@outlook.com", "123456");
        LoginResponse response = authService.login(request);

        assertThat(response).isNotNull();
        assertThat(response.token()).isEqualTo("mocked.jwt.token");
        assertThat(response.user()).isNotNull();
        assertThat(response.user().id()).isEqualTo(userId);
        assertThat(response.user().email()).isEqualTo("lucassas@outlook.com");
        assertThat(response.user().role()).isEqualTo("PERSONAL_TRAINER");
    }

    @Test
    @DisplayName("Login com usuário inativo deve lançar InactiveUserException")
    void shouldThrowInactiveUserExceptionWhenUserIsInactive() {
        User inactiveUser = new User(
                UUID.randomUUID(), "Usuario Inativo", "inativo@lionfitness.com", "hash123", "OPERATIONAL", false, LocalDateTime.now(), false
        );
        when(userRepository.findByEmail("inativo@lionfitness.com")).thenReturn(Optional.of(inactiveUser));

        LoginRequest request = new LoginRequest("inativo@lionfitness.com", "qualquerSenha");

        assertThatThrownBy(() -> authService.login(request))
                .isInstanceOf(InactiveUserException.class);

        verifyNoInteractions(passwordEncoder);
        verifyNoInteractions(jwtService);
    }
}
