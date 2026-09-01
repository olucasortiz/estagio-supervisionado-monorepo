package com.lionfitness.backend.subscription.service;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

import com.lionfitness.backend.payment.model.PaymentMethod;
import com.lionfitness.backend.payment.model.PaymentStatus;
import com.lionfitness.backend.payment.repository.PaymentRepository;
import com.lionfitness.backend.subscription.dto.MySubscriptionResponse;
import com.lionfitness.backend.subscription.dto.SubscriptionCreateRequest;
import com.lionfitness.backend.subscription.dto.SubscriptionResponse;
import com.lionfitness.backend.subscription.dto.SubscriptionUpdateRequest;
import com.lionfitness.backend.subscription.exception.InvalidSubscriptionPeriodException;
import com.lionfitness.backend.subscription.exception.SubscriptionMemberNotFoundException;
import com.lionfitness.backend.subscription.exception.SubscriptionNotFoundException;
import com.lionfitness.backend.subscription.exception.SubscriptionPlanNotFoundException;
import com.lionfitness.backend.subscription.model.Subscription;
import com.lionfitness.backend.subscription.repository.SubscriptionRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class SubscriptionService {

    private static final Logger logger = LoggerFactory.getLogger(SubscriptionService.class);

    private final SubscriptionRepository subscriptionRepository;
    private final PaymentRepository paymentRepository;

    public SubscriptionService(
            SubscriptionRepository subscriptionRepository,
            PaymentRepository paymentRepository
    ) {
        this.subscriptionRepository = subscriptionRepository;
        this.paymentRepository = paymentRepository;
    }

    @Transactional
    public SubscriptionResponse create(SubscriptionCreateRequest request) {
        logger.info("Creating subscription for memberId {} and planId {}", request.memberId(), request.planId());

        SubscriptionRepository.PlanSubscriptionData planData = validateRequest(
                request.memberId(),
                request.planId(),
                request.startDate()
        );
        LocalDate endDate = calculateEndDate(request.startDate(), planData);

        Subscription subscription = subscriptionRepository.save(UUID.randomUUID(), request, endDate);

        BigDecimal amount = planData.price() != null ? planData.price() : BigDecimal.ZERO;
        paymentRepository.save(
                UUID.randomUUID(),
                subscription.id(),
                amount,
                null,
                PaymentMethod.CASH,
                PaymentStatus.PENDING
        );

        return toResponse(subscription);
    }

    public List<SubscriptionResponse> findAll() {
        return subscriptionRepository.findAllActive()
                .stream()
                .map(this::toResponse)
                .toList();
    }

    public SubscriptionResponse findById(UUID id) {
        Subscription subscription = subscriptionRepository.findActiveById(id)
                .orElseThrow(() -> new SubscriptionNotFoundException(id));

        return toResponse(subscription);
    }

    public SubscriptionResponse update(UUID id, SubscriptionUpdateRequest request) {
        if (!subscriptionRepository.findActiveById(id).isPresent()) {
            throw new SubscriptionNotFoundException(id);
        }

        SubscriptionRepository.PlanSubscriptionData planData = validateRequest(
                request.memberId(),
                request.planId(),
                request.startDate()
        );
        LocalDate endDate = calculateEndDate(request.startDate(), planData);

        subscriptionRepository.update(id, request, endDate);
        return findById(id);
    }

    public void delete(UUID id) {
        if (!subscriptionRepository.cancel(id)) {
            throw new SubscriptionNotFoundException(id);
        }
    }

    @Transactional
    public boolean renewSubscription(UUID id) {
        logger.info("Renewing subscription for id {}", id);
        return subscriptionRepository.renewSubscription(id);
    }

    public Optional<MySubscriptionResponse> findMine(String authenticatedEmail) {
        logger.info("Loading active subscription for authenticated email {}", authenticatedEmail);
        return subscriptionRepository.findActiveByUserEmail(authenticatedEmail)
                .map(sub -> {
                    int days = 0;
                    if ("ACTIVE".equalsIgnoreCase(sub.status()) && sub.endDate() != null) {
                        long diff = java.time.temporal.ChronoUnit.DAYS.between(LocalDate.now(), sub.endDate());
                        days = diff < 0 ? 0 : (int) diff;
                    }
                    return new MySubscriptionResponse(
                            sub.id(),
                            sub.memberId(),
                            sub.planId(),
                            sub.planName(),
                            sub.planType(),
                            sub.planPrice(),
                            sub.startDate(),
                            sub.endDate(),
                            sub.status(),
                            sub.createdAt(),
                            days,
                            true
                    );
                });
    }

    private SubscriptionRepository.PlanSubscriptionData validateRequest(UUID memberId, UUID planId, LocalDate startDate) {
        if (startDate == null) {
            throw new InvalidSubscriptionPeriodException();
        }

        if (!subscriptionRepository.memberExists(memberId)) {
            throw new SubscriptionMemberNotFoundException(memberId);
        }

        SubscriptionRepository.PlanSubscriptionData planData = subscriptionRepository.findActivePlanData(planId)
                .orElseThrow(() -> new SubscriptionPlanNotFoundException(planId));

        if (planData.durationDays() <= 0) {
            throw new InvalidSubscriptionPeriodException();
        }

        return planData;
    }

    private LocalDate calculateEndDate(LocalDate startDate, SubscriptionRepository.PlanSubscriptionData planData) {
        if ("DAILY".equalsIgnoreCase(planData.type())) {
            return startDate;
        }

        return startDate.plusDays(planData.durationDays());
    }

    private SubscriptionResponse toResponse(Subscription subscription) {
        return new SubscriptionResponse(
                subscription.id(),
                subscription.memberId(),
                subscription.planId(),
                subscription.startDate(),
                subscription.endDate(),
                subscription.status(),
                subscription.createdAt()
        );
    }
}
