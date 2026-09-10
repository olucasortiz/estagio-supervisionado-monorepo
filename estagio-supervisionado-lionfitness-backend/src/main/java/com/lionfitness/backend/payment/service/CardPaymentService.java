package com.lionfitness.backend.payment.service;

import com.lionfitness.backend.payment.dto.CardPaymentRequest;
import com.lionfitness.backend.payment.dto.CardPaymentResponse;
import com.lionfitness.backend.payment.dto.CardPaymentStatusResponse;
import com.lionfitness.backend.payment.exception.MercadoPagoGatewayException;
import com.lionfitness.backend.payment.mercadopago.MercadoPagoOrder;
import com.lionfitness.backend.payment.mercadopago.MercadoPagoOrderClient;
import com.lionfitness.backend.payment.model.OnlinePaymentTransaction;
import com.lionfitness.backend.payment.repository.OnlinePaymentRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.UUID;

@Service
public class CardPaymentService {

    private static final Logger logger = LoggerFactory.getLogger(CardPaymentService.class);
    private static final String LOCAL_IDENTIFIER_PREFIX = "LOCAL-";

    private final OnlinePaymentRepository onlinePaymentRepository;
    private final MercadoPagoOrderClient orderClient;
    private final PaymentSettlementService settlementService;
    private final PaymentAttemptReservationService reservationService;

    public CardPaymentService(OnlinePaymentRepository onlinePaymentRepository,
                              MercadoPagoOrderClient orderClient,
                              PaymentSettlementService settlementService,
                              PaymentAttemptReservationService reservationService) {
        this.onlinePaymentRepository = onlinePaymentRepository;
        this.orderClient = orderClient;
        this.settlementService = settlementService;
        this.reservationService = reservationService;
    }

    public CardPaymentResponse processCardPayment(CardPaymentRequest request,
                                                  String idempotencyKey,
                                                  String requesterEmail,
                                                  boolean isAdmin) {
        String effectiveIdempotencyKey = validateIdempotencyKey(idempotencyKey);
        UUID subscriptionId = request.subscriptionId();
        int installments = request.resolveInstallments();
        String effectivePayerEmail = request.payerEmail() != null && !request.payerEmail().isBlank()
                ? request.payerEmail() : requesterEmail;

        PaymentAttemptReservationService.Reservation reservation = reservationService.reserveCard(
                subscriptionId, requesterEmail, isAdmin, effectiveIdempotencyKey);
        OnlinePaymentTransaction transaction = reservation.transaction();
        if (reservation.existing()) {
            if (!isLocalReservation(transaction)) {
                return toExistingPaymentResponse(transaction, request);
            }
            return submitReservedAttempt(transaction, request, transaction.amount(), installments,
                    effectivePayerEmail, effectiveIdempotencyKey);
        }
        return submitReservedAttempt(transaction, request, transaction.amount(), installments,
                effectivePayerEmail, effectiveIdempotencyKey);
    }

    private CardPaymentResponse submitReservedAttempt(OnlinePaymentTransaction transaction,
                                                      CardPaymentRequest request,
                                                      BigDecimal amount,
                                                      int installments,
                                                      String payerEmail,
                                                      String idempotencyKey) {
        logger.info("Criando Order de cartão: transactionId={} subscriptionId={} installments={} method={}",
                transaction.id(), transaction.subscriptionId(), installments, request.paymentMethodId());
        MercadoPagoOrder order;
        try {
            order = orderClient.createCardOrder(
                    amount,
                    request.token(),
                    request.paymentMethodId(),
                    installments,
                    payerEmail,
                    request.identificationType(),
                    request.identificationNumber(),
                    transaction.id().toString(),
                    idempotencyKey
            );
        } catch (MercadoPagoGatewayException exception) {
            rejectAttemptIfDefinitive(transaction, exception);
            throw exception;
        }
        PaymentSettlementService.SettlementResult result = settlementService.synchronize(transaction.id(), order);
        String message = messageForStatus(result.status(), result.statusDetail());
        return new CardPaymentResponse(
                transaction.id(), transaction.subscriptionId(), transaction.paymentId(), order.id(), amount,
                result.status(), result.statusDetail(), message, request.paymentMethodId(), installments,
                LocalDateTime.now()
        );
    }

    private void rejectAttemptIfDefinitive(OnlinePaymentTransaction transaction,
                                           MercadoPagoGatewayException exception) {
        if (exception.isIdempotencyKeyAlreadyUsed() || exception.isDefinitiveClientRejection()) {
            reservationService.rejectUnconfirmedAttempt(transaction.id());
        }
    }

