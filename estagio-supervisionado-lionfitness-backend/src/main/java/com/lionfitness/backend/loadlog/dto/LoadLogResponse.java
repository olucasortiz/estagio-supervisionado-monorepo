package com.lionfitness.backend.loadlog.dto;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.UUID;

public record LoadLogResponse(
        UUID id,
        UUID memberId,
        UUID workoutExerciseId,
        String exerciseName,
        String equipment,
        Integer setNumber,
        Integer reps,
        BigDecimal loadKg,
        LocalDateTime loggedAt
) {
}
