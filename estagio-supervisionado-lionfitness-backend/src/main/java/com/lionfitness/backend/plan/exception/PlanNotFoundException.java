package com.lionfitness.backend.plan.exception;

import java.util.UUID;

public class PlanNotFoundException extends RuntimeException {

    public PlanNotFoundException(UUID id) {
        super("Plan not found: " + id);
    }
}
