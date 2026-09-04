package com.lionfitness.backend.payment.exception;

public class InvalidPaymentAmountException extends RuntimeException {

    public InvalidPaymentAmountException() {
        super("Valor deve ser maior que zero.");
    }
}
