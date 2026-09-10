package com.lionfitness.backend.workout.repository;

import java.sql.Timestamp;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

import com.lionfitness.backend.workout.dto.WorkoutSheetResponse;
import com.lionfitness.backend.workout.dto.WorkoutResponse;
import com.lionfitness.backend.workout.model.WorkoutExercise;
import com.lionfitness.backend.workout.model.WorkoutSheet;
import com.lionfitness.backend.workout.model.WorkoutWeekDay;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.dao.DataAccessException;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.core.RowMapper;
import org.springframework.stereotype.Repository;
import org.springframework.transaction.annotation.Transactional;

@Repository
public class WorkoutRepository {

    private static final Logger logger = LoggerFactory.getLogger(WorkoutRepository.class);

    private static final RowMapper<WorkoutSheet> WORKOUT_SHEET_ROW_MAPPER = (resultSet, rowNum) -> new WorkoutSheet(
            resultSet.getObject("id", UUID.class),
            resultSet.getObject("member_id", UUID.class),
            resultSet.getObject("personal_trainer_id", UUID.class),
            resultSet.getString("goal"),
            resultSet.getString("week_day"),
            resultSet.getBoolean("is_active")
    );

    private static final RowMapper<WorkoutSheetResponse> WORKOUT_SHEET_RESPONSE_ROW_MAPPER = (resultSet, rowNum) ->
            new WorkoutSheetResponse(
                    resultSet.getObject("id", UUID.class),
                    resultSet.getObject("member_id", UUID.class),
                    resultSet.getObject("personal_trainer_id", UUID.class),
                    resultSet.getString("title"),
                    resultSet.getString("week_day"),
                    WorkoutWeekDay.labelFor(resultSet.getString("week_day")),
                    resultSet.getBoolean("is_active"),
                    resultSet.getObject("created_at", LocalDateTime.class)
            );

    private static final RowMapper<WorkoutExercise> WORKOUT_EXERCISE_ROW_MAPPER = (resultSet, rowNum) -> new WorkoutExercise(
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
            resultSet.getString("notes"),
            resultSet.getObject("created_at", LocalDateTime.class)
    );

    private final JdbcTemplate jdbcTemplate;

    public WorkoutRepository(JdbcTemplate jdbcTemplate) {
        this.jdbcTemplate = jdbcTemplate;
    }

    public Optional<WorkoutResponse> findActiveByUserId(UUID userId) {
        ensureWeekDayColumn();
        logger.info("Loading active workout for userId {}", userId);

        List<WorkoutSheet> workoutSheets = jdbcTemplate.query(
                """
                select ws.id, ws.member_id, ws.personal_trainer_id, ws.goal, ws.week_day, ws.is_active
                from members m
                join workout_sheets ws on ws.member_id = m.id
                where m.user_id = ?
                  and m.is_active = true
                  and ws.is_active = true
                order by ws.id
                limit 1
                """,
                WORKOUT_SHEET_ROW_MAPPER,
                userId
        );

        if (workoutSheets.isEmpty()) {
            return Optional.empty();
        }

        WorkoutSheet workoutSheet = workoutSheets.getFirst();
        List<WorkoutExercise> exercises = findExercisesByWorkoutSheetId(workoutSheet.id());

        return Optional.of(toWorkoutResponse(workoutSheet, exercises, null));
    }

    public List<WorkoutResponse> findActiveWorkoutsByUserId(UUID userId) {
        ensureWeekDayColumn();
        logger.info("Loading weekly workouts for userId {}", userId);

        List<WorkoutSheet> workoutSheets = jdbcTemplate.query(
                """
                select ws.id, ws.member_id, ws.personal_trainer_id, ws.goal, ws.week_day, ws.is_active
                from members m
                join workout_sheets ws on ws.member_id = m.id
                where m.user_id = ?
                  and m.is_active = true
                  and ws.is_active = true
                order by
                  case ws.week_day
                    when 'MONDAY' then 1
                    when 'TUESDAY' then 2
                    when 'WEDNESDAY' then 3
                    when 'THURSDAY' then 4
                    when 'FRIDAY' then 5
                    when 'SATURDAY' then 6
                    when 'SUNDAY' then 7
                    else 8
                  end,
                  ws.created_at asc nulls last,
                  ws.id asc
                """,
                WORKOUT_SHEET_ROW_MAPPER,
                userId
        );

        return workoutSheets.stream()
                .map(sheet -> toWorkoutResponse(sheet, findExercisesByWorkoutSheetId(sheet.id()), null))
                .toList();
    }

