package com.lionfitness.backend.payment.model;

import java.text.Normalizer;
import java.util.Locale;

public enum PaymentStatus {
    PENDING,
    PAID,
    OVERDUE,
    REFUNDED,
    CANCELED;

    public static PaymentStatus fromDatabaseValue(String value) {
        if (value == null) {
            return null;
        }
        return PaymentStatus.valueOf(value.toUpperCase());
    }

    public static PaymentStatus fromRequestValue(String value) {
        String normalized = normalize(value);

        return switch (normalized) {
            case "PAGO", "PAID" -> PAID;
            case "PENDENTE", "PENDING" -> PENDING;
            case "CANCELADO", "CANCELED", "CANCELLED" -> CANCELED;
            case "ATRASADO", "OVERDUE" -> OVERDUE;
            case "REEMBOLSADO", "REFUNDED" -> REFUNDED;
            default -> throw new IllegalArgumentException("Invalid payment status: " + value);
        };
    }

    private static String normalize(String value) {
        if (value == null || value.isBlank()) {
            throw new IllegalArgumentException("Payment status is required");
        }

        String withoutAccents = Normalizer.normalize(value.trim(), Normalizer.Form.NFD)
                .replaceAll("\\p{M}", "");

        return withoutAccents
                .replace('-', '_')
                .replace(' ', '_')
                .toUpperCase(Locale.ROOT);
    }
}
