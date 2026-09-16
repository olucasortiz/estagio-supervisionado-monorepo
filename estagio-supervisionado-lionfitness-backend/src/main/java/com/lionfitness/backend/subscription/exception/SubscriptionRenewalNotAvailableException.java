package com.lionfitness.backend.subscription.exception;

import java.time.LocalDate;

public class SubscriptionRenewalNotAvailableException extends RuntimeException {

    public SubscriptionRenewalNotAvailableException(LocalDate availableFrom) {
        super("A renovação desta assinatura estará disponível a partir de " + availableFrom + ".");
    }
}
