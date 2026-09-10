package com.lionfitness.backend.payment.service;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.lionfitness.backend.payment.dto.PixGenerateResponse;
import com.lionfitness.backend.payment.dto.PixStatusResponse;
import com.lionfitness.backend.payment.mercadopago.MercadoPagoOrder;
import com.lionfitness.backend.payment.mercadopago.MercadoPagoOrderClient;
import com.lionfitness.backend.payment.model.OnlinePaymentTransaction;
import com.lionfitness.backend.payment.repository.OnlinePaymentRepository;
import com.lionfitness.backend.payment.repository.PaymentRepository;
import com.lionfitness.backend.subscription.repository.SubscriptionRepository;
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
class PixPaymentServiceTest {
    @Mock SubscriptionRepository subscriptionRepository;
    @Mock PaymentRepository paymentRepository;
    @Mock OnlinePaymentRepository onlinePaymentRepository;
    @Mock MercadoPagoOrderClient orderClient;
    @Mock PaymentSettlementService settlementService;
    @Mock PaymentAttemptReservationService reservationService;

    private PixPaymentService service;
    private final UUID subscriptionId = UUID.randomUUID();
    private final String studentEmail = "aluno@lionfitness.com.br";
    private final BigDecimal price = new BigDecimal("89.90");

    @BeforeEach
    void setUp() {
        service = new PixPaymentService(subscriptionRepository, paymentRepository, onlinePaymentRepository,
                orderClient, settlementService, reservationService, new ObjectMapper());
    }

    @Test
    void commitsReservationBeanBeforeCreatingPixOrderAndExtractsQrData() {
        OnlinePaymentTransaction reserved = reservedTransaction();
        when(reservationService.reservePix(subscriptionId, studentEmail, false))
                .thenReturn(new PaymentAttemptReservationService.Reservation(reserved, false));
        when(orderClient.createPixOrder(price, studentEmail, reserved.id().toString(), reserved.idempotencyKey()))
                .thenReturn(pixOrder(reserved.id().toString()));
        when(settlementService.synchronize(eq(reserved.id()), any())).thenReturn(
                new PaymentSettlementService.SettlementResult("PENDING", "waiting_transfer", false,
                        "{\"payment\":{\"paymentId\":\"PAY-pix\"}}"));

        PixGenerateResponse response = service.generatePixTransaction(
                subscriptionId, new BigDecimal("1.00"), studentEmail, false);

        assertThat(response.transactionIdentifier()).isEqualTo("ORD-pix");
        assertThat(response.externalTransactionId()).isEqualTo("ORD-pix");
        assertThat(response.qrCodePayload()).isEqualTo("pix-copy-code");
        assertThat(response.qrCodeBase64()).isEqualTo("base64-qr");
        assertThat(response.ticketUrl()).isEqualTo("https://example.test/pix");
        assertThat(response.amount()).isEqualTo(price);
        InOrder order = inOrder(reservationService, orderClient);
        order.verify(reservationService).reservePix(subscriptionId, studentEmail, false);
        order.verify(orderClient).createPixOrder(
                price, studentEmail, reserved.id().toString(), reserved.idempotencyKey());
    }

    @Test
    void reusesRecentCompleteQrWithoutCallingMercadoPago() {
        OnlinePaymentTransaction existing = new OnlinePaymentTransaction(
                UUID.randomUUID(), subscriptionId, UUID.randomUUID(), "ORD-existing", price,
                LocalDateTime.now().minusMinutes(5), null, "PENDING",
                "{\"payment\":{\"paymentMethod\":{\"qrCode\":\"copy\",\"qrCodeBase64\":\"base64\",\"ticketUrl\":\"ticket\"}}}",
                UUID.randomUUID().toString());
        when(reservationService.reservePix(subscriptionId, studentEmail, false))
                .thenReturn(new PaymentAttemptReservationService.Reservation(existing, true));

        PixGenerateResponse response = service.generatePixTransaction(subscriptionId, null, studentEmail, false);

        assertThat(response.qrCodePayload()).isEqualTo("copy");
        assertThat(response.ticketUrl()).isEqualTo("ticket");
        verifyNoInteractions(orderClient, settlementService);
    }

