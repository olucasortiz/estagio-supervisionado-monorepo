package com.lionfitness.backend.workout.model;

import java.time.LocalDateTime;
import java.util.UUID;

public record WorkoutExercise(
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
        String notes,
        LocalDateTime createdAt
) {
}
