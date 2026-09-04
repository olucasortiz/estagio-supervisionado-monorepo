package com.lionfitness.backend.exercisecatalog;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;

@JsonIgnoreProperties(ignoreUnknown = true)
public record ExerciseExternalResponse(
        String name,
        String type,
        String muscle,
        String equipment,
        String difficulty,
        String instructions
) {
}
