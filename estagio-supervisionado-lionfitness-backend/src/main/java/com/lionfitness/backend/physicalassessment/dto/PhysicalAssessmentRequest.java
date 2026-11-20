package com.lionfitness.backend.physicalassessment.dto;

import jakarta.validation.Valid;
import jakarta.validation.constraints.DecimalMax;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.PastOrPresent;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;
import java.util.UUID;

/**
 * Avaliação física no formato usado pelos apps de academia: anamnese (PAR-Q), sinais vitais,
 * antropometria, perimetria e composição corporal (dobras de Jackson-Pollock ou bioimpedância).
 */
public record PhysicalAssessmentRequest(
        @NotNull(message = "Aluno é obrigatório.")
        UUID memberId,

        @NotNull(message = "Data da avaliação é obrigatória.")
        @PastOrPresent(message = "A data da avaliação não pode estar no futuro.")
        LocalDate assessmentDate,

        /** Opcional; exigido apenas pelos protocolos de dobras (as equações de Pollock são por sexo). */
        @Pattern(regexp = "^[MF]$", message = "Sexo deve ser M ou F.")
        String sex,

        @Size(max = 255, message = "Objetivo deve ter no máximo 255 caracteres.")
        String objective,

        /** Sete respostas do PAR-Q (true = "sim"); nulo quando o questionário não foi aplicado. */
        @Size(min = 7, max = 7, message = "O PAR-Q tem exatamente 7 perguntas.")
        List<@NotNull(message = "Responda todas as perguntas do PAR-Q.") Boolean> parqAnswers,

        @Size(max = 2000, message = "Histórico de saúde deve ter no máximo 2000 caracteres.")
        String healthNotes,

        @Min(value = 30, message = "Frequência cardíaca de repouso deve estar entre 30 e 220 bpm.")
        @Max(value = 220, message = "Frequência cardíaca de repouso deve estar entre 30 e 220 bpm.")
        Integer restingHeartRate,

        @Min(value = 60, message = "Pressão sistólica deve estar entre 60 e 260 mmHg.")
        @Max(value = 260, message = "Pressão sistólica deve estar entre 60 e 260 mmHg.")
        Integer systolicPressure,

        @Min(value = 30, message = "Pressão diastólica deve estar entre 30 e 160 mmHg.")
        @Max(value = 160, message = "Pressão diastólica deve estar entre 30 e 160 mmHg.")
        Integer diastolicPressure,

        @NotNull(message = "Peso é obrigatório.")
        @DecimalMin(value = "20", message = "Peso deve estar entre 20 e 400 kg.")
        @DecimalMax(value = "400", message = "Peso deve estar entre 20 e 400 kg.")
        BigDecimal weightKg,

        @NotNull(message = "Altura é obrigatória.")
        @DecimalMin(value = "100", message = "Altura deve estar entre 100 e 250 cm.")
        @DecimalMax(value = "250", message = "Altura deve estar entre 100 e 250 cm.")
        BigDecimal heightCm,

        @Valid
        Circumferences circumferences,

        @NotBlank(message = "Método de composição corporal é obrigatório.")
        @Pattern(regexp = "^(NONE|POLLOCK_3|POLLOCK_7|BIOIMPEDANCE)$", message = "Método de composição corporal inválido.")
        String bodyFatMethod,

        @Valid
        Skinfolds skinfolds,

        @DecimalMin(value = "2", message = "Percentual de gordura deve estar entre 2% e 70%.")
        @DecimalMax(value = "70", message = "Percentual de gordura deve estar entre 2% e 70%.")
        BigDecimal informedBodyFatPercent,

        @Size(max = 2000, message = "Observações devem ter no máximo 2000 caracteres.")
        String notes
) {

    /** Perímetros em centímetros. */
    public record Circumferences(
            @DecimalMin(value = "10", message = "Perímetros devem estar entre 10 e 250 cm.") @DecimalMax(value = "250", message = "Perímetros devem estar entre 10 e 250 cm.") BigDecimal chest,
            @DecimalMin(value = "10", message = "Perímetros devem estar entre 10 e 250 cm.") @DecimalMax(value = "250", message = "Perímetros devem estar entre 10 e 250 cm.") BigDecimal waist,
            @DecimalMin(value = "10", message = "Perímetros devem estar entre 10 e 250 cm.") @DecimalMax(value = "250", message = "Perímetros devem estar entre 10 e 250 cm.") BigDecimal abdomen,
            @DecimalMin(value = "10", message = "Perímetros devem estar entre 10 e 250 cm.") @DecimalMax(value = "250", message = "Perímetros devem estar entre 10 e 250 cm.") BigDecimal hip,
            @DecimalMin(value = "10", message = "Perímetros devem estar entre 10 e 250 cm.") @DecimalMax(value = "250", message = "Perímetros devem estar entre 10 e 250 cm.") BigDecimal rightArm,
            @DecimalMin(value = "10", message = "Perímetros devem estar entre 10 e 250 cm.") @DecimalMax(value = "250", message = "Perímetros devem estar entre 10 e 250 cm.") BigDecimal leftArm,
            @DecimalMin(value = "10", message = "Perímetros devem estar entre 10 e 250 cm.") @DecimalMax(value = "250", message = "Perímetros devem estar entre 10 e 250 cm.") BigDecimal rightThigh,
            @DecimalMin(value = "10", message = "Perímetros devem estar entre 10 e 250 cm.") @DecimalMax(value = "250", message = "Perímetros devem estar entre 10 e 250 cm.") BigDecimal leftThigh,
            @DecimalMin(value = "10", message = "Perímetros devem estar entre 10 e 250 cm.") @DecimalMax(value = "250", message = "Perímetros devem estar entre 10 e 250 cm.") BigDecimal rightCalf,
            @DecimalMin(value = "10", message = "Perímetros devem estar entre 10 e 250 cm.") @DecimalMax(value = "250", message = "Perímetros devem estar entre 10 e 250 cm.") BigDecimal leftCalf
    ) {
        public static final Circumferences EMPTY = new Circumferences(null, null, null, null, null, null, null, null, null, null);
    }

    /** Dobras cutâneas em milímetros (sítios do protocolo de Jackson-Pollock). */
    public record Skinfolds(
            @DecimalMin(value = "1", message = "Dobras devem estar entre 1 e 80 mm.") @DecimalMax(value = "80", message = "Dobras devem estar entre 1 e 80 mm.") BigDecimal chest,
            @DecimalMin(value = "1", message = "Dobras devem estar entre 1 e 80 mm.") @DecimalMax(value = "80", message = "Dobras devem estar entre 1 e 80 mm.") BigDecimal midaxillary,
            @DecimalMin(value = "1", message = "Dobras devem estar entre 1 e 80 mm.") @DecimalMax(value = "80", message = "Dobras devem estar entre 1 e 80 mm.") BigDecimal triceps,
            @DecimalMin(value = "1", message = "Dobras devem estar entre 1 e 80 mm.") @DecimalMax(value = "80", message = "Dobras devem estar entre 1 e 80 mm.") BigDecimal subscapular,
            @DecimalMin(value = "1", message = "Dobras devem estar entre 1 e 80 mm.") @DecimalMax(value = "80", message = "Dobras devem estar entre 1 e 80 mm.") BigDecimal abdominal,
            @DecimalMin(value = "1", message = "Dobras devem estar entre 1 e 80 mm.") @DecimalMax(value = "80", message = "Dobras devem estar entre 1 e 80 mm.") BigDecimal suprailiac,
            @DecimalMin(value = "1", message = "Dobras devem estar entre 1 e 80 mm.") @DecimalMax(value = "80", message = "Dobras devem estar entre 1 e 80 mm.") BigDecimal thigh
    ) {
        public static final Skinfolds EMPTY = new Skinfolds(null, null, null, null, null, null, null);
    }
}
