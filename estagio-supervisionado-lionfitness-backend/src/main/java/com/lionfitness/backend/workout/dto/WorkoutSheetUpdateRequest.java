package com.lionfitness.backend.workout.dto;

import jakarta.validation.Valid;
import jakarta.validation.constraints.*;
import java.util.List;
import java.util.UUID;

public record WorkoutSheetUpdateRequest(
        @NotBlank @Size(max = 255) String title,
        @NotBlank @Pattern(regexp = "(?i)^(MONDAY|TUESDAY|WEDNESDAY|THURSDAY|FRIDAY|SATURDAY|SUNDAY)$") String weekDay,
        @NotNull @Min(0) Long version,
        @NotBlank(message = "Motivo da alteração é obrigatório.") @Size(max = 2000) String changeReason,
        @NotNull List<@NotNull @Valid ExerciseUpdate> exercises
) {
    public record ExerciseUpdate(
            UUID id,
            UUID catalogExerciseId,
            @NotNull @Min(1) Integer sets,
            @NotNull @Min(1) Integer reps,
            @NotNull @Min(0) Integer restSeconds,
            String instructions,
            String notes
    ) {
        @AssertTrue(message = "Informe somente id para um exercício existente ou catalogExerciseId para uma nova inclusão.")
        public boolean isValidSource() { return (id != null) != (catalogExerciseId != null); }
    }
}
