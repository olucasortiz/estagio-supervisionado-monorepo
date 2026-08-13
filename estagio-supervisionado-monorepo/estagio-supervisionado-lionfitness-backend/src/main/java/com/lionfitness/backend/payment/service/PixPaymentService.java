package com.lionfitness.backend.payment.service;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.UUID;

import com.lionfitness.backend.payment.dto.PixConfirmResponse;
import com.lionfitness.backend.payment.dto.PixGenerateResponse;
import com.lionfitness.backend.payment.model.OnlinePaymentTransaction;
import com.lionfitness.backend.payment.model.Payment;
import com.lionfitness.backend.payment.model.PaymentMethod;
import com.lionfitness.backend.payment.model.PaymentStatus;
import com.lionfitness.backend.payment.repository.OnlinePaymentRepository;
import com.lionfitness.backend.payment.repository.PaymentRepository;
import com.lionfitness.backend.subscription.exception.SubscriptionNotFoundException;
import com.lionfitness.backend.subscription.model.Subscription;
import com.lionfitness.backend.subscription.repository.SubscriptionRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class PixPaymentService {

    private static final Logger logger = LoggerFactory.getLogger(PixPaymentService.class);

    private final SubscriptionRepository subscriptionRepository;
    private final PaymentRepository paymentRepository;
    private final OnlinePaymentRepository onlinePaymentRepository;

    public PixPaymentService(
            SubscriptionRepository subscriptionRepository,
            PaymentRepository paymentRepository,
            OnlinePaymentRepository onlinePaymentRepository
    ) {
        this.subscriptionRepository = subscriptionRepository;
        this.paymentRepository = paymentRepository;
        this.onlinePaymentRepository = onlinePaymentRepository;
    }

    @Transactional
    public PixGenerateResponse generatePixTransaction(UUID subscriptionId) {
        return generatePixTransaction(subscriptionId, null);
    }

    @Transactional
    public PixGenerateResponse generatePixTransaction(UUID subscriptionId, BigDecimal customAmount) {
        logger.info("Generating Pix transaction for subscriptionId {} with customAmount {}", subscriptionId, customAmount);

        Subscription subscription = subscriptionRepository.findActiveById(subscriptionId)
                .orElseThrow(() -> new SubscriptionNotFoundException(subscriptionId));

        Payment payment = paymentRepository.findPendingBySubscriptionId(subscriptionId)
                .map(p -> {
                    if (customAmount != null && customAmount.compareTo(BigDecimal.ZERO) > 0 && !customAmount.equals(p.amount())) {
                        logger.info("Updating existing PENDING payment {} amount from {} to {}", p.id(), p.amount(), customAmount);
                        paymentRepository.update(p.id(), p.subscriptionId(), customAmount, p.paidAt(), p.method(), p.status());
                        return new Payment(p.id(), p.subscriptionId(), customAmount, p.paidAt(), p.method(), p.status(), p.createdAt());
                    }
                    return p;
                })
                .orElseGet(() -> {
                    BigDecimal amount = (customAmount != null && customAmount.compareTo(BigDecimal.ZERO) > 0)
                            ? customAmount
                            : subscriptionRepository.findActivePlanData(subscription.planId())
                                    .map(SubscriptionRepository.PlanSubscriptionData::price)
                                    .orElse(BigDecimal.ZERO);

                    if (amount == null) {
                        amount = BigDecimal.ZERO;
                    }

                    logger.info("No pending payment found for subscription {}. Creating new PENDING payment with amount {}", subscriptionId, amount);
                    return paymentRepository.save(
                            UUID.randomUUID(),
                            subscriptionId,
                            amount,
                            null,
                            PaymentMethod.PIX,
                            PaymentStatus.PENDING
                    );
                });

        String transactionIdentifier = "PIX-TX-" + UUID.randomUUID();
        String qrCodePayload = buildSimulatedPixPayload(transactionIdentifier, payment.amount());
        LocalDateTime requestedAt = LocalDateTime.now();

        OnlinePaymentTransaction transaction = new OnlinePaymentTransaction(
                UUID.randomUUID(),
                subscriptionId,
                payment.id(),
                transactionIdentifier,
                payment.amount(),
                requestedAt,
                null,
                "PENDING",
                qrCodePayload
        );

        onlinePaymentRepository.save(transaction);

        return new PixGenerateResponse(
                transaction.id(),
                subscriptionId,
                payment.id(),
                transactionIdentifier,
                payment.amount(),
                "PENDING",
                qrCodePayload,
                requestedAt
        );
    }


    @Transactional
    public PixConfirmResponse confirmPixPayment(UUID transactionId) {
        logger.info("Confirming Pix payment for transactionId {}", transactionId);

        OnlinePaymentTransaction transaction = onlinePaymentRepository.findById(transactionId)
                .orElseThrow(() -> new RuntimeException("Transação Pix não encontrada para o ID: " + transactionId));

        LocalDateTime confirmedAt = LocalDateTime.now();
        String gatewayReturn = "PIX_SIMULATED_SUCCESS_CONFIRMATION";

        if (!"APPROVED".equalsIgnoreCase(transaction.status()) && !"CONFIRMED".equalsIgnoreCase(transaction.status())) {
            onlinePaymentRepository.updateStatus(transaction.id(), "APPROVED", confirmedAt, gatewayReturn);
            paymentRepository.markAsPaid(transaction.paymentId(), java.time.LocalDate.now());
            logger.info("Transaction {} and linked payment {} confirmed and marked as PAID.", transaction.id(), transaction.paymentId());
        } else {
            logger.info("Transaction {} was already approved/confirmed.", transaction.id());
        }

        return new PixConfirmResponse(
                transaction.id(),
                transaction.paymentId(),
                transaction.transactionIdentifier(),
                "APPROVED",
                "Pagamento Pix confirmado com sucesso.",
                confirmedAt
        );
    }

    private String buildSimulatedPixPayload(String txId, BigDecimal amount) {
        return "00020126580014br.gov.bcb.pix0136" + txId + "52040000530398654"
                + String.format("%.2f", amount != null ? amount : BigDecimal.ZERO).replace(",", ".")
                + "5802BR5913Lion Fitness6009SAO PAULO62070503***6304";
    }
}

