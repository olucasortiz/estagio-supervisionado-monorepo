package com.lionfitness.backend.member.dto;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.UUID;

public record OverdueMemberResponse(
        UUID memberId,
        String name,
        String cpf,
        UUID subscriptionId,
        String subscriptionStatus,
        UUID paymentId,
        BigDecimal amount,
        LocalDate paymentDate,
        String paymentMethod,
        String paymentStatus
) {
}
