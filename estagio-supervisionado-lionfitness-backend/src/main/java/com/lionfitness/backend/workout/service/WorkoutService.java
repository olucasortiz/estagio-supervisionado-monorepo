package com.lionfitness.backend.workout.service;

import com.lionfitness.backend.member.repository.MemberRepository;
import com.lionfitness.backend.personaltrainer.model.PersonalTrainer;
import com.lionfitness.backend.personaltrainer.repository.PersonalTrainerRepository;
import com.lionfitness.backend.workout.dto.WorkoutSheetCreateRequest;
import com.lionfitness.backend.workout.dto.WorkoutSheetResponse;
import com.lionfitness.backend.user.model.User;
import com.lionfitness.backend.user.repository.UserRepository;
import com.lionfitness.backend.workout.dto.WorkoutRequestDTO;
import com.lionfitness.backend.workout.dto.WorkoutResponse;
import com.lionfitness.backend.workout.exception.WorkoutNotFoundException;
import com.lionfitness.backend.workout.model.WorkoutExercise;
import com.lionfitness.backend.workout.model.WorkoutSheet;
import com.lionfitness.backend.workout.model.WorkoutWeekDay;
import com.lionfitness.backend.workout.repository.WorkoutRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

import java.util.List;
import java.util.UUID;

@Service
public class WorkoutService {

    private static final Logger logger = LoggerFactory.getLogger(WorkoutService.class);

    private final WorkoutRepository workoutRepository;
    private final UserRepository userRepository;
    private final MemberRepository memberRepository;
    private final PersonalTrainerRepository personalTrainerRepository;

    public WorkoutService(
            WorkoutRepository workoutRepository,
            UserRepository userRepository,
            MemberRepository memberRepository,
            PersonalTrainerRepository personalTrainerRepository
    ) {
        this.workoutRepository = workoutRepository;
        this.userRepository = userRepository;
        this.memberRepository = memberRepository;
        this.personalTrainerRepository = personalTrainerRepository;
    }

    public List<WorkoutResponse> findMyActiveWorkout(String email) {
        logger.info("Loading student workout for authenticated email {}", email);

        User user = userRepository.findByEmail(email)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "User not found: " + email));

        memberRepository.findByUserId(user.id())
                .orElseThrow(() -> new WorkoutNotFoundException(email));

        return workoutRepository.findActiveWorkoutsByUserId(user.id());
    }
    public void createNewWorkout(WorkoutRequestDTO request) {
        // Cria o objeto da ficha
        WorkoutSheet newSheet = new WorkoutSheet(
                UUID.randomUUID(),
                request.memberId(),
                request.personalTrainerId(),
                request.goal(),
                null,
                true
        );

        // Converte os DTOs de exercícios para o Model
        List<WorkoutExercise> exercises = request.exercises().stream()
                .map(e -> new WorkoutExercise(
                        null,
                        null,
                        e.exerciseName(),
                        null,
                        null,
                        null,
                        null,
                        null,
                        e.sets(),
                        e.reps(),
                        null,
                        e.notes(),
                        null
                ))
                .toList();

        workoutRepository.saveFullWorkout(newSheet, exercises, request.changeReason());
    }

    public WorkoutSheetResponse createWorkoutSheet(String authenticatedEmail, WorkoutSheetCreateRequest request) {
        AccessContext accessContext = resolveAccessContext(authenticatedEmail);

        validateMemberAccess(request.memberId(), accessContext);

        UUID personalTrainerId = accessContext.admin()
                ? workoutRepository.findAssignedPersonalTrainerIdByMemberId(request.memberId())
                        .orElseThrow(() -> new ResponseStatusException(
                                HttpStatus.BAD_REQUEST,
                                "O aluno informado nao possui personal trainer vinculado."
                        ))
                : accessContext.personalTrainerId();

        return workoutRepository.createWorkoutSheet(
                request.memberId(),
                personalTrainerId,
                request.title().trim(),
                WorkoutWeekDay.normalizeRequired(request.weekDay())
        );
    }

    public List<WorkoutSheetResponse> findWorkoutSheetsByMember(String authenticatedEmail, UUID memberId) {
        AccessContext accessContext = resolveAccessContext(authenticatedEmail);

        validateMemberAccess(memberId, accessContext);

        return workoutRepository.findByMemberId(memberId);
    }

    public void deactivateWorkoutSheet(String authenticatedEmail, UUID workoutSheetId) {
        AccessContext accessContext = resolveAccessContext(authenticatedEmail);

        UUID memberId = workoutRepository.findMemberIdByWorkoutSheetId(workoutSheetId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Ficha de treino nao encontrada."));

        validateMemberAccess(memberId, accessContext);

        if (!workoutRepository.deactivateWorkoutSheet(workoutSheetId)) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Ficha de treino nao encontrada.");
        }
    }

    private void validateMemberAccess(UUID memberId, AccessContext accessContext) {
        if (accessContext.admin()) {
            return;
        }

        if (!workoutRepository.memberBelongsToPersonalTrainer(memberId, accessContext.personalTrainerId())) {
            throw new ResponseStatusException(
                    HttpStatus.FORBIDDEN,
                    "Voce so pode gerenciar treinos dos seus proprios alunos."
            );
        }
    }

    private AccessContext resolveAccessContext(String authenticatedEmail) {
        User user = userRepository.findByEmail(authenticatedEmail)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "User not found: " + authenticatedEmail));

        boolean isAdmin = "ADMIN".equalsIgnoreCase(user.role());
        if (isAdmin) {
            return new AccessContext(user, null, true);
        }

        PersonalTrainer personalTrainer = personalTrainerRepository.findActiveByUserId(user.id())
                .orElseThrow(() -> new ResponseStatusException(
                        HttpStatus.NOT_FOUND,
                        "Personal trainer autenticado nao encontrado."
                ));

        return new AccessContext(user, personalTrainer.id(), false);
    }

    private record AccessContext(User user, UUID personalTrainerId, boolean admin) {
    }
}
