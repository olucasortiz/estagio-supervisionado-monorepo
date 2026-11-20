package com.lionfitness.backend.physicalassessment;

import com.lionfitness.backend.auth.JwtService;
import com.lionfitness.backend.auth.SecurityConfig;
import com.lionfitness.backend.member.model.Member;
import com.lionfitness.backend.member.repository.MemberRepository;
import com.lionfitness.backend.personaltrainer.model.PersonalTrainer;
import com.lionfitness.backend.personaltrainer.repository.PersonalTrainerRepository;
import com.lionfitness.backend.physicalassessment.controller.PhysicalAssessmentController;
import com.lionfitness.backend.physicalassessment.model.PhysicalAssessment;
import com.lionfitness.backend.physicalassessment.repository.PhysicalAssessmentRepository;
import com.lionfitness.backend.physicalassessment.service.PhysicalAssessmentService;
import com.lionfitness.backend.user.model.User;
import com.lionfitness.backend.user.repository.UserRepository;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.ValueSource;
import org.mockito.ArgumentCaptor;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.boot.test.context.TestConfiguration;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Import;
import org.springframework.http.MediaType;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.ResultActions;

import java.time.Clock;
import java.time.Instant;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.ZoneId;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.user;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@WebMvcTest(PhysicalAssessmentController.class)
@Import({SecurityConfig.class, PhysicalAssessmentService.class, PhysicalAssessmentApiTest.FixedClock.class})
class PhysicalAssessmentApiTest {

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
    @MockitoBean PhysicalAssessmentRepository assessments;

    final String email = "actor@example.com";
    final UUID userId = UUID.randomUUID(), trainerId = UUID.randomUUID(), memberId = UUID.randomUUID();
    final LocalDateTime time = LocalDateTime.of(2026, 11, 20, 9, 0);

    void actor(String role) {
        when(users.findByEmail(email)).thenReturn(Optional.of(new User(userId, "Avaliador", email, "hash", role, true, time, false)));
        if (role.equals("PERSONAL_TRAINER")) {
            when(trainers.findActiveByUserId(userId)).thenReturn(Optional.of(
                    new PersonalTrainer(trainerId, userId, "Avaliador", "", email, "", "", true, time, null)));
        }
    }

    void member(UUID personalTrainerId, LocalDate birthDate) {
        when(members.findActiveById(memberId)).thenReturn(Optional.of(new Member(memberId, UUID.randomUUID(),
                personalTrainerId, "Maria Teste", "52998224725", "maria@example.com", birthDate, null, true, time)));
    }

    String body(String method, String extra) {
        return """
                {"memberId":"%s", "assessmentDate":"2026-11-20", "sex":"F", "objective":"Hipertrofia",
                 "parqAnswers":[false,false,false,false,false,false,false],
                 "systolicPressure":120, "diastolicPressure":80, "restingHeartRate":68,
                 "weightKg":60, "heightCm":165,
                 "circumferences":{"waist":70, "hip":95},
                 "bodyFatMethod":"%s"%s}
                """.formatted(memberId, method, extra);
    }

    ResultActions post(String role, String body) throws Exception {
        return mvc.perform(org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post("/physical-assessments")
                .with(user(email).roles(role)).contentType(MediaType.APPLICATION_JSON).content(body));
    }

    @Test
    void trainerRegistersAssessmentForOwnStudentWithCalculatedResults() throws Exception {
        actor("PERSONAL_TRAINER");
        member(trainerId, LocalDate.of(2001, 5, 10));
        post("PERSONAL_TRAINER", body("POLLOCK_3", ", \"skinfolds\":{\"triceps\":18, \"suprailiac\":17, \"thigh\":25}"))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.ageYears").value(25))
                .andExpect(jsonPath("$.assessedByName").value("Avaliador"))
                .andExpect(jsonPath("$.results.bmi").value(22.0))
                .andExpect(jsonPath("$.results.bodyFatPercent").value(23.8))
                .andExpect(jsonPath("$.results.waistHipRatio").value(0.74))
                .andExpect(jsonPath("$.results.parqPositive").value(false));
        ArgumentCaptor<PhysicalAssessment> saved = ArgumentCaptor.forClass(PhysicalAssessment.class);
        verify(assessments).save(saved.capture());
        assertThat(saved.getValue().assessedByUserId()).isEqualTo(userId);
        assertThat(saved.getValue().informedBodyFatPercent()).isNull();
    }

    @Test
    void trainerCannotAssessAnotherTrainersStudent() throws Exception {
        actor("PERSONAL_TRAINER");
        member(UUID.randomUUID(), LocalDate.of(2001, 5, 10));
        post("PERSONAL_TRAINER", body("NONE", "")).andExpect(status().isForbidden());
        mvc.perform(get("/physical-assessments/member/" + memberId).with(user(email).roles("PERSONAL_TRAINER")))
                .andExpect(status().isForbidden());
        verify(assessments, never()).save(any());
        verify(assessments, never()).findActiveByMemberId(any());
    }

