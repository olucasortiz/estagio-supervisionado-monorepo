package com.lionfitness.backend.payment.controller;

import java.util.UUID;
import com.lionfitness.backend.payment.dto.PixConfirmResponse;
import com.lionfitness.backend.payment.dto.PixGenerateRequest;
import com.lionfitness.backend.payment.dto.PixGenerateResponse;
import com.lionfitness.backend.payment.service.PixPaymentService;
import jakarta.validation.Valid;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/payments")
@PreAuthorize("hasAnyRole('OPERATIONAL', 'ALUNO', 'ADMIN')")
public class OnlinePaymentController {


    private final PixPaymentService pixPaymentService;

    public OnlinePaymentController(PixPaymentService pixPaymentService) {
        this.pixPaymentService = pixPaymentService;
    }

    @PostMapping("/pix/generate")
    public ResponseEntity<PixGenerateResponse> generatePix(@Valid @RequestBody PixGenerateRequest request) {
        PixGenerateResponse response = pixPaymentService.generatePixTransaction(request.subscriptionId(), request.amount());
        return ResponseEntity.ok(response);
    }


    @PostMapping("/pix/simulate-confirm/{transactionId}")
    public ResponseEntity<PixConfirmResponse> simulateConfirmPix(@PathVariable UUID transactionId) {
        PixConfirmResponse response = pixPaymentService.confirmPixPayment(transactionId);
        return ResponseEntity.ok(response);
    }
}

