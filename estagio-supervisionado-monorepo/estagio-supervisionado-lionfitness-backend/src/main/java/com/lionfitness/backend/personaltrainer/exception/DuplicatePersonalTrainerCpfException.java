package com.lionfitness.backend.personaltrainer.exception;

public class DuplicatePersonalTrainerCpfException extends RuntimeException {

    public DuplicatePersonalTrainerCpfException(String cpf) {
        super("Já existe um personal trainer cadastrado com este CPF.");
    }
}
