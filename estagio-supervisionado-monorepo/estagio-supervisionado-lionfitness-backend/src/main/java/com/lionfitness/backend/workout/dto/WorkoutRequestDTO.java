package com.lionfitness.backend.workout.dto;

import java.util.List;
import java.util.UUID;

public record WorkoutRequestDTO(
        UUID memberId,
        UUID personalTrainerId,
        String goal,
        String changeReason, // Motivo para o histórico
        List<ExerciseRequest> exercises
) {
    public record ExerciseRequest(
            String exerciseName,
            int sets,
            int reps,
            String notes,
            int orderIndex
    ) {}
}