package com.lionfitness.backend.personaltrainer.dto;

import java.util.UUID;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

@JsonIgnoreProperties(ignoreUnknown = true)
public record PersonalTrainerCreateRequest(
        UUID userId,

        @NotBlank(message = "Nome é obrigatório.")
        @Size(max = 150, message = "Nome deve ter no máximo 150 caracteres.")
        String name,

        @NotBlank(message = "CPF é obrigatório.")
        @Pattern(regexp = "\\d{11}", message = "CPF deve conter exatamente 11 dígitos.")
        String cpf,

        @NotBlank(message = "Email é obrigatório.")
        @Email(message = "Informe um email válido.")
        String email,

        @Size(max = 20, message = "Telefone deve ter no máximo 20 caracteres.")
        String phone,

        @NotBlank(message = "Especialidade é obrigatória.")
        @Size(max = 150, message = "Especialidade deve ter no máximo 150 caracteres.")
        String specialty
) {
}