    public CardPaymentStatusResponse getCardPaymentStatus(UUID transactionId,
                                                          String requesterEmail,
                                                          boolean isAdmin) {
        OnlinePaymentTransaction transaction = isAdmin
                ? onlinePaymentRepository.findById(transactionId).orElse(null)
                : onlinePaymentRepository.findByIdAndUserEmail(transactionId, requesterEmail).orElse(null);
        if (transaction == null) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Transação de cartão não encontrada.");
        }
        if (isPendingOrder(transaction)) {
            MercadoPagoOrder order = orderClient.getOrder(transaction.transactionIdentifier());
            PaymentSettlementService.SettlementResult result = settlementService.synchronize(transaction.id(), order);
            return new CardPaymentStatusResponse(transaction.id(), result.status(),
                    messageForStatus(result.status(), result.statusDetail()),
                    "APPROVED".equals(result.status()) ? LocalDateTime.now() : transaction.confirmedAt());
        }
        return new CardPaymentStatusResponse(transaction.id(), transaction.status(),
                messageForStatus(transaction.status(), null), transaction.confirmedAt());
    }

    private boolean isPendingOrder(OnlinePaymentTransaction transaction) {
        return "PENDING".equalsIgnoreCase(transaction.status())
                && transaction.transactionIdentifier() != null
                && transaction.transactionIdentifier().startsWith("ORD");
    }

    private boolean isLocalReservation(OnlinePaymentTransaction transaction) {
        return transaction.transactionIdentifier() != null
                && transaction.transactionIdentifier().startsWith(LOCAL_IDENTIFIER_PREFIX)
                && "PENDING".equalsIgnoreCase(transaction.status());
    }

    private String validateIdempotencyKey(String idempotencyKey) {
        if (idempotencyKey == null || idempotencyKey.isBlank()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "X-Idempotency-Key é obrigatório.");
        }
        String normalized = idempotencyKey.trim();
        if (normalized.length() > 100) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "X-Idempotency-Key é inválido.");
        }
        try {
            UUID.fromString(normalized);
        } catch (IllegalArgumentException exception) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "X-Idempotency-Key deve ser um UUID válido.");
        }
        return normalized;
    }

    private CardPaymentResponse toExistingPaymentResponse(OnlinePaymentTransaction transaction,
                                                          CardPaymentRequest request) {
        return new CardPaymentResponse(
                transaction.id(), transaction.subscriptionId(), transaction.paymentId(),
                transaction.transactionIdentifier(), transaction.amount(), transaction.status(), "",
                messageForStatus(transaction.status(), null), request.paymentMethodId(),
                request.resolveInstallments(), transaction.requestedAt());
    }

    private String messageForStatus(String status, String statusDetail) {
        if ("APPROVED".equalsIgnoreCase(status) || "CONFIRMED".equalsIgnoreCase(status)) {
            return "Pagamento aprovado com sucesso! Sua assinatura foi renovada.";
        }
        if ("REJECTED".equalsIgnoreCase(status) || "FAILED".equalsIgnoreCase(status)) {
            return mapRejectionReason(statusDetail);
        }
        if ("EXPIRED".equalsIgnoreCase(status) || "CANCELED".equalsIgnoreCase(status)) {
            return "A tentativa de pagamento foi encerrada. Tente novamente.";
        }
        return "Pagamento em análise pelo Mercado Pago. A confirmação ocorrerá em instantes.";
    }

    private String mapRejectionReason(String statusDetail) {
        if (statusDetail == null || statusDetail.isBlank() || "failed".equals(statusDetail)) {
            return "Pagamento não aprovado pela emissora do cartão.";
        }
        return switch (statusDetail) {
            case "bad_filled_card_data" -> "Dados do cartão incorretos. Por favor, revise as informações.";
            case "insufficient_amount", "card_insufficient_amount" -> "Saldo ou limite insuficiente no cartão.";
            case "required_call_for_authorize" -> "Pagamento requer autorização da emissora do cartão.";
            case "card_disabled" -> "Cartão desabilitado ou bloqueado pela emissora.";
            case "high_risk" -> "Pagamento recusado por segurança pela operadora.";
            case "max_attempts_exceeded" -> "Limite de tentativas excedido. Tente novamente mais tarde.";
            case "invalid_installments" -> "Quantidade de parcelas não aceita para este cartão.";
            case "rejected_by_issuer" -> "Pagamento não autorizado pela emissora do cartão.";
            default -> "Pagamento não aprovado pela operadora (" + statusDetail + "). Tente outro cartão.";
        };
    }
}
