package com.lionfitness.backend.exercisecatalog;

import com.lionfitness.backend.auth.JwtService;
import com.lionfitness.backend.auth.SecurityConfig;
import com.lionfitness.backend.personaltrainer.model.PersonalTrainer;
import com.lionfitness.backend.personaltrainer.repository.PersonalTrainerRepository;
import com.lionfitness.backend.user.model.User;
import com.lionfitness.backend.user.repository.UserRepository;
import com.lionfitness.backend.workout.repository.WorkoutSheetHistoryRepository;
import com.lionfitness.backend.workout.repository.WorkoutRepository;
import com.lionfitness.backend.workout.dto.WorkoutSheetResponse;
import com.lionfitness.backend.workout.dto.WorkoutSheetSnapshot;
import com.lionfitness.backend.workoutexercise.controller.WorkoutExerciseController;
import com.lionfitness.backend.workoutexercise.dto.WorkoutExerciseResponse;
import com.lionfitness.backend.workoutexercise.model.WorkoutExerciseRecord;
import com.lionfitness.backend.workoutexercise.repository.WorkoutExerciseRepository;
import com.lionfitness.backend.workoutexercise.service.WorkoutExerciseService;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.ValueSource;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.context.annotation.Import;
import org.springframework.http.MediaType;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.user;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@WebMvcTest(controllers = {ExerciseCatalogController.class, WorkoutExerciseController.class})
@Import({SecurityConfig.class, ExerciseCatalogService.class, WorkoutExerciseService.class})
class ExerciseCatalogApiTest {
    @Autowired MockMvc mvc;
    @MockitoBean JwtService jwtService;
    @MockitoBean UserRepository users;
    @MockitoBean PersonalTrainerRepository trainers;
    @MockitoBean ExerciseCatalogRepository catalog;
    @MockitoBean WorkoutExerciseRepository workouts;
    @MockitoBean WorkoutSheetHistoryRepository history;
    @MockitoBean WorkoutRepository workoutRepository;

    final UUID exerciseId = UUID.randomUUID();
    final UUID userId = UUID.randomUUID();
    final UUID trainerId = UUID.randomUUID();
    final UUID sheetId = UUID.randomUUID();
    final String email = "actor@example.com";

    void actor(String role) {
        when(users.findByEmail(email)).thenReturn(Optional.of(new User(userId, "Actor", email,
                "hash", role, true, LocalDateTime.now(), false)));
        if (role.equals("PERSONAL_TRAINER")) {
            when(trainers.findActiveByUserId(userId)).thenReturn(Optional.of(new PersonalTrainer(trainerId,
                    userId, "Actor", "", email, "", "", true, LocalDateTime.now(), null)));
        }
    }

    ExerciseCatalog exercise(boolean custom, UUID owner, boolean active) {
        return new ExerciseCatalog(exerciseId, "Supino", "Peito", "Peitoral", "Barra", "Instruções",
                custom, owner, active, LocalDateTime.now());
    }

    @Test
    void equipmentCombinesWithExistingFiltersAndDefaultsToActive() throws Exception {
        actor("ADMIN");
        when(catalog.findAll("sup", "Peito", "Peitoral", "Barra", false, null))
                .thenReturn(List.of(exercise(false, null, true)));
        mvc.perform(get("/exercise-catalog").with(user(email).roles("ADMIN"))
                        .param("name", "sup").param("category", "Peito").param("muscle", "Peitoral").param("equipment", "Barra"))
                .andExpect(status().isOk()).andExpect(jsonPath("$[0].isActive").value(true))
                .andExpect(jsonPath("$[0].canManage").value(true));
        verify(catalog).findAll("sup", "Peito", "Peitoral", "Barra", false, null);
    }

    @Test
    void includeInactiveUsesRealTrainerIdAndMarksOnlyOwnedCustomItemsManageable() throws Exception {
        actor("PERSONAL_TRAINER");
        when(catalog.findAll(null, null, null, null, true, trainerId)).thenReturn(List.of(
                exercise(true, trainerId, false), exercise(false, null, true), exercise(true, UUID.randomUUID(), true)));
        mvc.perform(get("/exercise-catalog").with(user(email).roles("PERSONAL_TRAINER")).param("includeInactive", "true"))
                .andExpect(status().isOk()).andExpect(jsonPath("$[0].isActive").value(false))
                .andExpect(jsonPath("$[0].canManage").value(true)).andExpect(jsonPath("$[1].canManage").value(false))
                .andExpect(jsonPath("$[2].canManage").value(false));
    }

    @ParameterizedTest
    @ValueSource(booleans = {true, false})
    void adminCanActivateAndDeactivateStandardExercise(boolean active) throws Exception {
        actor("ADMIN");
        when(catalog.findById(exerciseId)).thenReturn(Optional.of(exercise(false, null, !active)));
        when(catalog.updateActiveStatus(exerciseId, active)).thenReturn(true);
        patchStatus("ADMIN", "{\"isActive\":" + active + "}")
                .andExpect(status().isOk()).andExpect(jsonPath("$.isActive").value(active));
        verifyNoInteractions(workouts, history);
    }

