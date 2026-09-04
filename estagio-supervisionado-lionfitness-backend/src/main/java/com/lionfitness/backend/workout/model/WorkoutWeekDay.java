package com.lionfitness.backend.workout.model;

public enum WorkoutWeekDay {
    MONDAY("Segunda-feira"),
    TUESDAY("Terca-feira"),
    WEDNESDAY("Quarta-feira"),
    THURSDAY("Quinta-feira"),
    FRIDAY("Sexta-feira"),
    SATURDAY("Sabado"),
    SUNDAY("Domingo");

    private final String label;

    WorkoutWeekDay(String label) {
        this.label = label;
    }

    public String label() {
        return label;
    }

    public static String labelFor(String value) {
        if (value == null || value.isBlank()) {
            return "Sem dia definido";
        }

        try {
            return WorkoutWeekDay.valueOf(value).label();
        } catch (IllegalArgumentException exception) {
            return "Sem dia definido";
        }
    }

    public static String normalizeRequired(String value) {
        if (value == null || value.isBlank()) {
            throw new IllegalArgumentException("Dia do treino e obrigatorio.");
        }

        try {
            return WorkoutWeekDay.valueOf(value.trim().toUpperCase()).name();
        } catch (IllegalArgumentException exception) {
            throw new IllegalArgumentException("Dia do treino invalido.");
        }
    }
}
