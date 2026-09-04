package com.lionfitness.backend.subscription.exception;

public class InvalidSubscriptionPeriodException extends RuntimeException {

    public InvalidSubscriptionPeriodException() {
        super("End date must be after start date");
    }
}
