package com.lionfitness.backend.payment.controller;

import java.util.UUID;

import com.lionfitness.backend.payment.dto.PixConfirmResponse;
import com.lionfitness.backend.payment.dto.PixGenerateRequest;
import com.lionfitness.backend.payment.dto.PixGenerateResponse;
import com.lionfitness.backend.payment.service.PixPaymentService;
import jakarta.validation.Valid;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/payments")
public class OnlinePaymentController {

    private final PixPaymentService pixPaymentService;

    public OnlinePaymentController(PixPaymentService pixPaymentService) {
        this.pixPaymentService = pixPaymentService;
    }

    /**
     * Gera uma cobrança Pix via Mercado Pago.
     *
     * <p>Perfis autorizados:
     * <ul>
     *   <li>ALUNO — gera o Pix da própria mensalidade (sem valor customizado)</li>
     *   <li>ADMIN / OPERATIONAL — pode informar um valor customizado via payload</li>
     * </ul>
     * Personal Trainer não possui acesso a nenhum endpoint financeiro.
     */
    @PostMapping("/pix/generate")
    @PreAuthorize("hasAnyRole('OPERATIONAL', 'ALUNO', 'ADMIN')")
    public ResponseEntity<PixGenerateResponse> generatePix(
            @Valid @RequestBody PixGenerateRequest request,
            Authentication authentication
    ) {
        String payerEmail = authentication.getName();
        boolean isAdmin = authentication.getAuthorities().stream()
                .anyMatch(a -> a.getAuthority().equals("ROLE_ADMIN"));

        PixGenerateResponse response = pixPaymentService.generatePixTransaction(
                request.resolveSubscriptionUuid(),
                request.amount(),
                payerEmail,
                isAdmin
        );

        return ResponseEntity.ok(response);
    }

    /**
     * Confirma/baixa manualmente uma transação Pix.
     *
     * <p>Exclusivo para ADMIN e OPERATIONAL — simula a confirmação de recebimento
     * no ambiente Sandbox, ativando a assinatura do aluno.
     * ALUNO e PERSONAL TRAINER não possuem acesso a este endpoint.
     */
    @PostMapping("/pix/simulate-confirm/{transactionId}")
    @PreAuthorize("hasAnyRole('OPERATIONAL', 'ADMIN')")
    public ResponseEntity<PixConfirmResponse> simulateConfirmPix(@PathVariable UUID transactionId) {
        PixConfirmResponse response = pixPaymentService.confirmPixPayment(transactionId);
        return ResponseEntity.ok(response);
    }
}
