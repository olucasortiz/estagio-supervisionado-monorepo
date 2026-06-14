package com.lionfitness.backend.workoutexercise.controller;

import com.lionfitness.backend.workoutexercise.dto.WorkoutExerciseCreateRequest;
import com.lionfitness.backend.workoutexercise.dto.WorkoutExerciseResponse;
import com.lionfitness.backend.workoutexercise.service.WorkoutExerciseService;
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
@RequestMapping("/workout-exercises")
public class WorkoutExerciseController {

    private final WorkoutExerciseService workoutExerciseService;

    public WorkoutExerciseController(WorkoutExerciseService workoutExerciseService) {
        this.workoutExerciseService = workoutExerciseService;
    }

    @PostMapping
    @PreAuthorize("hasAnyRole('PERSONAL_TRAINER', 'ADMIN')")
    public ResponseEntity<WorkoutExerciseResponse> create(
            Authentication authentication,
            @Valid @RequestBody WorkoutExerciseCreateRequest request
    ) {
        WorkoutExerciseResponse response = workoutExerciseService.create(authentication.getName(), request);
        return ResponseEntity
                .created(URI.create("/workout-exercises/" + response.id()))
                .body(response);
    }

    @GetMapping("/sheet/{workoutSheetId}")
    @PreAuthorize("hasAnyRole('PERSONAL_TRAINER', 'ADMIN')")
    public ResponseEntity<List<WorkoutExerciseResponse>> findByWorkoutSheetId(
            Authentication authentication,
            @PathVariable UUID workoutSheetId
    ) {
        return ResponseEntity.ok(
                workoutExerciseService.findByWorkoutSheetId(authentication.getName(), workoutSheetId)
        );
    }
}