    @Test
    void retryOfLocalReservationReusesSamePersistedIdempotencyKey() {
        OnlinePaymentTransaction reserved = reservedTransaction();
        when(reservationService.reservePix(subscriptionId, studentEmail, false))
                .thenReturn(new PaymentAttemptReservationService.Reservation(reserved, true));
        when(orderClient.createPixOrder(price, studentEmail, reserved.id().toString(), reserved.idempotencyKey()))
                .thenReturn(pixOrder(reserved.id().toString()));
        when(settlementService.synchronize(eq(reserved.id()), any())).thenReturn(
                new PaymentSettlementService.SettlementResult("PENDING", "waiting_transfer", false, "{}"));

        service.generatePixTransaction(subscriptionId, null, studentEmail, false);

        verify(orderClient).createPixOrder(
                price, studentEmail, reserved.id().toString(), reserved.idempotencyKey());
    }

    @Test
    void blocksPixForAnotherStudentBeforeCallingMercadoPago() {
        when(reservationService.reservePix(subscriptionId, studentEmail, false))
                .thenThrow(new ResponseStatusException(HttpStatus.FORBIDDEN));

        assertThatThrownBy(() -> service.generatePixTransaction(subscriptionId, null, studentEmail, false))
                .isInstanceOf(ResponseStatusException.class)
                .satisfies(error -> assertThat(((ResponseStatusException) error).getStatusCode())
                        .isEqualTo(HttpStatus.FORBIDDEN));
        verifyNoInteractions(orderClient);
    }

    @Test
    void pollingPendingOrderFetchesAndSettlesCurrentOrder() {
        OnlinePaymentTransaction pending = transaction("ORD-pending", "PENDING", UUID.randomUUID().toString());
        MercadoPagoOrder approved = approvedPixOrder(pending.id().toString());
        when(onlinePaymentRepository.findByIdAndUserEmail(pending.id(), studentEmail))
                .thenReturn(Optional.of(pending));
        when(orderClient.getOrder("ORD-pending")).thenReturn(approved);
        when(settlementService.synchronize(pending.id(), approved)).thenReturn(
                new PaymentSettlementService.SettlementResult("APPROVED", "accredited", true, "{}"));

        PixStatusResponse response = service.getPixTransactionStatus(pending.id(), studentEmail, false);

        assertThat(response.status()).isEqualTo("APPROVED");
        verify(orderClient).getOrder("ORD-pending");
        verify(settlementService).synchronize(pending.id(), approved);
    }

    @Test
    void pollingTerminalStateDoesNotCallMercadoPago() {
        OnlinePaymentTransaction expired = transaction("ORD-expired", "EXPIRED", UUID.randomUUID().toString());
        when(onlinePaymentRepository.findById(expired.id())).thenReturn(Optional.of(expired));

        PixStatusResponse response = service.getPixTransactionStatus(expired.id(), studentEmail, true);

        assertThat(response.status()).isEqualTo("EXPIRED");
        verifyNoInteractions(orderClient, settlementService);
    }

    private OnlinePaymentTransaction reservedTransaction() {
        UUID id = UUID.randomUUID();
        return transaction("LOCAL-" + id, "PENDING", id.toString(), id);
    }

    private OnlinePaymentTransaction transaction(String identifier, String status, String key) {
        return transaction(identifier, status, key, UUID.randomUUID());
    }

    private OnlinePaymentTransaction transaction(String identifier, String status, String key, UUID id) {
        return new OnlinePaymentTransaction(id, subscriptionId, UUID.randomUUID(), identifier, price,
                LocalDateTime.now(), "APPROVED".equals(status) ? LocalDateTime.now() : null,
                status, "{}", key);
    }

    private MercadoPagoOrder pixOrder(String externalReference) {
        MercadoPagoOrder.OrderPaymentMethod method = new MercadoPagoOrder.OrderPaymentMethod(
                "pix", "bank_transfer", null, "https://example.test/pix",
                "pix-copy-code", "base64-qr", null);
        MercadoPagoOrder.OrderPayment payment = new MercadoPagoOrder.OrderPayment(
                "PAY-pix", price, null, "action_required", "waiting_transfer", null, null, method);
        return new MercadoPagoOrder("ORD-pix", "online", "automatic", externalReference,
                price, "action_required", "waiting_transfer",
                new MercadoPagoOrder.Transactions(List.of(payment)));
    }

    private MercadoPagoOrder approvedPixOrder(String externalReference) {
        MercadoPagoOrder.OrderPaymentMethod method = new MercadoPagoOrder.OrderPaymentMethod(
                "pix", "bank_transfer", null, null, null, null, null);
        MercadoPagoOrder.OrderPayment payment = new MercadoPagoOrder.OrderPayment(
                "PAY-pix", price, price, "processed", "accredited", null, null, method);
        return new MercadoPagoOrder("ORD-approved", "online", "automatic", externalReference,
                price, "processed", "accredited", new MercadoPagoOrder.Transactions(List.of(payment)));
    }
}
