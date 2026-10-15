package com.lionfitness.backend.auth;

import com.lionfitness.backend.auth.dto.ForgotPasswordRequest;
import com.lionfitness.backend.auth.dto.ResetPasswordRequest;
import com.lionfitness.backend.common.exception.GlobalExceptionHandler;
import com.lionfitness.backend.user.repository.UserRepository;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.context.annotation.Import;
import org.springframework.http.MediaType;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.doNothing;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@WebMvcTest(controllers = AuthController.class)
@Import({SecurityConfig.class, GlobalExceptionHandler.class})
class PasswordResetApiTest {

    @Autowired
    private MockMvc mvc;

    @MockitoBean
    private JwtService jwtService;

    @MockitoBean
    private UserRepository userRepository;

    @MockitoBean
    private AuthService authService;

    @MockitoBean
    private PasswordResetService passwordResetService;

    @Test
    @DisplayName("BUG-08: POST /auth/forgot-password com JSON malformado deve retornar HTTP 400 no contrato padronizado")
    void forgotPasswordWithMalformedJsonReturns400BadRequest() throws Exception {
        mvc.perform(post("/auth/forgot-password")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"email\": broken_json_no_quotes}"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.status").value(400))
                .andExpect(jsonPath("$.error").value("Bad Request"))
                .andExpect(jsonPath("$.message").value("Corpo da requisição inválido ou malformado."))
                .andExpect(jsonPath("$.path").value("/auth/forgot-password"));
    }

    @Test
    @DisplayName("BUG-08: POST /auth/reset-password com JSON malformado deve retornar HTTP 400 no contrato padronizado")
    void resetPasswordWithMalformedJsonReturns400BadRequest() throws Exception {
        mvc.perform(post("/auth/reset-password")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"token\": \"abc\", \"newPassword\": unclosed_brace"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.status").value(400))
                .andExpect(jsonPath("$.error").value("Bad Request"))
                .andExpect(jsonPath("$.message").value("Corpo da requisição inválido ou malformado."))
                .andExpect(jsonPath("$.path").value("/auth/reset-password"));
    }

    @Test
    @DisplayName("POST /auth/forgot-password com email válido deve retornar mensagem genérica sem enumeração de usuários")
    void forgotPasswordWithValidEmailReturnsGenericMessageWithoutUserEnumeration() throws Exception {
        when(passwordResetService.requestPasswordReset(any(ForgotPasswordRequest.class)))
                .thenReturn(PasswordResetService.GENERIC_FORGOT_PASSWORD_MESSAGE);

        mvc.perform(post("/auth/forgot-password")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"email\":\"nonexistent@lionfitness.com\"}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.message").value(PasswordResetService.GENERIC_FORGOT_PASSWORD_MESSAGE));
    }

    @Test
    @DisplayName("POST /auth/reset-password com token válido deve retornar sucesso")
    void resetPasswordWithValidTokenReturnsSuccess() throws Exception {
        doNothing().when(passwordResetService).resetPassword(any(ResetPasswordRequest.class));

        mvc.perform(post("/auth/reset-password")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"token\":\"valid-token-123456\",\"newPassword\":\"NovaSenhaForte123\",\"confirmPassword\":\"NovaSenhaForte123\"}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.message").value("Senha alterada com sucesso."));
    }
}