    @ParameterizedTest
    @ValueSource(booleans = {true, false})
    void trainerCanChangeOwnCustomExercise(boolean active) throws Exception {
        actor("PERSONAL_TRAINER");
        when(catalog.findById(exerciseId)).thenReturn(Optional.of(exercise(true, trainerId, !active)));
        when(catalog.updateActiveStatus(exerciseId, active)).thenReturn(true);
        patchStatus("PERSONAL_TRAINER", "{\"isActive\":" + active + "}")
                .andExpect(status().isOk()).andExpect(jsonPath("$.isActive").value(active));
        verify(catalog).updateActiveStatus(exerciseId, active);
    }

    @Test
    void trainerCannotChangeStandardEvenIfOwnerFieldMatches() throws Exception {
        actor("PERSONAL_TRAINER");
        when(catalog.findById(exerciseId)).thenReturn(Optional.of(exercise(false, trainerId, true)));
        patchStatus("PERSONAL_TRAINER", "{\"isActive\":false}").andExpect(status().isForbidden());
        verify(catalog, never()).updateActiveStatus(any(), anyBoolean());
    }

    @Test
    void trainerCannotChangeAnotherTrainersCustomExerciseOrSpoofOwnership() throws Exception {
        actor("PERSONAL_TRAINER");
        when(catalog.findById(exerciseId)).thenReturn(Optional.of(exercise(true, UUID.randomUUID(), true)));
        patchStatus("PERSONAL_TRAINER", "{\"isActive\":false,\"createdByPersonalTrainerId\":\"" + trainerId + "\"}")
                .andExpect(status().isForbidden());
        verify(catalog, never()).updateActiveStatus(any(), anyBoolean());
    }

    @Test
    void trainerCannotChangeAdminCreatedCustomExerciseWithoutOwner() throws Exception {
        actor("PERSONAL_TRAINER");
        when(catalog.findById(exerciseId)).thenReturn(Optional.of(exercise(true, null, true)));
        patchStatus("PERSONAL_TRAINER", "{\"isActive\":false}").andExpect(status().isForbidden());
        verify(catalog, never()).updateActiveStatus(any(), anyBoolean());
    }

    @Test
    void missingExerciseReturns404() throws Exception {
        actor("ADMIN");
        patchStatus("ADMIN", "{\"isActive\":false}").andExpect(status().isNotFound());
    }

    @ParameterizedTest
    @ValueSource(strings = {"{}", "{\"isActive\":null}", "{\"isActive\":\"false\"}", "{\"isActive\":1}",
            "{\"isActive\":[]}", "{", "{\"isActive\":\"invalid\"}"})
    void invalidStatusPayloadReturns400WithoutMutation(String payload) throws Exception {
        patchStatus("ADMIN", payload).andExpect(status().isBadRequest());
        verifyNoInteractions(catalog, workouts, history);
    }

    @ParameterizedTest
    @ValueSource(strings = {"USER", "OPERATIONAL"})
    void studentCannotReadOrManageCatalog(String role) throws Exception {
        mvc.perform(get("/exercise-catalog").with(user(email).roles(role)).param("includeInactive", "true"))
                .andExpect(status().isForbidden());
        patchStatus(role, "{\"isActive\":false}").andExpect(status().isForbidden());
        verifyNoInteractions(catalog, users);
    }

    @Test
    void anonymousCannotReadOrManageCatalog() throws Exception {
        mvc.perform(get("/exercise-catalog")).andExpect(status().is4xxClientError());
        mvc.perform(patch("/exercise-catalog/" + exerciseId + "/status").contentType(MediaType.APPLICATION_JSON)
                .content("{\"isActive\":false}")).andExpect(status().is4xxClientError());
        verifyNoInteractions(catalog);
    }

    @Test
    void customCreationKeepsActualTrainerOwnership() throws Exception {
        actor("PERSONAL_TRAINER");
        when(catalog.save(any(), any(), eq(trainerId))).thenReturn(exercise(true, trainerId, true));
        mvc.perform(post("/exercise-catalog").with(user(email).roles("PERSONAL_TRAINER"))
                        .contentType(MediaType.APPLICATION_JSON).content("""
                                {"name":"Supino", "category":"Peito", "muscle":"Peitoral",
                                "equipment":"Barra", "instructions":"Instruções"}
                                """))
                .andExpect(status().isCreated()).andExpect(jsonPath("$.isCustom").value(true))
                .andExpect(jsonPath("$.createdByPersonalTrainerId").value(trainerId.toString()))
                .andExpect(jsonPath("$.isActive").value(true)).andExpect(jsonPath("$.canManage").value(true));
    }

