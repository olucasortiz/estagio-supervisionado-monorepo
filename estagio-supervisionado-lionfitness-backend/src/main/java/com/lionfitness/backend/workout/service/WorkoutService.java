package com.lionfitness.backend.workout.service;

import com.lionfitness.backend.member.repository.MemberRepository;
import com.lionfitness.backend.personaltrainer.model.PersonalTrainer;
import com.lionfitness.backend.personaltrainer.repository.PersonalTrainerRepository;
import com.lionfitness.backend.workout.dto.WorkoutSheetCreateRequest;
import com.lionfitness.backend.workout.dto.WorkoutSheetResponse;
import com.lionfitness.backend.workout.dto.WorkoutSheetHistoryResponse;
import com.lionfitness.backend.workout.dto.WorkoutSheetSnapshot;
import com.lionfitness.backend.workout.dto.WorkoutSheetUpdateRequest;
import com.lionfitness.backend.workout.model.WorkoutExercise;
import com.lionfitness.backend.workoutexercise.model.WorkoutExerciseRecord;
import com.lionfitness.backend.workoutexercise.repository.WorkoutExerciseRepository;
import com.lionfitness.backend.exercisecatalog.ExerciseCatalog;
import com.lionfitness.backend.exercisecatalog.ExerciseCatalogRepository;
import com.lionfitness.backend.user.model.User;
import com.lionfitness.backend.user.repository.UserRepository;
import com.lionfitness.backend.workout.dto.WorkoutResponse;
import com.lionfitness.backend.workout.exception.WorkoutNotFoundException;
import com.lionfitness.backend.workout.model.WorkoutWeekDay;
import com.lionfitness.backend.workout.repository.WorkoutRepository;
import com.lionfitness.backend.workout.repository.WorkoutSheetHistoryRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.util.List;
import java.util.UUID;
import java.util.ArrayList;
import java.util.HashSet;
import java.util.Map;
import java.util.function.Function;
import java.util.stream.Collectors;

@Service
public class WorkoutService {

    private static final Logger logger = LoggerFactory.getLogger(WorkoutService.class);

    private final WorkoutRepository workoutRepository;
    private final WorkoutSheetHistoryRepository historyRepository;
    private final UserRepository userRepository;
    private final MemberRepository memberRepository;
    private final PersonalTrainerRepository personalTrainerRepository;
    private final WorkoutExerciseRepository exerciseRepository;
    private final ExerciseCatalogRepository catalogRepository;

    public WorkoutService(
            WorkoutRepository workoutRepository,
            WorkoutSheetHistoryRepository historyRepository,
            UserRepository userRepository,
            MemberRepository memberRepository,
            PersonalTrainerRepository personalTrainerRepository,
            WorkoutExerciseRepository exerciseRepository,
            ExerciseCatalogRepository catalogRepository
    ) {
        this.workoutRepository = workoutRepository;
        this.historyRepository = historyRepository;
        this.userRepository = userRepository;
        this.memberRepository = memberRepository;
        this.personalTrainerRepository = personalTrainerRepository;
        this.exerciseRepository = exerciseRepository;
        this.catalogRepository = catalogRepository;
    }

    @Transactional
    public WorkoutSheetSnapshot findWorkoutSheet(String email, UUID id) {
        AccessContext context = resolveAccessContext(email);
        WorkoutSheetResponse sheet = workoutRepository.findByIdForShare(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Ficha de treino não encontrada."));
        validateMemberAccess(sheet.memberId(), context);
        return workoutRepository.snapshot(sheet);
    }

    @Transactional
    public WorkoutSheetSnapshot updateWorkoutSheet(String email, UUID id, WorkoutSheetUpdateRequest request) {
        AccessContext context = resolveAccessContext(email);
        WorkoutSheetResponse sheet = workoutRepository.findByIdForUpdate(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Ficha de treino não encontrada."));
        validateMemberAccess(sheet.memberId(), context);
        if (!sheet.active()) throw new ResponseStatusException(HttpStatus.CONFLICT, "Ficha inativa não pode ser editada.");
        if (request.version() != sheet.version()) {
            throw new ResponseStatusException(HttpStatus.CONFLICT,
                    "A ficha foi alterada por outro usuário. Reabra a edição para carregar a versão atual.");
        }

        WorkoutSheetSnapshot previous = workoutRepository.snapshot(sheet);
        Map<UUID, WorkoutExercise> existing = previous.exercises().stream()
                .collect(Collectors.toMap(WorkoutExercise::id, Function.identity()));
        Map<UUID, ExerciseCatalog> sources = request.exercises().stream()
                .map(WorkoutSheetUpdateRequest.ExerciseUpdate::catalogExerciseId).filter(java.util.Objects::nonNull)
                .distinct().sorted().collect(Collectors.toMap(Function.identity(), sourceId -> {
                    ExerciseCatalog source = catalogRepository.findByIdForShare(sourceId)
                            .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Exercício do catálogo não encontrado."));
                    if (!source.isActive()) throw new ResponseStatusException(HttpStatus.CONFLICT, "Novas inclusões exigem exercícios ativos no catálogo.");
                    return source;
                }));

        List<WorkoutExerciseRecord> updatedExercises = new ArrayList<>();
        HashSet<UUID> retained = new HashSet<>();
        for (WorkoutSheetUpdateRequest.ExerciseUpdate input : request.exercises()) {
            if (input.id() != null) {
                WorkoutExercise old = existing.get(input.id());
                if (old == null || !retained.add(input.id())) {
                    throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Exercício existente inválido ou repetido para esta ficha.");
                }
                updatedExercises.add(new WorkoutExerciseRecord(old.id(), id, old.exerciseName(), old.muscle(),
                        old.exerciseType(), old.equipment(), old.difficulty(),
                        input.instructions() == null ? old.instructions() : input.instructions().trim(),
                        input.sets(), input.reps(), input.restSeconds(), input.notes() == null ? old.notes() : input.notes().trim()));
            } else {
                ExerciseCatalog source = sources.get(input.catalogExerciseId());
                if (source == null) throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Exercício do catálogo é obrigatório.");
                updatedExercises.add(new WorkoutExerciseRecord(UUID.randomUUID(), id, source.name(), source.muscle(),
                        source.category(), source.equipment(), null,
                        input.instructions() == null ? source.instructions() : input.instructions().trim(),
                        input.sets(), input.reps(), input.restSeconds(), input.notes() == null ? null : input.notes().trim()));
            }
        }

        String weekDay = WorkoutWeekDay.normalizeRequired(request.weekDay());
        historyRepository.recordSnapshot(previous, context.user(), request.changeReason().trim());
        if (!workoutRepository.updateSheet(id, request.title().trim(), weekDay, sheet.version())) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "A ficha foi alterada. Reabra a edição.");
        }
        exerciseRepository.deactivateBySheet(id);
        for (int index = 0; index < updatedExercises.size(); index++) {
            WorkoutExerciseRecord exercise = updatedExercises.get(index);
            if (retained.contains(exercise.id())) exerciseRepository.updateExisting(exercise, index);
            else exerciseRepository.save(exercise, index);
        }
        return workoutRepository.snapshot(new WorkoutSheetResponse(sheet.id(), sheet.memberId(), sheet.personalTrainerId(),
                request.title().trim(), weekDay, WorkoutWeekDay.labelFor(weekDay), true, sheet.createdAt(), sheet.version() + 1));
    }

