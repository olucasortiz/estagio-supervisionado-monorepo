package com.lionfitness.backend.payment.service;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.lionfitness.backend.payment.mercadopago.MercadoPagoOrder;
import com.lionfitness.backend.payment.mercadopago.MercadoPagoOrderStatusMapper;
import com.lionfitness.backend.payment.model.OnlinePaymentTransaction;
import com.lionfitness.backend.payment.repository.OnlinePaymentRepository;
import com.lionfitness.backend.payment.repository.PaymentRepository;
import com.lionfitness.backend.subscription.repository.SubscriptionRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.LinkedHashMap;
import java.util.Map;
import java.util.UUID;

@Service
public class PaymentSettlementService {

    private static final Logger logger = LoggerFactory.getLogger(PaymentSettlementService.class);
    private final OnlinePaymentRepository onlinePaymentRepository;
    private final PaymentRepository paymentRepository;
    private final SubscriptionRepository subscriptionRepository;
    private final ObjectMapper objectMapper;

    public PaymentSettlementService(OnlinePaymentRepository onlinePaymentRepository,
                                    PaymentRepository paymentRepository,
                                    SubscriptionRepository subscriptionRepository,
                                    ObjectMapper objectMapper) {
        this.onlinePaymentRepository = onlinePaymentRepository;
        this.paymentRepository = paymentRepository;
        this.subscriptionRepository = subscriptionRepository;
        this.objectMapper = objectMapper;
    }

    @Transactional
    public SettlementResult synchronize(UUID transactionId, MercadoPagoOrder order) {
        OnlinePaymentTransaction transaction = onlinePaymentRepository.findByIdForUpdate(transactionId)
                .orElseThrow(() -> new IllegalStateException("Transação local não encontrada para a Order."));

        validateOrder(transaction, order);
        String internalStatus = MercadoPagoOrderStatusMapper.toInternalStatus(order);
        String statusDetail = MercadoPagoOrderStatusMapper.statusDetail(order);
        String auditJson = buildAuditJson(order);
        LocalDateTime confirmedAt = "APPROVED".equals(internalStatus) ? LocalDateTime.now() : null;

        if (isApproved(transaction.status())) {
            onlinePaymentRepository.updateApprovedOrderMetadata(transaction.id(), order.id(), auditJson);
            return new SettlementResult("APPROVED", statusDetail, false, auditJson);
        }

        boolean stateChanged = onlinePaymentRepository.updateOrderStateIfNotApproved(
                transaction.id(), order.id(), internalStatus, confirmedAt, auditJson);

        if ("APPROVED".equals(internalStatus) && stateChanged) {
            boolean paymentUpdated = paymentRepository.markAsPaid(transaction.paymentId(), confirmedAt.toLocalDate());
            if (!paymentUpdated) {
                logger.info("Payment já estava liquidado; renovação duplicada ignorada: paymentId={} orderId={}",
                        transaction.paymentId(), order.id());
                return new SettlementResult(internalStatus, statusDetail, false, auditJson);
            }
            boolean subscriptionRenewed = subscriptionRepository.renewSubscription(transaction.subscriptionId());
            if (!subscriptionRenewed) {
                throw new IllegalStateException("Não foi possível concluir atomicamente a renovação.");
            }
            logger.info("Order acreditada liquidada: transactionId={} orderId={} paymentId={} subscriptionId={}",
                    transaction.id(), order.id(), transaction.paymentId(), transaction.subscriptionId());
            return new SettlementResult(internalStatus, statusDetail, true, auditJson);
        }
        return new SettlementResult(internalStatus, statusDetail, false, auditJson);
    }

