package com.lionfitness.backend.user.dto;

import com.fasterxml.jackson.annotation.JsonAlias;
import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

@JsonIgnoreProperties(ignoreUnknown = true)
public record UserCreateRequest(
        @NotBlank(message = "Nome é obrigatório.")
        @Size(max = 150, message = "Nome deve ter no máximo 150 caracteres.")
        String name,

        @NotBlank(message = "Email é obrigatório.")
        @Email(message = "Informe um email válido.")
        @Size(max = 150, message = "Email deve ter no máximo 150 caracteres.")
        String email,

        @NotBlank(message = "Senha é obrigatória.")
        @Size(min = 6, message = "A senha deve ter pelo menos 6 caracteres.")
        @Size(max = 255, message = "Senha deve ter no máximo 255 caracteres.")
        @JsonAlias("password")
        String passwordHash,

        @NotBlank(message = "Perfil é obrigatório.")
        @Pattern(regexp = "(?i)^(ADMIN|PERSONAL_TRAINER|OPERATIONAL)$", message = "Perfil inválido.")
        @Size(max = 50, message = "Perfil deve ter no máximo 50 caracteres.")
        String role
) {
}
