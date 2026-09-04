package com.lionfitness.backend.member.exception;

public class DuplicateCpfException extends RuntimeException {

    public DuplicateCpfException(String cpf) {
        super("Já existe um membro cadastrado com este CPF.");
    }
}
