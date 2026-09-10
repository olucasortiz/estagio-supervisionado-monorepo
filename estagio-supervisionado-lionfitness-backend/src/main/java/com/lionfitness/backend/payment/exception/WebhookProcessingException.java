package com.lionfitness.backend.payment.exception;

public class WebhookProcessingException extends RuntimeException {
    public WebhookProcessingException(String message) {
        super(message);
    }
}
