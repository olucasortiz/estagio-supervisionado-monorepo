package com.lionfitness.backend.workout.exception;

public class WorkoutNotFoundException extends RuntimeException {

    public WorkoutNotFoundException(String email) {
        super("Active workout not found for user: " + email);
    }
}
