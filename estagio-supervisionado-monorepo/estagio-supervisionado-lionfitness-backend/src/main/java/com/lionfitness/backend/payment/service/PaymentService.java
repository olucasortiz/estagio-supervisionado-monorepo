package com.lionfitness.backend.payment.service;

import java.math.BigDecimal;
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
import org.springframework.stereotype.Service;

@Service
public class PaymentService {

    private final PaymentRepository paymentRepository;

    public PaymentService(PaymentRepository paymentRepository) {
        this.paymentRepository = paymentRepository;
    }

    public PaymentResponse create(PaymentCreateRequest request) {
        validateRequest(request.subscriptionId(), request.amount());

        Payment payment = paymentRepository.save(
                UUID.randomUUID(),
                request.subscriptionId(),
                request.amount(),
                request.paidAt(),
                PaymentMethod.fromRequestValue(request.method()),
                PaymentStatus.fromRequestValue(request.status())
        );
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

    public PaymentResponse update(UUID id, PaymentUpdateRequest request) {
        if (!paymentRepository.findActiveById(id).isPresent()) {
            throw new PaymentNotFoundException(id);
        }

        validateRequest(request.subscriptionId(), request.amount());

        paymentRepository.update(
                id,
                request.subscriptionId(),
                request.amount(),
                request.paidAt(),
                PaymentMethod.fromRequestValue(request.method()),
                PaymentStatus.fromRequestValue(request.status())
        );
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
