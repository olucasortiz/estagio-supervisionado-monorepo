package com.lionfitness.backend.workout.controller;

import com.lionfitness.backend.workout.dto.WorkoutSheetCreateRequest;
import com.lionfitness.backend.workout.dto.WorkoutSheetResponse;
import com.lionfitness.backend.workout.dto.WorkoutSheetHistoryResponse;
import com.lionfitness.backend.workout.dto.WorkoutSheetSnapshot;
import com.lionfitness.backend.workout.dto.WorkoutSheetUpdateRequest;
import com.lionfitness.backend.workout.service.WorkoutService;
import jakarta.validation.Valid;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.http.converter.HttpMessageNotReadableException;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.net.URI;
import java.util.List;
import java.util.UUID;
import java.util.Map;

@RestController
@RequestMapping("/workout-sheets")
public class WorkoutSheetController {

    private final WorkoutService workoutService;

    public WorkoutSheetController(WorkoutService workoutService) {
        this.workoutService = workoutService;
    }

    @PostMapping
    @PreAuthorize("hasAnyRole('PERSONAL_TRAINER', 'ADMIN')")
    public ResponseEntity<WorkoutSheetResponse> create(
            Authentication authentication,
            @Valid @RequestBody WorkoutSheetCreateRequest request
    ) {
        WorkoutSheetResponse response = workoutService.createWorkoutSheet(authentication.getName(), request);
        return ResponseEntity
                .created(URI.create("/workout-sheets/" + response.id()))
                .body(response);
    }

    @GetMapping
    @PreAuthorize("hasAnyRole('PERSONAL_TRAINER', 'ADMIN')")
    public ResponseEntity<?> findAll(
            Authentication authentication,
            @org.springframework.web.bind.annotation.RequestParam(required = false) Integer page,
            @org.springframework.web.bind.annotation.RequestParam(required = false) Integer size
    ) {
        if (page == null && size == null) {
            return ResponseEntity.ok(workoutService.findAllWorkoutSheets(authentication.getName()));
        }

        int validPage = com.lionfitness.backend.common.api.PaginationUtils.validateAndGetPage(page);
        int validSize = com.lionfitness.backend.common.api.PaginationUtils.validateAndGetSize(size);
        return ResponseEntity.ok(workoutService.findAllWorkoutSheetsPaged(authentication.getName(), validPage, validSize));
    }

    @GetMapping("/member/{memberId}")
    @PreAuthorize("hasAnyRole('PERSONAL_TRAINER', 'ADMIN')")
    public ResponseEntity<?> findByMemberId(
            Authentication authentication,
            @PathVariable UUID memberId,
            @org.springframework.web.bind.annotation.RequestParam(required = false) Integer page,
            @org.springframework.web.bind.annotation.RequestParam(required = false) Integer size
    ) {
        if (page == null && size == null) {
            return ResponseEntity.ok(workoutService.findWorkoutSheetsByMember(authentication.getName(), memberId));
        }

        int validPage = com.lionfitness.backend.common.api.PaginationUtils.validateAndGetPage(page);
        int validSize = com.lionfitness.backend.common.api.PaginationUtils.validateAndGetSize(size);
        return ResponseEntity.ok(workoutService.findWorkoutSheetsByMemberPaged(authentication.getName(), memberId, validPage, validSize));
    }

    @GetMapping("/{id}")
    @PreAuthorize("hasAnyRole('PERSONAL_TRAINER', 'ADMIN')")
    public ResponseEntity<WorkoutSheetSnapshot> detail(Authentication authentication, @PathVariable UUID id) {
        return ResponseEntity.ok(workoutService.findWorkoutSheet(authentication.getName(), id));
    }

    @PutMapping("/{id}")
    @PreAuthorize("hasAnyRole('PERSONAL_TRAINER', 'ADMIN')")
    public ResponseEntity<WorkoutSheetSnapshot> update(Authentication authentication, @PathVariable UUID id,
                                                     @Valid @RequestBody WorkoutSheetUpdateRequest request) {
        return ResponseEntity.ok(workoutService.updateWorkoutSheet(authentication.getName(), id, request));
    }

    @ExceptionHandler(HttpMessageNotReadableException.class)
    public ResponseEntity<Map<String, String>> invalidPayload() {
        return ResponseEntity.badRequest().body(Map.of("message", "Payload de edição inválido."));
    }

    @DeleteMapping("/{workoutSheetId}")
    @PreAuthorize("hasAnyRole('PERSONAL_TRAINER', 'ADMIN')")
    public ResponseEntity<Void> delete(
            Authentication authentication,
            @PathVariable UUID workoutSheetId
    ) {
        workoutService.deactivateWorkoutSheet(authentication.getName(), workoutSheetId);
        return ResponseEntity.noContent().build();
    }

    @GetMapping("/{workoutSheetId}/history")
    @PreAuthorize("hasAnyRole('PERSONAL_TRAINER', 'ADMIN')")
    public ResponseEntity<List<WorkoutSheetHistoryResponse>> history(
            Authentication authentication,
            @PathVariable UUID workoutSheetId
    ) {
        return ResponseEntity.ok(workoutService.findWorkoutSheetHistory(authentication.getName(), workoutSheetId));
    }
}
