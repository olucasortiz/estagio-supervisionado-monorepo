package com.lionfitness.backend.workout;

import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;

import com.lionfitness.backend.auth.JwtService;
import com.lionfitness.backend.auth.SecurityConfig;
import com.lionfitness.backend.common.api.PagedResponse;
import com.lionfitness.backend.common.exception.GlobalExceptionHandler;
import com.lionfitness.backend.user.repository.UserRepository;
import com.lionfitness.backend.workout.controller.WorkoutSheetController;
import com.lionfitness.backend.workout.dto.WorkoutSheetResponse;
import com.lionfitness.backend.workout.service.WorkoutService;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.context.annotation.Import;
import org.springframework.http.MediaType;
import org.springframework.security.test.context.support.WithMockUser;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@WebMvcTest(controllers = WorkoutSheetController.class)
@Import({SecurityConfig.class, GlobalExceptionHandler.class})
class WorkoutSheetPaginationApiTest {

    @Autowired
    private MockMvc mvc;

    @MockitoBean
    private WorkoutService workoutService;

    @MockitoBean
    private JwtService jwtService;

    @MockitoBean
    private UserRepository userRepository;

    private final UUID memberId = UUID.randomUUID();
    private final UUID trainerId = UUID.randomUUID();
    private final WorkoutSheetResponse sheet1 = new WorkoutSheetResponse(
            UUID.randomUUID(), memberId, trainerId, "Treino A - Peito", "MONDAY", "Segunda-feira", true, LocalDateTime.now(), 1L
    );
    private final WorkoutSheetResponse sheet2 = new WorkoutSheetResponse(
            UUID.randomUUID(), memberId, trainerId, "Treino B - Costas", "WEDNESDAY", "Quarta-feira", true, LocalDateTime.now(), 1L
    );

    @Test
    @WithMockUser(username = "trainer@lionfitness.com", roles = "PERSONAL_TRAINER")
    @DisplayName("GET /workout-sheets/member/{memberId} sem paginação deve retornar lista crua (retrocompatibilidade)")
    void getWorkoutSheetsByMemberWithoutPaginationReturnsRawList() throws Exception {
        when(workoutService.findWorkoutSheetsByMember("trainer@lionfitness.com", memberId))
                .thenReturn(List.of(sheet1, sheet2));

        mvc.perform(get("/workout-sheets/member/" + memberId).accept(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.length()").value(2))
                .andExpect(jsonPath("$[0].title").value("Treino A - Peito"))
                .andExpect(jsonPath("$[1].title").value("Treino B - Costas"));
    }

    @Test
    @WithMockUser(username = "trainer@lionfitness.com", roles = "PERSONAL_TRAINER")
    @DisplayName("GET /workout-sheets/member/{memberId}?page=0&size=2 retorna PagedResponse formatado")
    void getWorkoutSheetsByMemberWithPaginationReturnsPagedResponse() throws Exception {
        PagedResponse<WorkoutSheetResponse> paged = PagedResponse.of(List.of(sheet1, sheet2), 0, 2, 4);
        when(workoutService.findWorkoutSheetsByMemberPaged("trainer@lionfitness.com", memberId, 0, 2))
                .thenReturn(paged);

        mvc.perform(get("/workout-sheets/member/" + memberId + "?page=0&size=2").accept(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.content.length()").value(2))
                .andExpect(jsonPath("$.page").value(0))
                .andExpect(jsonPath("$.size").value(2))
                .andExpect(jsonPath("$.totalElements").value(4))
                .andExpect(jsonPath("$.totalPages").value(2))
                .andExpect(jsonPath("$.first").value(true))
                .andExpect(jsonPath("$.last").value(false));
    }

    @Test
    @WithMockUser(username = "trainer@lionfitness.com", roles = "PERSONAL_TRAINER")
    @DisplayName("GET /workout-sheets/member/{memberId}?page=10&size=10 com página vazia retorna content=[] e totalElements=0")
    void getWorkoutSheetsByMemberWithEmptyPageReturnsEmptyContent() throws Exception {
        PagedResponse<WorkoutSheetResponse> empty = PagedResponse.of(List.of(), 10, 10, 0);
        when(workoutService.findWorkoutSheetsByMemberPaged("trainer@lionfitness.com", memberId, 10, 10))
                .thenReturn(empty);

        mvc.perform(get("/workout-sheets/member/" + memberId + "?page=10&size=10").accept(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.content.length()").value(0))
                .andExpect(jsonPath("$.totalElements").value(0))
                .andExpect(jsonPath("$.totalPages").value(0));
    }

    @Test
    @WithMockUser(username = "trainer@lionfitness.com", roles = "PERSONAL_TRAINER")
    @DisplayName("GET /workout-sheets/member/{memberId}?page=-1 deve retornar HTTP 400 Bad Request")
    void getWorkoutSheetsWithNegativePageReturns400() throws Exception {
        mvc.perform(get("/workout-sheets/member/" + memberId + "?page=-1&size=10"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.status").value(400))
                .andExpect(jsonPath("$.message").value("O parâmetro 'page' não pode ser negativo."));
    }

    @Test
    @WithMockUser(username = "trainer@lionfitness.com", roles = "PERSONAL_TRAINER")
    @DisplayName("GET /workout-sheets/member/{memberId}?size=0 deve retornar HTTP 400 Bad Request")
    void getWorkoutSheetsWithSizeZeroReturns400() throws Exception {
        mvc.perform(get("/workout-sheets/member/" + memberId + "?page=0&size=0"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.status").value(400))
                .andExpect(jsonPath("$.message").value("O parâmetro 'size' deve estar entre 1 e 100."));
    }

    @Test
    @WithMockUser(username = "trainer@lionfitness.com", roles = "PERSONAL_TRAINER")
    @DisplayName("GET /workout-sheets/member/{memberId}?size=101 deve retornar HTTP 400 Bad Request")
    void getWorkoutSheetsWithSizeOverMaxReturns400() throws Exception {
        mvc.perform(get("/workout-sheets/member/" + memberId + "?page=0&size=101"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.status").value(400))
                .andExpect(jsonPath("$.message").value("O parâmetro 'size' deve estar entre 1 e 100."));
    }

    @Test
    @WithMockUser(roles = "USER")
    @DisplayName("RBAC: Aluno comum (USER) não tem permissão para listar fichas de treino diretamente (HTTP 403)")
    void studentRoleCannotListWorkoutSheets() throws Exception {
        mvc.perform(get("/workout-sheets/member/" + memberId))
                .andExpect(status().isForbidden());
    }

    @Test
    @WithMockUser(username = "admin@lionfitness.com", roles = "ADMIN")
    @DisplayName("RBAC: Administrador (ADMIN) tem permissão para listar fichas de treino")
    void adminCanListWorkoutSheets() throws Exception {
        when(workoutService.findWorkoutSheetsByMember("admin@lionfitness.com", memberId))
                .thenReturn(List.of(sheet1));

        mvc.perform(get("/workout-sheets/member/" + memberId))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.length()").value(1));
    }
}
