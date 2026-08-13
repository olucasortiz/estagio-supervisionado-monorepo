package com.lionfitness.backend.workout.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Pattern;

import java.util.UUID;

public record WorkoutSheetCreateRequest(
        @NotNull(message = "Aluno é obrigatório.")
        UUID memberId,

        @NotBlank(message = "Nome/objetivo da ficha é obrigatório.")
        String title,

        @NotBlank(message = "Dia da semana é obrigatório.")
        @Pattern(regexp = "(?i)^(MONDAY|TUESDAY|WEDNESDAY|THURSDAY|FRIDAY|SATURDAY|SUNDAY)$", message = "Dia da semana inválido.")
        String weekDay
) {
}
