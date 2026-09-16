package com.lionfitness.backend.payment.service;

import java.math.BigDecimal;
import java.time.Clock;
import java.time.LocalDate;
import java.util.List;
import java.util.UUID;

import com.lionfitness.backend.payment.dto.PaymentCreateRequest;
import com.lionfitness.backend.payment.dto.PaymentResponse;
import com.lionfitness.backend.payment.dto.PaymentUpdateRequest;
import com.lionfitness.backend.payment.exception.InvalidPaymentAmountException;
import com.lionfitness.backend.payment.exception.PaymentNotFoundException;
import com.lionfitness.backend.payment.exception.PaymentSubscriptionNotFoundException;
import com.lionfitness.backend.payment.model.Payment;
import com.lionfitness.backend.payment.model.PaymentMethod;
import com.lionfitness.backend.payment.model.PaymentStatus;
import com.lionfitness.backend.payment.repository.PaymentRepository;
import com.lionfitness.backend.subscription.model.Subscription;
import com.lionfitness.backend.subscription.repository.SubscriptionRepository;
import com.lionfitness.backend.subscription.service.SubscriptionRenewalEligibilityService;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class PaymentService {

    private final PaymentRepository paymentRepository;
    private final SubscriptionRepository subscriptionRepository;
    private final SubscriptionRenewalEligibilityService renewalEligibilityService;
    private final Clock clock;

    public PaymentService(PaymentRepository paymentRepository,
                          SubscriptionRepository subscriptionRepository,
                          SubscriptionRenewalEligibilityService renewalEligibilityService,
                          Clock applicationClock) {
        this.paymentRepository = paymentRepository;
        this.subscriptionRepository = subscriptionRepository;
        this.renewalEligibilityService = renewalEligibilityService;
        this.clock = applicationClock;
    }

    @Transactional
    public PaymentResponse create(PaymentCreateRequest request) {
        validateRequest(request.subscriptionId(), request.amount());

        PaymentStatus status = PaymentStatus.fromRequestValue(request.status());
        LocalDate effectivePaidAt = request.paidAt() != null ? request.paidAt() : LocalDate.now(clock);

        boolean isRenewal = false;
        Subscription subscription = null;

        if (status == PaymentStatus.PAID) {
            subscription = subscriptionRepository.findActiveById(request.subscriptionId()).orElse(null);
            if (subscription != null) {
                boolean hasPriorPaid = paymentRepository.hasPaidPaymentBySubscriptionId(request.subscriptionId());
                boolean isExpired = subscription.endDate() != null && subscription.endDate().isBefore(LocalDate.now(clock));
                if (hasPriorPaid || isExpired) {
                    isRenewal = true;
                    renewalEligibilityService.requireEligible(subscription);
                }
            }
        }

        Payment payment = paymentRepository.save(
                UUID.randomUUID(),
                request.subscriptionId(),
                request.amount(),
                effectivePaidAt,
                PaymentMethod.fromRequestValue(request.method()),
                status
        );

        if (isRenewal && subscription != null) {
            subscriptionRepository.renewSubscription(subscription.id(), effectivePaidAt);
        }

        return toResponse(payment);
    }

    public List<PaymentResponse> findAll() {
        return paymentRepository.findAllActive()
                .stream()
                .map(this::toResponse)
                .toList();
    }

    public PaymentResponse findById(UUID id) {
        Payment payment = paymentRepository.findActiveById(id)
                .orElseThrow(() -> new PaymentNotFoundException(id));

        return toResponse(payment);
    }

    @Transactional
    public PaymentResponse update(UUID id, PaymentUpdateRequest request) {
        Payment existing = paymentRepository.findActiveById(id)
                .orElseThrow(() -> new PaymentNotFoundException(id));

        validateRequest(request.subscriptionId(), request.amount());

        PaymentStatus newStatus = PaymentStatus.fromRequestValue(request.status());
        LocalDate effectivePaidAt = request.paidAt();
        if (newStatus == PaymentStatus.PAID && effectivePaidAt == null) {
            effectivePaidAt = LocalDate.now(clock);
        }

        boolean shouldRenew = false;
        Subscription subscription = null;

        if (existing.status() != PaymentStatus.PAID && newStatus == PaymentStatus.PAID) {
            subscription = subscriptionRepository.findActiveById(request.subscriptionId()).orElse(null);
            if (subscription != null) {
                boolean hasOtherPaid = paymentRepository.hasPaidPaymentBySubscriptionId(request.subscriptionId());
                boolean isExpired = subscription.endDate() != null && subscription.endDate().isBefore(LocalDate.now(clock));
                if (hasOtherPaid || isExpired) {
                    shouldRenew = true;
                    renewalEligibilityService.requireEligible(subscription);
                }
            }
        }

        paymentRepository.update(
                id,
                request.subscriptionId(),
                request.amount(),
                effectivePaidAt,
                PaymentMethod.fromRequestValue(request.method()),
                newStatus
        );

        if (shouldRenew && subscription != null) {
            subscriptionRepository.renewSubscription(subscription.id(), effectivePaidAt);
        }

        return findById(id);
    }

    public void delete(UUID id) {
        if (!paymentRepository.cancel(id)) {
            throw new PaymentNotFoundException(id);
        }
    }

    private void validateRequest(UUID subscriptionId, BigDecimal amount) {
        if (amount == null || amount.compareTo(BigDecimal.ZERO) <= 0) {
            throw new InvalidPaymentAmountException();
        }

        if (!paymentRepository.subscriptionExists(subscriptionId)) {
            throw new PaymentSubscriptionNotFoundException(subscriptionId);
        }
    }

    private PaymentResponse toResponse(Payment payment) {
        return new PaymentResponse(
                payment.id(),
                payment.subscriptionId(),
                payment.amount(),
                payment.paidAt(),
                payment.method(),
                payment.status(),
                payment.createdAt()
        );
    }
}
