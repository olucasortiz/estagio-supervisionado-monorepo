package com.lionfitness.backend.exercisecatalog;

import com.lionfitness.backend.personaltrainer.model.PersonalTrainer;
import com.lionfitness.backend.personaltrainer.repository.PersonalTrainerRepository;
import com.lionfitness.backend.user.model.User;
import com.lionfitness.backend.user.repository.UserRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

import java.util.List;
import java.util.UUID;

/**
 * Serviço do catálogo interno de exercícios.
 * Substitui o ExerciseCatalogService anterior que consultava a API Ninjas externa.
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

    public List<ExerciseCatalogResponse> findAll(String name, String category, String muscle) {
        return exerciseCatalogRepository.findAll(name, category, muscle)
                .stream()
                .map(this::toResponse)
                .toList();
    }

    public ExerciseCatalogResponse create(String authenticatedEmail, ExerciseCatalogCreateRequest request) {
        // Resolver o usuário autenticado
        User user = userRepository.findByEmail(authenticatedEmail)
                .orElseThrow(() -> new ResponseStatusException(
                        HttpStatus.NOT_FOUND, "Usuário autenticado não encontrado."));

        boolean isAdmin = "ADMIN".equalsIgnoreCase(user.role());
        UUID personalTrainerId = null;

        if (!isAdmin) {
            PersonalTrainer pt = personalTrainerRepository.findActiveByUserId(user.id())
                    .orElseThrow(() -> new ResponseStatusException(
                            HttpStatus.NOT_FOUND, "Personal trainer autenticado não encontrado."));
            personalTrainerId = pt.id();
        }

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

        return toResponse(saved);
    }

    private ExerciseCatalogResponse toResponse(ExerciseCatalog ex) {
        return new ExerciseCatalogResponse(
                ex.id(),
                ex.name(),
                ex.category(),
                ex.muscle(),
                ex.equipment(),
                ex.instructions(),
                ex.isCustom(),
                ex.createdByPersonalTrainerId()
        );
    }
}
