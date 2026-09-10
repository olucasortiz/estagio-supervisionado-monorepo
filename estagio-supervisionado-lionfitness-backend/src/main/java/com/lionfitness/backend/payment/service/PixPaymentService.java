package com.lionfitness.backend.payment.service;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.lionfitness.backend.payment.dto.PixConfirmResponse;
import com.lionfitness.backend.payment.dto.PixGenerateResponse;
import com.lionfitness.backend.payment.dto.PixStatusResponse;
import com.lionfitness.backend.payment.mercadopago.MercadoPagoOrder;
import com.lionfitness.backend.payment.mercadopago.MercadoPagoOrderClient;
import com.lionfitness.backend.payment.model.OnlinePaymentTransaction;
import com.lionfitness.backend.payment.repository.OnlinePaymentRepository;
import com.lionfitness.backend.payment.repository.PaymentRepository;
import com.lionfitness.backend.subscription.repository.SubscriptionRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.UUID;

@Service
public class PixPaymentService {

    private static final Logger logger = LoggerFactory.getLogger(PixPaymentService.class);
    private static final String LOCAL_IDENTIFIER_PREFIX = "LOCAL-";

    private final SubscriptionRepository subscriptionRepository;
    private final PaymentRepository paymentRepository;
    private final OnlinePaymentRepository onlinePaymentRepository;
    private final MercadoPagoOrderClient orderClient;
    private final PaymentSettlementService settlementService;
    private final PaymentAttemptReservationService reservationService;
    private final ObjectMapper objectMapper;

    public PixPaymentService(SubscriptionRepository subscriptionRepository,
                             PaymentRepository paymentRepository,
                             OnlinePaymentRepository onlinePaymentRepository,
                             MercadoPagoOrderClient orderClient,
                             PaymentSettlementService settlementService,
                             PaymentAttemptReservationService reservationService,
                             ObjectMapper objectMapper) {
        this.subscriptionRepository = subscriptionRepository;
        this.paymentRepository = paymentRepository;
        this.onlinePaymentRepository = onlinePaymentRepository;
        this.orderClient = orderClient;
        this.settlementService = settlementService;
        this.reservationService = reservationService;
        this.objectMapper = objectMapper;
    }

    public PixGenerateResponse generatePixTransaction(UUID subscriptionId, String payerEmail) {
        return generatePixTransaction(subscriptionId, null, payerEmail, false);
    }

    public PixGenerateResponse generatePixTransaction(UUID subscriptionId, BigDecimal customAmount, String payerEmail) {
        return generatePixTransaction(subscriptionId, customAmount, payerEmail, false);
    }

