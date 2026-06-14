package com.lionfitness.backend.subscription.exception;

import java.util.UUID;

public class SubscriptionNotFoundException extends RuntimeException {

    public SubscriptionNotFoundException(UUID id) {
        super("Subscription not found: " + id);
    }
}
