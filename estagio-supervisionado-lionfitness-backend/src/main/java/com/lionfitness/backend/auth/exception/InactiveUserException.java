package com.lionfitness.backend.auth.exception;

public class InactiveUserException extends RuntimeException {

    public InactiveUserException(String email) {
        super("User is inactive: " + email);
    }
}
