package com.lionfitness.backend.payment.service;

import com.lionfitness.backend.payment.model.OnlinePaymentTransaction;
import com.lionfitness.backend.payment.model.Payment;
import com.lionfitness.backend.payment.model.PaymentMethod;
import com.lionfitness.backend.payment.model.PaymentStatus;
import com.lionfitness.backend.payment.repository.OnlinePaymentRepository;
import com.lionfitness.backend.payment.repository.PaymentRepository;
import com.lionfitness.backend.subscription.model.Subscription;
import com.lionfitness.backend.subscription.repository.SubscriptionRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;

import java.lang.reflect.Method;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.Optional;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class PaymentAttemptReservationServiceTest {
    @Mock SubscriptionRepository subscriptionRepository;
    @Mock PaymentRepository paymentRepository;
    @Mock OnlinePaymentRepository onlinePaymentRepository;

    private PaymentAttemptReservationService service;
    private final UUID subscriptionId = UUID.randomUUID();
    private final UUID planId = UUID.randomUUID();
    private final BigDecimal price = new BigDecimal("89.90");
    private final String email = "student@testuser.com";

    @BeforeEach
    void setUp() {
        service = new PaymentAttemptReservationService(
                subscriptionRepository, paymentRepository, onlinePaymentRepository);
    }

    @Test
    void cardAndPixReservationsUseRequiresNewTransactions() throws Exception {
        Method card = PaymentAttemptReservationService.class.getMethod(
                "reserveCard", UUID.class, String.class, boolean.class, String.class);
        Method pix = PaymentAttemptReservationService.class.getMethod(
                "reservePix", UUID.class, String.class, boolean.class);
        Method reject = PaymentAttemptReservationService.class.getMethod(
                "rejectUnconfirmedAttempt", UUID.class);

        assertThat(card.getAnnotation(Transactional.class).propagation())
                .isEqualTo(Propagation.REQUIRES_NEW);
        assertThat(pix.getAnnotation(Transactional.class).propagation())
                .isEqualTo(Propagation.REQUIRES_NEW);
        assertThat(reject.getAnnotation(Transactional.class).propagation())
                .isEqualTo(Propagation.REQUIRES_NEW);
    }

    @Test
    void cardReservationPersistsLocalIdentifierAndRequestedIdempotencyKey() {
        String key = UUID.randomUUID().toString();
        stubSubscription();
        when(onlinePaymentRepository.findByIdempotencyKey(key)).thenReturn(Optional.empty());
        Payment payment = payment(PaymentMethod.CREDIT_CARD);
        when(paymentRepository.findPendingBySubscriptionIdAndMethod(subscriptionId, PaymentMethod.CREDIT_CARD))
                .thenReturn(Optional.of(payment));

        PaymentAttemptReservationService.Reservation reservation =
                service.reserveCard(subscriptionId, email, false, key);

        assertThat(reservation.transaction().transactionIdentifier()).startsWith("LOCAL-");
        assertThat(reservation.transaction().idempotencyKey()).isEqualTo(key);
        verify(onlinePaymentRepository).saveWithIdempotencyKey(reservation.transaction(), key);
    }

    @Test
    void pixReservationUsesTransactionIdAsStableIdempotencyKey() {
        stubSubscription();
        when(onlinePaymentRepository.findPendingBySubscriptionIdAndMethod(subscriptionId, "PIX"))
                .thenReturn(Optional.empty());
        Payment payment = payment(PaymentMethod.PIX);
        when(paymentRepository.findPendingBySubscriptionIdAndMethod(subscriptionId, PaymentMethod.PIX))
                .thenReturn(Optional.of(payment));

        PaymentAttemptReservationService.Reservation reservation =
                service.reservePix(subscriptionId, email, false);

        OnlinePaymentTransaction transaction = reservation.transaction();
        assertThat(transaction.transactionIdentifier()).isEqualTo("LOCAL-" + transaction.id());
        assertThat(transaction.idempotencyKey()).isEqualTo(transaction.id().toString());
        verify(onlinePaymentRepository)
                .saveWithIdempotencyKey(transaction, transaction.id().toString());
    }

    @Test
    void rejectsOnlyTheUnconfirmedLocalAttemptThroughRepository() {
        UUID transactionId = UUID.randomUUID();
        when(onlinePaymentRepository.markRejectedIfPendingLocal(transactionId)).thenReturn(true);

        assertThat(service.rejectUnconfirmedAttempt(transactionId)).isTrue();

        verify(onlinePaymentRepository).markRejectedIfPendingLocal(transactionId);
    }

    private void stubSubscription() {
        Subscription subscription = new Subscription(subscriptionId, UUID.randomUUID(), planId,
                LocalDate.now(), LocalDate.now().plusDays(30), "ACTIVE", LocalDateTime.now());
        when(subscriptionRepository.findActiveByIdAndUserEmailForUpdate(subscriptionId, email))
                .thenReturn(Optional.of(subscription));
        when(subscriptionRepository.findActivePlanData(planId))
                .thenReturn(Optional.of(new SubscriptionRepository.PlanSubscriptionData("MONTHLY", 30, price)));
    }

    private Payment payment(PaymentMethod method) {
        return new Payment(UUID.randomUUID(), subscriptionId, price, null,
                method, PaymentStatus.PENDING, LocalDateTime.now());
    }
}
