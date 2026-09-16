package com.lionfitness.backend.cancellationrecord.exception;

import java.util.UUID;

public class CancellationBlockedException extends RuntimeException {

    public CancellationBlockedException(UUID memberId) {
        super("Não é possível cancelar o aluno enquanto existirem pagamentos pendentes ou atrasados.");
    }
}
