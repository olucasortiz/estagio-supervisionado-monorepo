package com.lionfitness.backend.auth.exception;

public class AuthUserNotFoundException extends RuntimeException {

    public AuthUserNotFoundException(String email) {
        super("User not found: " + email);
    }
}
