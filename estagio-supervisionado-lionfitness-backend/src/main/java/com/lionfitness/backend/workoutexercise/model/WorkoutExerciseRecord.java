package com.lionfitness.backend.workoutexercise.model;

import java.util.UUID;

public record WorkoutExerciseRecord(
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
