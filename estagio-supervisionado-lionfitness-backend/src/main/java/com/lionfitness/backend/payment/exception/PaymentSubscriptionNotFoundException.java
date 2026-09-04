package com.lionfitness.backend.payment.exception;

import java.util.UUID;

public class PaymentSubscriptionNotFoundException extends RuntimeException {

    public PaymentSubscriptionNotFoundException(UUID subscriptionId) {
        super("Assinatura não encontrada.");
    }
}
