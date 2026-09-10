package com.lionfitness.backend.workoutexercise.repository;

import com.lionfitness.backend.workoutexercise.dto.WorkoutExerciseResponse;
import com.lionfitness.backend.workoutexercise.model.WorkoutExerciseRecord;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.dao.DataAccessException;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.core.RowMapper;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public class WorkoutExerciseRepository {

    private static final Logger logger = LoggerFactory.getLogger(WorkoutExerciseRepository.class);

    private static final RowMapper<WorkoutExerciseResponse> WORKOUT_EXERCISE_ROW_MAPPER = (resultSet, rowNum) ->
            new WorkoutExerciseResponse(
                    resultSet.getObject("id", UUID.class),
                    resultSet.getObject("workout_sheet_id", UUID.class),
                    resultSet.getString("exercise_name"),
                    resultSet.getString("muscle"),
                    resultSet.getString("exercise_type"),
                    resultSet.getString("equipment"),
                    resultSet.getString("difficulty"),
                    resultSet.getString("instructions"),
                    resultSet.getInt("sets"),
                    resultSet.getInt("reps"),
                    resultSet.getInt("rest_seconds"),
                    resultSet.getString("notes")
            );

    private final JdbcTemplate jdbcTemplate;

    public WorkoutExerciseRepository(JdbcTemplate jdbcTemplate) {
        this.jdbcTemplate = jdbcTemplate;
    }

    public boolean workoutSheetExists(UUID workoutSheetId) {
        Integer result = jdbcTemplate.queryForObject(
                """
                select count(*)
                from workout_sheets
                where id = ?
                """,
                Integer.class,
                workoutSheetId
        );

        return result != null && result > 0;
    }

    public Optional<UUID> findWorkoutSheetAssignedPersonalTrainerId(UUID workoutSheetId) {
        List<UUID> ownerIds = jdbcTemplate.query(
                """
                select m.personal_trainer_id
                from workout_sheets ws
                join members m on m.id = ws.member_id
                where ws.id = ?
                """,
                (resultSet, rowNum) -> resultSet.getObject("personal_trainer_id", UUID.class),
                workoutSheetId
        );

        return ownerIds.stream()
                .filter(ownerId -> ownerId != null)
                .findFirst();
    }

    public WorkoutExerciseRecord save(WorkoutExerciseRecord exercise) {
        logger.info("Saving workout exercise for sheetId {}", exercise.workoutSheetId());

        try {
            jdbcTemplate.update(
                    """
                    insert into workout_exercises
                    (
                        id,
                        workout_sheet_id,
                        exercise_name,
                        muscle,
                        exercise_type,
                        equipment,
                        difficulty,
                        instructions,
                        "sets",
                        reps,
                        rest_seconds,
                        notes,
                        created_at
                    )
                    values (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, now())
                    """,
                    exercise.id(),
                    exercise.workoutSheetId(),
                    exercise.exerciseName(),
                    exercise.muscle(),
                    exercise.exerciseType(),
                    exercise.equipment(),
                    exercise.difficulty(),
                    exercise.instructions(),
                    exercise.sets(),
                    exercise.reps(),
                    exercise.restSeconds(),
                    exercise.notes()
            );
        } catch (DataAccessException exception) {
            logger.error(
                    "Failed to save workout exercise for sheetId {}",
                    exercise.workoutSheetId(),
                    exception
            );
            throw exception;
        }

        return exercise;
    }

    public List<WorkoutExerciseResponse> findByWorkoutSheetId(UUID workoutSheetId) {
        logger.info("Loading exercises for sheetId {}", workoutSheetId);

        try {
            return jdbcTemplate.query(
                    """
                    select
                        id,
                        workout_sheet_id,
                        exercise_name,
                        muscle,
                        exercise_type,
                        equipment,
                        difficulty,
                        instructions,
                        "sets",
                        reps,
                        rest_seconds,
                        notes
                    from workout_exercises
                    where workout_sheet_id = ?
                    order by created_at asc, id
                    """,
                    WORKOUT_EXERCISE_ROW_MAPPER,
                    workoutSheetId
            );
        } catch (DataAccessException exception) {
            logger.error("Failed to load exercises for sheetId {}", workoutSheetId, exception);
            throw exception;
        }
    }
}