    private void validateOrder(OnlinePaymentTransaction transaction, MercadoPagoOrder order) {
        if (order == null || order.id() == null || order.id().isBlank()) {
            throw new IllegalArgumentException("Order do Mercado Pago sem identificador.");
        }
        if (!transaction.id().toString().equals(order.externalReference())) {
            throw new IllegalArgumentException("external_reference da Order não corresponde à transação local.");
        }
        requireSameAmount(transaction.amount(), order.totalAmount(), "total_amount");

        MercadoPagoOrder.OrderPayment payment = order.firstPayment().orElse(null);
        if (payment != null) {
            requireSameAmount(transaction.amount(), payment.amount(), "transactions.payments.amount");
        }
        if ("APPROVED".equals(MercadoPagoOrderStatusMapper.toInternalStatus(order))) {
            if (payment == null || payment.id() == null || payment.id().isBlank()) {
                throw new IllegalArgumentException("Order acreditada sem pagamento identificável.");
            }
            if (!"processed".equalsIgnoreCase(payment.status())
                    || !"accredited".equalsIgnoreCase(payment.statusDetail())) {
                throw new IllegalArgumentException("Pagamento da Order não está efetivamente acreditado.");
            }
        }

        String storedIdentifier = transaction.transactionIdentifier();
        if (storedIdentifier != null && storedIdentifier.startsWith("ORD") && !storedIdentifier.equals(order.id())) {
            throw new IllegalArgumentException("Order recebida não corresponde ao identificador persistido.");
        }
    }

    private void requireSameAmount(BigDecimal expected, BigDecimal actual, String field) {
        if (expected == null || actual == null || expected.compareTo(actual) != 0) {
            throw new IllegalArgumentException("Valor divergente no campo " + field + ".");
        }
    }

    private boolean isApproved(String status) {
        return "APPROVED".equalsIgnoreCase(status) || "CONFIRMED".equalsIgnoreCase(status);
    }

    private String buildAuditJson(MercadoPagoOrder order) {
        Map<String, Object> audit = new LinkedHashMap<>();
        audit.put("orderId", order.id());
        audit.put("status", order.status());
        audit.put("statusDetail", order.statusDetail());
        audit.put("externalReference", order.externalReference());
        audit.put("totalAmount", order.totalAmount());
        order.firstPayment().ifPresent(payment -> {
            Map<String, Object> paymentAudit = new LinkedHashMap<>();
            paymentAudit.put("paymentId", payment.id());
            paymentAudit.put("amount", payment.amount());
            paymentAudit.put("paidAmount", payment.paidAmount());
            paymentAudit.put("status", payment.status());
            paymentAudit.put("statusDetail", payment.statusDetail());
            paymentAudit.put("expirationTime", payment.expirationTime());
            paymentAudit.put("dateOfExpiration", payment.dateOfExpiration());
            if (payment.paymentMethod() != null) {
                MercadoPagoOrder.OrderPaymentMethod method = payment.paymentMethod();
                Map<String, Object> methodAudit = new LinkedHashMap<>();
                methodAudit.put("id", method.id());
                methodAudit.put("type", method.type());
                methodAudit.put("installments", method.installments());
                methodAudit.put("ticketUrl", method.ticketUrl());
                methodAudit.put("qrCode", method.qrCode());
                methodAudit.put("qrCodeBase64", method.qrCodeBase64());
                if (method.transactionSecurity() != null) {
                    MercadoPagoOrder.TransactionSecurity security = method.transactionSecurity();
                    Map<String, Object> securityAudit = new LinkedHashMap<>();
                    securityAudit.put("id", security.id());
                    securityAudit.put("type", security.type());
                    securityAudit.put("status", security.status());
                    securityAudit.put("url", security.url());
                    methodAudit.put("transactionSecurity", securityAudit);
                }
                paymentAudit.put("paymentMethod", methodAudit);
            }
            audit.put("payment", paymentAudit);
        });
        try {
            return objectMapper.writeValueAsString(audit);
        } catch (JsonProcessingException exception) {
            return "{\"orderId\":\"" + order.id() + "\"}";
        }
    }

    public record SettlementResult(String status, String statusDetail, boolean renewed, String auditJson) {}
}
