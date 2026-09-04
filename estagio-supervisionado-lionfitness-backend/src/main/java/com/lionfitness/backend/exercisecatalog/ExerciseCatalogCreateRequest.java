package com.lionfitness.backend.exercisecatalog;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record ExerciseCatalogCreateRequest(

        @NotBlank(message = "Nome do exercício é obrigatório.")
        @Size(max = 150, message = "Nome deve ter no máximo 150 caracteres.")
        String name,

        @NotBlank(message = "Categoria é obrigatória.")
        @Size(max = 80, message = "Categoria deve ter no máximo 80 caracteres.")
        String category,

        @NotBlank(message = "Músculo é obrigatório.")
        @Size(max = 80, message = "Músculo deve ter no máximo 80 caracteres.")
        String muscle,

        @Size(max = 100, message = "Equipamento deve ter no máximo 100 caracteres.")
        String equipment,

        @NotBlank(message = "Instruções são obrigatórias.")
        String instructions
) {
}