    public List<WorkoutResponse> findMyActiveWorkout(String email) {
        logger.info("Loading student workout for authenticated email {}", email);

        User user = userRepository.findByEmail(email)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "User not found: " + email));

        memberRepository.findByUserId(user.id())
                .orElseThrow(() -> new WorkoutNotFoundException(email));

        return workoutRepository.findActiveWorkoutsByUserId(user.id());
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

    public com.lionfitness.backend.common.api.PagedResponse<WorkoutSheetResponse> findWorkoutSheetsByMemberPaged(
            String authenticatedEmail, UUID memberId, int page, int size
    ) {
        AccessContext accessContext = resolveAccessContext(authenticatedEmail);
        validateMemberAccess(memberId, accessContext);

        long total = workoutRepository.countByMemberId(memberId);
        int offset = com.lionfitness.backend.common.api.PaginationUtils.calculateOffset(page, size);
        List<WorkoutSheetResponse> items = workoutRepository.findByMemberIdPaged(memberId, size, offset);
        return com.lionfitness.backend.common.api.PagedResponse.of(items, page, size, total);
    }

    public List<WorkoutSheetResponse> findAllWorkoutSheets(String authenticatedEmail) {
        AccessContext accessContext = resolveAccessContext(authenticatedEmail);
        if (!accessContext.admin() && accessContext.personalTrainerId() == null) {
            throw new org.springframework.web.server.ResponseStatusException(org.springframework.http.HttpStatus.FORBIDDEN, "Acesso não autorizado.");
        }
        return workoutRepository.findAllActive();
    }

    public com.lionfitness.backend.common.api.PagedResponse<WorkoutSheetResponse> findAllWorkoutSheetsPaged(
            String authenticatedEmail, int page, int size
    ) {
        AccessContext accessContext = resolveAccessContext(authenticatedEmail);
        if (!accessContext.admin() && accessContext.personalTrainerId() == null) {
            throw new org.springframework.web.server.ResponseStatusException(org.springframework.http.HttpStatus.FORBIDDEN, "Acesso não autorizado.");
        }
        long total = workoutRepository.countAllActive();
        int offset = com.lionfitness.backend.common.api.PaginationUtils.calculateOffset(page, size);
        List<WorkoutSheetResponse> items = workoutRepository.findAllActivePaged(size, offset);
        return com.lionfitness.backend.common.api.PagedResponse.of(items, page, size, total);
    }

    @Transactional
    public void deactivateWorkoutSheet(String authenticatedEmail, UUID workoutSheetId) {
        AccessContext accessContext = resolveAccessContext(authenticatedEmail);

        WorkoutSheetResponse sheet = workoutRepository.findByIdForUpdate(workoutSheetId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Ficha de treino nao encontrada."));

        validateMemberAccess(sheet.memberId(), accessContext);

        if (!sheet.active()) throw new ResponseStatusException(HttpStatus.CONFLICT, "Ficha já inativa.");
        historyRepository.recordSnapshot(workoutRepository.snapshot(sheet), accessContext.user(), "Ficha inativada.");

        if (!workoutRepository.deactivateWorkoutSheet(workoutSheetId)) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Ficha de treino nao encontrada.");
        }
    }

    public List<WorkoutSheetHistoryResponse> findWorkoutSheetHistory(String authenticatedEmail, UUID workoutSheetId) {
        AccessContext accessContext = resolveAccessContext(authenticatedEmail);
        UUID memberId = workoutRepository.findMemberIdByWorkoutSheetId(workoutSheetId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Ficha de treino nao encontrada."));
        validateMemberAccess(memberId, accessContext);
        return historyRepository.findByWorkoutSheetId(workoutSheetId);
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

        if (!user.active() || (!"ADMIN".equalsIgnoreCase(user.role()) && !"PERSONAL_TRAINER".equalsIgnoreCase(user.role()))) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Acesso negado à gestão de fichas.");
        }

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
