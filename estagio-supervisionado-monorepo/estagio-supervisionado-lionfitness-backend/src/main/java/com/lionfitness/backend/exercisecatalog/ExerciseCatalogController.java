package com.lionfitness.backend.exercisecatalog;

import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("/exercise-catalog")
public class ExerciseCatalogController {

    private final ExerciseCatalogService exerciseCatalogService;

    public ExerciseCatalogController(ExerciseCatalogService exerciseCatalogService) {
        this.exerciseCatalogService = exerciseCatalogService;
    }

    /**
     * Busca exercícios do catálogo interno com filtros opcionais.
     * Substitui o endpoint anterior /exercise-catalog/search que consultava a API Ninjas.
     */
    @GetMapping
    @PreAuthorize("hasAnyRole('PERSONAL_TRAINER', 'ADMIN')")
    public ResponseEntity<List<ExerciseCatalogResponse>> findAll(
            @RequestParam(required = false) String name,
            @RequestParam(required = false) String category,
            @RequestParam(required = false) String muscle
    ) {
        return ResponseEntity.ok(exerciseCatalogService.findAll(name, category, muscle));
    }

    /**
     * Cria um exercício personalizado no catálogo.
     * Se o usuário autenticado for PERSONAL_TRAINER, o exercício é vinculado a ele.
     * Se for ADMIN, created_by_personal_trainer_id fica null.
     */
    @PostMapping
    @PreAuthorize("hasAnyRole('PERSONAL_TRAINER', 'ADMIN')")
    public ResponseEntity<ExerciseCatalogResponse> create(
            Authentication authentication,
            @Valid @RequestBody ExerciseCatalogCreateRequest request
    ) {
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(exerciseCatalogService.create(authentication.getName(), request));
    }
}