    void sheetAccess() {
        actor("PERSONAL_TRAINER");
        WorkoutSheetResponse sheet = new WorkoutSheetResponse(sheetId, UUID.randomUUID(), trainerId,
                "Treino A", "MONDAY", "Segunda-feira", true, LocalDateTime.now());
        when(workoutRepository.findByIdForUpdate(sheetId)).thenReturn(Optional.of(sheet));
        when(workoutRepository.snapshot(sheet)).thenReturn(new WorkoutSheetSnapshot(sheet, List.of()));
        when(workouts.workoutSheetExists(sheetId)).thenReturn(true);
        when(workouts.findWorkoutSheetAssignedPersonalTrainerId(sheetId)).thenReturn(Optional.of(trainerId));
    }

    @Test
    void directApiRejectsInactiveCatalogSourceWithoutSavingPrescriptionOrHistory() throws Exception {
        sheetAccess();
        when(catalog.findByIdForShare(exerciseId)).thenReturn(Optional.of(exercise(true, trainerId, false)));
        addFromCatalog().andExpect(status().isConflict());
        verify(workouts, never()).save(any());
        verifyNoInteractions(history);
    }

    @Test
    void missingCatalogSourceReturns404() throws Exception {
        sheetAccess();
        addFromCatalog().andExpect(status().isNotFound());
        verify(workouts, never()).save(any());
    }

    @ParameterizedTest
    @ValueSource(booleans = {true, false})
    void activeCatalogSourceCopiesCanonicalDataAndKeepsPrescription(boolean custom) throws Exception {
        sheetAccess();
        when(catalog.findByIdForShare(exerciseId)).thenReturn(Optional.of(exercise(custom, custom ? trainerId : null, true)));
        when(workouts.save(any())).thenAnswer(invocation -> invocation.getArgument(0));
        addFromCatalog().andExpect(status().isCreated()).andExpect(jsonPath("$.exerciseName").value("Supino"))
                .andExpect(jsonPath("$.muscle").value("Peitoral")).andExpect(jsonPath("$.equipment").value("Barra"))
                .andExpect(jsonPath("$.sets").value(3)).andExpect(jsonPath("$.reps").value(12));
        verify(workouts).save(argThat((WorkoutExerciseRecord record) -> record.instructions().equals("Instruções")));
    }

    @ParameterizedTest
    @ValueSource(strings = {"", ",\"catalogExerciseId\":null"})
    void omittingCatalogSourceCannotBypassActiveValidation(String sourceField) throws Exception {
        mvc.perform(post("/workout-exercises").with(user(email).roles("PERSONAL_TRAINER"))
                        .contentType(MediaType.APPLICATION_JSON).content("""
                                {"workoutSheetId":"%s", "externalName":"Supino", "muscle":"Peitoral",
                                "sets":3, "reps":12, "restSeconds":60%s}
                                """.formatted(sheetId, sourceField)))
                .andExpect(status().isBadRequest());
        verifyNoInteractions(catalog, workouts, history);
    }

    @Test
    void historicalPrescriptionIsStillReadableAfterCatalogDeactivation() throws Exception {
        actor("ADMIN");
        WorkoutExerciseResponse existing = new WorkoutExerciseResponse(UUID.randomUUID(), sheetId, "Supino",
                "Peitoral", "Peito", "Barra", "", "Instruções antigas", 4, 8, 90, "Notas antigas");
        when(workouts.workoutSheetExists(sheetId)).thenReturn(true);
        when(workouts.findByWorkoutSheetId(sheetId)).thenReturn(List.of(existing));
        when(catalog.findById(exerciseId)).thenReturn(Optional.of(exercise(false, null, true)));
        when(catalog.updateActiveStatus(exerciseId, false)).thenReturn(true);
        patchStatus("ADMIN", "{\"isActive\":false}").andExpect(status().isOk());
        mvc.perform(get("/workout-exercises/sheet/" + sheetId).with(user(email).roles("ADMIN")))
                .andExpect(status().isOk()).andExpect(jsonPath("$[0].instructions").value("Instruções antigas"))
                .andExpect(jsonPath("$[0].sets").value(4)).andExpect(jsonPath("$[0].reps").value(8))
                .andExpect(jsonPath("$[0].notes").value("Notas antigas"));
        verify(workouts, never()).save(any());
        verifyNoInteractions(history);
        assertThat(existing.restSeconds()).isEqualTo(90);
    }

    private org.springframework.test.web.servlet.ResultActions patchStatus(String role, String payload) throws Exception {
        return mvc.perform(patch("/exercise-catalog/" + exerciseId + "/status").with(user(email).roles(role))
                .contentType(MediaType.APPLICATION_JSON).content(payload));
    }

    private org.springframework.test.web.servlet.ResultActions addFromCatalog() throws Exception {
        return mvc.perform(post("/workout-exercises").with(user(email).roles("PERSONAL_TRAINER"))
                .contentType(MediaType.APPLICATION_JSON).content("""
                        {"workoutSheetId":"%s", "catalogExerciseId":"%s", "externalName":"Nome adulterado",
                        "muscle":"Músculo adulterado", "equipment":"Outro", "sets":3, "reps":12, "restSeconds":60}
                        """.formatted(sheetId, exerciseId)));
    }
}
