package com.lionfitness.backend.personaltrainer;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.lionfitness.backend.auth.JwtService;
import com.lionfitness.backend.auth.SecurityConfig;
import com.lionfitness.backend.common.exception.GlobalExceptionHandler;
import com.lionfitness.backend.member.dto.MemberResponse;
import com.lionfitness.backend.personaltrainer.controller.PersonalTrainerController;
import com.lionfitness.backend.personaltrainer.dto.PersonalTrainerCreateRequest;
import com.lionfitness.backend.personaltrainer.dto.PersonalTrainerResponse;
import com.lionfitness.backend.personaltrainer.exception.PersonalTrainerNotFoundException;
import com.lionfitness.backend.personaltrainer.service.PersonalTrainerService;
import com.lionfitness.backend.user.repository.UserRepository;
import jakarta.validation.Validation;
import jakarta.validation.Validator;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.context.annotation.Import;
import org.springframework.http.MediaType;
import org.springframework.mock.web.MockMultipartFile;
import org.springframework.security.test.context.support.WithMockUser;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.multipart;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@WebMvcTest(controllers = PersonalTrainerController.class)
@Import({SecurityConfig.class, GlobalExceptionHandler.class})
class PersonalTrainerControllerTest {

    @Autowired
    private MockMvc mvc;

    @MockitoBean
    private JwtService jwtService;

    @MockitoBean
    private UserRepository userRepository;

    @MockitoBean
    private PersonalTrainerService personalTrainerService;

    @MockitoBean
    private Validator validator;

    @BeforeEach
    void setUpValidator() {
        Validator realValidator = Validation.buildDefaultValidatorFactory().getValidator();
        when(validator.validate(any())).thenAnswer(invocation -> realValidator.validate(invocation.getArgument(0)));
    }

    @Test
    @WithMockUser(roles = "ADMIN")
    @DisplayName("BUG-02: Cadastro multipart com CPF formatado deve normalizar e retornar 201 Created")
    void shouldAcceptFormattedCpfInMultipartUpload() throws Exception {
        UUID ptId = UUID.randomUUID();
        UUID userId = UUID.randomUUID();
        PersonalTrainerResponse mockResponse = new PersonalTrainerResponse(
                ptId, userId, "Personal Teste", "12345678901", "pt@lion.com", "11999999999", "Musculação", true, LocalDateTime.now(), "http://photo.url"
        );

        when(personalTrainerService.createWithPhoto(any(), any())).thenReturn(mockResponse);

        MockMultipartFile photo = new MockMultipartFile("photo", "avatar.jpg", "image/jpeg", "image-content".getBytes());

        mvc.perform(multipart("/personal-trainers")
                        .file(photo)
                        .param("name", "Personal Teste")
                        .param("cpf", "123.456.789-01")
                        .param("email", "pt@lion.com")
                        .param("phone", "11999999999")
                        .param("specialty", "Musculação")
                        .contentType(MediaType.MULTIPART_FORM_DATA))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.id").value(ptId.toString()))
                .andExpect(jsonPath("$.cpf").value("12345678901"));
    }

    @Test
    @WithMockUser(roles = "ADMIN")
    @DisplayName("BUG-02: Cadastro multipart com CPF inválido/curto deve retornar 400 Bad Request via ConstraintViolationException")
    void shouldReturnBadRequestWhenMultipartCpfIsInvalid() throws Exception {
        mvc.perform(multipart("/personal-trainers")
                        .param("name", "Personal Teste")
                        .param("cpf", "123")
                        .param("email", "pt@lion.com")
                        .param("phone", "11999999999")
                        .param("specialty", "Musculação")
                        .contentType(MediaType.MULTIPART_FORM_DATA))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.status").value(400))
                .andExpect(jsonPath("$.validationErrors[0].field").value("cpf"))
                .andExpect(jsonPath("$.validationErrors[0].message").value("CPF deve conter exatamente 11 dígitos."));
    }

    @Test
    @WithMockUser(username = "personal@lion.com", roles = "PERSONAL_TRAINER")
    @DisplayName("BUG-03: GET /personal-trainers/me/members deve retornar 200 OK com a lista de alunos do personal")
    void shouldReturnMyMembersWhenPersonalTrainerExists() throws Exception {
        UUID memberId = UUID.randomUUID();
        MemberResponse member = new MemberResponse(
                memberId, UUID.randomUUID(), UUID.randomUUID(), null, "Aluno 1", "12345678901",
                "aluno1@lion.com", LocalDate.of(1998, 4, 10), null, true, LocalDateTime.now()
        );

        when(personalTrainerService.findMyMembersByEmail("personal@lion.com")).thenReturn(List.of(member));

        mvc.perform(get("/personal-trainers/me/members"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[0].id").value(memberId.toString()))
                .andExpect(jsonPath("$[0].name").value("Aluno 1"));
    }

    @Test
    @WithMockUser(username = "desconhecido@lion.com", roles = "PERSONAL_TRAINER")
    @DisplayName("BUG-03: GET /personal-trainers/me/members para personal inexistente deve retornar 404 Not Found (não 500)")
    void shouldReturnNotFoundWhenPersonalTrainerDoesNotExist() throws Exception {
        when(personalTrainerService.findMyMembersByEmail("desconhecido@lion.com"))
                .thenThrow(new PersonalTrainerNotFoundException("Personal trainer não encontrado para o e-mail: desconhecido@lion.com"));

        mvc.perform(get("/personal-trainers/me/members"))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.status").value(404))
                .andExpect(jsonPath("$.error").value("Not Found"))
                .andExpect(jsonPath("$.message").value("Personal trainer não encontrado para o e-mail: desconhecido@lion.com"));
    }

    @Test
    @WithMockUser(roles = "USER")
    @DisplayName("BUG-03: GET /personal-trainers/me/members chamado por perfil sem role PERSONAL_TRAINER deve retornar 403 Forbidden")
    void shouldReturnForbiddenWhenNonPersonalTrainerCallsMeMembers() throws Exception {
        mvc.perform(get("/personal-trainers/me/members"))
                .andExpect(status().isForbidden());
    }

    @Test
    @WithMockUser(roles = "ADMIN")
    @DisplayName("BUG-03: GET /personal-trainers/{id} para personal inexistente deve retornar 404 Not Found")
    void shouldReturnNotFoundWhenPersonalTrainerIdDoesNotExist() throws Exception {
        UUID nonExistentId = UUID.randomUUID();
        when(personalTrainerService.findById(nonExistentId))
                .thenThrow(new PersonalTrainerNotFoundException(nonExistentId));

        mvc.perform(get("/personal-trainers/" + nonExistentId))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.status").value(404))
                .andExpect(jsonPath("$.error").value("Not Found"));
    }

    @Test
    @WithMockUser(roles = "PERSONAL_TRAINER")
    @DisplayName("BUG-03: GET /personal-trainers/{id} chamado por perfil não autorizado deve retornar 403 Forbidden (RBAC preservado)")
    void shouldReturnForbiddenWhenNonAdminCallsPersonalTrainerById() throws Exception {
        UUID someId = UUID.randomUUID();
        mvc.perform(get("/personal-trainers/" + someId))
                .andExpect(status().isForbidden());
    }
}