    public PixGenerateResponse generatePixTransaction(UUID subscriptionId,
                                                      BigDecimal customAmount,
                                                      String payerEmail,
                                                      boolean isAdmin) {
        if (subscriptionId == null) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "O ID da assinatura é obrigatório.");
        }
        PaymentAttemptReservationService.Reservation reservation =
                reservationService.reservePix(subscriptionId, payerEmail, isAdmin);
        OnlinePaymentTransaction transaction = reservation.transaction();
        if (reservation.existing()) {
            OnlinePaymentTransaction pending = transaction;
            ParsedGatewayReturn qr = parseGatewayReturn(pending.gatewayReturn());
            if (qr.hasCompleteQr()) {
                return toResponse(pending, qr, pending.status());
            }
            if (pending.transactionIdentifier() != null
                    && pending.transactionIdentifier().startsWith("ORD")) {
                MercadoPagoOrder order = orderClient.getOrder(pending.transactionIdentifier());
                return synchronizeAndRespond(pending, order);
            }
            if (pending.transactionIdentifier() != null
                    && pending.transactionIdentifier().startsWith(LOCAL_IDENTIFIER_PREFIX)
                    && pending.idempotencyKey() != null) {
                MercadoPagoOrder order = orderClient.createPixOrder(
                        pending.amount(), payerEmail, pending.id().toString(), pending.idempotencyKey());
                return synchronizeAndRespond(pending, order);
            }
            throw new IllegalStateException("A reserva Pix pendente não pode ser reconciliada.");
        }
        logger.info("Criando Order Pix: transactionId={} subscriptionId={}",
                transaction.id(), transaction.subscriptionId());
        MercadoPagoOrder order = orderClient.createPixOrder(
                transaction.amount(), payerEmail, transaction.id().toString(), transaction.idempotencyKey());
        return synchronizeAndRespond(transaction, order);
    }

    private PixGenerateResponse synchronizeAndRespond(OnlinePaymentTransaction transaction, MercadoPagoOrder order) {
        PaymentSettlementService.SettlementResult result = settlementService.synchronize(transaction.id(), order);
        MercadoPagoOrder.OrderPaymentMethod method = order.firstPayment()
                .map(MercadoPagoOrder.OrderPayment::paymentMethod)
                .orElse(null);
        ParsedGatewayReturn qr = new ParsedGatewayReturn(
                method != null ? method.qrCode() : null,
                method != null ? method.qrCodeBase64() : null,
                method != null ? method.ticketUrl() : null
        );
        OnlinePaymentTransaction synchronizedTransaction = new OnlinePaymentTransaction(
                transaction.id(), transaction.subscriptionId(), transaction.paymentId(), order.id(),
                transaction.amount(), transaction.requestedAt(),
                "APPROVED".equals(result.status()) ? LocalDateTime.now() : null,
                result.status(), result.auditJson(), transaction.idempotencyKey());
        return toResponse(synchronizedTransaction, qr, result.status());
    }

    @Transactional
    public PixConfirmResponse confirmPixPayment(UUID transactionId) {
        OnlinePaymentTransaction transaction = onlinePaymentRepository.findByIdForUpdate(transactionId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Transação Pix não encontrada."));
        LocalDateTime confirmedAt = transaction.confirmedAt();
        if (!isApproved(transaction.status())) {
            confirmedAt = LocalDateTime.now();
            boolean changed = onlinePaymentRepository.updateOrderStateIfNotApproved(
                    transaction.id(), transaction.transactionIdentifier(), "APPROVED", confirmedAt,
                    transaction.gatewayReturn());
            if (changed) {
                boolean paid = paymentRepository.markAsPaid(transaction.paymentId(), confirmedAt.toLocalDate());
                if (paid && !subscriptionRepository.renewSubscription(transaction.subscriptionId())) {
                    throw new IllegalStateException("Não foi possível confirmar integralmente o Pix simulado.");
                }
            }
        }
        return new PixConfirmResponse(transaction.id(), transaction.paymentId(),
                transaction.transactionIdentifier(), "APPROVED",
                "Pagamento Pix confirmado com sucesso e assinatura renovada.", confirmedAt);
    }

    public PixStatusResponse getPixTransactionStatus(UUID transactionId, String requesterEmail, boolean isAdmin) {
        if (transactionId == null) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "O ID da transação é obrigatório.");
        }
        OnlinePaymentTransaction transaction = isAdmin
                ? onlinePaymentRepository.findById(transactionId)
                    .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Transação Pix não encontrada."))
                : onlinePaymentRepository.findByIdAndUserEmail(transactionId, requesterEmail)
                    .orElseThrow(() -> new ResponseStatusException(HttpStatus.FORBIDDEN,
                            "Transação Pix não encontrada ou você não possui autorização para consultá-la."));
        if (isPendingOrder(transaction)) {
            MercadoPagoOrder order = orderClient.getOrder(transaction.transactionIdentifier());
            PaymentSettlementService.SettlementResult result = settlementService.synchronize(transaction.id(), order);
            return new PixStatusResponse(transaction.id(), result.status(), transaction.paymentId(),
                    transaction.subscriptionId(), transaction.amount(),
                    "APPROVED".equals(result.status()) ? LocalDateTime.now() : transaction.confirmedAt());
        }
        return new PixStatusResponse(transaction.id(), transaction.status(), transaction.paymentId(),
                transaction.subscriptionId(), transaction.amount(), transaction.confirmedAt());
    }

    private boolean isPendingOrder(OnlinePaymentTransaction transaction) {
        return "PENDING".equalsIgnoreCase(transaction.status())
                && transaction.transactionIdentifier() != null
                && transaction.transactionIdentifier().startsWith("ORD");
    }

    private PixGenerateResponse toResponse(OnlinePaymentTransaction transaction,
                                           ParsedGatewayReturn qr,
                                           String status) {
        return new PixGenerateResponse(
                transaction.id(), transaction.subscriptionId(), transaction.paymentId(),
                transaction.transactionIdentifier(), transaction.amount(), status,
                qr.qrCode(), qr.qrCodeBase64(), qr.ticketUrl(),
                transaction.transactionIdentifier(), transaction.requestedAt());
    }

    private ParsedGatewayReturn parseGatewayReturn(String gatewayReturn) {
        if (gatewayReturn == null || gatewayReturn.isBlank()) {
            return new ParsedGatewayReturn(null, null, null);
        }
        try {
            JsonNode root = objectMapper.readTree(gatewayReturn);
            JsonNode method = root.path("payment").path("paymentMethod");
            return new ParsedGatewayReturn(
                    text(method, "qrCode", text(root, "qrCode", null)),
                    text(method, "qrCodeBase64", text(root, "qrCodeBase64", null)),
                    text(method, "ticketUrl", text(root, "ticketUrl", null))
            );
        } catch (Exception ignored) {
            return new ParsedGatewayReturn(gatewayReturn, null, null);
        }
    }

    private String text(JsonNode node, String field, String fallback) {
        JsonNode value = node.path(field);
        return value.isTextual() && !value.asText().isBlank() ? value.asText() : fallback;
    }

    private boolean isApproved(String status) {
        return "APPROVED".equalsIgnoreCase(status) || "CONFIRMED".equalsIgnoreCase(status);
    }

    private record ParsedGatewayReturn(String qrCode, String qrCodeBase64, String ticketUrl) {
        boolean hasCompleteQr() {
            return qrCode != null && !qrCode.isBlank() && qrCodeBase64 != null && !qrCodeBase64.isBlank();
        }
    }
}
