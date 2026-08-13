package com.lionfitness.backend.cancellationrecord.exception;

import java.util.UUID;

public class CancellationRecordNotFoundException extends RuntimeException {

    public CancellationRecordNotFoundException(UUID id) {
        super("Cancellation record not found: " + id);
    }
}
