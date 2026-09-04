package com.lionfitness.backend.workout.dto;

import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;

import com.lionfitness.backend.workout.model.WorkoutExercise;

public record WorkoutResponse(
        UUID id,
        UUID memberId,
        UUID personalTrainerId,
        String title,
        String weekDay,
        String weekDayLabel,
        boolean active,
        LocalDateTime createdAt,
        List<WorkoutExercise> exercises
) {
}
