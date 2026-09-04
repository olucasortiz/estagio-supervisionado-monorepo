package com.lionfitness.backend.payment.controller;

import java.util.Map;
import java.util.UUID;

import com.lionfitness.backend.payment.dto.CardPaymentRequest;
import com.lionfitness.backend.payment.dto.CardPaymentResponse;
import com.lionfitness.backend.payment.dto.PixConfirmResponse;
import com.lionfitness.backend.payment.dto.PixGenerateRequest;
import com.lionfitness.backend.payment.dto.PixGenerateResponse;
import com.lionfitness.backend.payment.dto.PixStatusResponse;
import com.lionfitness.backend.payment.service.CardPaymentService;
import com.lionfitness.backend.payment.service.PixPaymentService;
import jakarta.validation.Valid;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/payments")
public class OnlinePaymentController {

    private final PixPaymentService pixPaymentService;
    private final CardPaymentService cardPaymentService;

    @Value("${mercado.pago.public-key:}")
    private String publicKey;

    public OnlinePaymentController(PixPaymentService pixPaymentService, CardPaymentService cardPaymentService) {
        this.pixPaymentService = pixPaymentService;
        this.cardPaymentService = cardPaymentService;
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
     * Consulta o status atual de uma transação Pix no banco de dados local.
     *
     * <p>Endpoint somente leitura para acompanhamento automático (polling) pelo frontend.
     * <ul>
     *   <li>ADMIN: pode consultar qualquer transação do sistema</li>
     *   <li>ALUNO / OPERATIONAL: só pode consultar transação pertencente à própria assinatura</li>
     * </ul>
     */
    @GetMapping("/pix/{transactionId}/status")
    @PreAuthorize("hasAnyRole('OPERATIONAL', 'ALUNO', 'ADMIN')")
    public ResponseEntity<PixStatusResponse> getPixStatus(
            @PathVariable UUID transactionId,
            Authentication authentication
    ) {
        String requesterEmail = authentication.getName();
        boolean isAdmin = authentication.getAuthorities().stream()
                .anyMatch(a -> a.getAuthority().equals("ROLE_ADMIN"));

        PixStatusResponse response = pixPaymentService.getPixTransactionStatus(
                transactionId,
                requesterEmail,
                isAdmin
        );

        return ResponseEntity.ok(response);
    }

    /**
     * Confirma/baixa manualmente uma transação Pix.
     *
     * <p>Exclusivo para ADMIN — simula a confirmação de recebimento
     * no ambiente Sandbox, ativando a assinatura do aluno.
     * ALUNO / OPERATIONAL e PERSONAL TRAINER não possuem acesso a este endpoint.
     */
    @PostMapping("/pix/simulate-confirm/{transactionId}")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<PixConfirmResponse> simulateConfirmPix(@PathVariable UUID transactionId) {
        PixConfirmResponse response = pixPaymentService.confirmPixPayment(transactionId);
        return ResponseEntity.ok(response);
    }

    /**
     * Processa pagamento via cartão de crédito ou débito utilizando token seguro do Mercado Pago.
     *
     * <p><b>SEGURANÇA:</b> O endpoint recebe APENAS o token pré-gerado pelo frontend
     * diretamente nos servidores seguros do Mercado Pago. NENHUM número bruto ou CVV trafega aqui.
     * O valor cobrado é rigorosamente obtido do plano cadastrado no banco de dados.
     *
     * <p>Perfis autorizados:
     * <ul>
     *   <li>ALUNO — pode pagar apenas a própria mensalidade</li>
     *   <li>ADMIN / OPERATIONAL — pode pagar para o aluno/assinatura selecionado</li>
     * </ul>
     */
    @PostMapping("/card")
    @PreAuthorize("hasAnyRole('OPERATIONAL', 'ALUNO', 'ADMIN')")
    public ResponseEntity<CardPaymentResponse> processCard(
            @Valid @RequestBody CardPaymentRequest request,
            Authentication authentication
    ) {
        String requesterEmail = authentication.getName();
        boolean isAdmin = authentication.getAuthorities().stream()
                .anyMatch(a -> a.getAuthority().equals("ROLE_ADMIN"));

        CardPaymentResponse response = cardPaymentService.processCardPayment(
                request,
                requesterEmail,
                isAdmin
        );

        return ResponseEntity.ok(response);
    }

    /**
     * Retorna a chave pública de integração do Mercado Pago configurada no backend.
     * Útil para o frontend inicializar o SDK JavaScript do Mercado Pago.
     */
    @GetMapping("/public-key")
    public ResponseEntity<Map<String, String>> getPublicKey() {
        return ResponseEntity.ok(Map.of("publicKey", publicKey != null ? publicKey : ""));
    }
}

