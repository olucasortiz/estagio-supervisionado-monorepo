package com.lionfitness.backend.subscription.exception;

import java.util.UUID;

public class SubscriptionPlanNotFoundException extends RuntimeException {

    public SubscriptionPlanNotFoundException(UUID planId) {
        super("Plano não encontrado ou inativo.");
    }
}
