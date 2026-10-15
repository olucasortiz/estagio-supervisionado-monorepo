package com.lionfitness.backend.workout.dto;

import java.time.LocalDateTime;
import java.util.UUID;

public record WorkoutSheetHistoryResponse(
        UUID id,
        UUID workoutSheetId,
        String changeReason,
        @com.fasterxml.jackson.annotation.JsonFormat(shape = com.fasterxml.jackson.annotation.JsonFormat.Shape.STRING)
        LocalDateTime createdAt,
        UUID changedByUserId,
        String changedByName,
        WorkoutSheetSnapshot snapshot
) {
    public WorkoutSheetHistoryResponse(UUID id, UUID workoutSheetId, String changeReason, LocalDateTime createdAt) {
        this(id, workoutSheetId, changeReason, createdAt, null, null, null);
    }
}
