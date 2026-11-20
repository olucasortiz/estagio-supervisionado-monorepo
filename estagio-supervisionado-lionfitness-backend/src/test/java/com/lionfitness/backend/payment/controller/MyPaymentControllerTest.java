package com.lionfitness.backend.payment.controller;

import com.lionfitness.backend.auth.JwtService;
import com.lionfitness.backend.auth.SecurityConfig;
import com.lionfitness.backend.member.model.Member;
import com.lionfitness.backend.member.repository.MemberRepository;
import com.lionfitness.backend.payment.dto.MyPaymentResponse;
import com.lionfitness.backend.payment.repository.PaymentRepository;
import com.lionfitness.backend.payment.service.MyPaymentHistoryService;
import com.lionfitness.backend.user.model.User;
import com.lionfitness.backend.user.repository.UserRepository;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.ValueSource;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.context.annotation.Import;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

import static org.mockito.Mockito.*;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.user;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@WebMvcTest(MyPaymentController.class)
@Import({SecurityConfig.class, MyPaymentHistoryService.class})
class MyPaymentControllerTest {

    @Autowired MockMvc mvc;
    @MockitoBean JwtService jwtService;
    @MockitoBean UserRepository users;
    @MockitoBean MemberRepository members;
    @MockitoBean PaymentRepository payments;

    final String email = "aluno@example.com";
    final UUID userId = UUID.randomUUID(), memberId = UUID.randomUUID();
    final LocalDateTime time = LocalDateTime.of(2026, 11, 20, 9, 0);

    @Test
    void studentSeesOnlyOwnPaymentHistory() throws Exception {
        when(users.findByEmail(email)).thenReturn(Optional.of(new User(userId, "Maria", email, "hash", "OPERATIONAL", true, time, false)));
        when(members.findByUserId(userId)).thenReturn(Optional.of(new Member(memberId, userId, null, "Maria",
                "52998224725", email, LocalDate.of(2000, 1, 1), null, true, time)));
        when(payments.findHistoryByMemberId(memberId)).thenReturn(List.of(new MyPaymentResponse(UUID.randomUUID(),
                UUID.randomUUID(), "Mensal", new BigDecimal("99.90"), "PIX", "PAID", LocalDate.of(2026, 11, 1),
                LocalDate.of(2026, 12, 1), time)));
        mvc.perform(get("/payments/me").with(user(email).roles("OPERATIONAL")))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[0].planName").value("Mensal"))
                .andExpect(jsonPath("$[0].status").value("PAID"))
                .andExpect(jsonPath("$[0].amount").value(99.90));
        verify(payments).findHistoryByMemberId(memberId);
    }

    @Test
    void userWithoutMemberRecordGetsEmptyList() throws Exception {
        when(users.findByEmail(email)).thenReturn(Optional.of(new User(userId, "Sem cadastro", email, "hash", "USER", true, time, false)));
        when(members.findByUserId(userId)).thenReturn(Optional.empty());
        mvc.perform(get("/payments/me").with(user(email).roles("USER")))
                .andExpect(status().isOk()).andExpect(jsonPath("$").isEmpty());
        verifyNoInteractions(payments);
    }

    @ParameterizedTest
    @ValueSource(strings = {"ADMIN", "PERSONAL_TRAINER"})
    void staffProfilesUseTheAdministrativeListInstead(String role) throws Exception {
        mvc.perform(get("/payments/me").with(user(email).roles(role))).andExpect(status().isForbidden());
        verifyNoInteractions(payments);
    }
}
