package com.lionfitness.backend.common.exception;

import com.lionfitness.backend.auth.exception.AuthUserNotFoundException;
import com.lionfitness.backend.auth.exception.InvalidCredentialsException;
import com.lionfitness.backend.common.api.ApiErrorResponse;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.ConstraintViolation;
import jakarta.validation.ConstraintViolationException;
import jakarta.validation.Path;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.http.converter.HttpMessageNotReadableException;
import org.springframework.web.server.ResponseStatusException;

import java.util.Set;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class GlobalExceptionHandlerTest {

    private GlobalExceptionHandler exceptionHandler;

    @Mock
    private HttpServletRequest request;

    @BeforeEach
    void setUp() {
        exceptionHandler = new GlobalExceptionHandler();
        when(request.getRequestURI()).thenReturn("/api/test-endpoint");
    }

    @Test
    @DisplayName("BUG-15: ResponseStatusException(NOT_FOUND) deve retornar HTTP 404 e preservar a mensagem original")
    void shouldPreserveNotFoundFromResponseStatusException() {
        ResponseStatusException ex = new ResponseStatusException(HttpStatus.NOT_FOUND, "Ficha de treino não encontrada.");

        ResponseEntity<ApiErrorResponse> response = exceptionHandler.handleResponseStatusException(ex, request);

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.NOT_FOUND);
        assertThat(response.getBody()).isNotNull();
        assertThat(response.getBody().status()).isEqualTo(404);
        assertThat(response.getBody().message()).isEqualTo("Ficha de treino não encontrada.");
        assertThat(response.getBody().path()).isEqualTo("/api/test-endpoint");
    }

    @Test
    @DisplayName("BUG-15: ResponseStatusException(FORBIDDEN) deve retornar HTTP 403 e preservar a mensagem original")
    void shouldPreserveForbiddenFromResponseStatusException() {
        ResponseStatusException ex = new ResponseStatusException(HttpStatus.FORBIDDEN, "Voce so pode gerenciar treinos dos seus proprios alunos.");

        ResponseEntity<ApiErrorResponse> response = exceptionHandler.handleResponseStatusException(ex, request);

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.FORBIDDEN);
        assertThat(response.getBody()).isNotNull();
        assertThat(response.getBody().status()).isEqualTo(403);
        assertThat(response.getBody().message()).isEqualTo("Voce so pode gerenciar treinos dos seus proprios alunos.");
    }

    @Test
    @DisplayName("BUG-15: ResponseStatusException(CONFLICT) deve retornar HTTP 409")
    void shouldPreserveConflictFromResponseStatusException() {
        ResponseStatusException ex = new ResponseStatusException(HttpStatus.CONFLICT, "A ficha foi alterada por outro usuário.");

        ResponseEntity<ApiErrorResponse> response = exceptionHandler.handleResponseStatusException(ex, request);

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.CONFLICT);
        assertThat(response.getBody()).isNotNull();
        assertThat(response.getBody().status()).isEqualTo(409);
        assertThat(response.getBody().message()).isEqualTo("A ficha foi alterada por outro usuário.");
    }

    @Test
    @DisplayName("BUG-15: ResponseStatusException(BAD_REQUEST) deve retornar HTTP 400")
    void shouldPreserveBadRequestFromResponseStatusException() {
        ResponseStatusException ex = new ResponseStatusException(HttpStatus.BAD_REQUEST, "CPF deve conter exatamente 11 dígitos.");

        ResponseEntity<ApiErrorResponse> response = exceptionHandler.handleResponseStatusException(ex, request);

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.BAD_REQUEST);
        assertThat(response.getBody()).isNotNull();
        assertThat(response.getBody().status()).isEqualTo(400);
        assertThat(response.getBody().message()).isEqualTo("CPF deve conter exatamente 11 dígitos.");
    }

    @Test
    @DisplayName("BUG-02: ConstraintViolationException deve retornar HTTP 400 com lista de campos violados")
    @SuppressWarnings("unchecked")
    void shouldHandleConstraintViolationException() {
        ConstraintViolation<?> violation = mock(ConstraintViolation.class);
        Path path = mock(Path.class);
        when(path.toString()).thenReturn("createWithPhoto.cpf");
        when(violation.getPropertyPath()).thenReturn(path);
        when(violation.getMessage()).thenReturn("CPF deve conter exatamente 11 dígitos.");

        ConstraintViolationException ex = new ConstraintViolationException(Set.of(violation));

        ResponseEntity<ApiErrorResponse> response = exceptionHandler.handleConstraintViolationException(ex, request);

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.BAD_REQUEST);
        assertThat(response.getBody()).isNotNull();
        assertThat(response.getBody().status()).isEqualTo(400);
        assertThat(response.getBody().message()).isEqualTo("Verifique os campos informados.");
        assertThat(response.getBody().validationErrors()).hasSize(1);
        assertThat(response.getBody().validationErrors().get(0).field()).isEqualTo("cpf");
        assertThat(response.getBody().validationErrors().get(0).message()).isEqualTo("CPF deve conter exatamente 11 dígitos.");
    }

    @Test
    @DisplayName("BUG-07: HttpMessageNotReadableException deve retornar HTTP 400 em vez de HTTP 500")
    void shouldHandleHttpMessageNotReadableException() {
        HttpMessageNotReadableException ex = mock(HttpMessageNotReadableException.class);

        ResponseEntity<ApiErrorResponse> response = exceptionHandler.handleHttpMessageNotReadableException(ex, request);

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.BAD_REQUEST);
        assertThat(response.getBody()).isNotNull();
        assertThat(response.getBody().status()).isEqualTo(400);
        assertThat(response.getBody().message()).isEqualTo("Corpo da requisição inválido ou malformado.");
    }

    @Test
    @DisplayName("BUG-07: AuthUserNotFoundException deve retornar HTTP 401 com 'Invalid credentials' para impedir enumeração")
    void shouldReturn401OnAuthUserNotFoundException() {
        AuthUserNotFoundException ex = new AuthUserNotFoundException("alvo@lionfitness.com");

        ResponseEntity<ApiErrorResponse> response = exceptionHandler.handleAuthUserNotFoundException(ex, request);

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.UNAUTHORIZED);
        assertThat(response.getBody()).isNotNull();
        assertThat(response.getBody().status()).isEqualTo(401);
        assertThat(response.getBody().message()).isEqualTo("Invalid credentials");
    }

    @Test
    @DisplayName("BUG-07: InvalidCredentialsException deve retornar HTTP 401 com 'Invalid credentials'")
    void shouldReturn401OnInvalidCredentialsException() {
        InvalidCredentialsException ex = new InvalidCredentialsException();

        ResponseEntity<ApiErrorResponse> response = exceptionHandler.handleInvalidCredentialsException(ex, request);

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.UNAUTHORIZED);
        assertThat(response.getBody()).isNotNull();
        assertThat(response.getBody().status()).isEqualTo(401);
        assertThat(response.getBody().message()).isEqualTo("Invalid credentials");
    }
}
