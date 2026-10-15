package com.lionfitness.backend.workout;

import com.lionfitness.backend.auth.JwtService;
import com.lionfitness.backend.auth.SecurityConfig;
import com.lionfitness.backend.exercisecatalog.ExerciseCatalogRepository;
import com.lionfitness.backend.member.repository.MemberRepository;
import com.lionfitness.backend.personaltrainer.model.PersonalTrainer;
import com.lionfitness.backend.personaltrainer.repository.PersonalTrainerRepository;
import com.lionfitness.backend.user.model.User;
import com.lionfitness.backend.user.repository.UserRepository;
import com.lionfitness.backend.workout.controller.WorkoutSheetController;
import com.lionfitness.backend.workout.dto.*;
import com.lionfitness.backend.workout.model.WorkoutExercise;
import com.lionfitness.backend.workout.repository.*;
import com.lionfitness.backend.workout.service.WorkoutService;
import com.lionfitness.backend.workoutexercise.repository.WorkoutExerciseRepository;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.node.ObjectNode;
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
import java.util.*;

import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.user;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@WebMvcTest(WorkoutSheetController.class)
@Import({SecurityConfig.class, WorkoutService.class})
class WorkoutSheetEditingApiTest {
    @Autowired MockMvc mvc;
    @Autowired ObjectMapper mapper;
    @MockitoBean JwtService jwtService;
    @MockitoBean UserRepository users;
    @MockitoBean PersonalTrainerRepository trainers;
    @MockitoBean MemberRepository members;
    @MockitoBean WorkoutRepository sheets;
    @MockitoBean WorkoutExerciseRepository exercises;
    @MockitoBean ExerciseCatalogRepository catalog;
    @MockitoBean WorkoutSheetHistoryRepository history;
    final UUID sheetId = UUID.randomUUID(), memberId = UUID.randomUUID(), trainerId = UUID.randomUUID(), exerciseId = UUID.randomUUID();
    final String email = "personal@example.com";
    final LocalDateTime time = LocalDateTime.of(2026, 10, 8, 9, 30);

    User actor(String role, boolean linked) {
        User actor = new User(UUID.randomUUID(), "Autor autenticado", email, "hash", role, true, time, false);
        when(users.findByEmail(email)).thenReturn(Optional.of(actor));
        if (role.equals("PERSONAL_TRAINER")) {
            when(trainers.findActiveByUserId(actor.id())).thenReturn(Optional.of(new PersonalTrainer(trainerId, actor.id(),
                    actor.name(), "", email, "", "", true, time, null)));
        }
        when(sheets.memberBelongsToPersonalTrainer(memberId, trainerId)).thenReturn(linked);
        WorkoutSheetResponse sheet = new WorkoutSheetResponse(sheetId, memberId, trainerId, "Antigo objetivo", "MONDAY",
                "Segunda-feira", true, time, 0);
        when(sheets.findByIdForUpdate(sheetId)).thenReturn(Optional.of(sheet));
        when(sheets.findByIdForShare(sheetId)).thenReturn(Optional.of(sheet));
        when(sheets.findMemberIdByWorkoutSheetId(sheetId)).thenReturn(Optional.of(memberId));
        when(sheets.snapshot(any())).thenAnswer(call -> new WorkoutSheetSnapshot(call.getArgument(0), List.of(
                new WorkoutExercise(exerciseId, sheetId, "Supino", "Peitoral", "Peito", "Barra", null,
                        "Instruções antigas", 3, 12, 60, "Observações antigas", time))));
        when(sheets.updateSheet(any(), anyString(), anyString(), anyLong())).thenReturn(true);
        return actor;
    }

    String body() {
        return """
                {"title":"Novo objetivo", "weekDay":"FRIDAY", "version":0, "changeReason":"Progressão",
                 "exercises":[{"id":"%s", "sets":5, "reps":8, "restSeconds":90,
                 "instructions":"Novas instruções", "notes":"Novas observações"}]}
                """.formatted(exerciseId);
    }

    @ParameterizedTest
    @ValueSource(strings = {"ADMIN", "PERSONAL_TRAINER"})
    void authorizedProfilesCanReadAndUpdateCompleteSheet(String role) throws Exception {
        User actor = actor(role, true);
        mvc.perform(get("/workout-sheets/" + sheetId).with(user(email).roles(role)))
                .andExpect(status().isOk()).andExpect(jsonPath("$.sheet.version").value(0))
                .andExpect(jsonPath("$.exercises[0].instructions").value("Instruções antigas"));
        ObjectNode request = (ObjectNode) mapper.readTree(body());
        request.put("changedByUserId", UUID.randomUUID().toString());
        request.put("changedByName", "Autor forjado");
        mvc.perform(put("/workout-sheets/" + sheetId).with(user(email).roles(role))
                        .contentType(MediaType.APPLICATION_JSON).content(request.toString()))
                .andExpect(status().isOk()).andExpect(jsonPath("$.sheet.title").value("Novo objetivo"))
                .andExpect(jsonPath("$.sheet.weekDay").value("FRIDAY")).andExpect(jsonPath("$.sheet.version").value(1));
        verify(history).recordSnapshot(any(), eq(actor), eq("Progressão"));
    }

