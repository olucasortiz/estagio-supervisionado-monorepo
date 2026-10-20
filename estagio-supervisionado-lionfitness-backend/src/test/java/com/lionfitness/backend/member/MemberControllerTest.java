package com.lionfitness.backend.member;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.lionfitness.backend.auth.JwtService;
import com.lionfitness.backend.auth.SecurityConfig;
import com.lionfitness.backend.common.exception.GlobalExceptionHandler;
import com.lionfitness.backend.member.controller.MemberController;
import com.lionfitness.backend.member.dto.MemberResponse;
import com.lionfitness.backend.member.exception.MemberNotFoundException;
import com.lionfitness.backend.member.model.Member;
import com.lionfitness.backend.member.service.MemberService;
import com.lionfitness.backend.user.exception.UserNotFoundException;
import com.lionfitness.backend.user.model.User;
import com.lionfitness.backend.user.repository.UserRepository;
import jakarta.validation.Validation;
import jakarta.validation.Validator;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.context.annotation.Import;
import org.springframework.security.test.context.support.WithMockUser;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.Optional;
import java.util.UUID;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@WebMvcTest(controllers = MemberController.class)
@Import({SecurityConfig.class, GlobalExceptionHandler.class})
class MemberControllerTest {

    @Autowired
    private MockMvc mvc;

    @Autowired
    private ObjectMapper objectMapper;

    @MockitoBean
    private JwtService jwtService;

    @MockitoBean
    private UserRepository userRepository;

    @MockitoBean
    private MemberService memberService;

    @MockitoBean
    private Validator validator;

    @BeforeEach
    void setUpValidator() {
        Validator realValidator = Validation.buildDefaultValidatorFactory().getValidator();
        when(validator.validate(any())).thenAnswer(invocation -> realValidator.validate(invocation.getArgument(0)));
    }

    @Test
    @WithMockUser(username = "aluno@lion.com", roles = "USER")
    @DisplayName("BUG-03: GET /members/me deve retornar 200 OK quando o perfil do aluno existir")
    void shouldReturnOkWhenMyMemberProfileExists() throws Exception {
        UUID userId = UUID.randomUUID();
        UUID memberId = UUID.randomUUID();
        User user = new User(userId, "Aluno Silva", "aluno@lion.com", "hash", "USER", true, LocalDateTime.now(), false);
        Member member = new Member(
                memberId, userId, null, "Aluno Silva", "12345678901", "aluno@lion.com",
                LocalDate.of(1995, 5, 20), null, true, LocalDateTime.now()
        );

        when(userRepository.findByEmail("aluno@lion.com")).thenReturn(Optional.of(user));
        when(memberService.findByUserId(userId)).thenReturn(member);

        mvc.perform(get("/members/me"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.id").value(memberId.toString()))
                .andExpect(jsonPath("$.name").value("Aluno Silva"))
                .andExpect(jsonPath("$.cpf").value("12345678901"));
    }

    @Test
    @WithMockUser(username = "admin@lion.com", roles = "ADMIN")
    @DisplayName("BUG-03: GET /members/me para usuário autenticado sem perfil de aluno deve retornar 404 Not Found (não 500)")
    void shouldReturnNotFoundWhenUserHasNoMemberProfile() throws Exception {
        UUID userId = UUID.randomUUID();
        User adminUser = new User(userId, "Admin Master", "admin@lion.com", "hash", "ADMIN", true, LocalDateTime.now(), false);

        when(userRepository.findByEmail("admin@lion.com")).thenReturn(Optional.of(adminUser));
        when(memberService.findByUserId(userId))
                .thenThrow(new MemberNotFoundException("Perfil de aluno não encontrado para o usuário: " + userId));

        mvc.perform(get("/members/me"))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.status").value(404))
                .andExpect(jsonPath("$.error").value("Not Found"))
                .andExpect(jsonPath("$.message").value("Perfil de aluno não encontrado para o usuário: " + userId));
    }

    @Test
    @WithMockUser(username = "deleted@lion.com", roles = "USER")
    @DisplayName("BUG-03: GET /members/me para usuário autenticado ausente na tabela users deve retornar 404 Not Found (não 500)")
    void shouldReturnNotFoundWhenUserDoesNotExistInDatabase() throws Exception {
        when(userRepository.findByEmail("deleted@lion.com")).thenReturn(Optional.empty());

        mvc.perform(get("/members/me"))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.status").value(404))
                .andExpect(jsonPath("$.error").value("Not Found"))
                .andExpect(jsonPath("$.message").value("Usuário não encontrado para o e-mail: deleted@lion.com"));
    }

    @Test
    @WithMockUser(roles = "PERSONAL_TRAINER")
    @DisplayName("BUG-03: GET /members/me chamado por role não autorizada (PERSONAL_TRAINER) deve retornar 403 Forbidden")
    void shouldReturnForbiddenWhenRoleIsNotAllowedForMembersMe() throws Exception {
        mvc.perform(get("/members/me"))
                .andExpect(status().isForbidden());
    }

    @Test
    @WithMockUser(roles = "ADMIN")
    @DisplayName("BUG-03: GET /members/{id} para membro inexistente deve retornar 404 Not Found")
    void shouldReturnNotFoundForNonExistentMemberId() throws Exception {
        UUID nonExistentId = UUID.randomUUID();
        when(memberService.findById(nonExistentId)).thenThrow(new MemberNotFoundException(nonExistentId));

        mvc.perform(get("/members/" + nonExistentId))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.status").value(404))
                .andExpect(jsonPath("$.error").value("Not Found"));
    }

    @Test
    @WithMockUser(roles = "USER")
    @DisplayName("BUG-03: GET /members/{id} chamado por perfil não autorizado deve retornar 403 Forbidden (RBAC preservado)")
    void shouldReturnForbiddenForNonAdminAccessToMemberById() throws Exception {
        UUID someId = UUID.randomUUID();
        mvc.perform(get("/members/" + someId))
                .andExpect(status().isForbidden());
    }

    @Test
    @WithMockUser(username = "student@example.test", roles = "USER")
    void memberCanReadOnlyOwnLinkedTrainerPublicIdentity() throws Exception {
        UUID userId = UUID.randomUUID(), trainerId = UUID.randomUUID();
        when(userRepository.findByEmail("student@example.test")).thenReturn(Optional.of(
                new User(userId, "Student", "student@example.test", "hash", "USER", true, LocalDateTime.now(), false)));
        when(memberService.findMyPersonalTrainer(userId)).thenReturn(
                new com.lionfitness.backend.member.dto.LinkedPersonalTrainerResponse(trainerId, "Own trainer", null));
        mvc.perform(get("/members/me/personal-trainer").param("userId", UUID.randomUUID().toString()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.id").value(trainerId.toString()))
                .andExpect(jsonPath("$.name").value("Own trainer"))
                .andExpect(jsonPath("$.email").doesNotExist())
                .andExpect(jsonPath("$.cpf").doesNotExist());
        org.mockito.Mockito.verify(memberService).findMyPersonalTrainer(userId);
    }

    @Test
    @WithMockUser(roles = "PERSONAL_TRAINER")
    void personalRoleCannotUseStudentTrainerLookup() throws Exception {
        mvc.perform(get("/members/me/personal-trainer")).andExpect(status().isForbidden());
    }
}
