package com.lionfitness.backend.personaltrainer.exception;

import java.util.UUID;

public class PersonalTrainerNotFoundException extends RuntimeException {

    public PersonalTrainerNotFoundException(UUID id) {
        super("Personal trainer not found: " + id);
    }
}