    @Test
    void otherTrainerCannotReadEditOrReadHistoryByUuid() throws Exception {
        actor("PERSONAL_TRAINER", false);
        mvc.perform(get("/workout-sheets/" + sheetId).with(user(email).roles("PERSONAL_TRAINER"))).andExpect(status().isForbidden());
        mvc.perform(get("/workout-sheets/" + sheetId + "/history").with(user(email).roles("PERSONAL_TRAINER"))).andExpect(status().isForbidden());
        mvc.perform(put("/workout-sheets/" + sheetId).with(user(email).roles("PERSONAL_TRAINER"))
                .contentType(MediaType.APPLICATION_JSON).content(body())).andExpect(status().isForbidden());
        verifyNoInteractions(history, exercises, catalog);
    }

    @ParameterizedTest
    @ValueSource(strings = {"USER", "OPERATIONAL"})
    void studentRolesCannotReadEditingStateEditOrReadHistory(String role) throws Exception {
        mvc.perform(get("/workout-sheets/" + sheetId).with(user(email).roles(role))).andExpect(status().isForbidden());
        mvc.perform(get("/workout-sheets/" + sheetId + "/history").with(user(email).roles(role))).andExpect(status().isForbidden());
        mvc.perform(put("/workout-sheets/" + sheetId).with(user(email).roles(role))
                .contentType(MediaType.APPLICATION_JSON).content(body())).andExpect(status().isForbidden());
        verifyNoInteractions(history, sheets, exercises, catalog);
    }

    @Test
    void anonymousCannotEdit() throws Exception {
        mvc.perform(put("/workout-sheets/" + sheetId).contentType(MediaType.APPLICATION_JSON).content(body()))
                .andExpect(status().is4xxClientError());
        verifyNoInteractions(history, sheets, exercises);
    }

    @Test
    void staleRevisionReturns409WithoutMutation() throws Exception {
        actor("PERSONAL_TRAINER", true);
        mvc.perform(put("/workout-sheets/" + sheetId).with(user(email).roles("PERSONAL_TRAINER"))
                .contentType(MediaType.APPLICATION_JSON).content(body().replace("\"version\":0", "\"version\":9")))
                .andExpect(status().isConflict());
        verifyNoInteractions(history, exercises, catalog);
    }

    @ParameterizedTest
    @ValueSource(strings = {"title", "weekday", "versionMissing", "versionNegative", "reason", "reasonMissing", "exercisesMissing",
            "exercisesNull", "exerciseNull", "sets", "reps", "rest", "bothSources", "noSource", "invalidUuid", "titleTooLong"})
    void invalidPayloadsReturn400WithoutWrites(String invalid) throws Exception {
        ObjectNode request = (ObjectNode) mapper.readTree(body());
        ObjectNode item = (ObjectNode) request.get("exercises").get(0);
        switch (invalid) {
            case "title" -> request.put("title", " ");
            case "weekday" -> request.put("weekDay", "BAD_DAY");
            case "versionMissing" -> request.remove("version");
            case "versionNegative" -> request.put("version", -1);
            case "reason" -> request.put("changeReason", " ");
            case "reasonMissing" -> request.remove("changeReason");
            case "exercisesMissing" -> request.remove("exercises");
            case "exercisesNull" -> request.putNull("exercises");
            case "exerciseNull" -> request.putArray("exercises").addNull();
            case "sets" -> item.put("sets", 0);
            case "reps" -> item.putNull("reps");
            case "rest" -> item.put("restSeconds", -1);
            case "bothSources" -> item.put("catalogExerciseId", UUID.randomUUID().toString());
            case "noSource" -> item.remove("id");
            case "invalidUuid" -> item.put("id", "invalid");
            case "titleTooLong" -> request.put("title", "a".repeat(256));
        }
        mvc.perform(put("/workout-sheets/" + sheetId).with(user(email).roles("ADMIN"))
                .contentType(MediaType.APPLICATION_JSON).content(request.toString())).andExpect(status().isBadRequest());
        verifyNoInteractions(history, sheets, exercises, catalog);
    }

    @Test
    void historyReturnsLegacyEventsAndFullSnapshotsWithoutInventingLegacyAuthor() throws Exception {
        User actor = actor("PERSONAL_TRAINER", true);
        WorkoutSheetSnapshot snapshot = sheets.snapshot(sheets.findByIdForShare(sheetId).orElseThrow());
        when(history.findByWorkoutSheetId(sheetId)).thenReturn(List.of(
                new WorkoutSheetHistoryResponse(UUID.randomUUID(), sheetId, "Evento legado", time),
                new WorkoutSheetHistoryResponse(UUID.randomUUID(), sheetId, "Progressão", time, actor.id(), actor.name(), snapshot)));
        mvc.perform(get("/workout-sheets/" + sheetId + "/history").with(user(email).roles("PERSONAL_TRAINER")))
                .andExpect(status().isOk()).andExpect(jsonPath("$[0].snapshot").doesNotExist())
                .andExpect(jsonPath("$[0].changedByUserId").doesNotExist())
                .andExpect(jsonPath("$[1].changedByUserId").value(actor.id().toString()))
                .andExpect(jsonPath("$[1].createdAt").value("2026-10-08T09:30:00"))
                .andExpect(jsonPath("$[1].snapshot.sheet.title").value("Antigo objetivo"))
                .andExpect(jsonPath("$[1].snapshot.exercises[0].sets").value(3))
                .andExpect(jsonPath("$[1].snapshot.exercises[0].notes").value("Observações antigas"));
    }
}
