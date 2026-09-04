package com.lionfitness.backend.workoutexercise.dto;

import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;

import java.util.UUID;

public record WorkoutExerciseCreateRequest(
        @NotNull(message = "Ficha de treino é obrigatória.")
        UUID workoutSheetId,

        @NotBlank(message = "Exercício é obrigatório.")
        String externalName,

        @NotBlank(message = "Músculo é obrigatório.")
        String muscle,

        String exerciseType,
        String equipment,
        String difficulty,
        String instructions,

        @NotNull(message = "Séries devem ser maiores que zero.")
        @Min(value = 1, message = "Séries devem ser maiores que zero.")
        Integer sets,

        @NotNull(message = "Repetições devem ser maiores que zero.")
        @Min(value = 1, message = "Repetições devem ser maiores que zero.")
        Integer reps,

        @NotNull(message = "Descanso deve ser zero ou maior.")
        @Min(value = 0, message = "Descanso deve ser zero ou maior.")
        Integer restSeconds,

        String notes
) {
}
