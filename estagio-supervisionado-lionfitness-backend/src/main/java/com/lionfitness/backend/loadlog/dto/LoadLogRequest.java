package com.lionfitness.backend.loadlog.dto;

import jakarta.validation.constraints.DecimalMax;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotNull;

import java.math.BigDecimal;
import java.util.UUID;

/** Carga usada pelo aluno em uma série de um exercício da sua ficha ativa. */
public record LoadLogRequest(
        @NotNull(message = "Exercício é obrigatório.")
        UUID workoutExerciseId,

        @NotNull(message = "Série é obrigatória.")
        @Min(value = 1, message = "Série deve ser 1 ou maior.")
        @Max(value = 50, message = "Série deve ser no máximo 50.")
        Integer setNumber,

        @NotNull(message = "Repetições são obrigatórias.")
        @Min(value = 1, message = "Repetições devem ser 1 ou mais.")
        @Max(value = 200, message = "Repetições devem ser no máximo 200.")
        Integer reps,

        @NotNull(message = "Carga é obrigatória.")
        @DecimalMin(value = "0", message = "Carga não pode ser negativa.")
        @DecimalMax(value = "999", message = "Carga deve ser no máximo 999 kg.")
        BigDecimal loadKg
) {
}
