package com.lionfitness.backend.workout.controller;

import com.lionfitness.backend.workout.dto.WorkoutSheetCreateRequest;
import com.lionfitness.backend.workout.dto.WorkoutSheetResponse;
import com.lionfitness.backend.workout.service.WorkoutService;
import jakarta.validation.Valid;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.net.URI;
import java.util.List;
import java.util.UUID;

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

    @GetMapping("/member/{memberId}")
    @PreAuthorize("hasAnyRole('PERSONAL_TRAINER', 'ADMIN')")
    public ResponseEntity<List<WorkoutSheetResponse>> findByMemberId(
            Authentication authentication,
            @PathVariable UUID memberId
    ) {
        return ResponseEntity.ok(workoutService.findWorkoutSheetsByMember(authentication.getName(), memberId));
    }
}
