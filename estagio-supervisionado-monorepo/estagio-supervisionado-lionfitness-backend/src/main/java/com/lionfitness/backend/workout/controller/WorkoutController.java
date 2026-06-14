package com.lionfitness.backend.workout.controller;

import com.lionfitness.backend.workout.dto.WorkoutRequestDTO;
import com.lionfitness.backend.workout.dto.WorkoutResponse;
import com.lionfitness.backend.workout.service.WorkoutService;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/workouts")
public class WorkoutController {

    private final WorkoutService workoutService;

    public WorkoutController(WorkoutService workoutService) {
        this.workoutService = workoutService;
    }

    @GetMapping("/me")
    @PreAuthorize("hasAnyRole('OPERATIONAL', 'ADMIN')")
    public ResponseEntity<List<WorkoutResponse>> findMyWorkout(Authentication authentication) {
        List<WorkoutResponse> response = workoutService.findMyActiveWorkout(authentication.getName());
        return ResponseEntity.ok(response);
    }
    @PostMapping
    @PreAuthorize("hasAnyRole('OPERATIONAL', 'ADMIN')")
    public ResponseEntity<Void> createWorkout(@RequestBody WorkoutRequestDTO request) {
        workoutService.createNewWorkout(request);
        return ResponseEntity.status(HttpStatus.CREATED).build();
    }
    
}
