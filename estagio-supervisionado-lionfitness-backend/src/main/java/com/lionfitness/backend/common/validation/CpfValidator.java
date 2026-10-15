package com.lionfitness.backend.common.validation;

import org.springframework.http.HttpStatus;
import org.springframework.web.server.ResponseStatusException;

public final class CpfValidator {
    private CpfValidator() {}

    public static String normalize(String cpf) {
        return cpf == null ? null : cpf.replaceAll("[.\\-\\s]", "");
    }

    public static boolean isValid(String value) {
        String cpf = normalize(value);
        if (cpf == null || !cpf.matches("[0-9]{11}") || cpf.chars().distinct().count() == 1) return false;
        for (int length = 9; length <= 10; length++) {
            int sum = 0;
            for (int i = 0; i < length; i++) sum += (cpf.charAt(i) - '0') * (length + 1 - i);
            int digit = (sum * 10) % 11;
            if (digit == 10) digit = 0;
            if (cpf.charAt(length) - '0' != digit) return false;
        }
        return true;
    }

    public static void requireValid(String cpf) {
        if (!isValid(cpf)) throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "CPF inválido. Informe 11 dígitos com verificadores válidos.");
    }

    public static void requireValidChange(String cpf, String current) {
        if (!java.util.Objects.equals(normalize(cpf), normalize(current))) requireValid(cpf);
    }
}
