package com.lionfitness.backend.workout.dto;

import com.lionfitness.backend.workout.model.WorkoutExercise;
import java.util.List;

public record WorkoutSheetSnapshot(WorkoutSheetResponse sheet, List<WorkoutExercise> exercises) {
    public WorkoutSheetSnapshot { exercises = List.copyOf(exercises); }
}
