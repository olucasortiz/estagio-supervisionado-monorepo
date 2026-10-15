package com.lionfitness.backend.subscription.service;

import java.math.BigDecimal;
import java.time.Clock;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.ZoneId;
import java.util.Optional;
import java.util.UUID;

import com.lionfitness.backend.payment.repository.PaymentRepository;
import com.lionfitness.backend.subscription.dto.SubscriptionCreateRequest;
import com.lionfitness.backend.subscription.dto.SubscriptionResponse;
import com.lionfitness.backend.subscription.model.Subscription;
import com.lionfitness.backend.subscription.repository.SubscriptionRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class SubscriptionServiceTest {

    private static final ZoneId ZONE = ZoneId.of("America/Sao_Paulo");

    @Mock
    private SubscriptionRepository subscriptionRepository;

    @Mock
    private PaymentRepository paymentRepository;

    private Clock clock;
    private SubscriptionRenewalEligibilityService renewalEligibilityService;
    private SubscriptionService subscriptionService;

    private final UUID memberId = UUID.randomUUID();
    private final UUID planId = UUID.randomUUID();
    private final UUID subscriptionId = UUID.randomUUID();
    private final LocalDate today = LocalDate.of(2026, 10, 20);

    @BeforeEach
    void setUp() {
        clock = Clock.fixed(today.atStartOfDay(ZONE).toInstant(), ZONE);
        renewalEligibilityService = new SubscriptionRenewalEligibilityService(clock);
        subscriptionService = new SubscriptionService(subscriptionRepository, paymentRepository, renewalEligibilityService);
    }

    @Test
    void createsSubscriptionAndPendingPaymentWhenNotDuplicate() {
        SubscriptionRepository.PlanSubscriptionData planData =
                new SubscriptionRepository.PlanSubscriptionData("MONTHLY", 30, new BigDecimal("100.00"));

        when(subscriptionRepository.memberExists(memberId)).thenReturn(true);
        when(subscriptionRepository.findActivePlanData(planId)).thenReturn(Optional.of(planData));
        when(subscriptionRepository.findRecentDuplicate(eq(memberId), eq(planId), eq(today), any()))
                .thenReturn(Optional.empty());

        LocalDate endDate = today.plusDays(30);
        Subscription createdSub = new Subscription(subscriptionId, memberId, planId, today, endDate, "ACTIVE", LocalDateTime.now());
        when(subscriptionRepository.save(any(), any(), eq(endDate))).thenReturn(createdSub);

        SubscriptionCreateRequest request = new SubscriptionCreateRequest(memberId, planId, today);
        SubscriptionResponse response = subscriptionService.create(request);

        assertThat(response).isNotNull();
        assertThat(response.id()).isEqualTo(subscriptionId);
        assertThat(response.memberId()).isEqualTo(memberId);
        verify(subscriptionRepository).save(any(), eq(request), eq(endDate));
        verify(paymentRepository).save(any(), eq(subscriptionId), eq(new BigDecimal("100.00")), eq(null), any(), any());
    }

    @Test
    void duplicateSubscriptionSubmissionReturnsExistingSubscriptionWithoutDuplicatePayment() {
        SubscriptionRepository.PlanSubscriptionData planData =
                new SubscriptionRepository.PlanSubscriptionData("MONTHLY", 30, new BigDecimal("100.00"));

        when(subscriptionRepository.memberExists(memberId)).thenReturn(true);
        when(subscriptionRepository.findActivePlanData(planId)).thenReturn(Optional.of(planData));

        LocalDate endDate = today.plusDays(30);
        Subscription existingSub = new Subscription(subscriptionId, memberId, planId, today, endDate, "ACTIVE", LocalDateTime.now());
        when(subscriptionRepository.findRecentDuplicate(eq(memberId), eq(planId), eq(today), any()))
                .thenReturn(Optional.of(existingSub));

        SubscriptionCreateRequest request = new SubscriptionCreateRequest(memberId, planId, today);
        SubscriptionResponse response = subscriptionService.create(request);

        assertThat(response).isNotNull();
        assertThat(response.id()).isEqualTo(subscriptionId);

        // Verify that duplicate is NOT inserted and duplicate pending payment is NOT created
        verify(subscriptionRepository, never()).save(any(), any(), any());
        verify(paymentRepository, never()).save(any(), any(), any(), any(), any(), any());
    }
}
