package com.lionfitness.backend.workoutexercise.dto;

import java.util.UUID;

public record WorkoutExerciseResponse(
        UUID id,
        UUID workoutSheetId,
        String exerciseName,
        String muscle,
        String exerciseType,
        String equipment,
        String difficulty,
        String instructions,
        Integer sets,
        Integer reps,
        Integer restSeconds,
        String notes
) {
}
