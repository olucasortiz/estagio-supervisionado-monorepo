package com.lionfitness.backend.payment.service;

import com.lionfitness.backend.payment.mercadopago.MercadoPagoOrder;
import com.lionfitness.backend.payment.mercadopago.MercadoPagoOrderClient;
import com.lionfitness.backend.payment.model.OnlinePaymentTransaction;
import com.lionfitness.backend.payment.repository.OnlinePaymentRepository;
import org.junit.jupiter.api.Test;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

import static org.mockito.Mockito.*;

class MercadoPagoWebhookServiceTest {
    @Test
    void getsOrderAndLocatesReservedTransactionByExternalReference() {
        OnlinePaymentRepository repository = mock(OnlinePaymentRepository.class);
        MercadoPagoOrderClient client = mock(MercadoPagoOrderClient.class);
        PaymentSettlementService settlement = mock(PaymentSettlementService.class);
        MercadoPagoWebhookService service = new MercadoPagoWebhookService(repository, client, settlement);
        UUID txId = UUID.randomUUID();
        MercadoPagoOrder order = order(txId);
        OnlinePaymentTransaction transaction = new OnlinePaymentTransaction(
                txId, UUID.randomUUID(), UUID.randomUUID(), "LOCAL-" + txId,
                new BigDecimal("89.90"), LocalDateTime.now(), null, "PENDING", "{}", txId.toString());
        when(client.getOrder("ORD-webhook")).thenReturn(order);
        when(repository.findByTransactionIdentifier("ORD-webhook")).thenReturn(Optional.empty());
        when(repository.findById(txId)).thenReturn(Optional.of(transaction));

        service.processOrderNotification("ORD-webhook");

        verify(client).getOrder("ORD-webhook");
        verify(settlement).synchronize(txId, order);
    }

    private MercadoPagoOrder order(UUID txId) {
        MercadoPagoOrder.OrderPaymentMethod method = new MercadoPagoOrder.OrderPaymentMethod(
                "pix", "bank_transfer", null, null, "qr", "base64", null);
        MercadoPagoOrder.OrderPayment payment = new MercadoPagoOrder.OrderPayment(
                "PAY-webhook", new BigDecimal("89.90"), null,
                "action_required", "waiting_transfer", null, null, method);
        return new MercadoPagoOrder("ORD-webhook", "online", "automatic", txId.toString(),
                new BigDecimal("89.90"), "action_required", "waiting_transfer",
                new MercadoPagoOrder.Transactions(List.of(payment)));
    }
}