    public Optional<UUID> findActiveWorkoutSheetIdByMemberId(UUID memberId) {
        List<UUID> workoutSheetIds = jdbcTemplate.query(
                """
                select id
                from workout_sheets
                where member_id = ?
                  and is_active = true
                order by created_at desc nulls last, id desc
                limit 1
                """,
                (resultSet, rowNum) -> resultSet.getObject("id", UUID.class),
                memberId
        );

        return workoutSheetIds.stream().findFirst();
    }

    public boolean memberBelongsToPersonalTrainer(UUID memberId, UUID personalTrainerId) {
        Integer count = jdbcTemplate.queryForObject(
                """
                select count(*)
                from members
                where id = ?
                  and personal_trainer_id = ?
                  and is_active = true
                """,
                Integer.class,
                memberId,
                personalTrainerId
        );

        return count != null && count > 0;
    }

    public Optional<UUID> findAssignedPersonalTrainerIdByMemberId(UUID memberId) {
        List<UUID> personalTrainerIds = jdbcTemplate.query(
                """
                select personal_trainer_id
                from members
                where id = ?
                  and is_active = true
                  and personal_trainer_id is not null
                """,
                (resultSet, rowNum) -> resultSet.getObject("personal_trainer_id", UUID.class),
                memberId
        );

        return personalTrainerIds.stream().findFirst();
    }

    public Optional<UUID> findMemberIdByWorkoutSheetId(UUID workoutSheetId) {
        List<UUID> memberIds = jdbcTemplate.query(
                """
                select member_id
                from workout_sheets
                where id = ?
                """,
                (resultSet, rowNum) -> resultSet.getObject("member_id", UUID.class),
                workoutSheetId
        );

        return memberIds.stream().findFirst();
    }

    public WorkoutSheetResponse createWorkoutSheet(UUID memberId, UUID personalTrainerId, String title) {
        return createWorkoutSheet(memberId, personalTrainerId, title, null);
    }

    public WorkoutSheetResponse createWorkoutSheet(UUID memberId, UUID personalTrainerId, String title, String weekDay) {
        ensureWeekDayColumn();

        UUID workoutSheetId = UUID.randomUUID();
        LocalDateTime createdAt = LocalDateTime.now();

        jdbcTemplate.update(
                """
                insert into workout_sheets (id, member_id, personal_trainer_id, goal, week_day, is_active, created_at)
                values (?, ?, ?, ?, ?, ?, ?)
                """,
                workoutSheetId,
                memberId,
                personalTrainerId,
                title,
                weekDay,
                true,
                Timestamp.valueOf(createdAt)
        );

        return new WorkoutSheetResponse(
                workoutSheetId,
                memberId,
                personalTrainerId,
                title,
                weekDay,
                WorkoutWeekDay.labelFor(weekDay),
                true,
                createdAt
        );
    }

    public List<WorkoutSheetResponse> findByMemberId(UUID memberId) {
        ensureWeekDayColumn();
        return jdbcTemplate.query(
                """
                select
                    id,
                    member_id,
                    personal_trainer_id,
                    goal as title,
                    week_day,
                    is_active,
                    created_at
                from workout_sheets
                where member_id = ?
                  and is_active = true
                order by
                  case week_day
                    when 'MONDAY' then 1
                    when 'TUESDAY' then 2
                    when 'WEDNESDAY' then 3
                    when 'THURSDAY' then 4
                    when 'FRIDAY' then 5
                    when 'SATURDAY' then 6
                    when 'SUNDAY' then 7
                    else 8
                  end,
                  created_at asc nulls last,
                  id asc
                """,
                WORKOUT_SHEET_RESPONSE_ROW_MAPPER,
                memberId
        );
    }

