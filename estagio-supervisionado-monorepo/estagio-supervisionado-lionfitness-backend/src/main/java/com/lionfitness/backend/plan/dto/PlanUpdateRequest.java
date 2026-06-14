package com.lionfitness.backend.plan.dto;

import java.math.BigDecimal;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

@JsonIgnoreProperties(ignoreUnknown = true)
public record PlanUpdateRequest(
        @NotBlank(message = "Nome do plano é obrigatório.")
        @Size(max = 150, message = "Nome do plano deve ter no máximo 150 caracteres.")
        String name,

        @NotBlank(message = "Tipo do plano é obrigatório.")
        @Pattern(regexp = "(?i)^(DAILY|MONTHLY)$", message = "Tipo do plano deve ser DAILY ou MONTHLY.")
        String type,

        @NotNull(message = "Valor do plano é obrigatório.")
        @DecimalMin(value = "0.01", message = "Valor do plano deve ser maior que zero.")
        BigDecimal price,

        @NotNull(message = "Duração do plano é obrigatória.")
        @Min(value = 1, message = "Duração do plano deve ser maior que zero.")
        Integer durationDays
) {
}
