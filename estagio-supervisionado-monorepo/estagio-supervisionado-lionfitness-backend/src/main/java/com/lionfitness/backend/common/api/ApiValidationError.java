package com.lionfitness.backend.common.api;

public record ApiValidationError(
        String field,
        String message
) {
}
