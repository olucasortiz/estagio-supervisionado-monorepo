package com.lionfitness.backend.payment.controller;

import java.util.List;

import com.lionfitness.backend.payment.dto.MyPaymentResponse;
import com.lionfitness.backend.payment.service.MyPaymentHistoryService;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
public class MyPaymentController {

    private final MyPaymentHistoryService historyService;

    public MyPaymentController(MyPaymentHistoryService historyService) {
        this.historyService = historyService;
    }

    /** Caminho literal: tem prioridade sobre GET /payments/{id}, que é exclusivo do ADMIN. */
    @GetMapping("/payments/me")
    @PreAuthorize("hasAnyRole('OPERATIONAL', 'USER')")
    public List<MyPaymentResponse> findMine(Authentication authentication) {
        return historyService.findMine(authentication.getName());
    }
}
