package com.lionfitness.backend.physicalassessment.service;

import com.lionfitness.backend.physicalassessment.dto.PhysicalAssessmentRequest.Circumferences;
import com.lionfitness.backend.physicalassessment.dto.PhysicalAssessmentRequest.Skinfolds;
import com.lionfitness.backend.physicalassessment.dto.PhysicalAssessmentResponse.Results;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

/**
 * Cálculos da avaliação física.
 * <ul>
 *   <li>IMC = peso / altura², classificado pelas faixas da OMS.</li>
 *   <li>Densidade corporal pelas equações de Jackson &amp; Pollock (3 ou 7 dobras, por sexo)
 *       e % de gordura pela equação de Siri: %G = 495 / D − 450.</li>
 *   <li>Relação cintura-quadril com risco elevado acima de 0,90 (homens) e 0,85 (mulheres), segundo a OMS.</li>
 *   <li>PAR-Q positivo quando há qualquer resposta "sim": recomenda-se liberação médica.</li>
 * </ul>
 */
public final class BodyCompositionCalculator {

    public static final String NONE = "NONE";
    public static final String POLLOCK_3 = "POLLOCK_3";
    public static final String POLLOCK_7 = "POLLOCK_7";
    public static final String BIOIMPEDANCE = "BIOIMPEDANCE";

    private BodyCompositionCalculator() {
    }

    /** Sítios exigidos por protocolo e sexo, com o nome exibido nas mensagens de erro. */
    public static Map<String, BigDecimal> requiredSkinfolds(String method, String sex, Skinfolds s) {
        Skinfolds f = s == null ? Skinfolds.EMPTY : s;
        Map<String, BigDecimal> sites = new LinkedHashMap<>();
        if (POLLOCK_7.equals(method)) {
            sites.put("peitoral", f.chest());
            sites.put("axilar média", f.midaxillary());
            sites.put("tríceps", f.triceps());
            sites.put("subescapular", f.subscapular());
            sites.put("abdominal", f.abdominal());
            sites.put("suprailíaca", f.suprailiac());
            sites.put("coxa", f.thigh());
        } else if (POLLOCK_3.equals(method) && "M".equals(sex)) {
            sites.put("peitoral", f.chest());
            sites.put("abdominal", f.abdominal());
            sites.put("coxa", f.thigh());
        } else if (POLLOCK_3.equals(method)) {
            sites.put("tríceps", f.triceps());
            sites.put("suprailíaca", f.suprailiac());
            sites.put("coxa", f.thigh());
        }
        return sites;
    }

    public static List<String> missingSkinfolds(String method, String sex, Skinfolds skinfolds) {
        List<String> missing = new ArrayList<>();
        requiredSkinfolds(method, sex, skinfolds).forEach((name, value) -> {
            if (value == null) missing.add(name);
        });
        return missing;
    }

    public static Results calculate(String sex, Integer ageYears, BigDecimal weightKg, BigDecimal heightCm,
                                    Circumferences circumferences, String method, Skinfolds skinfolds,
                                    BigDecimal informedBodyFatPercent, List<Boolean> parqAnswers) {
        double weight = weightKg.doubleValue();
        double heightM = heightCm.doubleValue() / 100.0;
        double bmi = weight / (heightM * heightM);

        BigDecimal skinfoldSum = null;
        BigDecimal density = null;
        Double bodyFat = null;

        if (POLLOCK_3.equals(method) || POLLOCK_7.equals(method)) {
            Map<String, BigDecimal> sites = requiredSkinfolds(method, sex, skinfolds);
            if (ageYears != null && sites.values().stream().allMatch(v -> v != null)) {
                double sum = sites.values().stream().mapToDouble(BigDecimal::doubleValue).sum();
                double d = bodyDensity(method, sex, sum, ageYears);
                skinfoldSum = round(sum, 1);
                density = round(d, 4);
                bodyFat = 495.0 / d - 450.0;
            }
        } else if (BIOIMPEDANCE.equals(method) && informedBodyFatPercent != null) {
            bodyFat = informedBodyFatPercent.doubleValue();
        }

        BigDecimal fatMass = null;
        BigDecimal leanMass = null;
        if (bodyFat != null) {
            double fat = weight * bodyFat / 100.0;
            fatMass = round(fat, 1);
            leanMass = round(weight - fat, 1);
        }

        BigDecimal waistHipRatio = null;
        Boolean riskElevated = null;
        Circumferences c = circumferences == null ? Circumferences.EMPTY : circumferences;
        if (c.waist() != null && c.hip() != null && c.hip().signum() > 0) {
            double ratio = c.waist().doubleValue() / c.hip().doubleValue();
            waistHipRatio = round(ratio, 2);
            // O ponto de corte da OMS depende do sexo; sem ele, mostra só a relação.
            if ("M".equals(sex) || "F".equals(sex)) riskElevated = ratio > ("M".equals(sex) ? 0.90 : 0.85);
        }

        Boolean parqPositive = parqAnswers == null ? null : parqAnswers.stream().anyMatch(Boolean.TRUE::equals);

        return new Results(round(bmi, 1), classifyBmi(bmi), skinfoldSum, density,
                bodyFat == null ? null : round(bodyFat, 1), fatMass, leanMass, waistHipRatio, riskElevated, parqPositive);
    }

    static double bodyDensity(String method, String sex, double sum, int age) {
        boolean male = "M".equals(sex);
        if (POLLOCK_7.equals(method)) {
            return male
                    ? 1.112 - 0.00043499 * sum + 0.00000055 * sum * sum - 0.00028826 * age
                    : 1.097 - 0.00046971 * sum + 0.00000056 * sum * sum - 0.00012828 * age;
        }
        return male
                ? 1.10938 - 0.0008267 * sum + 0.0000016 * sum * sum - 0.0002574 * age
                : 1.0994921 - 0.0009929 * sum + 0.0000023 * sum * sum - 0.0001392 * age;
    }

    static String classifyBmi(double bmi) {
        if (bmi < 18.5) return "Abaixo do peso";
        if (bmi < 25) return "Peso adequado";
        if (bmi < 30) return "Sobrepeso";
        if (bmi < 35) return "Obesidade grau I";
        if (bmi < 40) return "Obesidade grau II";
        return "Obesidade grau III";
    }

    private static BigDecimal round(double value, int scale) {
        return BigDecimal.valueOf(value).setScale(scale, RoundingMode.HALF_UP);
    }
}
