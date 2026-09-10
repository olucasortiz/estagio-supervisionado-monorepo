package com.lionfitness.backend.payment.service;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.lionfitness.backend.payment.mercadopago.MercadoPagoOrder;
import com.lionfitness.backend.payment.model.OnlinePaymentTransaction;
import com.lionfitness.backend.payment.repository.OnlinePaymentRepository;
import com.lionfitness.backend.payment.repository.PaymentRepository;
import com.lionfitness.backend.subscription.repository.SubscriptionRepository;
import org.junit.jupiter.api.Test;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

class PaymentSettlementServiceTest {

    private final OnlinePaymentRepository onlineRepository = mock(OnlinePaymentRepository.class);
    private final PaymentRepository paymentRepository = mock(PaymentRepository.class);
    private final SubscriptionRepository subscriptionRepository = mock(SubscriptionRepository.class);
    private final PaymentSettlementService service = new PaymentSettlementService(
            onlineRepository, paymentRepository, subscriptionRepository, new ObjectMapper());

    @Test
    void duplicateSynchronousAndWebhookSettlementRenewsOnlyOnce() {
        UUID txId = UUID.randomUUID();
        UUID paymentId = UUID.randomUUID();
        UUID subscriptionId = UUID.randomUUID();
        BigDecimal amount = new BigDecimal("89.90");
        OnlinePaymentTransaction pending = transaction(txId, paymentId, subscriptionId, amount, "PENDING");
        OnlinePaymentTransaction approved = transaction(txId, paymentId, subscriptionId, amount, "APPROVED");
        when(onlineRepository.findByIdForUpdate(txId)).thenReturn(Optional.of(pending), Optional.of(approved));
        when(onlineRepository.updateOrderStateIfNotApproved(eq(txId), eq("ORD-1"), eq("APPROVED"), any(), anyString()))
                .thenReturn(true);
        when(paymentRepository.markAsPaid(eq(paymentId), any())).thenReturn(true);
        when(subscriptionRepository.renewSubscription(subscriptionId)).thenReturn(true);
        MercadoPagoOrder order = approvedOrder(txId, amount);

        PaymentSettlementService.SettlementResult first = service.synchronize(txId, order);
        PaymentSettlementService.SettlementResult duplicate = service.synchronize(txId, order);

        assertThat(first.renewed()).isTrue();
        assertThat(duplicate.renewed()).isFalse();
        verify(paymentRepository, times(1)).markAsPaid(eq(paymentId), any());
        verify(subscriptionRepository, times(1)).renewSubscription(subscriptionId);
    }

    @Test
    void amountMismatchNeverSettles() {
        UUID txId = UUID.randomUUID();
        OnlinePaymentTransaction pending = transaction(txId, UUID.randomUUID(), UUID.randomUUID(),
                new BigDecimal("89.90"), "PENDING");
        when(onlineRepository.findByIdForUpdate(txId)).thenReturn(Optional.of(pending));

        assertThatThrownBy(() -> service.synchronize(txId, approvedOrder(txId, new BigDecimal("1.00"))))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("total_amount");
        verifyNoInteractions(paymentRepository, subscriptionRepository);
    }

    @Test
    void alreadyPaidPaymentPreventsRenewalFromAnotherConcurrentAttempt() {
        UUID txId = UUID.randomUUID();
        UUID paymentId = UUID.randomUUID();
        UUID subscriptionId = UUID.randomUUID();
        BigDecimal amount = new BigDecimal("89.90");
        when(onlineRepository.findByIdForUpdate(txId)).thenReturn(Optional.of(
                transaction(txId, paymentId, subscriptionId, amount, "PENDING")));
        when(onlineRepository.updateOrderStateIfNotApproved(eq(txId), eq("ORD-1"),
                eq("APPROVED"), any(), anyString())).thenReturn(true);
        when(paymentRepository.markAsPaid(eq(paymentId), any())).thenReturn(false);

        PaymentSettlementService.SettlementResult result = service.synchronize(txId, approvedOrder(txId, amount));

        assertThat(result.renewed()).isFalse();
        verify(subscriptionRepository, never()).renewSubscription(any());
    }

    private OnlinePaymentTransaction transaction(UUID txId, UUID paymentId, UUID subscriptionId,
                                                  BigDecimal amount, String status) {
        return new OnlinePaymentTransaction(txId, subscriptionId, paymentId, "ORD-1", amount,
                LocalDateTime.now(), "APPROVED".equals(status) ? LocalDateTime.now() : null,
                status, "{}", txId.toString());
    }

    private MercadoPagoOrder approvedOrder(UUID txId, BigDecimal amount) {
        MercadoPagoOrder.OrderPaymentMethod method = new MercadoPagoOrder.OrderPaymentMethod(
                "visa", "credit_card", 1, null, null, null, null);
        MercadoPagoOrder.OrderPayment payment = new MercadoPagoOrder.OrderPayment(
                "PAY-1", amount, amount, "processed", "accredited", null, null, method);
        return new MercadoPagoOrder("ORD-1", "online", "automatic", txId.toString(), amount,
                "processed", "accredited", new MercadoPagoOrder.Transactions(List.of(payment)));
    }
}