    @Test
    void missingSkinfoldsForProtocolReturn400() throws Exception {
        actor("ADMIN");
        member(trainerId, LocalDate.of(2001, 5, 10));
        post("ADMIN", body("POLLOCK_7", ", \"skinfolds\":{\"triceps\":18}"))
                .andExpect(status().isBadRequest());
        verify(assessments, never()).save(any());
    }

    @Test
    void skinfoldProtocolRequiresBirthDate() throws Exception {
        actor("ADMIN");
        member(trainerId, null);
        post("ADMIN", body("POLLOCK_3", ", \"skinfolds\":{\"triceps\":18, \"suprailiac\":17, \"thigh\":25}"))
                .andExpect(status().isBadRequest());
        verify(assessments, never()).save(any());
    }

    @Test
    void minimalAssessmentNeedsOnlyDateWeightAndHeight() throws Exception {
        actor("PERSONAL_TRAINER");
        member(trainerId, null);
        post("PERSONAL_TRAINER", """
                {"memberId":"%s", "assessmentDate":"2026-11-20", "weightKg":72.4, "heightCm":178, "bodyFatMethod":"NONE"}
                """.formatted(memberId))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.sex").doesNotExist())
                .andExpect(jsonPath("$.parqAnswers").doesNotExist())
                .andExpect(jsonPath("$.results.bmi").value(22.9))
                .andExpect(jsonPath("$.results.bodyFatPercent").doesNotExist())
                .andExpect(jsonPath("$.results.parqPositive").doesNotExist());
        verify(assessments).save(any());
    }

    @Test
    void skinfoldProtocolRequiresSex() throws Exception {
        actor("ADMIN");
        member(trainerId, LocalDate.of(2001, 5, 10));
        post("ADMIN", body("POLLOCK_3", ", \"skinfolds\":{\"triceps\":18, \"suprailiac\":17, \"thigh\":25}")
                .replace("\"sex\":\"F\",", ""))
                .andExpect(status().isBadRequest());
        verify(assessments, never()).save(any());
    }

    @Test
    void bioimpedanceRequiresInformedPercent() throws Exception {
        actor("ADMIN");
        member(trainerId, LocalDate.of(2001, 5, 10));
        post("ADMIN", body("BIOIMPEDANCE", "")).andExpect(status().isBadRequest());
        post("ADMIN", body("BIOIMPEDANCE", ", \"informedBodyFatPercent\":28"))
                .andExpect(status().isCreated()).andExpect(jsonPath("$.results.bodyFatPercent").value(28.0));
    }

    @ParameterizedTest
    @ValueSource(strings = {"futureDate", "badSex", "badMethod", "lowWeight", "parqSize", "pressureOrder", "pressureAlone"})
    void invalidPayloadsReturn400(String invalid) throws Exception {
        actor("ADMIN");
        member(trainerId, LocalDate.of(2001, 5, 10));
        String payload = switch (invalid) {
            case "futureDate" -> body("NONE", "").replace("2026-11-20", "2099-01-01");
            case "badSex" -> body("NONE", "").replace("\"sex\":\"F\"", "\"sex\":\"X\"");
            case "badMethod" -> body("OTHER", "");
            case "lowWeight" -> body("NONE", "").replace("\"weightKg\":60", "\"weightKg\":5");
            case "parqSize" -> body("NONE", "").replace("[false,false,false,false,false,false,false]", "[false]");
            case "pressureOrder" -> body("NONE", "").replace("\"diastolicPressure\":80", "\"diastolicPressure\":130");
            default -> body("NONE", "").replace("\"diastolicPressure\":80,", "");
        };
        post("ADMIN", payload).andExpect(status().isBadRequest());
        verify(assessments, never()).save(any());
    }

    @Test
    void studentReadsOnlyOwnAssessmentsAndCannotWrite() throws Exception {
        actor("OPERATIONAL");
        when(members.findByUserId(userId)).thenReturn(Optional.of(new Member(memberId, userId, trainerId, "Maria",
                "52998224725", email, LocalDate.of(2001, 5, 10), null, true, time)));
        when(assessments.findActiveByMemberId(memberId)).thenReturn(List.of());
        mvc.perform(get("/physical-assessments/me").with(user(email).roles("OPERATIONAL")))
                .andExpect(status().isOk()).andExpect(jsonPath("$").isArray());
        verify(assessments).findActiveByMemberId(memberId);
        post("OPERATIONAL", body("NONE", "")).andExpect(status().isForbidden());
        mvc.perform(get("/physical-assessments/member/" + memberId).with(user(email).roles("OPERATIONAL")))
                .andExpect(status().isForbidden());
        mvc.perform(delete("/physical-assessments/" + UUID.randomUUID()).with(user(email).roles("OPERATIONAL")))
                .andExpect(status().isForbidden());
        verify(assessments, never()).save(any());
    }

    @Test
    void anonymousIsRejected() throws Exception {
        mvc.perform(get("/physical-assessments/me")).andExpect(status().is4xxClientError());
        verifyNoInteractions(assessments);
    }
}
