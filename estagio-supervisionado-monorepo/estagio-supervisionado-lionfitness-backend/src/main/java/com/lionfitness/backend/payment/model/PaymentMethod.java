package com.lionfitness.backend.payment.model;

import java.text.Normalizer;
import java.util.Locale;

public enum PaymentMethod {
    CASH,
    DEBIT_CARD,
    CREDIT_CARD,
    PIX,
    ONLINE_GATEWAY;

    public static PaymentMethod fromDatabaseValue(String value) {
        if (value == null) {
            return null;
        }
        return PaymentMethod.valueOf(value.toUpperCase());
    }

    public static PaymentMethod fromRequestValue(String value) {
        String normalized = normalize(value);

        return switch (normalized) {
            case "PIX" -> PIX;
            case "DINHEIRO", "CASH" -> CASH;
            case "CARTAO", "CARD", "CREDIT_CARD", "CREDITO", "CARTAO_CREDITO" -> CREDIT_CARD;
            case "DEBIT_CARD", "DEBITO", "CARTAO_DEBITO" -> DEBIT_CARD;
            case "ONLINE_GATEWAY", "BOLETO" -> ONLINE_GATEWAY;
            default -> throw new IllegalArgumentException("Invalid payment method: " + value);
        };
    }

    private static String normalize(String value) {
        if (value == null || value.isBlank()) {
            throw new IllegalArgumentException("Payment method is required");
        }

        String withoutAccents = Normalizer.normalize(value.trim(), Normalizer.Form.NFD)
                .replaceAll("\\p{M}", "");

        return withoutAccents
                .replace('-', '_')
                .replace(' ', '_')
                .toUpperCase(Locale.ROOT);
    }
}
