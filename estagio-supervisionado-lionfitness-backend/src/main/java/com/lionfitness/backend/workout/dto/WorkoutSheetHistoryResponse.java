package com.lionfitness.backend.workout.dto;

import java.time.LocalDateTime;
import java.util.UUID;

public record WorkoutSheetHistoryResponse(
        UUID id,
        UUID workoutSheetId,
        String changeReason,
        LocalDateTime createdAt
) {}
