package com.lionfitness.backend.payment.dto;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.UUID;

/**
 * Resposta imutável da consulta de status de uma transação Pix.
 */
public record PixStatusResponse(
        UUID transactionId,
        String status,
        UUID paymentId,
        UUID subscriptionId,
        BigDecimal amount,
        LocalDateTime confirmedAt
) {
}
