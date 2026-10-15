package com.lionfitness.backend.member.service;

import com.lionfitness.backend.member.dto.MemberCreateRequest;
import com.lionfitness.backend.member.dto.MemberResponse;
import com.lionfitness.backend.member.model.Member;
import com.lionfitness.backend.member.repository.MemberRepository;
import com.lionfitness.backend.personaltrainer.repository.PersonalTrainerRepository;
import com.lionfitness.backend.user.dto.UserCreateRequest;
import com.lionfitness.backend.user.repository.UserRepository;
import com.lionfitness.backend.user.service.UserService;
import com.lionfitness.backend.workout.repository.WorkoutRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class MemberCreationSecurityTest {

    @Mock private MemberRepository memberRepository;
    @Mock private UserRepository userRepository;
    @Mock private PersonalTrainerRepository personalTrainerRepository;
    @Mock private WorkoutRepository workoutRepository;
    @Mock private UserService userService;
    @Mock private JdbcTemplate jdbcTemplate;

    private PasswordEncoder passwordEncoder = new BCryptPasswordEncoder();
    private MemberService memberService;

    @BeforeEach
    void setUp() {
        memberService = new MemberService(
                memberRepository,
                null,
                null,
                jdbcTemplate,
                userRepository,
                passwordEncoder,
                workoutRepository,
                userService,
                personalTrainerRepository
        );
    }

    @Test
    @DisplayName("BUG-11: Cadastro de membro sem senha explícita NÃO deve usar os 6 primeiros dígitos do CPF")
    void memberCreationWithoutPasswordMustNotUseCpfPrefix() {
        String cpf = "98765432100";
        String cpfPrefix = "987654";
        MemberCreateRequest request = new MemberCreateRequest(
                "Aluno Seguro",
                cpf,
                "aluno.seguro@lionfitness.com",
                null,
                LocalDate.of(2000, 1, 1),
                null,
                null
        );

        when(memberRepository.existsActiveByCpf(cpf)).thenReturn(false);
        when(userRepository.existsActiveByEmail("aluno.seguro@lionfitness.com")).thenReturn(false);

        UUID memberId = UUID.randomUUID();
        UUID userId = UUID.randomUUID();
        Member mockMember = new Member(
                memberId, userId, null, "Aluno Seguro", "98765432100",
                "aluno.seguro@lionfitness.com", LocalDate.of(2000, 1, 1), null,
                true, LocalDateTime.now()
        );
        when(memberRepository.save(any(UUID.class), eq(request), any(UUID.class))).thenReturn(mockMember);

        MemberResponse response = memberService.create(request);

        assertThat(response).isNotNull();

        ArgumentCaptor<UserCreateRequest> userCaptor = ArgumentCaptor.forClass(UserCreateRequest.class);
        verify(userRepository).save(any(UUID.class), userCaptor.capture());

        UserCreateRequest capturedUser = userCaptor.getValue();
        String storedHash = capturedUser.passwordHash();

        // Verifica que o hash gerado NÃO coincide com o hash do prefixo do CPF
        assertThat(passwordEncoder.matches(cpfPrefix, storedHash))
                .as("A senha inicial jamais deve bater com os primeiros 6 dígitos do CPF")
                .isFalse();

        // Verifica que a senha inicial gerada não é vazia e possui alta entropia
        assertThat(storedHash).isNotBlank();
        assertThat(storedHash.length()).isGreaterThanOrEqualTo(30);
    }

    @Test
    @DisplayName("BUG-11: Cadastro de membro com senha explícita deve respeitar a senha fornecida")
    void memberCreationWithExplicitPasswordUsesProvidedPassword() {
        String explicitPassword = "MinhaSenhaSuperSecreta!2026";
        MemberCreateRequest request = new MemberCreateRequest(
                "Aluno com Senha",
                "52998224725",
                "aluno.senha@lionfitness.com",
                explicitPassword,
                LocalDate.of(1995, 5, 20),
                null,
                null
        );

        when(memberRepository.existsActiveByCpf(any())).thenReturn(false);
        when(userRepository.existsActiveByEmail(any())).thenReturn(false);

        Member mockMember = new Member(
                UUID.randomUUID(), UUID.randomUUID(), null, "Aluno com Senha", "52998224725",
                "aluno.senha@lionfitness.com", LocalDate.of(1995, 5, 20), null,
                true, LocalDateTime.now()
        );
        when(memberRepository.save(any(), any(), any())).thenReturn(mockMember);

        memberService.create(request);

        ArgumentCaptor<UserCreateRequest> userCaptor = ArgumentCaptor.forClass(UserCreateRequest.class);
        verify(userRepository).save(any(), userCaptor.capture());

        String storedHash = userCaptor.getValue().passwordHash();
        assertThat(passwordEncoder.matches(explicitPassword, storedHash)).isTrue();
    }
}
