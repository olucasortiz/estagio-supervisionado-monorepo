package com.lionfitness.backend.workout.repository;

import com.lionfitness.backend.workout.dto.WorkoutSheetHistoryResponse;
import com.lionfitness.backend.workout.dto.WorkoutSheetSnapshot;
import com.lionfitness.backend.user.model.User;
import com.lionfitness.backend.common.config.TimeConfiguration;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.core.JsonProcessingException;
import org.springframework.context.annotation.DependsOn;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.UUID;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.time.Instant;
import java.time.LocalDateTime;
import java.time.OffsetDateTime;

@Repository
@DependsOn("workoutSchemaMigration")
public class WorkoutSheetHistoryRepository {

    private final JdbcTemplate jdbcTemplate;
    private final ObjectMapper objectMapper;

    public WorkoutSheetHistoryRepository(JdbcTemplate jdbcTemplate, ObjectMapper objectMapper) {
        this.jdbcTemplate = jdbcTemplate;
        this.objectMapper = objectMapper;
    }

    public void recordSnapshot(WorkoutSheetSnapshot snapshot, User actor, String reason) {
        jdbcTemplate.update("""
                INSERT INTO workout_sheet_history
                    (id, workout_sheet_id, change_reason, snapshot, changed_by_user_id, changed_by_name, created_at)
                VALUES (?, ?, ?, CAST(? AS jsonb), ?, ?, ?)
                """, UUID.randomUUID(), snapshot.sheet().id(), reason, serialize(snapshot), actor.id(), actor.name(),
                java.sql.Timestamp.from(Instant.now()));
    }

    private String serialize(WorkoutSheetSnapshot snapshot) {
        try { return objectMapper.writeValueAsString(snapshot); }
        catch (JsonProcessingException exception) { throw new IllegalStateException("Falha ao serializar versão da ficha.", exception); }
    }

    private WorkoutSheetSnapshot deserialize(String json) {
        if (json == null) return null;
        try { return objectMapper.readValue(json, WorkoutSheetSnapshot.class); }
        catch (JsonProcessingException exception) { throw new IllegalStateException("Falha ao ler versão da ficha.", exception); }
    }

    public void recordChange(UUID workoutSheetId, String reason) {
        jdbcTemplate.update(
                "INSERT INTO workout_sheet_history (id, workout_sheet_id, change_reason) VALUES (?, ?, ?)",
                UUID.randomUUID(), workoutSheetId, reason
        );
    }

    public List<WorkoutSheetHistoryResponse> findByWorkoutSheetId(UUID workoutSheetId) {
        return jdbcTemplate.query(
                """
                SELECT id, workout_sheet_id, change_reason, created_at, snapshot::text as snapshot,
                       changed_by_user_id, changed_by_name
                FROM workout_sheet_history
                WHERE workout_sheet_id = ?
                ORDER BY created_at DESC, id DESC
                """,
                (rs, rowNum) -> new WorkoutSheetHistoryResponse(
                        rs.getObject("id", UUID.class),
                        rs.getObject("workout_sheet_id", UUID.class),
                        rs.getString("change_reason"),
                        readCreatedAt(rs),
                        rs.getObject("changed_by_user_id", UUID.class),
                        rs.getString("changed_by_name"),
                        deserialize(rs.getString("snapshot"))
                ),
                workoutSheetId
        );
    }

    private LocalDateTime readCreatedAt(ResultSet rs) throws SQLException {
        String type = rs.getMetaData().getColumnTypeName(rs.findColumn("created_at"));
        if ("timestamp".equalsIgnoreCase(type) || "timestamp without time zone".equalsIgnoreCase(type)) {
            // A legacy wall-clock value has no offset: preserve it without inventing an instant.
            return rs.getObject("created_at", LocalDateTime.class);
        }
        OffsetDateTime createdAt = rs.getObject("created_at", OffsetDateTime.class);
        // Keep the REST LocalDateTime shape, displaying the instant in the business timezone.
        return createdAt == null ? null
                : createdAt.atZoneSameInstant(TimeConfiguration.BUSINESS_ZONE).toLocalDateTime();
    }
}
