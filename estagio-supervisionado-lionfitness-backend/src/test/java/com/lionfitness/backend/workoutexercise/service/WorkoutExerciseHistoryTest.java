package com.lionfitness.backend.workoutexercise.service;

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

    private WorkoutExerciseService service;
    private final UUID sheetId = UUID.randomUUID();
    private final UUID trainerId = UUID.randomUUID();
    private final String email = "trainer@example.com";

    @BeforeEach
    void setUp() {
        service = new WorkoutExerciseService(exerciseRepository, historyRepository,
                userRepository, trainerRepository);
    }

    @Test
    void addingExerciseToCurrentSheetRecordsHistoryInSameTransaction() throws Exception {
        UUID userId = UUID.randomUUID();
        when(userRepository.findByEmail(email)).thenReturn(Optional.of(new User(userId, "Trainer", email,
                "", "PERSONAL_TRAINER", true, LocalDateTime.now(), false)));
        when(trainerRepository.findActiveByUserId(userId)).thenReturn(Optional.of(new PersonalTrainer(
                trainerId, userId, "Trainer", "", email, "", "", true, LocalDateTime.now(), null)));
        when(exerciseRepository.workoutSheetExists(sheetId)).thenReturn(true);
        when(exerciseRepository.findWorkoutSheetAssignedPersonalTrainerId(sheetId))
                .thenReturn(Optional.of(trainerId));
        when(exerciseRepository.save(any(WorkoutExerciseRecord.class)))
                .thenAnswer(invocation -> invocation.getArgument(0));

        service.create(email, new WorkoutExerciseCreateRequest(sheetId, "Agachamento", "Pernas", null,
                null, null, null, 3, 12, 60, null));

        InOrder order = inOrder(exerciseRepository, historyRepository);
        order.verify(exerciseRepository).save(any(WorkoutExerciseRecord.class));
        order.verify(historyRepository).recordChange(sheetId, "Exercício adicionado: Agachamento");
        assertThat(WorkoutExerciseService.class.getMethod("create", String.class, WorkoutExerciseCreateRequest.class)
                .isAnnotationPresent(Transactional.class)).isTrue();
    }
}
