package com.lionfitness.backend.user.exception;

public class DuplicateEmailException extends RuntimeException {

    public DuplicateEmailException(String email) {
        super("Já existe um usuário cadastrado com este email.");
    }
}
