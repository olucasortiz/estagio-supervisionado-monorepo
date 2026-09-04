package com.lionfitness.backend.payment.dto;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.UUID;

import com.fasterxml.jackson.annotation.JsonAlias;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;

public record PaymentUpdateRequest(
        @NotNull(message = "Assinatura é obrigatória.")
        UUID subscriptionId,

        @NotNull(message = "Valor é obrigatório.")
        @DecimalMin(value = "0.01", message = "Valor deve ser maior que zero.")
        BigDecimal amount,

        @JsonAlias("paymentDate")
        LocalDate paidAt,

        @NotBlank(message = "Método de pagamento é obrigatório.")
        String method,

        @NotBlank(message = "Status do pagamento é obrigatório.")
        String status
) {
}
