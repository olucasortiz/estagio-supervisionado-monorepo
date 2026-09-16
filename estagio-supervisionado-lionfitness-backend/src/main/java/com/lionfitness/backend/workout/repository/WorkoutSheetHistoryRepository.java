package com.lionfitness.backend.workout.repository;

import com.lionfitness.backend.workout.dto.WorkoutSheetHistoryResponse;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.UUID;

@Repository
public class WorkoutSheetHistoryRepository {

    private final JdbcTemplate jdbcTemplate;

    public WorkoutSheetHistoryRepository(JdbcTemplate jdbcTemplate) {
        this.jdbcTemplate = jdbcTemplate;
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
                SELECT id, workout_sheet_id, change_reason, created_at
                FROM workout_sheet_history
                WHERE workout_sheet_id = ?
                ORDER BY created_at DESC, id DESC
                """,
                (rs, rowNum) -> new WorkoutSheetHistoryResponse(
                        rs.getObject("id", UUID.class),
                        rs.getObject("workout_sheet_id", UUID.class),
                        rs.getString("change_reason"),
                        rs.getObject("created_at", java.time.LocalDateTime.class)
                ),
                workoutSheetId
        );
    }
}
