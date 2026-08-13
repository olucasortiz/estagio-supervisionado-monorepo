package com.lionfitness.backend.payment.dto;

import java.math.BigDecimal;
import java.util.UUID;
import jakarta.validation.constraints.NotNull;

public record PixGenerateRequest(
        @NotNull(message = "O ID da assinatura é obrigatório.")
        UUID subscriptionId,

        BigDecimal amount
) {
}

