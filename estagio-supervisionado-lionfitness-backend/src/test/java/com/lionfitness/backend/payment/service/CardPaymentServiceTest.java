package com.lionfitness.backend.payment.service;

import com.lionfitness.backend.payment.dto.CardPaymentRequest;
import com.lionfitness.backend.payment.dto.CardPaymentResponse;
import com.lionfitness.backend.payment.dto.CardPaymentStatusResponse;
import com.lionfitness.backend.payment.exception.MercadoPagoGatewayException;
import com.lionfitness.backend.payment.mercadopago.MercadoPagoOrder;
import com.lionfitness.backend.payment.mercadopago.MercadoPagoOrderClient;
import com.lionfitness.backend.payment.model.OnlinePaymentTransaction;
import com.lionfitness.backend.payment.repository.OnlinePaymentRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InOrder;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.http.HttpStatus;
import org.springframework.web.server.ResponseStatusException;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class CardPaymentServiceTest {
    @Mock OnlinePaymentRepository onlinePaymentRepository;
    @Mock MercadoPagoOrderClient orderClient;
    @Mock PaymentSettlementService settlementService;
    @Mock PaymentAttemptReservationService reservationService;

    private CardPaymentService service;
    private final UUID subscriptionId = UUID.randomUUID();
    private final String studentEmail = "aluno@lionfitness.com.br";
    private final String idempotencyKey = UUID.randomUUID().toString();
    private final BigDecimal price = new BigDecimal("89.90");

    @BeforeEach
    void setUp() {
        service = new CardPaymentService(
                onlinePaymentRepository, orderClient, settlementService, reservationService);
    }

    @Test
    void commitsReservationBeanBeforeCallingMercadoPago() {
        OnlinePaymentTransaction reserved = transaction("LOCAL-reserved", "PENDING", idempotencyKey);
        when(reservationService.reserveCard(subscriptionId, studentEmail, false, idempotencyKey))
                .thenReturn(new PaymentAttemptReservationService.Reservation(reserved, false));
        when(orderClient.createCardOrder(eq(price), eq("token"), eq("visa"), eq(1),
                eq(studentEmail), eq("CPF"), eq("12345678909"), eq(reserved.id().toString()),
                eq(idempotencyKey))).thenReturn(approvedOrder(reserved.id().toString()));
        when(settlementService.synchronize(eq(reserved.id()), any())).thenReturn(
                new PaymentSettlementService.SettlementResult("APPROVED", "accredited", true, "{}"));

        CardPaymentResponse response = service.processCardPayment(
                request(), idempotencyKey, studentEmail, false);

        assertThat(response.transactionIdentifier()).isEqualTo("ORD-card");
        InOrder order = inOrder(reservationService, orderClient);
        order.verify(reservationService).reserveCard(subscriptionId, studentEmail, false, idempotencyKey);
        order.verify(orderClient).createCardOrder(any(), any(), any(), anyInt(), any(), any(), any(),
                eq(reserved.id().toString()), eq(idempotencyKey));
    }

    @Test
    void retryWithPersistedOrderDoesNotCreateAnotherOrder() {
        OnlinePaymentTransaction existing = transaction("ORD-existing", "APPROVED", idempotencyKey);
        when(reservationService.reserveCard(subscriptionId, studentEmail, false, idempotencyKey))
                .thenReturn(new PaymentAttemptReservationService.Reservation(existing, true));

        CardPaymentResponse response = service.processCardPayment(
                request(), idempotencyKey, studentEmail, false);

        assertThat(response.transactionIdentifier()).isEqualTo("ORD-existing");
        verifyNoInteractions(orderClient, settlementService);
    }

    @Test
    void retryOfLocalReservationReusesSameIdempotencyKey() {
        OnlinePaymentTransaction reserved = transaction("LOCAL-reserved", "PENDING", idempotencyKey);
        when(reservationService.reserveCard(subscriptionId, studentEmail, false, idempotencyKey))
                .thenReturn(new PaymentAttemptReservationService.Reservation(reserved, true));
        when(orderClient.createCardOrder(any(), any(), any(), anyInt(), any(), any(), any(),
                eq(reserved.id().toString()), eq(idempotencyKey)))
                .thenReturn(approvedOrder(reserved.id().toString()));
        when(settlementService.synchronize(eq(reserved.id()), any())).thenReturn(
                new PaymentSettlementService.SettlementResult("APPROVED", "accredited", true, "{}"));

        service.processCardPayment(request(), idempotencyKey, studentEmail, false);

        verify(orderClient).createCardOrder(any(), any(), any(), anyInt(), any(), any(), any(),
                eq(reserved.id().toString()), eq(idempotencyKey));
    }

    @Test
    void definitive400RejectsAttemptAndNextExplicitActionUsesNewKey() {
        String nextKey = UUID.randomUUID().toString();
        OnlinePaymentTransaction rejected = transaction("LOCAL-rejected", "PENDING", idempotencyKey);
        OnlinePaymentTransaction next = transaction("LOCAL-next", "PENDING", nextKey);
        when(reservationService.reserveCard(subscriptionId, studentEmail, false, idempotencyKey))
                .thenReturn(new PaymentAttemptReservationService.Reservation(rejected, false));
        when(reservationService.reserveCard(subscriptionId, studentEmail, false, nextKey))
                .thenReturn(new PaymentAttemptReservationService.Reservation(next, false));
        when(orderClient.createCardOrder(any(), any(), any(), anyInt(), any(), any(), any(),
                eq(rejected.id().toString()), eq(idempotencyKey)))
                .thenThrow(gatewayFailure(400, "invalid_email_for_sandbox"));
        when(orderClient.createCardOrder(any(), any(), any(), anyInt(), any(), any(), any(),
                eq(next.id().toString()), eq(nextKey)))
                .thenReturn(approvedOrder(next.id().toString()));
        when(settlementService.synchronize(eq(next.id()), any())).thenReturn(
                new PaymentSettlementService.SettlementResult("APPROVED", "accredited", true, "{}"));

        assertThatThrownBy(() -> service.processCardPayment(request(), idempotencyKey, studentEmail, false))
                .isInstanceOf(MercadoPagoGatewayException.class);
        CardPaymentResponse response = service.processCardPayment(request(), nextKey, studentEmail, false);

        assertThat(response.status()).isEqualTo("APPROVED");
        verify(reservationService).rejectUnconfirmedAttempt(rejected.id());
        verify(orderClient).createCardOrder(any(), any(), any(), anyInt(), any(), any(), any(),
                eq(next.id().toString()), eq(nextKey));
    }

    @Test
    void serverFailureKeepsSameKeyForRetry() {
        OnlinePaymentTransaction reserved = transaction("LOCAL-reserved", "PENDING", idempotencyKey);
        when(reservationService.reserveCard(subscriptionId, studentEmail, false, idempotencyKey))
                .thenReturn(new PaymentAttemptReservationService.Reservation(reserved, false),
                        new PaymentAttemptReservationService.Reservation(reserved, true));
        when(orderClient.createCardOrder(any(), any(), any(), anyInt(), any(), any(), any(),
                eq(reserved.id().toString()), eq(idempotencyKey)))
                .thenThrow(gatewayFailure(503, "service_unavailable"))
                .thenReturn(approvedOrder(reserved.id().toString()));
        when(settlementService.synchronize(eq(reserved.id()), any())).thenReturn(
                new PaymentSettlementService.SettlementResult("APPROVED", "accredited", true, "{}"));

        assertThatThrownBy(() -> service.processCardPayment(request(), idempotencyKey, studentEmail, false))
                .isInstanceOf(MercadoPagoGatewayException.class);
        service.processCardPayment(request(), idempotencyKey, studentEmail, false);

        verify(reservationService, never()).rejectUnconfirmedAttempt(any());
        verify(orderClient, times(2)).createCardOrder(any(), any(), any(), anyInt(), any(), any(), any(),
                eq(reserved.id().toString()), eq(idempotencyKey));
    }

    @Test
    void idempotencyConflictRejectsAttemptWithoutAutomaticRetry() {
        OnlinePaymentTransaction reserved = transaction("LOCAL-reserved", "PENDING", idempotencyKey);
        when(reservationService.reserveCard(subscriptionId, studentEmail, false, idempotencyKey))
                .thenReturn(new PaymentAttemptReservationService.Reservation(reserved, true));
        when(orderClient.createCardOrder(any(), any(), any(), anyInt(), any(), any(), any(),
                eq(reserved.id().toString()), eq(idempotencyKey)))
                .thenThrow(gatewayFailure(409, "idempotency_key_already_used"));

        assertThatThrownBy(() -> service.processCardPayment(request(), idempotencyKey, studentEmail, false))
                .isInstanceOfSatisfying(MercadoPagoGatewayException.class,
                        exception -> assertThat(exception.isIdempotencyKeyAlreadyUsed()).isTrue());

        verify(reservationService).rejectUnconfirmedAttempt(reserved.id());
        verify(orderClient, times(1)).createCardOrder(any(), any(), any(), anyInt(), any(), any(), any(),
                eq(reserved.id().toString()), eq(idempotencyKey));
        verifyNoInteractions(settlementService);
    }

    @Test
    void blocksPaymentForAnotherStudentBeforeCallingMercadoPago() {
        when(reservationService.reserveCard(subscriptionId, studentEmail, false, idempotencyKey))
                .thenThrow(new ResponseStatusException(HttpStatus.FORBIDDEN));

        assertThatThrownBy(() -> service.processCardPayment(request(), idempotencyKey, studentEmail, false))
                .isInstanceOf(ResponseStatusException.class)
                .satisfies(error -> assertThat(((ResponseStatusException) error).getStatusCode())
                        .isEqualTo(HttpStatus.FORBIDDEN));
        verifyNoInteractions(orderClient);
    }

    @Test
    void pollingPendingOrderFetchesAndSettlesCurrentOrder() {
        OnlinePaymentTransaction pending = transaction("ORD-pending", "PENDING", idempotencyKey);
        MercadoPagoOrder approved = approvedOrder(pending.id().toString());
        when(onlinePaymentRepository.findByIdAndUserEmail(pending.id(), studentEmail))
                .thenReturn(Optional.of(pending));
        when(orderClient.getOrder("ORD-pending")).thenReturn(approved);
        when(settlementService.synchronize(pending.id(), approved)).thenReturn(
                new PaymentSettlementService.SettlementResult("APPROVED", "accredited", true, "{}"));

        CardPaymentStatusResponse response = service.getCardPaymentStatus(pending.id(), studentEmail, false);

        assertThat(response.status()).isEqualTo("APPROVED");
        verify(orderClient).getOrder("ORD-pending");
        verify(settlementService).synchronize(pending.id(), approved);
    }

    @Test
    void pollingTerminalStateDoesNotCallMercadoPago() {
        OnlinePaymentTransaction approved = transaction("ORD-approved", "APPROVED", idempotencyKey);
        when(onlinePaymentRepository.findById(approved.id())).thenReturn(Optional.of(approved));

        CardPaymentStatusResponse response = service.getCardPaymentStatus(approved.id(), studentEmail, true);

        assertThat(response.status()).isEqualTo("APPROVED");
        verifyNoInteractions(orderClient, settlementService);
    }

    private CardPaymentRequest request() {
        return new CardPaymentRequest(subscriptionId, "token", "visa", "credit_card", 1,
                studentEmail, "CPF", "12345678909");
    }

    private OnlinePaymentTransaction transaction(String identifier, String status, String key) {
        return new OnlinePaymentTransaction(
                UUID.randomUUID(), subscriptionId, UUID.randomUUID(), identifier, price,
                LocalDateTime.now(), "APPROVED".equals(status) ? LocalDateTime.now() : null,
                status, "{}", key);
    }

    private MercadoPagoOrder approvedOrder(String externalReference) {
        MercadoPagoOrder.OrderPaymentMethod method = new MercadoPagoOrder.OrderPaymentMethod(
                "visa", "credit_card", 1, null, null, null, null);
        MercadoPagoOrder.OrderPayment payment = new MercadoPagoOrder.OrderPayment(
                "PAY-card", price, price, "processed", "accredited", null, null, method);
        return new MercadoPagoOrder("ORD-card", "online", "automatic", externalReference,
                price, "processed", "accredited", new MercadoPagoOrder.Transactions(List.of(payment)));
    }

    private MercadoPagoGatewayException gatewayFailure(int status, String code) {
        return new MercadoPagoGatewayException("Order rejected", status, code, null);
    }
}
