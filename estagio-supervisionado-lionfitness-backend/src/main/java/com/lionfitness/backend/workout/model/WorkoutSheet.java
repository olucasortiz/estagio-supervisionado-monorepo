package com.lionfitness.backend.workout.model;

import java.util.UUID;

public record WorkoutSheet(
        UUID id,
        UUID memberId,
        UUID personalTrainerId,
        String goal,
        String weekDay,
        boolean active
) {
}
