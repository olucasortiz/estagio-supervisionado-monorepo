package com.lionfitness.backend.physicalassessment;

import com.lionfitness.backend.physicalassessment.dto.PhysicalAssessmentRequest.Circumferences;
import com.lionfitness.backend.physicalassessment.dto.PhysicalAssessmentRequest.Skinfolds;
import com.lionfitness.backend.physicalassessment.dto.PhysicalAssessmentResponse.Results;
import com.lionfitness.backend.physicalassessment.service.BodyCompositionCalculator;
import org.junit.jupiter.api.Test;

import java.math.BigDecimal;
import java.util.Collections;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;

class BodyCompositionCalculatorTest {

    static BigDecimal d(String value) { return new BigDecimal(value); }

    static Circumferences waistHip(String waist, String hip) {
        return new Circumferences(null, d(waist), null, d(hip), null, null, null, null, null, null);
    }

    @Test
    void bmiUsesWeightOverHeightSquaredAndWhoClasses() {
        Results r = BodyCompositionCalculator.calculate("M", 30, d("80"), d("180"), null, "NONE", null, null, null);
        assertThat(r.bmi()).isEqualByComparingTo("24.7");
        assertThat(r.bmiClassification()).isEqualTo("Peso adequado");
        assertThat(BodyCompositionCalculator.calculate("F", 30, d("85"), d("160"), null, "NONE", null, null, null)
                .bmiClassification()).isEqualTo("Obesidade grau I");
        assertThat(r.bodyFatPercent()).isNull();
        assertThat(r.parqPositive()).isNull();
    }

    @Test
    void jacksonPollockSevenSitesMaleWithSiri() {
        // Soma 100 mm, 30 anos: D = 1,112 − 0,043499 + 0,0055 − 0,0086478 = 1,06535 → %G = 495/D − 450 = 14,6
        Skinfolds folds = new Skinfolds(d("10"), d("12"), d("14"), d("16"), d("20"), d("13"), d("15"));
        Results r = BodyCompositionCalculator.calculate("M", 30, d("80"), d("180"), null, "POLLOCK_7", folds, null, null);
        assertThat(r.skinfoldSum()).isEqualByComparingTo("100.0");
        assertThat(r.bodyDensity()).isEqualByComparingTo("1.0654");
        assertThat(r.bodyFatPercent()).isEqualByComparingTo("14.6");
        assertThat(r.fatMassKg()).isEqualByComparingTo("11.7");
        assertThat(r.leanMassKg()).isEqualByComparingTo("68.3");
    }

    @Test
    void jacksonPollockThreeSitesUsesSexSpecificSites() {
        // Mulher: tríceps + suprailíaca + coxa = 60 mm, 25 anos.
        // D = 1,0994921 − 0,059574 + 0,00828 − 0,00348 = 1,04472 → %G = 23,8
        Skinfolds folds = new Skinfolds(null, null, d("18"), null, null, d("17"), d("25"));
        Results r = BodyCompositionCalculator.calculate("F", 25, d("60"), d("165"), null, "POLLOCK_3", folds, null, null);
        assertThat(r.skinfoldSum()).isEqualByComparingTo("60.0");
        assertThat(r.bodyFatPercent()).isEqualByComparingTo("23.8");
        assertThat(BodyCompositionCalculator.missingSkinfolds("POLLOCK_3", "M", folds))
                .containsExactly("peitoral", "abdominal");
        assertThat(BodyCompositionCalculator.missingSkinfolds("POLLOCK_7", "F", null)).hasSize(7);
    }

    @Test
    void bioimpedanceUsesInformedPercent() {
        Results r = BodyCompositionCalculator.calculate("F", 40, d("70"), d("165"), null, "BIOIMPEDANCE", null, d("30"), null);
        assertThat(r.bodyFatPercent()).isEqualByComparingTo("30.0");
        assertThat(r.fatMassKg()).isEqualByComparingTo("21.0");
        assertThat(r.leanMassKg()).isEqualByComparingTo("49.0");
    }

    @Test
    void waistHipRiskFollowsWhoCutoffsBySex() {
        Results male = BodyCompositionCalculator.calculate("M", 30, d("80"), d("180"), waistHip("92", "100"), "NONE", null, null, null);
        assertThat(male.waistHipRatio()).isEqualByComparingTo("0.92");
        assertThat(male.waistHipRiskElevated()).isTrue();
        Results female = BodyCompositionCalculator.calculate("F", 30, d("60"), d("165"), waistHip("80", "100"), "NONE", null, null, null);
        assertThat(female.waistHipRiskElevated()).isFalse();
    }

    @Test
    void parqIsPositiveWithAnyYes() {
        List<Boolean> allNo = Collections.nCopies(7, false);
        assertThat(BodyCompositionCalculator.calculate("M", 30, d("80"), d("180"), null, "NONE", null, null, allNo)
                .parqPositive()).isFalse();
        assertThat(BodyCompositionCalculator.calculate("M", 30, d("80"), d("180"), null, "NONE", null, null,
                List.of(false, false, true, false, false, false, false)).parqPositive()).isTrue();
    }
}
