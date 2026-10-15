package com.lionfitness.backend.workoutexercise.service;

import com.lionfitness.backend.exercisecatalog.ExerciseCatalogRepository;
import com.lionfitness.backend.exercisecatalog.ExerciseCatalog;
import com.lionfitness.backend.workout.repository.WorkoutRepository;
import com.lionfitness.backend.workout.dto.WorkoutSheetResponse;
import com.lionfitness.backend.workout.dto.WorkoutSheetSnapshot;
import java.util.List;
import com.lionfitness.backend.personaltrainer.model.PersonalTrainer;
import com.lionfitness.backend.personaltrainer.repository.PersonalTrainerRepository;
import com.lionfitness.backend.user.model.User;
import com.lionfitness.backend.user.repository.UserRepository;
import com.lionfitness.backend.workout.repository.WorkoutSheetHistoryRepository;
import com.lionfitness.backend.workoutexercise.dto.WorkoutExerciseCreateRequest;
import com.lionfitness.backend.workoutexercise.model.WorkoutExerciseRecord;
import com.lionfitness.backend.workoutexercise.repository.WorkoutExerciseRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InOrder;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.Optional;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class WorkoutExerciseHistoryTest {
    @Mock WorkoutExerciseRepository exerciseRepository;
    @Mock WorkoutSheetHistoryRepository historyRepository;
    @Mock UserRepository userRepository;
    @Mock PersonalTrainerRepository trainerRepository;
    @Mock ExerciseCatalogRepository catalogRepository;
    @Mock WorkoutRepository workoutRepository;

    private WorkoutExerciseService service;
    private final UUID sheetId = UUID.randomUUID();
    private final UUID trainerId = UUID.randomUUID();
    private final String email = "trainer@example.com";

    @BeforeEach
    void setUp() {
        service = new WorkoutExerciseService(exerciseRepository, historyRepository,
                userRepository, trainerRepository, catalogRepository, workoutRepository);
    }

    @Test
    void addingExerciseToCurrentSheetRecordsHistoryInSameTransaction() throws Exception {
        UUID userId = UUID.randomUUID();
        when(userRepository.findByEmail(email)).thenReturn(Optional.of(new User(userId, "Trainer", email,
                "", "PERSONAL_TRAINER", true, LocalDateTime.now(), false)));
        when(trainerRepository.findActiveByUserId(userId)).thenReturn(Optional.of(new PersonalTrainer(
                trainerId, userId, "Trainer", "", email, "", "", true, LocalDateTime.now(), null)));
        when(exerciseRepository.workoutSheetExists(sheetId)).thenReturn(true);
        WorkoutSheetResponse sheet = new WorkoutSheetResponse(sheetId, UUID.randomUUID(), trainerId,
                "Treino A", "MONDAY", "Segunda-feira", true, LocalDateTime.now());
        WorkoutSheetSnapshot snapshot = new WorkoutSheetSnapshot(sheet, List.of());
        when(workoutRepository.findByIdForUpdate(sheetId)).thenReturn(Optional.of(sheet));
        when(workoutRepository.snapshot(sheet)).thenReturn(snapshot);
        when(exerciseRepository.findWorkoutSheetAssignedPersonalTrainerId(sheetId))
                .thenReturn(Optional.of(trainerId));
        when(exerciseRepository.save(any(WorkoutExerciseRecord.class)))
                .thenAnswer(invocation -> invocation.getArgument(0));
        UUID catalogId = UUID.randomUUID();
        when(catalogRepository.findByIdForShare(catalogId)).thenReturn(Optional.of(new ExerciseCatalog(
                catalogId, "Agachamento", "Pernas", "Pernas", null, "Instruções", false, null, true, LocalDateTime.now())));

        service.create(email, new WorkoutExerciseCreateRequest(sheetId, "Agachamento", "Pernas", null,
                null, null, null, 3, 12, 60, null, catalogId));

        InOrder order = inOrder(exerciseRepository, historyRepository);
        order.verify(historyRepository).recordSnapshot(eq(snapshot), any(User.class), eq("Exercício adicionado: Agachamento"));
        order.verify(exerciseRepository).save(any(WorkoutExerciseRecord.class));
        verify(workoutRepository).incrementVersion(sheetId);
        assertThat(WorkoutExerciseService.class.getMethod("create", String.class, WorkoutExerciseCreateRequest.class)
                .isAnnotationPresent(Transactional.class)).isTrue();
    }
}
