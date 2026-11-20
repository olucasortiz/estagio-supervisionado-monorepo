package com.lionfitness.backend.loadlog.repository;

import com.lionfitness.backend.loadlog.dto.LoadLogResponse;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.core.RowMapper;
import org.springframework.stereotype.Repository;

import java.sql.Timestamp;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public class LoadLogRepository {

    /** Exercício prescrito: o nome e o aparelho são copiados para o registro, como nas fichas. */
    public record PrescribedExercise(UUID id, String exerciseName, String equipment) {
    }

    private static final RowMapper<LoadLogResponse> ROW_MAPPER = (rs, row) -> new LoadLogResponse(
            rs.getObject("id", UUID.class),
            rs.getObject("member_id", UUID.class),
            rs.getObject("workout_exercise_id", UUID.class),
            rs.getString("exercise_name"),
            rs.getString("equipment"),
            rs.getObject("set_number", Integer.class),
            rs.getObject("reps", Integer.class),
            rs.getBigDecimal("load_kg"),
            rs.getObject("logged_at", LocalDateTime.class));

    private final JdbcTemplate jdbcTemplate;

    public LoadLogRepository(JdbcTemplate jdbcTemplate) {
        this.jdbcTemplate = jdbcTemplate;
    }

    /** Só aceita exercícios ativos de fichas ativas do próprio aluno. */
    public Optional<PrescribedExercise> findActiveExerciseOfMember(UUID workoutExerciseId, UUID memberId) {
        return jdbcTemplate.query("""
                select we.id, we.exercise_name, we.equipment
                from workout_exercises we
                join workout_sheets ws on ws.id = we.workout_sheet_id
                where we.id = ?
                  and ws.member_id = ?
                  and ws.is_active = true
                  and we.is_active = true
                """, (rs, row) -> new PrescribedExercise(rs.getObject("id", UUID.class),
                rs.getString("exercise_name"), rs.getString("equipment")), workoutExerciseId, memberId)
                .stream().findFirst();
    }

    public LoadLogResponse save(UUID id, UUID memberId, PrescribedExercise exercise, int setNumber, int reps,
                                java.math.BigDecimal loadKg, LocalDateTime loggedAt) {
        jdbcTemplate.update("""
                insert into exercise_load_logs
                    (id, member_id, workout_exercise_id, exercise_name, equipment, set_number, reps, load_kg, logged_at)
                values (?, ?, ?, ?, ?, ?, ?, ?, ?)
                """, id, memberId, exercise.id(), exercise.exerciseName(), exercise.equipment(), setNumber, reps,
                loadKg, Timestamp.valueOf(loggedAt));
        return new LoadLogResponse(id, memberId, exercise.id(), exercise.exerciseName(), exercise.equipment(),
                setNumber, reps, loadKg, loggedAt);
    }

    public List<LoadLogResponse> findRecentByMemberId(UUID memberId, int limit) {
        return jdbcTemplate.query("""
                select id, member_id, workout_exercise_id, exercise_name, equipment, set_number, reps, load_kg, logged_at
                from exercise_load_logs
                where member_id = ?
                order by logged_at desc, set_number desc
                limit ?
                """, ROW_MAPPER, memberId, limit);
    }
}
