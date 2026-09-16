package com.lionfitness.backend.member.service;

import com.lionfitness.backend.cancellationrecord.dto.CancellationRequest;
import com.lionfitness.backend.cancellationrecord.exception.CancellationBlockedException;
import com.lionfitness.backend.cancellationrecord.model.CancellationRecord;
import com.lionfitness.backend.cancellationrecord.repository.CancellationRecordRepository;
import com.lionfitness.backend.member.repository.MemberRepository;
import com.lionfitness.backend.payment.repository.PaymentRepository;
import com.lionfitness.backend.personaltrainer.repository.PersonalTrainerRepository;
import com.lionfitness.backend.user.repository.UserRepository;
import com.lionfitness.backend.user.service.UserService;
import com.lionfitness.backend.workout.repository.WorkoutRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.core.RowMapper;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class MemberCancellationTest {
    @Mock MemberRepository memberRepository;
    @Mock PaymentRepository paymentRepository;
    @Mock CancellationRecordRepository cancellationRecordRepository;
    @Mock JdbcTemplate jdbcTemplate;
    @Mock UserRepository userRepository;
    @Mock PasswordEncoder passwordEncoder;
    @Mock WorkoutRepository workoutRepository;
    @Mock UserService userService;
    @Mock PersonalTrainerRepository personalTrainerRepository;

    private MemberService service;
    private final UUID memberId = UUID.randomUUID();

    @BeforeEach
    void setUp() {
        service = new MemberService(memberRepository, paymentRepository, cancellationRecordRepository,
                jdbcTemplate, userRepository, passwordEncoder, workoutRepository, userService,
                personalTrainerRepository);
    }

    @Test
    void cancelWithoutDebtCreatesRecordAndDeactivatesMember() {
        activeMember();
        when(paymentRepository.hasPendingOrOverdueByMemberId(memberId)).thenReturn(false);
        when(cancellationRecordRepository.save(any(UUID.class), eq(memberId), any(LocalDateTime.class), eq("Pedido")))
                .thenAnswer(invocation -> new CancellationRecord(invocation.getArgument(0), memberId,
                        invocation.getArgument(2), "Pedido", LocalDateTime.now()));
        when(memberRepository.softDelete(memberId)).thenReturn(true);

        service.cancel(memberId, new CancellationRequest("Pedido"));

        verify(cancellationRecordRepository).save(any(UUID.class), eq(memberId), any(LocalDateTime.class), eq("Pedido"));
        verify(memberRepository).softDelete(memberId);
    }

    @Test
    void pendingPaymentBlocksCancellationWithoutMutations() {
        assertDebtBlocksCancellation();
    }

    @Test
    void overduePaymentBlocksCancellationWithoutMutations() {
        assertDebtBlocksCancellation();
    }

    @Test
    void simpleDeleteCannotBypassDebtRule() {
        activeMember();
        when(paymentRepository.hasPendingOrOverdueByMemberId(memberId)).thenReturn(true);

        assertThatThrownBy(() -> service.delete(memberId)).isInstanceOf(CancellationBlockedException.class);
        verify(memberRepository, never()).softDelete(any());
    }

    @Test
    void cancellationAndDeleteAreTransactional() throws Exception {
        assertThat(MemberService.class.getMethod("cancel", UUID.class, CancellationRequest.class)
                .isAnnotationPresent(Transactional.class)).isTrue();
        assertThat(MemberService.class.getMethod("delete", UUID.class)
                .isAnnotationPresent(Transactional.class)).isTrue();
    }

    private void assertDebtBlocksCancellation() {
        activeMember();
        when(paymentRepository.hasPendingOrOverdueByMemberId(memberId)).thenReturn(true);

        assertThatThrownBy(() -> service.cancel(memberId, new CancellationRequest("Pedido")))
                .isInstanceOf(CancellationBlockedException.class);

        verifyNoInteractions(cancellationRecordRepository);
        verify(memberRepository, never()).softDelete(any());
    }

    @SuppressWarnings("unchecked")
    private void activeMember() {
        when(jdbcTemplate.query(eq("SELECT is_active FROM members WHERE id = ? FOR UPDATE"),
                any(RowMapper.class), eq(memberId))).thenReturn(List.of(true));
        when(jdbcTemplate.query(eq("SELECT id FROM subscriptions WHERE member_id = ? FOR UPDATE"),
                any(RowMapper.class), eq(memberId))).thenReturn(List.of());
    }
}
