package com.lionfitness.backend.payment.dto;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.UUID;

/**
 * Lançamento exibido no painel do aluno (Estória 17), somente leitura.
 * O status já vem efetivo: um pagamento pendente de assinatura vencida aparece como OVERDUE.
 */
public record MyPaymentResponse(
        UUID id,
        UUID subscriptionId,
        String planName,
        BigDecimal amount,
        String method,
        String status,
        LocalDate paidAt,
        LocalDate subscriptionEndDate,
        LocalDateTime createdAt
) {
}
