package com.lionfitness.backend.subscription.exception;

import java.util.UUID;

public class SubscriptionMemberNotFoundException extends RuntimeException {

    public SubscriptionMemberNotFoundException(UUID memberId) {
        super("Aluno não encontrado ou inativo.");
    }
}
