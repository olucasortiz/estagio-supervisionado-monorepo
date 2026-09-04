package com.lionfitness.backend.payment.dto;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.UUID;

/**
 * Resposta retornada ao frontend após o processamento da tentativa de pagamento com cartão.
 */
public record CardPaymentResponse(
        UUID transactionId,
        UUID subscriptionId,
        UUID paymentId,
        String transactionIdentifier,
        BigDecimal amount,
        String status, // APPROVED, PENDING, REJECTED
        String statusDetail,
        String message,
        String paymentMethodId,
        Integer installments,
        LocalDateTime processedAt
) {}
