package com.lionfitness.backend.payment.service;

import com.lionfitness.backend.payment.exception.WebhookProcessingException;
import com.lionfitness.backend.payment.mercadopago.MercadoPagoOrder;
import com.lionfitness.backend.payment.mercadopago.MercadoPagoOrderClient;
import com.lionfitness.backend.payment.model.OnlinePaymentTransaction;
import com.lionfitness.backend.payment.repository.OnlinePaymentRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;

import java.util.Optional;
import java.util.UUID;

@Service
public class MercadoPagoWebhookService {

    private static final Logger logger = LoggerFactory.getLogger(MercadoPagoWebhookService.class);
    private final OnlinePaymentRepository onlinePaymentRepository;
    private final MercadoPagoOrderClient orderClient;
    private final PaymentSettlementService settlementService;

    public MercadoPagoWebhookService(OnlinePaymentRepository onlinePaymentRepository,
                                     MercadoPagoOrderClient orderClient,
                                     PaymentSettlementService settlementService) {
        this.onlinePaymentRepository = onlinePaymentRepository;
        this.orderClient = orderClient;
        this.settlementService = settlementService;
    }

    public void processOrderNotification(String orderId) {
        MercadoPagoOrder order = orderClient.getOrder(orderId);
        if (!orderId.equals(order.id())) {
            throw new IllegalArgumentException("A Order consultada não corresponde ao webhook recebido.");
        }

        Optional<OnlinePaymentTransaction> byOrderId =
                onlinePaymentRepository.findByTransactionIdentifier(orderId);
        OnlinePaymentTransaction transaction = byOrderId.orElseGet(() -> findByExternalReference(order));
        settlementService.synchronize(transaction.id(), order);
        logger.info("Webhook de Order processado: orderId={} transactionId={}", orderId, transaction.id());
    }

    private OnlinePaymentTransaction findByExternalReference(MercadoPagoOrder order) {
        UUID transactionId;
        try {
            transactionId = UUID.fromString(order.externalReference());
        } catch (RuntimeException exception) {
            throw new IllegalArgumentException("external_reference da Order é inválido.");
        }
        return onlinePaymentRepository.findById(transactionId)
                .orElseThrow(() -> new WebhookProcessingException(
                        "A transação local ainda não está disponível; o webhook deve ser reenviado."));
    }
}
