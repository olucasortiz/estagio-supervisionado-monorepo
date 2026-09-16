package com.lionfitness.backend.workout;

import com.lionfitness.backend.member.repository.MemberRepository;
import com.lionfitness.backend.personaltrainer.model.PersonalTrainer;
import com.lionfitness.backend.personaltrainer.repository.PersonalTrainerRepository;
import com.lionfitness.backend.user.model.User;
import com.lionfitness.backend.user.repository.UserRepository;
import com.lionfitness.backend.workout.dto.WorkoutSheetHistoryResponse;
import com.lionfitness.backend.workout.repository.WorkoutRepository;
import com.lionfitness.backend.workout.repository.WorkoutSheetHistoryRepository;
import com.lionfitness.backend.workout.service.WorkoutService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InOrder;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.http.HttpStatus;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.core.RowMapper;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class WorkoutSheetHistoryTest {
    @Mock WorkoutRepository workoutRepository;
    @Mock WorkoutSheetHistoryRepository historyRepository;
    @Mock UserRepository userRepository;
    @Mock MemberRepository memberRepository;
    @Mock PersonalTrainerRepository trainerRepository;
    @Mock JdbcTemplate jdbcTemplate;

    private WorkoutService service;
    private final UUID sheetId = UUID.randomUUID();
    private final UUID memberId = UUID.randomUUID();
    private final UUID trainerId = UUID.randomUUID();
    private final String trainerEmail = "personal@example.com";

    @BeforeEach
    void setUp() {
        service = new WorkoutService(workoutRepository, historyRepository, userRepository,
                memberRepository, trainerRepository);
    }

    @Test
    void assignedTrainerCanReadOnlyTheEventsStoredForThatSheet() {
        trainerContext();
        when(workoutRepository.findMemberIdByWorkoutSheetId(sheetId)).thenReturn(Optional.of(memberId));
        when(workoutRepository.memberBelongsToPersonalTrainer(memberId, trainerId)).thenReturn(true);
        WorkoutSheetHistoryResponse entry = new WorkoutSheetHistoryResponse(UUID.randomUUID(), sheetId,
                "Exercício adicionado", LocalDateTime.now());
        when(historyRepository.findByWorkoutSheetId(sheetId)).thenReturn(List.of(entry));

        assertThat(service.findWorkoutSheetHistory(trainerEmail, sheetId)).containsExactly(entry);
    }

    @Test
    void trainerCannotReadAnotherStudentsHistoryByUuid() {
        trainerContext();
        when(workoutRepository.findMemberIdByWorkoutSheetId(sheetId)).thenReturn(Optional.of(memberId));
        when(workoutRepository.memberBelongsToPersonalTrainer(memberId, trainerId)).thenReturn(false);

        assertThatThrownBy(() -> service.findWorkoutSheetHistory(trainerEmail, sheetId))
                .isInstanceOfSatisfying(ResponseStatusException.class,
                        error -> assertThat(error.getStatusCode()).isEqualTo(HttpStatus.FORBIDDEN));
        verifyNoInteractions(historyRepository);
    }

    @Test
    void deactivationRecordsEventAfterSuccessfulUpdate() throws Exception {
        trainerContext();
        when(workoutRepository.findMemberIdByWorkoutSheetId(sheetId)).thenReturn(Optional.of(memberId));
        when(workoutRepository.memberBelongsToPersonalTrainer(memberId, trainerId)).thenReturn(true);
        when(workoutRepository.deactivateWorkoutSheet(sheetId)).thenReturn(true);

        service.deactivateWorkoutSheet(trainerEmail, sheetId);

        InOrder order = inOrder(workoutRepository, historyRepository);
        order.verify(workoutRepository).deactivateWorkoutSheet(sheetId);
        order.verify(historyRepository).recordChange(sheetId, "Ficha inativada.");
        assertThat(WorkoutService.class.getMethod("deactivateWorkoutSheet", String.class, UUID.class)
                .isAnnotationPresent(Transactional.class)).isTrue();
    }

    @Test
    void repositoryPersistsEventWithoutInventingSnapshotColumns() {
        WorkoutSheetHistoryRepository repository = new WorkoutSheetHistoryRepository(jdbcTemplate);
        repository.recordChange(sheetId, "Exercício adicionado");
        verify(jdbcTemplate).update(contains("INSERT INTO workout_sheet_history (id, workout_sheet_id, change_reason)"),
                any(UUID.class), eq(sheetId), eq("Exercício adicionado"));
        repository.findByWorkoutSheetId(sheetId);
        verify(jdbcTemplate).query(contains("WHERE workout_sheet_id = ?"), any(RowMapper.class), eq(sheetId));
    }

    private void trainerContext() {
        UUID userId = UUID.randomUUID();
        when(userRepository.findByEmail(trainerEmail)).thenReturn(Optional.of(new User(userId, "Personal",
                trainerEmail, "", "PERSONAL_TRAINER", true, LocalDateTime.now(), false)));
        when(trainerRepository.findActiveByUserId(userId)).thenReturn(Optional.of(new PersonalTrainer(
                trainerId, userId, "Personal", "", trainerEmail, "", "", true, LocalDateTime.now(), null)));
    }
}
