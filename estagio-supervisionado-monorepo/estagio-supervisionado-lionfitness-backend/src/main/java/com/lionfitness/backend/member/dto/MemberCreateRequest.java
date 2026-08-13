package com.lionfitness.backend.member.dto;

import java.time.LocalDate;
import java.util.UUID;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Past;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

@JsonIgnoreProperties(ignoreUnknown = true)
public record MemberCreateRequest(
        @NotBlank(message = "Nome é obrigatório.")
        @Size(max = 150, message = "Nome deve ter no máximo 150 caracteres.")
        String name,

        @NotBlank(message = "CPF é obrigatório.")
        @Pattern(regexp = "\\d{11}", message = "CPF deve conter exatamente 11 dígitos.")
        String cpf,

        @NotBlank(message = "Email é obrigatório.")
        @Email(message = "Informe um email válido.")
        String email,

        String password,

        @NotNull(message = "Data de nascimento é obrigatória.")
        @Past(message = "Data de nascimento não pode ser futura.")
        LocalDate birthDate,

        @Size(max = 500, message = "Photo URL must have at most 500 characters")
        String photoUrl,
        UUID personalTrainerId
) {
}
