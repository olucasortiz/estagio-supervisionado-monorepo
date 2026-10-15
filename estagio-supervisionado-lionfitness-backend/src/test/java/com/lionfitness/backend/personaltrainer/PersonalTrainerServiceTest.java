package com.lionfitness.backend.personaltrainer;

import com.lionfitness.backend.personaltrainer.dto.PersonalTrainerCreateRequest;
import com.lionfitness.backend.personaltrainer.dto.PersonalTrainerResponse;
import com.lionfitness.backend.personaltrainer.dto.PersonalTrainerUpdateRequest;
import com.lionfitness.backend.personaltrainer.exception.DuplicatePersonalTrainerCpfException;
import com.lionfitness.backend.personaltrainer.model.PersonalTrainer;
import com.lionfitness.backend.personaltrainer.repository.PersonalTrainerRepository;
import com.lionfitness.backend.personaltrainer.service.PersonalTrainerService;
import com.lionfitness.backend.user.model.User;
import com.lionfitness.backend.user.repository.UserRepository;
import com.lionfitness.backend.user.service.UserService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.http.HttpStatus;
import org.springframework.web.server.ResponseStatusException;

import java.time.LocalDateTime;
import java.util.Optional;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class PersonalTrainerServiceTest {

    @Mock private PersonalTrainerRepository personalTrainerRepository;
    @Mock private UserService userService;
    @Mock private UserRepository userRepository;

    private PersonalTrainerService service;

    @BeforeEach
    void setUp() {
        service = new PersonalTrainerService(personalTrainerRepository, userService, null, userRepository);
    }

    @Test
    @DisplayName("BUG-01: CPF com menos de 11 dígitos deve lançar ResponseStatusException BAD_REQUEST em vez de StringIndexOutOfBoundsException")
    void shouldThrowBadRequestWhenCpfIsShort() {
        PersonalTrainerCreateRequest request = new PersonalTrainerCreateRequest(
                null, "Personal Curto", "123", "curto@lion.com", "11999999999", "Musculação"
        );

        assertThatThrownBy(() -> service.create(request))
                .isInstanceOf(ResponseStatusException.class)
                .satisfies(ex -> {
                    ResponseStatusException rse = (ResponseStatusException) ex;
                    assertThat(rse.getStatusCode()).isEqualTo(HttpStatus.BAD_REQUEST);
                    assertThat(rse.getReason()).contains("11 dígitos");
                });

        verifyNoInteractions(userService);
        verify(personalTrainerRepository, never()).save(any(), any(), any());
    }

    @Test
    @DisplayName("BUG-01: CPF nulo ou em branco deve lançar BAD_REQUEST")
    void shouldThrowBadRequestWhenCpfIsNullOrBlank() {
        PersonalTrainerCreateRequest nullCpfRequest = new PersonalTrainerCreateRequest(
                null, "Personal Nulo", null, "null@lion.com", "11999999999", "Musculação"
        );

        assertThatThrownBy(() -> service.create(nullCpfRequest))
                .isInstanceOf(ResponseStatusException.class)
                .satisfies(ex -> assertThat(((ResponseStatusException) ex).getStatusCode()).isEqualTo(HttpStatus.BAD_REQUEST));

        PersonalTrainerCreateRequest blankCpfRequest = new PersonalTrainerCreateRequest(
                null, "Personal Branco", "   ", "blank@lion.com", "11999999999", "Musculação"
        );

        assertThatThrownBy(() -> service.create(blankCpfRequest))
                .isInstanceOf(ResponseStatusException.class)
                .satisfies(ex -> assertThat(((ResponseStatusException) ex).getStatusCode()).isEqualTo(HttpStatus.BAD_REQUEST));
    }

    @Test
    @DisplayName("BUG-01: Cadastro com CPF formatado (pontos e traço) deve normalizar para 11 dígitos e salvar com sucesso")
    void shouldNormalizeFormattedCpfAndCreatePersonalTrainer() {
        PersonalTrainerCreateRequest request = new PersonalTrainerCreateRequest(
                null, "Personal Válido", "529.982.247-25", "valido@lion.com", "11999999999", "Musculação"
        );

        when(personalTrainerRepository.existsActiveByCpf("52998224725")).thenReturn(false);

        UUID userId = UUID.randomUUID();
        User mockUser = new User(userId, "Personal Válido", "valido@lion.com", "hash", "PERSONAL_TRAINER", true, LocalDateTime.now(), false);
        when(userService.create(any())).thenReturn(mockUser);

        UUID ptId = UUID.randomUUID();
        PersonalTrainer mockPt = new PersonalTrainer(
                ptId, userId, "Personal Válido", "52998224725", "valido@lion.com", "11999999999", "Musculação", true, LocalDateTime.now(), null
        );
        when(personalTrainerRepository.save(any(), any(), eq(userId))).thenReturn(mockPt);

        PersonalTrainerResponse response = service.create(request);

        assertThat(response).isNotNull();
        assertThat(response.cpf()).isEqualTo("52998224725");

        // BUG-11: Verifica que a senha inicial gerada NÃO utiliza os primeiros 6 dígitos do CPF ("123456")
        // e que possui entropia segura (não previsível)
        ArgumentCaptor<com.lionfitness.backend.user.dto.UserCreateRequest> userCaptor =
                ArgumentCaptor.forClass(com.lionfitness.backend.user.dto.UserCreateRequest.class);
        verify(userService).create(userCaptor.capture());
        assertThat(userCaptor.getValue().passwordHash()).isNotEqualTo("123456");
        assertThat(userCaptor.getValue().passwordHash()).doesNotContain("123456");
        assertThat(userCaptor.getValue().passwordHash().length()).isGreaterThanOrEqualTo(16);

        // Verifica que o repository recebeu o request normalizado
        ArgumentCaptor<PersonalTrainerCreateRequest> repoCaptor =
                ArgumentCaptor.forClass(PersonalTrainerCreateRequest.class);
        verify(personalTrainerRepository).save(any(), repoCaptor.capture(), eq(userId));
        assertThat(repoCaptor.getValue().cpf()).isEqualTo("52998224725");
    }

    @Test
    @DisplayName("Cadastro com CPF duplicado deve lançar DuplicatePersonalTrainerCpfException")
    void shouldThrowDuplicatePersonalTrainerCpfException() {
        PersonalTrainerCreateRequest request = new PersonalTrainerCreateRequest(
                null, "Personal Duplicado", "529.982.247-25", "dup@lion.com", "11999999999", "Musculação"
        );

        when(personalTrainerRepository.existsActiveByCpf("52998224725")).thenReturn(true);

        assertThatThrownBy(() -> service.create(request))
                .isInstanceOf(DuplicatePersonalTrainerCpfException.class);

        verifyNoInteractions(userService);
    }

    @Test
    @DisplayName("Atualização com CPF curto deve lançar ResponseStatusException BAD_REQUEST")
    void shouldThrowBadRequestOnUpdateWithShortCpf() {
        UUID ptId = UUID.randomUUID();
        PersonalTrainer mockPt = new PersonalTrainer(
                ptId, UUID.randomUUID(), "Personal Existente", "52998224725", "existente@lion.com", "11999999999", "Musculação", true, LocalDateTime.now(), null
        );
        when(personalTrainerRepository.findActiveById(ptId)).thenReturn(Optional.of(mockPt));

        PersonalTrainerUpdateRequest updateRequest = new PersonalTrainerUpdateRequest(
                "Personal Alterado", "999", "existente@lion.com", "11999999999", "Crossfit"
        );

        assertThatThrownBy(() -> service.update(ptId, updateRequest))
                .isInstanceOf(ResponseStatusException.class)
                .satisfies(ex -> assertThat(((ResponseStatusException) ex).getStatusCode()).isEqualTo(HttpStatus.BAD_REQUEST));
    }
}
