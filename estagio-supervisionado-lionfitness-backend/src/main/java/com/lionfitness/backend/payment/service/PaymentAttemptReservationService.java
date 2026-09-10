package com.lionfitness.backend.payment.service;

import com.lionfitness.backend.payment.model.OnlinePaymentTransaction;
import com.lionfitness.backend.payment.model.Payment;
import com.lionfitness.backend.payment.model.PaymentMethod;
import com.lionfitness.backend.payment.model.PaymentStatus;
import com.lionfitness.backend.payment.repository.OnlinePaymentRepository;
import com.lionfitness.backend.payment.repository.PaymentRepository;
import com.lionfitness.backend.subscription.exception.SubscriptionNotFoundException;
import com.lionfitness.backend.subscription.model.Subscription;
import com.lionfitness.backend.subscription.repository.SubscriptionRepository;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.Optional;
import java.util.UUID;

@Service
public class PaymentAttemptReservationService {

    private static final String LOCAL_IDENTIFIER_PREFIX = "LOCAL-";

    private final SubscriptionRepository subscriptionRepository;
    private final PaymentRepository paymentRepository;
    private final OnlinePaymentRepository onlinePaymentRepository;

    public PaymentAttemptReservationService(SubscriptionRepository subscriptionRepository,
                                            PaymentRepository paymentRepository,
                                            OnlinePaymentRepository onlinePaymentRepository) {
        this.subscriptionRepository = subscriptionRepository;
        this.paymentRepository = paymentRepository;
        this.onlinePaymentRepository = onlinePaymentRepository;
    }

    @Transactional(propagation = Propagation.REQUIRES_NEW)
    public Reservation reserveCard(UUID subscriptionId,
                                   String requesterEmail,
                                   boolean isAdmin,
                                   String idempotencyKey) {
        Subscription subscription = findAuthorizedSubscription(subscriptionId, requesterEmail, isAdmin);
        BigDecimal officialPrice = findOfficialPrice(subscription);

        Optional<OnlinePaymentTransaction> existing =
                onlinePaymentRepository.findByIdempotencyKey(idempotencyKey);
        if (existing.isPresent()) {
            OnlinePaymentTransaction transaction = existing.get();
            if (!subscriptionId.equals(transaction.subscriptionId())) {
                throw new ResponseStatusException(HttpStatus.CONFLICT,
                        "A chave de idempotência já foi utilizada em outra assinatura.");
            }
            return new Reservation(transaction, true);
        }

        Payment payment = paymentRepository
                .findPendingBySubscriptionIdAndMethod(subscriptionId, PaymentMethod.CREDIT_CARD)
                .orElseGet(() -> paymentRepository.save(UUID.randomUUID(), subscriptionId, officialPrice,
                        null, PaymentMethod.CREDIT_CARD, PaymentStatus.PENDING));
        OnlinePaymentTransaction transaction = newTransaction(
                UUID.randomUUID(), subscriptionId, payment.id(), officialPrice, idempotencyKey);
        onlinePaymentRepository.saveWithIdempotencyKey(transaction, idempotencyKey);
        return new Reservation(transaction, false);
    }

    @Transactional(propagation = Propagation.REQUIRES_NEW)
    public Reservation reservePix(UUID subscriptionId, String payerEmail, boolean isAdmin) {
        Subscription subscription = findAuthorizedSubscription(subscriptionId, payerEmail, isAdmin);
        BigDecimal officialPrice = findOfficialPrice(subscription);

        Optional<OnlinePaymentTransaction> existing = onlinePaymentRepository
                .findPendingBySubscriptionIdAndMethod(subscription.id(), PaymentMethod.PIX.name());
        if (existing.isPresent()) {
            OnlinePaymentTransaction pending = existing.get();
            boolean recent = pending.requestedAt() != null
                    && pending.requestedAt().isAfter(LocalDateTime.now().minusHours(24));
            if (recent) {
                return new Reservation(pending, true);
            }
            onlinePaymentRepository.updateStatus(pending.id(), "EXPIRED", null, pending.gatewayReturn());
        }

        Payment payment = resolveOrCreatePendingPayment(subscription.id(), officialPrice);
        UUID transactionId = UUID.randomUUID();
        String idempotencyKey = transactionId.toString();
        OnlinePaymentTransaction transaction = newTransaction(
                transactionId, subscription.id(), payment.id(), payment.amount(), idempotencyKey);
        onlinePaymentRepository.saveWithIdempotencyKey(transaction, idempotencyKey);
        return new Reservation(transaction, false);
    }

    private OnlinePaymentTransaction newTransaction(UUID transactionId,
                                                    UUID subscriptionId,
                                                    UUID paymentId,
                                                    BigDecimal amount,
                                                    String idempotencyKey) {
        return new OnlinePaymentTransaction(
                transactionId, subscriptionId, paymentId, LOCAL_IDENTIFIER_PREFIX + transactionId,
                amount, LocalDateTime.now(), null, "PENDING", "{}", idempotencyKey);
    }

    private Subscription findAuthorizedSubscription(UUID subscriptionId, String payerEmail, boolean isAdmin) {
        if (isAdmin) {
            return subscriptionRepository.findActiveByIdForUpdate(subscriptionId)
                    .orElseThrow(() -> new SubscriptionNotFoundException(subscriptionId));
        }
        return subscriptionRepository.findActiveByIdAndUserEmailForUpdate(subscriptionId, payerEmail)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.FORBIDDEN,
                        "Assinatura não encontrada ou não pertence ao aluno autenticado."));
    }

    private BigDecimal findOfficialPrice(Subscription subscription) {
        BigDecimal price = subscriptionRepository.findActivePlanData(subscription.planId())
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND,
                        "Plano associado à assinatura não encontrado."))
                .price();
        if (price == null || price.compareTo(BigDecimal.ZERO) <= 0) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST,
                    "O valor oficial do plano associado é inválido.");
        }
        return price;
    }

    private Payment resolveOrCreatePendingPayment(UUID subscriptionId, BigDecimal officialAmount) {
        return paymentRepository.findPendingBySubscriptionIdAndMethod(subscriptionId, PaymentMethod.PIX)
                .map(payment -> {
                    if (payment.amount().compareTo(officialAmount) != 0) {
                        paymentRepository.update(payment.id(), payment.subscriptionId(), officialAmount,
                                payment.paidAt(), payment.method(), payment.status());
                        return new Payment(payment.id(), payment.subscriptionId(), officialAmount,
                                payment.paidAt(), payment.method(), payment.status(), payment.createdAt());
                    }
                    return payment;
                })
                .orElseGet(() -> paymentRepository.save(UUID.randomUUID(), subscriptionId, officialAmount,
                        null, PaymentMethod.PIX, PaymentStatus.PENDING));
    }

    public record Reservation(OnlinePaymentTransaction transaction, boolean existing) {}
}
