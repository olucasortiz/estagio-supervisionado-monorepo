package com.lionfitness.backend.physicalassessment.model;

import com.lionfitness.backend.physicalassessment.dto.PhysicalAssessmentRequest.Circumferences;
import com.lionfitness.backend.physicalassessment.dto.PhysicalAssessmentRequest.Skinfolds;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;

/** Dados medidos e informados na avaliação. Os indicadores derivados são calculados na leitura. */
public record PhysicalAssessment(
        UUID id,
        UUID memberId,
        String memberName,
        LocalDate assessmentDate,
        String sex,
        Integer ageYears,
        String objective,
        List<Boolean> parqAnswers,
        String healthNotes,
        Integer restingHeartRate,
        Integer systolicPressure,
        Integer diastolicPressure,
        BigDecimal weightKg,
        BigDecimal heightCm,
        Circumferences circumferences,
        String bodyFatMethod,
        Skinfolds skinfolds,
        BigDecimal informedBodyFatPercent,
        String notes,
        UUID assessedByUserId,
        String assessedByName,
        LocalDateTime createdAt
) {
}
