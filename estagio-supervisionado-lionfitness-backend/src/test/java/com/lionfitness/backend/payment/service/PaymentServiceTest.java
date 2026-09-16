package com.lionfitness.backend.payment.service;

import java.math.BigDecimal;
import java.time.Clock;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.ZoneId;
import java.util.Optional;
import java.util.UUID;

import com.lionfitness.backend.payment.dto.PaymentCreateRequest;
import com.lionfitness.backend.payment.dto.PaymentResponse;
import com.lionfitness.backend.payment.dto.PaymentUpdateRequest;
import com.lionfitness.backend.payment.model.Payment;
import com.lionfitness.backend.payment.model.PaymentMethod;
import com.lionfitness.backend.payment.model.PaymentStatus;
import com.lionfitness.backend.payment.repository.PaymentRepository;
import com.lionfitness.backend.subscription.exception.SubscriptionRenewalNotAvailableException;
import com.lionfitness.backend.subscription.model.Subscription;
import com.lionfitness.backend.subscription.repository.SubscriptionRepository;
import com.lionfitness.backend.subscription.service.SubscriptionRenewalEligibilityService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class PaymentServiceTest {

    private static final ZoneId ZONE = ZoneId.of("America/Sao_Paulo");

    @Mock
    private PaymentRepository paymentRepository;

    @Mock
    private SubscriptionRepository subscriptionRepository;

    private Clock clock;
    private SubscriptionRenewalEligibilityService renewalEligibilityService;
    private PaymentService paymentService;

    private final UUID subscriptionId = UUID.randomUUID();
    private final UUID paymentId = UUID.randomUUID();
    private final BigDecimal amount = new BigDecimal("120.00");
    private final LocalDate today = LocalDate.of(2026, 10, 20);

    @BeforeEach
    void setUp() {
        clock = Clock.fixed(today.atStartOfDay(ZONE).toInstant(), ZONE);
        renewalEligibilityService = new SubscriptionRenewalEligibilityService(clock);
        paymentService = new PaymentService(paymentRepository, subscriptionRepository, renewalEligibilityService, clock);
    }

    @Test
    void blocksManualPaidRenewalWhenMoreThanFiveDaysRemain() {
        // subscription expires in 10 days (2026-10-30)
        LocalDate endDate = today.plusDays(10);
        Subscription subscription = new Subscription(subscriptionId, UUID.randomUUID(), UUID.randomUUID(),
                today.minusDays(20), endDate, "ACTIVE", LocalDateTime.now());

        when(paymentRepository.subscriptionExists(subscriptionId)).thenReturn(true);
        when(subscriptionRepository.findActiveById(subscriptionId)).thenReturn(Optional.of(subscription));
        when(paymentRepository.hasPaidPaymentBySubscriptionId(subscriptionId)).thenReturn(true);

        PaymentCreateRequest request = new PaymentCreateRequest(
                subscriptionId, amount, today, "CASH", "PAID");

        assertThatThrownBy(() -> paymentService.create(request))
                .isInstanceOf(SubscriptionRenewalNotAvailableException.class);

        verify(paymentRepository, never()).save(any(), any(), any(), any(), any(), any());
        verify(subscriptionRepository, never()).renewSubscription(any(), any());
    }

    @Test
    void allowsManualPaidRenewalWhenWithinFiveDays() {
        // subscription expires in 5 days (2026-10-25)
        LocalDate endDate = today.plusDays(5);
        Subscription subscription = new Subscription(subscriptionId, UUID.randomUUID(), UUID.randomUUID(),
                today.minusDays(25), endDate, "ACTIVE", LocalDateTime.now());

        when(paymentRepository.subscriptionExists(subscriptionId)).thenReturn(true);
        when(subscriptionRepository.findActiveById(subscriptionId)).thenReturn(Optional.of(subscription));
        when(paymentRepository.hasPaidPaymentBySubscriptionId(subscriptionId)).thenReturn(true);
        when(paymentRepository.save(any(), eq(subscriptionId), eq(amount), eq(today), eq(PaymentMethod.CASH), eq(PaymentStatus.PAID)))
                .thenReturn(new Payment(paymentId, subscriptionId, amount, today, PaymentMethod.CASH, PaymentStatus.PAID, LocalDateTime.now()));
        when(subscriptionRepository.renewSubscription(subscriptionId, today)).thenReturn(true);

        PaymentCreateRequest request = new PaymentCreateRequest(
                subscriptionId, amount, today, "CASH", "PAID");

        PaymentResponse response = paymentService.create(request);

        assertThat(response).isNotNull();
        assertThat(response.id()).isEqualTo(paymentId);
        verify(subscriptionRepository).renewSubscription(subscriptionId, today);
    }

    @Test
    void allowsManualPaidRenewalWhenExpired() {
        // subscription expired 2 days ago (2026-10-18)
        LocalDate endDate = today.minusDays(2);
        Subscription subscription = new Subscription(subscriptionId, UUID.randomUUID(), UUID.randomUUID(),
                today.minusDays(32), endDate, "EXPIRED", LocalDateTime.now());

        when(paymentRepository.subscriptionExists(subscriptionId)).thenReturn(true);
        when(subscriptionRepository.findActiveById(subscriptionId)).thenReturn(Optional.of(subscription));
        when(paymentRepository.hasPaidPaymentBySubscriptionId(subscriptionId)).thenReturn(false);
        when(paymentRepository.save(any(), eq(subscriptionId), eq(amount), eq(today), eq(PaymentMethod.CASH), eq(PaymentStatus.PAID)))
                .thenReturn(new Payment(paymentId, subscriptionId, amount, today, PaymentMethod.CASH, PaymentStatus.PAID, LocalDateTime.now()));
        when(subscriptionRepository.renewSubscription(subscriptionId, today)).thenReturn(true);

        PaymentCreateRequest request = new PaymentCreateRequest(
                subscriptionId, amount, today, "CASH", "PAID");

        PaymentResponse response = paymentService.create(request);

        assertThat(response).isNotNull();
        verify(subscriptionRepository).renewSubscription(subscriptionId, today);
    }

    @Test
    void allowsNonPaidPaymentWithoutRenewalCheck() {
        when(paymentRepository.subscriptionExists(subscriptionId)).thenReturn(true);
        when(paymentRepository.save(any(), eq(subscriptionId), eq(amount), eq(today), eq(PaymentMethod.ONLINE_GATEWAY), eq(PaymentStatus.PENDING)))
                .thenReturn(new Payment(paymentId, subscriptionId, amount, today, PaymentMethod.ONLINE_GATEWAY, PaymentStatus.PENDING, LocalDateTime.now()));

        PaymentCreateRequest request = new PaymentCreateRequest(
                subscriptionId, amount, today, "BOLETO", "PENDING");

        PaymentResponse response = paymentService.create(request);

        assertThat(response).isNotNull();
        verify(subscriptionRepository, never()).renewSubscription(any(), any());
    }

    @Test
    void allowsInitialPaidPaymentWithoutRenewalProrationWhenNoPriorPaidAndActive() {
        // Active subscription with 20 days left, but NO prior paid payment (initial fee payment)
        LocalDate endDate = today.plusDays(20);
        Subscription subscription = new Subscription(subscriptionId, UUID.randomUUID(), UUID.randomUUID(),
                today, endDate, "ACTIVE", LocalDateTime.now());

        when(paymentRepository.subscriptionExists(subscriptionId)).thenReturn(true);
        when(subscriptionRepository.findActiveById(subscriptionId)).thenReturn(Optional.of(subscription));
        when(paymentRepository.hasPaidPaymentBySubscriptionId(subscriptionId)).thenReturn(false);
        when(paymentRepository.save(any(), eq(subscriptionId), eq(amount), eq(today), eq(PaymentMethod.CASH), eq(PaymentStatus.PAID)))
                .thenReturn(new Payment(paymentId, subscriptionId, amount, today, PaymentMethod.CASH, PaymentStatus.PAID, LocalDateTime.now()));

        PaymentCreateRequest request = new PaymentCreateRequest(
                subscriptionId, amount, today, "CASH", "PAID");

        PaymentResponse response = paymentService.create(request);

        assertThat(response).isNotNull();
        verify(subscriptionRepository, never()).renewSubscription(any(), any());
    }

    @Test
    void updatePaymentToPaidRenewsSubscriptionIfEligibleRenewal() {
        LocalDate endDate = today.plusDays(3); // eligible (3 <= 5)
        Subscription subscription = new Subscription(subscriptionId, UUID.randomUUID(), UUID.randomUUID(),
                today.minusDays(27), endDate, "ACTIVE", LocalDateTime.now());

        Payment existing = new Payment(paymentId, subscriptionId, amount, null, PaymentMethod.CASH, PaymentStatus.PENDING, LocalDateTime.now());
        when(paymentRepository.findActiveById(paymentId)).thenReturn(Optional.of(existing));
        when(paymentRepository.subscriptionExists(subscriptionId)).thenReturn(true);
        when(subscriptionRepository.findActiveById(subscriptionId)).thenReturn(Optional.of(subscription));
        when(paymentRepository.hasPaidPaymentBySubscriptionId(subscriptionId)).thenReturn(true);
        when(subscriptionRepository.renewSubscription(subscriptionId, today)).thenReturn(true);

        PaymentUpdateRequest request = new PaymentUpdateRequest(subscriptionId, amount, today, "CASH", "PAID");
        PaymentResponse response = paymentService.update(paymentId, request);

        verify(paymentRepository).update(paymentId, subscriptionId, amount, today, PaymentMethod.CASH, PaymentStatus.PAID);
        verify(subscriptionRepository).renewSubscription(subscriptionId, today);
    }
}