    public boolean deactivateWorkoutSheet(UUID workoutSheetId) {
        return jdbcTemplate.update(
                """
                update workout_sheets
                set is_active = false
                where id = ?
                """,
                workoutSheetId
        ) > 0;
    }

    @Transactional
    public void saveFullWorkout(WorkoutSheet newSheet, List<WorkoutExercise> exercises, String changeReason) {
        // 1. Desativar ficha anterior e salvar no histórico se existir
        String findActiveSql = "SELECT id FROM workout_sheets WHERE member_id = ? AND is_active = true";
        List<UUID> activeSheetIds = jdbcTemplate.query(findActiveSql, (rs, rowNum) -> rs.getObject("id", UUID.class), newSheet.memberId());

        for (UUID oldSheetId : activeSheetIds) {
            // Registrar no histórico
            jdbcTemplate.update(
                    "INSERT INTO workout_sheet_history (id, workout_sheet_id, change_reason) VALUES (?, ?, ?)",
                    UUID.randomUUID(), oldSheetId, changeReason
            );
            // Desativar
            jdbcTemplate.update("UPDATE workout_sheets SET is_active = false WHERE id = ?", oldSheetId);
        }

        // 2. Inserir nova ficha
        jdbcTemplate.update(
                "INSERT INTO workout_sheets (id, member_id, personal_trainer_id, goal, is_active) VALUES (?, ?, ?, ?, ?)",
                newSheet.id(), newSheet.memberId(), newSheet.personalTrainerId(), newSheet.goal(), true
        );

        // 3. Inserir exercícios em lote (Batch Update)
        String exerciseSql = """
        INSERT INTO workout_exercises (id, workout_sheet_id, exercise_name, sets, reps, notes, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?)
        """;

        jdbcTemplate.batchUpdate(exerciseSql, exercises, exercises.size(), (ps, exercise) -> {
            ps.setObject(1, UUID.randomUUID());
            ps.setObject(2, newSheet.id());
            ps.setString(3, exercise.exerciseName());
            ps.setInt(4, exercise.sets());
            ps.setInt(5, exercise.reps());
            ps.setString(6, exercise.notes());
            ps.setTimestamp(7, Timestamp.valueOf(LocalDateTime.now()));
        });
    }
    private List<WorkoutExercise> findExercisesByWorkoutSheetId(UUID workoutSheetId) {
        logger.info("Loading workout exercises for sheetId {}", workoutSheetId);

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
                        notes,
                        created_at
                    from workout_exercises
                    where workout_sheet_id = ?
                    order by created_at asc nulls last, exercise_name asc
                    """,
                    WORKOUT_EXERCISE_ROW_MAPPER,
                    workoutSheetId
            );
        } catch (DataAccessException exception) {
            logger.error("Failed to load workout exercises for sheetId {}", workoutSheetId, exception);
            throw exception;
        }
    }

    private WorkoutResponse toWorkoutResponse(
            WorkoutSheet workoutSheet,
            List<WorkoutExercise> exercises,
            LocalDateTime createdAt
    ) {
        return new WorkoutResponse(
                workoutSheet.id(),
                workoutSheet.memberId(),
                workoutSheet.personalTrainerId(),
                workoutSheet.goal(),
                workoutSheet.weekDay(),
                WorkoutWeekDay.labelFor(workoutSheet.weekDay()),
                workoutSheet.active(),
                createdAt,
                exercises
        );
    }

    private void ensureWeekDayColumn() {
        jdbcTemplate.execute("""
                alter table workout_sheets
                add column if not exists week_day varchar(20)
                """);
    }
}
