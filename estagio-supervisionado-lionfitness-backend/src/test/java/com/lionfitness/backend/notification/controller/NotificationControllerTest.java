package com.lionfitness.backend.notification.controller;

import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.lionfitness.backend.auth.JwtService;
import com.lionfitness.backend.auth.SecurityConfig;
import com.lionfitness.backend.notification.dto.MarkAllNotificationsReadResponse;
import com.lionfitness.backend.notification.dto.NotificationReplyRequest;
import com.lionfitness.backend.notification.dto.NotificationResponse;
import com.lionfitness.backend.notification.dto.StudentNotificationCreateRequest;
import com.lionfitness.backend.notification.dto.UnreadNotificationCountResponse;
import com.lionfitness.backend.notification.model.NotificationType;
import com.lionfitness.backend.notification.service.NotificationService;
import com.lionfitness.backend.user.repository.UserRepository;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.context.annotation.Import;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.security.test.context.support.WithMockUser;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.web.server.ResponseStatusException;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.patch;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@WebMvcTest(controllers = NotificationController.class)
@Import(SecurityConfig.class)
class NotificationControllerTest {

    @Autowired
    private MockMvc mvc;

    @Autowired
    private ObjectMapper objectMapper;

    @MockitoBean
    private JwtService jwtService;

    @MockitoBean
    private UserRepository userRepository;

    @MockitoBean
    private NotificationService notificationService;

    private final UUID notificationId = UUID.randomUUID();
    private final UUID studentUserId = UUID.randomUUID();
    private final UUID trainerUserId = UUID.randomUUID();

