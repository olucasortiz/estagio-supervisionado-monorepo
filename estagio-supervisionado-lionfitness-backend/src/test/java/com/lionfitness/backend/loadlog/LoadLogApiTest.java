package com.lionfitness.backend.loadlog;

import com.lionfitness.backend.auth.JwtService;
import com.lionfitness.backend.auth.SecurityConfig;
import com.lionfitness.backend.loadlog.controller.LoadLogController;
import com.lionfitness.backend.loadlog.repository.LoadLogRepository;
import com.lionfitness.backend.loadlog.service.LoadLogService;
import com.lionfitness.backend.member.model.Member;
import com.lionfitness.backend.member.repository.MemberRepository;
import com.lionfitness.backend.personaltrainer.model.PersonalTrainer;
import com.lionfitness.backend.personaltrainer.repository.PersonalTrainerRepository;
import com.lionfitness.backend.user.model.User;
import com.lionfitness.backend.user.repository.UserRepository;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.ValueSource;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.boot.test.context.TestConfiguration;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Import;
import org.springframework.http.MediaType;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;

import java.math.BigDecimal;
import java.time.Clock;
import java.time.Instant;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.ZoneId;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.user;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@WebMvcTest(LoadLogController.class)
@Import({SecurityConfig.class, LoadLogService.class, LoadLogApiTest.FixedClock.class})
class LoadLogApiTest {

    @TestConfiguration
    static class FixedClock {
        @Bean Clock applicationClock() {
            return Clock.fixed(Instant.parse("2026-11-20T12:00:00Z"), ZoneId.of("America/Sao_Paulo"));
        }
    }

    @Autowired MockMvc mvc;
    @MockitoBean JwtService jwtService;
    @MockitoBean UserRepository users;
    @MockitoBean MemberRepository members;
    @MockitoBean PersonalTrainerRepository trainers;
    @MockitoBean LoadLogRepository logs;

    final String email = "aluno@example.com";
    final UUID userId = UUID.randomUUID(), memberId = UUID.randomUUID(), trainerId = UUID.randomUUID(),
            exerciseId = UUID.randomUUID();
    final LocalDateTime time = LocalDateTime.of(2026, 11, 20, 9, 0);

    void actor(String role) {
        when(users.findByEmail(email)).thenReturn(Optional.of(new User(userId, "Ator", email, "hash", role, true, time, false)));
    }

    Member member(UUID personalTrainerId) {
        return new Member(memberId, userId, personalTrainerId, "Maria", "52998224725", email,
                LocalDate.of(2000, 1, 1), null, true, time);
    }

    String body(String load) {
        return "{\"workoutExerciseId\":\"%s\", \"setNumber\":2, \"reps\":10, \"loadKg\":%s}".formatted(exerciseId, load);
    }

    @Test
    void studentLogsLoadForExerciseOfOwnActiveSheet() throws Exception {
        actor("OPERATIONAL");
        when(members.findByUserId(userId)).thenReturn(Optional.of(member(trainerId)));
        var exercise = new LoadLogRepository.PrescribedExercise(exerciseId, "Leg press 45", "Leg press");
        when(logs.findActiveExerciseOfMember(exerciseId, memberId)).thenReturn(Optional.of(exercise));
        when(logs.save(any(), eq(memberId), eq(exercise), eq(2), eq(10), any(), any())).thenAnswer(call ->
                new com.lionfitness.backend.loadlog.dto.LoadLogResponse(call.getArgument(0), memberId, exerciseId,
                        "Leg press 45", "Leg press", 2, 10, call.getArgument(5), call.getArgument(6)));
        mvc.perform(post("/load-logs").with(user(email).roles("OPERATIONAL"))
                        .contentType(MediaType.APPLICATION_JSON).content(body("120.5")))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.equipment").value("Leg press"))
                .andExpect(jsonPath("$.loadKg").value(120.5))
                .andExpect(jsonPath("$.loggedAt").value("2026-11-20T09:00:00"));
        verify(logs).save(any(), eq(memberId), eq(exercise), eq(2), eq(10),
                argThat((BigDecimal v) -> v.compareTo(new BigDecimal("120.50")) == 0), any());
    }

    @Test
    void exerciseOutsideStudentsActiveSheetReturns404() throws Exception {
        actor("OPERATIONAL");
        when(members.findByUserId(userId)).thenReturn(Optional.of(member(trainerId)));
        when(logs.findActiveExerciseOfMember(exerciseId, memberId)).thenReturn(Optional.empty());
        mvc.perform(post("/load-logs").with(user(email).roles("OPERATIONAL"))
                .contentType(MediaType.APPLICATION_JSON).content(body("50"))).andExpect(status().isNotFound());
        verify(logs, never()).save(any(), any(), any(), anyInt(), anyInt(), any(), any());
    }

    @ParameterizedTest
    @ValueSource(strings = {"-1", "1000", "null"})
    void invalidLoadReturns400(String load) throws Exception {
        actor("OPERATIONAL");
        mvc.perform(post("/load-logs").with(user(email).roles("OPERATIONAL"))
                .contentType(MediaType.APPLICATION_JSON).content(body(load))).andExpect(status().isBadRequest());
        verifyNoInteractions(logs);
    }

    @Test
    void trainerReadsOnlyLinkedStudentsLoads() throws Exception {
        actor("PERSONAL_TRAINER");
        when(trainers.findActiveByUserId(userId)).thenReturn(Optional.of(
                new PersonalTrainer(trainerId, userId, "Ator", "", email, "", "", true, time, null)));
        when(members.findActiveById(memberId)).thenReturn(Optional.of(member(trainerId)));
        when(logs.findRecentByMemberId(eq(memberId), anyInt())).thenReturn(List.of());
        mvc.perform(get("/load-logs/member/" + memberId).with(user(email).roles("PERSONAL_TRAINER")))
                .andExpect(status().isOk());
        when(members.findActiveById(memberId)).thenReturn(Optional.of(member(UUID.randomUUID())));
        mvc.perform(get("/load-logs/member/" + memberId).with(user(email).roles("PERSONAL_TRAINER")))
                .andExpect(status().isForbidden());
        verify(logs, times(1)).findRecentByMemberId(eq(memberId), anyInt());
    }

    @Test
    void staffCannotLogAndStudentCannotReadOthers() throws Exception {
        mvc.perform(post("/load-logs").with(user(email).roles("PERSONAL_TRAINER"))
                .contentType(MediaType.APPLICATION_JSON).content(body("50"))).andExpect(status().isForbidden());
        mvc.perform(get("/load-logs/member/" + memberId).with(user(email).roles("OPERATIONAL")))
                .andExpect(status().isForbidden());
        verifyNoInteractions(logs);
    }
}
