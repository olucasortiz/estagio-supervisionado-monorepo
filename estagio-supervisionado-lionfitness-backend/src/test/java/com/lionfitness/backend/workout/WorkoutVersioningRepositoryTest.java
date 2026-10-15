package com.lionfitness.backend.workout;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.datatype.jsr310.JavaTimeModule;
import com.lionfitness.backend.user.model.User;
import com.lionfitness.backend.workout.dto.*;
import com.lionfitness.backend.workout.model.WorkoutExercise;
import com.lionfitness.backend.workout.repository.*;
import com.lionfitness.backend.workoutexercise.repository.WorkoutExerciseRepository;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;
import org.springframework.core.io.ClassPathResource;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.core.RowMapper;

import java.nio.charset.StandardCharsets;
import java.sql.ResultSet;
import java.sql.ResultSetMetaData;
import java.sql.Timestamp;
import java.time.LocalDateTime;
import java.util.*;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

class WorkoutVersioningRepositoryTest {
    final UUID sheetId = UUID.randomUUID(), memberId = UUID.randomUUID(), trainerId = UUID.randomUUID();
    final LocalDateTime time = LocalDateTime.of(2026, 10, 8, 9, 30);
    final ObjectMapper mapper = new ObjectMapper().registerModule(new JavaTimeModule());
    final JdbcTemplate jdbc = mock(JdbcTemplate.class);

    WorkoutSheetSnapshot snapshot() {
        return new WorkoutSheetSnapshot(new WorkoutSheetResponse(sheetId, memberId, trainerId, "Objetivo anterior", "MONDAY",
                "Segunda-feira", true, time, 7), List.of(new WorkoutExercise(UUID.randomUUID(), sheetId, "Supino", "Peitoral",
                "Peito", "Barra", "Média", "Instruções", 3, 12, 60, "Observações", time)));
    }

    @Test
    void snapshotIsSerializedIntoJsonbWithAuthenticatedActorAndTimestamp() throws Exception {
        WorkoutSheetSnapshot previous = snapshot();
        User actor = new User(UUID.randomUUID(), "Autor real", "actor@example.com", "hash", "ADMIN", true, time, false);
        new WorkoutSheetHistoryRepository(jdbc, mapper).recordSnapshot(previous, actor, "Motivo real");
        ArgumentCaptor<String> json = ArgumentCaptor.forClass(String.class);
        verify(jdbc).update(contains("CAST(? AS jsonb)"), any(UUID.class), eq(sheetId), eq("Motivo real"), json.capture(),
                eq(actor.id()), eq(actor.name()), any(Timestamp.class));
        assertThat(mapper.readValue(json.getValue(), WorkoutSheetSnapshot.class)).isEqualTo(previous);
        assertThat(mapper.readTree(json.getValue()).path("exercises").get(0).path("restSeconds").asInt()).isEqualTo(60);
    }

    @Test
    @SuppressWarnings("unchecked")
    void repositoryReadsFullSnapshotAndPreservesNullForLegacyRows() throws Exception {
        WorkoutSheetHistoryRepository repository = new WorkoutSheetHistoryRepository(jdbc, mapper);
        repository.findByWorkoutSheetId(sheetId);
        ArgumentCaptor<RowMapper<WorkoutSheetHistoryResponse>> rowMapper = ArgumentCaptor.forClass(RowMapper.class);
        verify(jdbc).query(contains("snapshot::text"), rowMapper.capture(), eq(sheetId));
        ResultSet legacy = mock(ResultSet.class);
        ResultSetMetaData metadata = mock(ResultSetMetaData.class);
        when(legacy.getMetaData()).thenReturn(metadata);
        when(legacy.findColumn("created_at")).thenReturn(1);
        when(metadata.getColumnTypeName(1)).thenReturn("timestamp");
        when(legacy.getObject("workout_sheet_id", UUID.class)).thenReturn(sheetId);
        when(legacy.getString("change_reason")).thenReturn("Evento antigo");
        WorkoutSheetHistoryResponse old = rowMapper.getValue().mapRow(legacy, 0);
        assertThat(old.snapshot()).isNull();
        assertThat(old.changedByUserId()).isNull();
        assertThat(old.changedByName()).isNull();
        WorkoutSheetSnapshot previous = snapshot();
        when(legacy.getString("snapshot")).thenReturn(mapper.writeValueAsString(previous));
        assertThat(rowMapper.getValue().mapRow(legacy, 1).snapshot()).isEqualTo(previous);
    }

    @Test
    void editingLocksSheetAndMemberWhileUpdateChecksExpectedRevision() {
        WorkoutRepository repository = new WorkoutRepository(jdbc);
        repository.findByIdForUpdate(sheetId);
        verify(jdbc).query(contains("FOR UPDATE OF ws FOR SHARE OF m"), any(RowMapper.class), eq(sheetId));
        repository.updateSheet(sheetId, "Novo", "FRIDAY", 7);
        verify(jdbc).update(contains("WHERE id = ? AND version = ? AND is_active = true"), eq("Novo"), eq("FRIDAY"), eq(sheetId), eq(7L));
    }

    @Test
    void removedExercisesAreOnlyLogicallyDeactivatedAndHiddenFromCurrentReads() {
        WorkoutExerciseRepository repository = new WorkoutExerciseRepository(jdbc);
        repository.deactivateBySheet(sheetId);
        verify(jdbc).update("UPDATE workout_exercises SET is_active = false WHERE workout_sheet_id = ? AND is_active = true", sheetId);
        repository.findByWorkoutSheetId(sheetId);
        ArgumentCaptor<String> sql = ArgumentCaptor.forClass(String.class);
        verify(jdbc).query(sql.capture(), any(RowMapper.class), eq(sheetId));
        assertThat(sql.getValue()).contains("and is_active = true", "sort_order asc nulls last");
    }

    @Test
    void migrationAddsOnlyColumnsAndIndexWithoutBackfillingSnapshotsOrRemovingData() throws Exception {
        String sql;
        try (var input = new ClassPathResource("db/manual/2026-10-08-workout-sheet-versioning.sql").getInputStream()) {
            sql = new String(input.readAllBytes(), StandardCharsets.UTF_8);
        }
        assertThat(sql).contains("ADD COLUMN IF NOT EXISTS snapshot JSONB", "ADD COLUMN IF NOT EXISTS version BIGINT",
                        "ADD COLUMN IF NOT EXISTS is_active BOOLEAN", "ADD COLUMN IF NOT EXISTS changed_by_user_id")
                .doesNotContain("DROP COLUMN", "DELETE FROM", "UPDATE workout", "TRUNCATE ");
    }
}
