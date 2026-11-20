package com.lionfitness.backend.physicalassessment.dto;

import com.lionfitness.backend.physicalassessment.dto.PhysicalAssessmentRequest.Circumferences;
import com.lionfitness.backend.physicalassessment.dto.PhysicalAssessmentRequest.Skinfolds;
import com.lionfitness.backend.physicalassessment.model.PhysicalAssessment;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;

public record PhysicalAssessmentResponse(
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
        String assessedByName,
        LocalDateTime createdAt,
        Results results
) {

    /** Indicadores derivados das medidas (IMC, % de gordura, massas, RCQ e alerta do PAR-Q). */
    public record Results(
            BigDecimal bmi,
            String bmiClassification,
            BigDecimal skinfoldSum,
            BigDecimal bodyDensity,
            BigDecimal bodyFatPercent,
            BigDecimal fatMassKg,
            BigDecimal leanMassKg,
            BigDecimal waistHipRatio,
            Boolean waistHipRiskElevated,
            Boolean parqPositive
    ) {
    }

    public static PhysicalAssessmentResponse of(PhysicalAssessment a, Results results) {
        return new PhysicalAssessmentResponse(a.id(), a.memberId(), a.memberName(), a.assessmentDate(), a.sex(),
                a.ageYears(), a.objective(), a.parqAnswers(), a.healthNotes(), a.restingHeartRate(),
                a.systolicPressure(), a.diastolicPressure(), a.weightKg(), a.heightCm(), a.circumferences(),
                a.bodyFatMethod(), a.skinfolds(), a.informedBodyFatPercent(), a.notes(), a.assessedByName(),
                a.createdAt(), results);
    }
}
