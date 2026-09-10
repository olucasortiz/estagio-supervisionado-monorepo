package com.lionfitness.backend.workoutexercise.service;

import com.lionfitness.backend.personaltrainer.model.PersonalTrainer;
import com.lionfitness.backend.personaltrainer.repository.PersonalTrainerRepository;
import com.lionfitness.backend.user.model.User;
import com.lionfitness.backend.user.repository.UserRepository;
import com.lionfitness.backend.workoutexercise.dto.WorkoutExerciseCreateRequest;
import com.lionfitness.backend.workoutexercise.dto.WorkoutExerciseResponse;
import com.lionfitness.backend.workoutexercise.model.WorkoutExerciseRecord;
import com.lionfitness.backend.workoutexercise.repository.WorkoutExerciseRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.util.StringUtils;
import org.springframework.web.server.ResponseStatusException;

import java.util.List;
import java.util.Objects;
import java.util.UUID;

@Service
public class WorkoutExerciseService {

    private static final Logger logger = LoggerFactory.getLogger(WorkoutExerciseService.class);

    private final WorkoutExerciseRepository workoutExerciseRepository;
    private final UserRepository userRepository;
    private final PersonalTrainerRepository personalTrainerRepository;

    public WorkoutExerciseService(
            WorkoutExerciseRepository workoutExerciseRepository,
            UserRepository userRepository,
            PersonalTrainerRepository personalTrainerRepository
    ) {
        this.workoutExerciseRepository = workoutExerciseRepository;
        this.userRepository = userRepository;
        this.personalTrainerRepository = personalTrainerRepository;
    }

    public WorkoutExerciseResponse create(String authenticatedEmail, WorkoutExerciseCreateRequest request) {
        AccessContext accessContext = resolveAccessContext(authenticatedEmail);

        validateWorkoutSheetAccess(accessContext, request.workoutSheetId());

        WorkoutExerciseRecord savedExercise = workoutExerciseRepository.save(
                new WorkoutExerciseRecord(
                        UUID.randomUUID(),
                        request.workoutSheetId(),
                        request.externalName().trim(),
                        normalize(request.muscle()),
                        normalize(request.exerciseType()),
                        normalize(request.equipment()),
                        normalize(request.difficulty()),
                        normalize(request.instructions()),
                        request.sets(),
                        request.reps(),
                        request.restSeconds(),
                        normalize(request.notes())
                )
        );

        logger.info(
                "Exercise {} added to workout sheet {} by personal trainer {}",
                savedExercise.id(),
                savedExercise.workoutSheetId(),
                accessContext.personalTrainerId()
        );

        return new WorkoutExerciseResponse(
                savedExercise.id(),
                savedExercise.workoutSheetId(),
                savedExercise.exerciseName(),
                savedExercise.muscle(),
                savedExercise.exerciseType(),
                savedExercise.equipment(),
                savedExercise.difficulty(),
                savedExercise.instructions(),
                savedExercise.sets(),
                savedExercise.reps(),
                savedExercise.restSeconds(),
                savedExercise.notes()
        );
    }

    public List<WorkoutExerciseResponse> findByWorkoutSheetId(String authenticatedEmail, UUID workoutSheetId) {
        AccessContext accessContext = resolveAccessContext(authenticatedEmail);
        validateWorkoutSheetAccess(accessContext, workoutSheetId);
        return workoutExerciseRepository.findByWorkoutSheetId(workoutSheetId);
    }

    private AccessContext resolveAccessContext(String authenticatedEmail) {
        User user = userRepository.findByEmail(authenticatedEmail)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Usuario autenticado nao encontrado."));

        boolean isAdmin = "ADMIN".equalsIgnoreCase(user.role());
        if (isAdmin) {
            return new AccessContext(user, null, true);
        }

        PersonalTrainer personalTrainer = personalTrainerRepository.findActiveByUserId(user.id())
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Personal trainer autenticado nao encontrado."));

        return new AccessContext(user, personalTrainer.id(), false);
    }

    private void validateWorkoutSheetAccess(AccessContext accessContext, UUID workoutSheetId) {
        if (!workoutExerciseRepository.workoutSheetExists(workoutSheetId)) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Ficha de treino nao encontrada.");
        }

        if (accessContext.admin()) {
            return;
        }

        UUID ownerId = workoutExerciseRepository.findWorkoutSheetAssignedPersonalTrainerId(workoutSheetId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.FORBIDDEN, "Ficha de treino sem personal responsavel."));

        if (!Objects.equals(ownerId, accessContext.personalTrainerId())) {
            logger.warn(
                    "Personal trainer {} tried to modify workout sheet {} owned by {}",
                    accessContext.personalTrainerId(),
                    workoutSheetId,
                    ownerId
            );
            throw new ResponseStatusException(
                    HttpStatus.FORBIDDEN,
                    "Voce so pode alterar treinos dos seus proprios alunos."
            );
        }
    }

    private String normalize(String value) {
        return StringUtils.hasText(value) ? value.trim() : null;
    }

    private record AccessContext(User user, UUID personalTrainerId, boolean admin) {
    }
}
