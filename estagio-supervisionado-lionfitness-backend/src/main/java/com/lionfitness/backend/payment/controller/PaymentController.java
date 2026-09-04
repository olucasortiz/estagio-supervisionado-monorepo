package com.lionfitness.backend.payment.controller;

import java.net.URI;
import java.util.List;
import java.util.UUID;

import com.lionfitness.backend.payment.dto.PaymentCreateRequest;
import com.lionfitness.backend.payment.dto.PaymentResponse;
import com.lionfitness.backend.payment.dto.PaymentUpdateRequest;
import com.lionfitness.backend.payment.service.PaymentService;
import jakarta.validation.Valid;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/payments")
public class PaymentController {

    private final PaymentService paymentService;

    public PaymentController(PaymentService paymentService) {
        this.paymentService = paymentService;
    }

    @PostMapping
    public ResponseEntity<PaymentResponse> create(@Valid @RequestBody PaymentCreateRequest request) {
        PaymentResponse response = paymentService.create(request);
        return ResponseEntity
                .created(URI.create("/payments/" + response.id()))
                .body(response);
    }

    @GetMapping
    public List<PaymentResponse> findAll() {
        return paymentService.findAll();
    }

    @GetMapping("/{id}")
    public PaymentResponse findById(@PathVariable UUID id) {
        return paymentService.findById(id);
    }

    @PutMapping("/{id}")
    public PaymentResponse update(@PathVariable UUID id, @Valid @RequestBody PaymentUpdateRequest request) {
        return paymentService.update(id, request);
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> delete(@PathVariable UUID id) {
        paymentService.delete(id);
        return ResponseEntity.noContent().build();
    }
}
