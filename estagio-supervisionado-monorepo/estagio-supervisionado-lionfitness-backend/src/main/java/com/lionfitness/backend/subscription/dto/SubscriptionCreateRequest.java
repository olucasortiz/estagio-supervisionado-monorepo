package com.lionfitness.backend.subscription.dto;

import java.time.LocalDate;
import java.util.UUID;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import jakarta.validation.constraints.NotNull;

@JsonIgnoreProperties(ignoreUnknown = true)
public record SubscriptionCreateRequest(
        @NotNull(message = "Aluno é obrigatório.")
        UUID memberId,

        @NotNull(message = "Plano é obrigatório.")
        UUID planId,

        @NotNull(message = "Data de início é obrigatória.")
        LocalDate startDate
) {
}
