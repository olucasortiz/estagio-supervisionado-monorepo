package com.lionfitness.backend.plan;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;

import com.lionfitness.backend.auth.JwtService;
import com.lionfitness.backend.auth.SecurityConfig;
import com.lionfitness.backend.common.api.PagedResponse;
import com.lionfitness.backend.common.exception.GlobalExceptionHandler;
import com.lionfitness.backend.plan.controller.PlanController;
import com.lionfitness.backend.plan.dto.PlanResponse;
import com.lionfitness.backend.plan.model.PlanType;
import com.lionfitness.backend.plan.service.PlanService;
import com.lionfitness.backend.user.repository.UserRepository;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.context.annotation.Import;
import org.springframework.http.MediaType;
import org.springframework.security.test.context.support.WithMockUser;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;

import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@WebMvcTest(controllers = PlanController.class)
@Import({SecurityConfig.class, GlobalExceptionHandler.class})
class PlanPaginationApiTest {

    @Autowired
    private MockMvc mvc;

    @MockitoBean
    private PlanService planService;

    @MockitoBean
    private JwtService jwtService;

    @MockitoBean
    private UserRepository userRepository;

    private final PlanResponse plan1 = new PlanResponse(
            UUID.randomUUID(), "Plano Mensal", PlanType.MONTHLY, new BigDecimal("100.00"), 30, true, LocalDateTime.now()
    );
    private final PlanResponse plan2 = new PlanResponse(
            UUID.randomUUID(), "Plano Anual", PlanType.MONTHLY, new BigDecimal("1000.00"), 365, true, LocalDateTime.now()
    );

    @Test
    @WithMockUser(roles = "ADMIN")
    void zeroPriceIsAlreadyRejectedOnCreate() throws Exception {
        mvc.perform(org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post("/plans")
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"name\":\"Plano zero\",\"type\":\"MONTHLY\",\"price\":0,\"durationDays\":30}"))
                .andExpect(status().isBadRequest()).andExpect(jsonPath("status").value(400));
        org.mockito.Mockito.verifyNoInteractions(planService);
    }

    @Test
    @WithMockUser(roles = "ADMIN")
    void zeroPriceIsAlreadyRejectedOnUpdate() throws Exception {
        mvc.perform(org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put("/plans/" + UUID.randomUUID())
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"name\":\"Plano zero\",\"type\":\"MONTHLY\",\"price\":0,\"durationDays\":30}"))
                .andExpect(status().isBadRequest()).andExpect(jsonPath("status").value(400));
        org.mockito.Mockito.verifyNoInteractions(planService);
    }

    @Test
    @WithMockUser(roles = "USER")
    @DisplayName("GET /plans sem parâmetros de paginação deve retornar lista crua (retrocompatibilidade)")
    void getPlansWithoutPaginationReturnsRawList() throws Exception {
        when(planService.findAll()).thenReturn(List.of(plan1, plan2));

        mvc.perform(get("/plans").accept(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.length()").value(2))
                .andExpect(jsonPath("$[0].name").value("Plano Mensal"))
                .andExpect(jsonPath("$[1].name").value("Plano Anual"));
    }

    @Test
    @WithMockUser(roles = "USER")
    @DisplayName("GET /plans?page=0&size=2 retorna PagedResponse formatado")
    void getPlansWithPaginationReturnsPagedResponse() throws Exception {
        PagedResponse<PlanResponse> paged = PagedResponse.of(List.of(plan1, plan2), 0, 2, 5);
        when(planService.findPaged(0, 2)).thenReturn(paged);

        mvc.perform(get("/plans?page=0&size=2").accept(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.content.length()").value(2))
                .andExpect(jsonPath("$.page").value(0))
                .andExpect(jsonPath("$.size").value(2))
                .andExpect(jsonPath("$.totalElements").value(5))
                .andExpect(jsonPath("$.totalPages").value(3))
                .andExpect(jsonPath("$.first").value(true))
                .andExpect(jsonPath("$.last").value(false));
    }

    @Test
    @WithMockUser(roles = "USER")
    @DisplayName("GET /plans?page=10&size=10 com página vazia retorna content=[] e totalElements=0")
    void getPlansWithEmptyPageReturnsEmptyContent() throws Exception {
        PagedResponse<PlanResponse> emptyPaged = PagedResponse.of(List.of(), 10, 10, 0);
        when(planService.findPaged(10, 10)).thenReturn(emptyPaged);

        mvc.perform(get("/plans?page=10&size=10").accept(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.content.length()").value(0))
                .andExpect(jsonPath("$.totalElements").value(0))
                .andExpect(jsonPath("$.totalPages").value(0));
    }

    @Test
    @WithMockUser(roles = "USER")
    @DisplayName("GET /plans?page=-1 deve retornar HTTP 400 Bad Request")
    void getPlansWithNegativePageReturns400() throws Exception {
        mvc.perform(get("/plans?page=-1&size=10"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.status").value(400))
                .andExpect(jsonPath("$.message").value("O parâmetro 'page' não pode ser negativo."));
    }

    @Test
    @WithMockUser(roles = "USER")
    @DisplayName("GET /plans?size=0 deve retornar HTTP 400 Bad Request")
    void getPlansWithSizeZeroReturns400() throws Exception {
        mvc.perform(get("/plans?page=0&size=0"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.status").value(400))
                .andExpect(jsonPath("$.message").value("O parâmetro 'size' deve estar entre 1 e 100."));
    }

    @Test
    @WithMockUser(roles = "USER")
    @DisplayName("GET /plans?size=101 deve retornar HTTP 400 Bad Request (limite máximo excedido)")
    void getPlansWithSizeOverMaxReturns400() throws Exception {
        mvc.perform(get("/plans?page=0&size=101"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.status").value(400))
                .andExpect(jsonPath("$.message").value("O parâmetro 'size' deve estar entre 1 e 100."));
    }

    @Test
    @DisplayName("GET /plans sem autenticação deve retornar 401 ou 403")
    void unauthenticatedCannotAccessPlans() throws Exception {
        mvc.perform(get("/plans")).andExpect(status().is4xxClientError());
    }
}