    @Test
    void rejectsUnauthenticatedRequestsToAllEndpoints() throws Exception {
        mvc.perform(get("/notifications")).andExpect(status().is4xxClientError());
        mvc.perform(get("/notifications/unread-count")).andExpect(status().is4xxClientError());
        mvc.perform(post("/notifications/trainer-message")
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"type\":\"EXERCISE_QUESTION\",\"message\":\"Duvida\"}"))
                .andExpect(status().is4xxClientError());
        mvc.perform(patch("/notifications/" + notificationId + "/read")).andExpect(status().is4xxClientError());
        mvc.perform(patch("/notifications/read-all")).andExpect(status().is4xxClientError());
        mvc.perform(post("/notifications/" + notificationId + "/reply")
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"message\":\"Resposta\"}"))
                .andExpect(status().is4xxClientError());

        verifyNoInteractions(notificationService);
    }

    @Test
    @WithMockUser(username = "aluno@lionfitness.com", roles = "USER")
    void studentSendsMessageToTrainerSuccessfully() throws Exception {
        StudentNotificationCreateRequest request = new StudentNotificationCreateRequest(
                NotificationType.EXERCISE_QUESTION, "Como fazer o supino?");

        NotificationResponse response = new NotificationResponse(
                notificationId, "Aluno Exemplo", "EXERCISE_QUESTION",
                "Dúvida sobre exercício", "Como fazer o supino?", false, LocalDateTime.now(), null);

        when(notificationService.sendStudentMessage(eq("aluno@lionfitness.com"), any(StudentNotificationCreateRequest.class)))
                .thenReturn(response);

        mvc.perform(post("/notifications/trainer-message")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.id").value(notificationId.toString()))
                .andExpect(jsonPath("$.title").value("Dúvida sobre exercício"))
                .andExpect(jsonPath("$.read").value(false));

        verify(notificationService).sendStudentMessage(eq("aluno@lionfitness.com"), any(StudentNotificationCreateRequest.class));
    }

    @Test
    @WithMockUser(username = "aluno_sem_personal@lionfitness.com", roles = "USER")
    void rejectsStudentMessageWhenNoActiveTrainerAssigned() throws Exception {
        StudentNotificationCreateRequest request = new StudentNotificationCreateRequest(
                NotificationType.EXERCISE_QUESTION, "Mensagem sem personal");

        when(notificationService.sendStudentMessage(eq("aluno_sem_personal@lionfitness.com"), any(StudentNotificationCreateRequest.class)))
                .thenThrow(new ResponseStatusException(HttpStatus.BAD_REQUEST, "Aluno não possui personal trainer vinculado."));

        mvc.perform(post("/notifications/trainer-message")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isBadRequest());
    }

    @Test
    @WithMockUser(username = "personal@lionfitness.com", roles = "PERSONAL_TRAINER")
    void trainerListsOnlyTheirNotifications() throws Exception {
        NotificationResponse item = new NotificationResponse(
                notificationId, "Aluno Exemplo", "EXERCISE_QUESTION",
                "Dúvida", "Como executa?", false, LocalDateTime.now(), null);

        when(notificationService.findMine("personal@lionfitness.com")).thenReturn(List.of(item));

        mvc.perform(get("/notifications"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[0].id").value(notificationId.toString()))
                .andExpect(jsonPath("$[0].senderName").value("Aluno Exemplo"));

        verify(notificationService).findMine("personal@lionfitness.com");
    }

    @Test
    @WithMockUser(username = "aluno@lionfitness.com", roles = "USER")
    void studentListsOnlyTheirNotifications() throws Exception {
        NotificationResponse item = new NotificationResponse(
                notificationId, "Personal Trainer", "PERSONAL_TRAINER_REPLY",
                "Resposta do personal", "Execute com postura reta.", false, LocalDateTime.now(), null);

        when(notificationService.findMine("aluno@lionfitness.com")).thenReturn(List.of(item));

        mvc.perform(get("/notifications"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[0].id").value(notificationId.toString()))
                .andExpect(jsonPath("$[0].type").value("PERSONAL_TRAINER_REPLY"));

        verify(notificationService).findMine("aluno@lionfitness.com");
    }

    @Test
    @WithMockUser(username = "aluno@lionfitness.com", roles = "USER")
    void returnsUnreadNotificationCount() throws Exception {
        when(notificationService.unreadCount("aluno@lionfitness.com"))
                .thenReturn(new UnreadNotificationCountResponse(3));

        mvc.perform(get("/notifications/unread-count"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.count").value(3));

        verify(notificationService).unreadCount("aluno@lionfitness.com");
    }

    @Test
    @WithMockUser(username = "aluno@lionfitness.com", roles = "USER")
    void marksSingleNotificationAsRead() throws Exception {
        NotificationResponse readResponse = new NotificationResponse(
                notificationId, "Personal Trainer", "PERSONAL_TRAINER_REPLY",
                "Resposta", "OK", true, LocalDateTime.now(), LocalDateTime.now());

        when(notificationService.markAsRead("aluno@lionfitness.com", notificationId))
                .thenReturn(readResponse);

        mvc.perform(patch("/notifications/" + notificationId + "/read"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.read").value(true));

        verify(notificationService).markAsRead("aluno@lionfitness.com", notificationId);
    }

    @Test
    @WithMockUser(username = "aluno@lionfitness.com", roles = "USER")
    void marksAllNotificationsAsRead() throws Exception {
        when(notificationService.markAllAsRead("aluno@lionfitness.com"))
                .thenReturn(new MarkAllNotificationsReadResponse(5));

        mvc.perform(patch("/notifications/read-all"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.updated").value(5));

        verify(notificationService).markAllAsRead("aluno@lionfitness.com");
    }

    @Test
    @WithMockUser(username = "personal@lionfitness.com", roles = "PERSONAL_TRAINER")
    void personalTrainerRepliesToValidNotification() throws Exception {
        NotificationReplyRequest replyRequest = new NotificationReplyRequest("Basta manter a coluna reta.");
        NotificationResponse response = new NotificationResponse(
                UUID.randomUUID(), "Personal Trainer", "PERSONAL_TRAINER_REPLY",
                "Resposta do personal", "Basta manter a coluna reta.", false, LocalDateTime.now(), null);

        when(notificationService.replyAsPersonal(eq("personal@lionfitness.com"), eq(notificationId), any(NotificationReplyRequest.class)))
                .thenReturn(response);

        mvc.perform(post("/notifications/" + notificationId + "/reply")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(replyRequest)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.type").value("PERSONAL_TRAINER_REPLY"))
                .andExpect(jsonPath("$.message").value("Basta manter a coluna reta."));

        verify(notificationService).replyAsPersonal(eq("personal@lionfitness.com"), eq(notificationId), any(NotificationReplyRequest.class));
    }

    @Test
    @WithMockUser(username = "aluno@lionfitness.com", roles = "USER")
    void unauthorizedUserCannotReply() throws Exception {
        // Aluno (USER role) não possui role PERSONAL_TRAINER -> deve retornar 403 Forbidden
        NotificationReplyRequest replyRequest = new NotificationReplyRequest("Tentando responder sem ser personal.");

        mvc.perform(post("/notifications/" + notificationId + "/reply")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(replyRequest)))
                .andExpect(status().isForbidden());

        verifyNoInteractions(notificationService);
    }

    @Test
    @WithMockUser(username = "outro_usuario@lionfitness.com", roles = "USER")
    void userCannotAccessOrModifyAnotherUsersNotification() throws Exception {
        when(notificationService.markAsRead("outro_usuario@lionfitness.com", notificationId))
                .thenThrow(new ResponseStatusException(HttpStatus.NOT_FOUND, "Notificação não encontrada."));

        mvc.perform(patch("/notifications/" + notificationId + "/read"))
                .andExpect(status().isNotFound());
    }
}
