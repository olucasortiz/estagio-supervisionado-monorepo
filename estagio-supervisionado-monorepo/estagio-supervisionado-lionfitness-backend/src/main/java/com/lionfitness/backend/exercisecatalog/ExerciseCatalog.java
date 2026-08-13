package com.lionfitness.backend.exercisecatalog;

import java.time.LocalDateTime;
import java.util.UUID;

public record ExerciseCatalog(
        UUID id,
        String name,
        String category,
        String muscle,
        String equipment,
        String instructions,
        boolean isCustom,
        UUID createdByPersonalTrainerId,
        boolean isActive,
        LocalDateTime createdAt
) {
}
