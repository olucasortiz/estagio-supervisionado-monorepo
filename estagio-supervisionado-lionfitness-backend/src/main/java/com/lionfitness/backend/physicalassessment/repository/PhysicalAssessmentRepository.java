package com.lionfitness.backend.physicalassessment.repository;

import com.lionfitness.backend.physicalassessment.dto.PhysicalAssessmentRequest.Circumferences;
import com.lionfitness.backend.physicalassessment.dto.PhysicalAssessmentRequest.Skinfolds;
import com.lionfitness.backend.physicalassessment.model.PhysicalAssessment;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.core.RowMapper;
import org.springframework.stereotype.Repository;

import java.sql.Date;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.sql.Timestamp;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public class PhysicalAssessmentRepository {

    private static final String COLUMNS = """
            pa.id, pa.member_id, m.name as member_name, pa.assessment_date, pa.sex, pa.age_years, pa.objective,
            pa.parq_answers, pa.health_notes, pa.resting_heart_rate, pa.systolic_pressure, pa.diastolic_pressure,
            pa.weight_kg, pa.height_cm, pa.chest_cm, pa.waist_cm, pa.abdomen_cm, pa.hip_cm, pa.right_arm_cm,
            pa.left_arm_cm, pa.right_thigh_cm, pa.left_thigh_cm, pa.right_calf_cm, pa.left_calf_cm,
            pa.body_fat_method, pa.skinfold_chest_mm, pa.skinfold_midaxillary_mm, pa.skinfold_triceps_mm,
            pa.skinfold_subscapular_mm, pa.skinfold_abdominal_mm, pa.skinfold_suprailiac_mm, pa.skinfold_thigh_mm,
            pa.informed_body_fat_percent, pa.notes, pa.assessed_by_user_id, pa.assessed_by_name, pa.created_at
            """;

    private static final RowMapper<PhysicalAssessment> ROW_MAPPER = PhysicalAssessmentRepository::map;

    private final JdbcTemplate jdbcTemplate;

    public PhysicalAssessmentRepository(JdbcTemplate jdbcTemplate) {
        this.jdbcTemplate = jdbcTemplate;
    }

    public void save(PhysicalAssessment a) {
        Circumferences c = a.circumferences() == null ? Circumferences.EMPTY : a.circumferences();
        Skinfolds s = a.skinfolds() == null ? Skinfolds.EMPTY : a.skinfolds();
        jdbcTemplate.update("""
                insert into physical_assessments (
                    id, member_id, assessment_date, sex, age_years, objective, parq_answers, health_notes,
                    resting_heart_rate, systolic_pressure, diastolic_pressure, weight_kg, height_cm,
                    chest_cm, waist_cm, abdomen_cm, hip_cm, right_arm_cm, left_arm_cm, right_thigh_cm, left_thigh_cm,
                    right_calf_cm, left_calf_cm, body_fat_method, skinfold_chest_mm, skinfold_midaxillary_mm,
                    skinfold_triceps_mm, skinfold_subscapular_mm, skinfold_abdominal_mm, skinfold_suprailiac_mm,
                    skinfold_thigh_mm, informed_body_fat_percent, notes, assessed_by_user_id, assessed_by_name,
                    is_active, created_at
                ) values (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, true, ?)
                """,
                a.id(), a.memberId(), Date.valueOf(a.assessmentDate()), a.sex(), a.ageYears(), a.objective(),
                encodeParq(a.parqAnswers()), a.healthNotes(), a.restingHeartRate(), a.systolicPressure(),
                a.diastolicPressure(), a.weightKg(), a.heightCm(),
                c.chest(), c.waist(), c.abdomen(), c.hip(), c.rightArm(), c.leftArm(), c.rightThigh(), c.leftThigh(),
                c.rightCalf(), c.leftCalf(), a.bodyFatMethod(), s.chest(), s.midaxillary(), s.triceps(),
                s.subscapular(), s.abdominal(), s.suprailiac(), s.thigh(), a.informedBodyFatPercent(), a.notes(),
                a.assessedByUserId(), a.assessedByName(), Timestamp.valueOf(a.createdAt()));
    }

    public List<PhysicalAssessment> findActiveByMemberId(UUID memberId) {
        return jdbcTemplate.query("select " + COLUMNS + """
                from physical_assessments pa
                join members m on m.id = pa.member_id
                where pa.member_id = ? and pa.is_active = true
                order by pa.assessment_date desc, pa.created_at desc
                """, ROW_MAPPER, memberId);
    }

    public Optional<PhysicalAssessment> findActiveById(UUID id) {
        return jdbcTemplate.query("select " + COLUMNS + """
                from physical_assessments pa
                join members m on m.id = pa.member_id
                where pa.id = ? and pa.is_active = true
                """, ROW_MAPPER, id).stream().findFirst();
    }

    /** Exclusão lógica: a avaliação some das consultas, mas o registro permanece no banco. */
    public boolean deactivate(UUID id) {
        return jdbcTemplate.update("update physical_assessments set is_active = false where id = ? and is_active = true", id) > 0;
    }

    static String encodeParq(List<Boolean> answers) {
        if (answers == null) return null;
        StringBuilder encoded = new StringBuilder();
        answers.forEach(answer -> encoded.append(Boolean.TRUE.equals(answer) ? 'S' : 'N'));
        return encoded.toString();
    }

    static List<Boolean> decodeParq(String encoded) {
        if (encoded == null || encoded.isBlank()) return null;
        List<Boolean> answers = new ArrayList<>();
        for (char answer : encoded.toCharArray()) answers.add(answer == 'S');
        return answers;
    }

    private static PhysicalAssessment map(ResultSet rs, int row) throws SQLException {
        return new PhysicalAssessment(
                rs.getObject("id", UUID.class),
                rs.getObject("member_id", UUID.class),
                rs.getString("member_name"),
                rs.getObject("assessment_date", LocalDate.class),
                rs.getString("sex"),
                rs.getObject("age_years", Integer.class),
                rs.getString("objective"),
                decodeParq(rs.getString("parq_answers")),
                rs.getString("health_notes"),
                rs.getObject("resting_heart_rate", Integer.class),
                rs.getObject("systolic_pressure", Integer.class),
                rs.getObject("diastolic_pressure", Integer.class),
                rs.getBigDecimal("weight_kg"),
                rs.getBigDecimal("height_cm"),
                new Circumferences(rs.getBigDecimal("chest_cm"), rs.getBigDecimal("waist_cm"),
                        rs.getBigDecimal("abdomen_cm"), rs.getBigDecimal("hip_cm"), rs.getBigDecimal("right_arm_cm"),
                        rs.getBigDecimal("left_arm_cm"), rs.getBigDecimal("right_thigh_cm"),
                        rs.getBigDecimal("left_thigh_cm"), rs.getBigDecimal("right_calf_cm"),
                        rs.getBigDecimal("left_calf_cm")),
                rs.getString("body_fat_method"),
                new Skinfolds(rs.getBigDecimal("skinfold_chest_mm"), rs.getBigDecimal("skinfold_midaxillary_mm"),
                        rs.getBigDecimal("skinfold_triceps_mm"), rs.getBigDecimal("skinfold_subscapular_mm"),
                        rs.getBigDecimal("skinfold_abdominal_mm"), rs.getBigDecimal("skinfold_suprailiac_mm"),
                        rs.getBigDecimal("skinfold_thigh_mm")),
                rs.getBigDecimal("informed_body_fat_percent"),
                rs.getString("notes"),
                rs.getObject("assessed_by_user_id", UUID.class),
                rs.getString("assessed_by_name"),
                rs.getObject("created_at", LocalDateTime.class));
    }
}
