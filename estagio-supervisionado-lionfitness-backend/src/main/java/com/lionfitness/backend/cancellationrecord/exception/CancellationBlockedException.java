package com.lionfitness.backend.cancellationrecord.exception;

import java.util.UUID;

public class CancellationBlockedException extends RuntimeException {

    public CancellationBlockedException(UUID memberId) {
        super("Member cannot be canceled because there are pending or overdue payments: " + memberId);
    }
}
