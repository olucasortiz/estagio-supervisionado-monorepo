package com.lionfitness.backend.exercisecatalog;

import com.lionfitness.backend.personaltrainer.model.PersonalTrainer;
import com.lionfitness.backend.personaltrainer.repository.PersonalTrainerRepository;
import com.lionfitness.backend.user.model.User;
import com.lionfitness.backend.user.repository.UserRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.util.List;
import java.util.Objects;
import java.util.UUID;

/**
 * Serviço do catálogo interno de exercícios.
 * Todos os exercícios agora são servidos do banco de dados, em português.
 */
@Service
public class ExerciseCatalogService {

    private static final Logger logger = LoggerFactory.getLogger(ExerciseCatalogService.class);

    private final ExerciseCatalogRepository exerciseCatalogRepository;
    private final UserRepository userRepository;
    private final PersonalTrainerRepository personalTrainerRepository;

    public ExerciseCatalogService(
            ExerciseCatalogRepository exerciseCatalogRepository,
            UserRepository userRepository,
            PersonalTrainerRepository personalTrainerRepository
    ) {
        this.exerciseCatalogRepository = exerciseCatalogRepository;
        this.userRepository = userRepository;
        this.personalTrainerRepository = personalTrainerRepository;
    }

    public List<ExerciseCatalogResponse> findAll(String authenticatedEmail, String name, String category,
                                                 String muscle, String equipment, boolean includeInactive) {
        AccessContext context = resolveAccessContext(authenticatedEmail);
        return exerciseCatalogRepository.findAll(name, category, muscle, equipment, includeInactive,
                        context.personalTrainerId())
                .stream()
                .map(exercise -> toResponse(exercise, context))
                .toList();
    }

    @Transactional
    public ExerciseCatalogResponse updateStatus(String authenticatedEmail, UUID id,
                                                 ExerciseCatalogStatusRequest request) {
        AccessContext context = resolveAccessContext(authenticatedEmail);
        ExerciseCatalog exercise = exerciseCatalogRepository.findById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Exercício não encontrado."));
        if (!canManage(exercise, context)) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN,
                    "Você só pode gerenciar exercícios personalizados de sua autoria.");
        }
        if (!exerciseCatalogRepository.updateActiveStatus(id, request.isActive())) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Exercício não encontrado.");
        }
        return toResponse(new ExerciseCatalog(exercise.id(), exercise.name(), exercise.category(), exercise.muscle(),
                exercise.equipment(), exercise.instructions(), exercise.isCustom(), exercise.createdByPersonalTrainerId(),
                request.isActive(), exercise.createdAt()), context);
    }

    public ExerciseCatalogResponse create(String authenticatedEmail, ExerciseCatalogCreateRequest request) {
        AccessContext context = resolveAccessContext(authenticatedEmail);
        UUID personalTrainerId = context.personalTrainerId();

        // Impedir duplicata de exercício padrão com mesmo nome + categoria
        // (exercícios personalizados com o mesmo nome são permitidos)
        if (exerciseCatalogRepository.existsStandardByNameAndCategory(
                request.name().trim(), request.category().trim())) {
            throw new ResponseStatusException(
                    HttpStatus.CONFLICT,
                    "Já existe um exercício padrão com este nome e categoria. Você pode adicioná-lo ao treino diretamente pelo catálogo."
            );
        }

        ExerciseCatalog saved = exerciseCatalogRepository.save(UUID.randomUUID(), request, personalTrainerId);

        logger.info("Custom exercise '{}' created by {} (personalTrainerId={})",
                saved.name(), authenticatedEmail, personalTrainerId);

        return toResponse(saved, context);
    }

    private AccessContext resolveAccessContext(String authenticatedEmail) {
        User user = userRepository.findByEmail(authenticatedEmail)
                .orElseThrow(() -> new ResponseStatusException(
                        HttpStatus.NOT_FOUND, "Usuário autenticado não encontrado."));

        if (!user.active()) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Usuário inativo.");
        }
        if ("ADMIN".equalsIgnoreCase(user.role())) return new AccessContext(true, null);
        if ("PERSONAL_TRAINER".equalsIgnoreCase(user.role())) {
            PersonalTrainer pt = personalTrainerRepository.findActiveByUserId(user.id())
                    .orElseThrow(() -> new ResponseStatusException(
                            HttpStatus.NOT_FOUND, "Personal trainer autenticado não encontrado."));
            return new AccessContext(false, pt.id());
        }
        throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Acesso negado ao catálogo.");
    }

    private boolean canManage(ExerciseCatalog exercise, AccessContext context) {
        return context.admin() || (exercise.isCustom() && context.personalTrainerId() != null
                && Objects.equals(context.personalTrainerId(), exercise.createdByPersonalTrainerId()));
    }

    private record AccessContext(boolean admin, UUID personalTrainerId) {}

    private ExerciseCatalogResponse toResponse(ExerciseCatalog ex, AccessContext context) {
        return new ExerciseCatalogResponse(
                ex.id(),
                ex.name(),
                ex.category(),
                ex.muscle(),
                ex.equipment(),
                ex.instructions(),
                ex.isCustom(),
                ex.createdByPersonalTrainerId(),
                ex.isActive(),
                canManage(ex, context)
        );
    }
}
