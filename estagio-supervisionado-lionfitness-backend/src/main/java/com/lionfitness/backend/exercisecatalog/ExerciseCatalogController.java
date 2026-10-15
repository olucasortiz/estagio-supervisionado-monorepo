package com.lionfitness.backend.exercisecatalog;

import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.http.converter.HttpMessageNotReadableException;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;
import java.util.Map;
import java.util.UUID;

@RestController
@RequestMapping("/exercise-catalog")
public class ExerciseCatalogController {

    private final ExerciseCatalogService exerciseCatalogService;

    public ExerciseCatalogController(ExerciseCatalogService exerciseCatalogService) {
        this.exerciseCatalogService = exerciseCatalogService;
    }

    /**
     * Busca exercícios do catálogo interno com filtros opcionais.
     */
    @GetMapping
    @PreAuthorize("hasAnyRole('PERSONAL_TRAINER', 'ADMIN')")
    public ResponseEntity<List<ExerciseCatalogResponse>> findAll(
            Authentication authentication,
            @RequestParam(required = false) String name,
            @RequestParam(required = false) String category,
            @RequestParam(required = false) String muscle,
            @RequestParam(required = false) String equipment,
            @RequestParam(defaultValue = "false") boolean includeInactive
    ) {
        return ResponseEntity.ok(exerciseCatalogService.findAll(
                authentication.getName(), name, category, muscle, equipment, includeInactive));
    }

    @PatchMapping("/{id}/status")
    @PreAuthorize("hasAnyRole('PERSONAL_TRAINER', 'ADMIN')")
    public ResponseEntity<ExerciseCatalogResponse> updateStatus(
            Authentication authentication, @PathVariable UUID id,
            @Valid @RequestBody ExerciseCatalogStatusRequest request) {
        return ResponseEntity.ok(exerciseCatalogService.updateStatus(authentication.getName(), id, request));
    }

    @ExceptionHandler(HttpMessageNotReadableException.class)
    public ResponseEntity<Map<String, String>> invalidPayload() {
        return ResponseEntity.badRequest().body(Map.of("message", "Payload inválido. Verifique os tipos dos campos."));
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
