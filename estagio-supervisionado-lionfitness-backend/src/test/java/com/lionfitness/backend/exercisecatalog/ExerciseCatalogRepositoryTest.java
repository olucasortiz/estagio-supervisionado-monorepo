package com.lionfitness.backend.exercisecatalog;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.core.RowMapper;

import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class ExerciseCatalogRepositoryTest {
    @Mock JdbcTemplate jdbc;
    ExerciseCatalogRepository repository;

    @BeforeEach
    void setUp() { repository = new ExerciseCatalogRepository(jdbc); }

    @Test
    void combinesAllFiltersWithParametersIncludingUntrustedEquipment() {
        String equipment = " halter' OR 1=1 -- ";
        repository.findAll(" supino ", " peito ", " peitoral ", equipment, false, null);
        ArgumentCaptor<String> sql = ArgumentCaptor.forClass(String.class);
        verify(jdbc).query(sql.capture(), any(RowMapper.class), eq("%supino%"), eq("%peito%"),
                eq("%peitoral%"), eq("%halter' OR 1=1 --%"));
        assertThat(sql.getValue()).contains("is_active = true", "name ILIKE ?", "category ILIKE ?",
                "muscle ILIKE ?", "equipment ILIKE ?").doesNotContain("halter'", "OR 1=1");
    }

    @Test
    void blankFiltersKeepDefaultActiveListing() {
        repository.findAll(" ", null, "", " ", false, null);
        ArgumentCaptor<String> sql = ArgumentCaptor.forClass(String.class);
        verify(jdbc).query(sql.capture(), any(RowMapper.class), any(Object[].class));
        assertThat(sql.getValue()).contains("AND is_active = true").doesNotContain("ILIKE");
    }

    @Test
    void adminCanListInactiveWhileTrainerOnlySeesOwnInactive() {
        repository.findAll(null, null, null, null, true, null);
        ArgumentCaptor<String> sql = ArgumentCaptor.forClass(String.class);
        verify(jdbc).query(sql.capture(), any(RowMapper.class), any(Object[].class));
        assertThat(sql.getValue()).doesNotContain("AND is_active", "LIMIT 200");
        clearInvocations(jdbc);
        UUID trainerId = UUID.randomUUID();
        repository.findAll(null, null, null, "barra", true, trainerId);
        verify(jdbc).query(sql.capture(), any(RowMapper.class), eq(trainerId), eq("%barra%"));
        assertThat(sql.getValue()).contains("(is_active = true OR (is_custom = true AND created_by_personal_trainer_id = ?))",
                "AND equipment ILIKE ?");
    }

    @Test
    void statusUpdateOnlyChangesCatalogAndPreservesWorkoutRows() {
        UUID id = UUID.randomUUID();
        when(jdbc.update(anyString(), eq(false), eq(id))).thenReturn(1);
        assertThat(repository.updateActiveStatus(id, false)).isTrue();
        verify(jdbc).update("UPDATE exercise_catalog SET is_active = ? WHERE id = ?", false, id);
        verifyNoMoreInteractions(jdbc);
    }

    @Test
    void missingExerciseReturnsFalseOnUpdate() {
        assertThat(repository.updateActiveStatus(UUID.randomUUID(), true)).isFalse();
    }

    @Test
    void catalogSourceLookupLocksRowUntilPrescriptionTransactionEnds() {
        UUID id = UUID.randomUUID();
        repository.findByIdForShare(id);
        ArgumentCaptor<String> sql = ArgumentCaptor.forClass(String.class);
        verify(jdbc).query(sql.capture(), any(RowMapper.class), eq(id));
        assertThat(sql.getValue()).contains("WHERE id = ?", "FOR SHARE").doesNotContain("is_active = true");
    }
}
