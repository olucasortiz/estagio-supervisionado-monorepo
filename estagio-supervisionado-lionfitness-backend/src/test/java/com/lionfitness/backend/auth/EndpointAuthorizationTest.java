package com.lionfitness.backend.auth;

import com.lionfitness.backend.common.controller.HealthController;
import com.lionfitness.backend.payment.controller.OnlinePaymentController;
import com.lionfitness.backend.payment.service.CardPaymentService;
import com.lionfitness.backend.payment.service.PixPaymentService;
import com.lionfitness.backend.plan.controller.PlanController;
import com.lionfitness.backend.plan.service.PlanService;
import com.lionfitness.backend.plan.dto.PlanResponse;
import com.lionfitness.backend.plan.model.PlanType;
import com.lionfitness.backend.user.repository.UserRepository;
import com.lionfitness.backend.user.controller.UserController;
import com.lionfitness.backend.user.service.UserService;
import com.lionfitness.backend.member.controller.MemberController;
import com.lionfitness.backend.member.service.MemberService;
import com.lionfitness.backend.personaltrainer.controller.PersonalTrainerController;
import com.lionfitness.backend.personaltrainer.service.PersonalTrainerService;
import com.lionfitness.backend.workout.controller.WorkoutSheetController;
import com.lionfitness.backend.workout.service.WorkoutService;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.context.annotation.Import;
import org.springframework.http.MediaType;
import org.springframework.security.test.context.support.WithMockUser;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;

import java.util.List;
import java.util.Optional;
import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.UUID;

import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@WebMvcTest(controllers = {PlanController.class, OnlinePaymentController.class,
        HealthController.class, WorkoutSheetController.class, UserController.class, MemberController.class,
        PersonalTrainerController.class})
@Import(SecurityConfig.class)
class EndpointAuthorizationTest {
    @Autowired MockMvc mvc;
    @MockitoBean JwtService jwtService;
    @MockitoBean UserRepository userRepository;
    @MockitoBean PlanService planService;
    @MockitoBean CardPaymentService cardPaymentService;
    @MockitoBean PixPaymentService pixPaymentService;
    @MockitoBean WorkoutService workoutService;
    @MockitoBean UserService userService;
    @MockitoBean MemberService memberService;
    @MockitoBean PersonalTrainerService personalTrainerService;

    @Test
    void publicHealthRemainsAvailableAndAdministrativeCrudIsNotPublic() throws Exception {
        mvc.perform(get("/health")).andExpect(status().isOk());
        mvc.perform(get("/plans")).andExpect(status().is4xxClientError());
        mvc.perform(post("/plans").contentType(MediaType.APPLICATION_JSON).content(planRequest()))
                .andExpect(status().is4xxClientError());
        verifyNoInteractions(planService);
    }

    @Test
    void photosUsedByImageElementsRemainPublicButUserDirectoryDoesNot() throws Exception {
        when(userService.findPhotoByUserId(any())).thenReturn(Optional.empty());
        mvc.perform(get("/users/64f81ae1-e6d0-4c6f-b764-884bc00f96ab/photo"))
                .andExpect(status().isNotFound());
        mvc.perform(get("/users")).andExpect(status().is4xxClientError());
        verify(userService, never()).findAll();
    }

    @Test
    @WithMockUser(roles = "USER")
    void studentCannotListUsers() throws Exception {
        mvc.perform(get("/users")).andExpect(status().isForbidden());
        verifyNoInteractions(userService);
    }

    @Test
    @WithMockUser(roles = "USER")
    void studentCannotCancelAnotherMemberByUuid() throws Exception {
        mvc.perform(post("/members/64f81ae1-e6d0-4c6f-b764-884bc00f96ab/cancel")
                        .contentType(MediaType.APPLICATION_JSON).content("{\"reason\":\"Pedido\"}"))
                .andExpect(status().isForbidden());
        verifyNoInteractions(memberService);
    }

    @Test
    @WithMockUser(username = "personal@example.com", roles = "PERSONAL_TRAINER")
    void trainerCanUseOwnStudentsEndpointButNotGlobalDirectory() throws Exception {
        when(personalTrainerService.findMyMembersByEmail("personal@example.com")).thenReturn(List.of());
        mvc.perform(get("/personal-trainers/me/members")).andExpect(status().isOk());
        mvc.perform(get("/members")).andExpect(status().isForbidden());
        verify(memberService, never()).findAll(anyBoolean());
    }

