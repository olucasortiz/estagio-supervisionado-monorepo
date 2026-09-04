package com.lionfitness.backend.workout.dto;

import java.time.LocalDateTime;
import java.util.UUID;

public record WorkoutSheetResponse(
        UUID id,
        UUID memberId,
        UUID personalTrainerId,
        String title,
        String weekDay,
        String weekDayLabel,
        boolean active,
        LocalDateTime createdAt
) {
}
