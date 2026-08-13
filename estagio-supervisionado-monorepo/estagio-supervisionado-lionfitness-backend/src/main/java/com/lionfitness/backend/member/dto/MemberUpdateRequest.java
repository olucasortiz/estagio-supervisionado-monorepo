package com.lionfitness.backend.member.dto;

import java.time.LocalDate;
import java.util.UUID;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Past;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

@JsonIgnoreProperties(ignoreUnknown = true)
public record MemberUpdateRequest(
        @NotBlank(message = "Nome é obrigatório.")
        @Size(max = 150, message = "Nome deve ter no máximo 150 caracteres.")
        String name,

        @NotBlank(message = "CPF é obrigatório.")
        @Pattern(regexp = "\\d{11}", message = "CPF deve conter exatamente 11 dígitos.")
        String cpf,

        @NotNull(message = "Data de nascimento é obrigatória.")
        @Past(message = "Data de nascimento não pode ser futura.")
        LocalDate birthDate,

        String photoUrl,

        UUID personalTrainerId
) {
}