    @Test
    @WithMockUser(roles = "USER")
    void studentCanReadPlansButCannotModifyThem() throws Exception {
        when(planService.findAll()).thenReturn(List.of());
        mvc.perform(get("/plans")).andExpect(status().isOk());
        mvc.perform(post("/plans").contentType(MediaType.APPLICATION_JSON).content(planRequest()))
                .andExpect(status().isForbidden());
        verify(planService).findAll();
    }

    @Test
    @WithMockUser(roles = "ADMIN")
    void adminRetainsPlanManagement() throws Exception {
        when(planService.create(any())).thenReturn(new PlanResponse(UUID.randomUUID(), "Mensal",
                PlanType.MONTHLY, new BigDecimal("89.90"), 30, true, LocalDateTime.now()));
        mvc.perform(post("/plans").contentType(MediaType.APPLICATION_JSON).content(planRequest()))
                .andExpect(status().isCreated());
        verify(planService).create(any());
    }

    @Test
    @WithMockUser(roles = "PERSONAL_TRAINER")
    void personalCannotAccessStudentPayment() throws Exception {
        mvc.perform(post("/payments/card")
                        .header("X-Idempotency-Key", "fbd85012-35d3-4da5-a2b3-b1ea4c3eddb3")
                        .contentType(MediaType.APPLICATION_JSON).content(cardRequest()))
                .andExpect(status().isForbidden());
        verifyNoInteractions(cardPaymentService);
    }

    @Test
    @WithMockUser(username = "student@example.com", roles = "USER")
    void studentCardRequestReachesOwnershipCheckingServiceAsNonAdmin() throws Exception {
        mvc.perform(post("/payments/card")
                        .header("X-Idempotency-Key", "fbd85012-35d3-4da5-a2b3-b1ea4c3eddb3")
                        .contentType(MediaType.APPLICATION_JSON).content(cardRequest()))
                .andExpect(status().isOk());
        verify(cardPaymentService).processCardPayment(any(), anyString(), eq("student@example.com"), eq(false));
    }

    @Test
    @WithMockUser(username = "admin@example.com", roles = "ADMIN")
    void adminCardRequestKeepsAdministrativeFlow() throws Exception {
        mvc.perform(post("/payments/card")
                        .header("X-Idempotency-Key", "fbd85012-35d3-4da5-a2b3-b1ea4c3eddb3")
                        .contentType(MediaType.APPLICATION_JSON).content(cardRequest()))
                .andExpect(status().isOk());
        verify(cardPaymentService).processCardPayment(any(), anyString(), eq("admin@example.com"), eq(true));
    }

    @Test
    void unauthenticatedCardRequestIsBlocked() throws Exception {
        mvc.perform(post("/payments/card")
                        .header("X-Idempotency-Key", "fbd85012-35d3-4da5-a2b3-b1ea4c3eddb3")
                        .contentType(MediaType.APPLICATION_JSON).content(cardRequest()))
                .andExpect(status().is4xxClientError());
        verifyNoInteractions(cardPaymentService);
    }

    @Test
    @WithMockUser(roles = "USER")
    void studentCannotEnumerateWorkoutHistoryByUuid() throws Exception {
        mvc.perform(get("/workout-sheets/64f81ae1-e6d0-4c6f-b764-884bc00f96ab/history"))
                .andExpect(status().isForbidden());
        verifyNoInteractions(workoutService);
    }

    @Test
    @WithMockUser(username = "personal@example.com", roles = "PERSONAL_TRAINER")
    void trainerReachesScopedHistoryService() throws Exception {
        when(workoutService.findWorkoutSheetHistory(eq("personal@example.com"), any())).thenReturn(List.of());
        mvc.perform(get("/workout-sheets/64f81ae1-e6d0-4c6f-b764-884bc00f96ab/history"))
                .andExpect(status().isOk());
        verify(workoutService).findWorkoutSheetHistory(eq("personal@example.com"), any());
    }

    private String cardRequest() {
        return """
                {"subscriptionId":"64f81ae1-e6d0-4c6f-b764-884bc00f96ab","token":"sdk-token",
                 "paymentMethodId":"visa","paymentTypeId":"credit_card","installments":1}
                """;
    }

    private String planRequest() {
        return """
                {"name":"Mensal","type":"MONTHLY","price":89.90,"durationDays":30}
                """;
    }
}
