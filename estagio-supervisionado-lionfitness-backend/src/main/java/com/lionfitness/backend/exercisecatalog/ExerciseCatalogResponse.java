package com.lionfitness.backend.exercisecatalog;

import java.util.UUID;

// Substituído o modelo anterior (que tinha campos de tradução como originalName, typeOriginal etc.)
// Agora reflete diretamente a tabela exercise_catalog em português.
public record ExerciseCatalogResponse(
        UUID id,
        String name,
        String category,
        String muscle,
        String equipment,
        String instructions,
        boolean isCustom,
        UUID createdByPersonalTrainerId
) {
}
