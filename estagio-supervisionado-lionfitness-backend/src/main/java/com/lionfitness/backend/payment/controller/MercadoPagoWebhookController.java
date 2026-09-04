package com.lionfitness.backend.payment.controller;

import com.lionfitness.backend.payment.dto.MercadoPagoWebhookRequest;
import com.lionfitness.backend.payment.service.MercadoPagoWebhookService;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

/**
 * Controller que recebe as notificações de pagamento (webhooks / IPN) do Mercado Pago.
 *
 * <p><b>Segurança:</b> o endpoint é público (sem JWT) porque as requisições partem
 * dos servidores do Mercado Pago, não do browser do usuário. A rota está liberada via
 * {@code /payments/webhook} em {@code SecurityConfig}. A validação de autenticidade
 * é feita internamente ao re-consultar a API do MP (nunca confiamos apenas no payload).
 *
 * <p><b>Idempotência:</b> o Mercado Pago pode reenviar a mesma notificação múltiplas
 * vezes. O serviço verifica o status atual da transação antes de aplicar qualquer
 * alteração, retornando sempre HTTP 200 para evitar reenvios.
 *
 * <p><b>Endpoint:</b> {@code POST /payments/webhook}
 */
@RestController
@RequestMapping("/payments/webhook")
public class MercadoPagoWebhookController {

    private static final Logger logger = LoggerFactory.getLogger(MercadoPagoWebhookController.class);

    private final MercadoPagoWebhookService webhookService;

    public MercadoPagoWebhookController(MercadoPagoWebhookService webhookService) {
        this.webhookService = webhookService;
    }

    /**
     * Recebe a notificação do Mercado Pago.
     *
     * <p>O MP pode enviar o ID tanto via query param {@code ?id=xxx&topic=payment}
     * (formato v1 / IPN) quanto via body JSON {@code {"action":"payment.updated","data":{"id":"xxx"}}}
     * (formato v2). Este endpoint trata os dois cenários.
     *
     * @param idParam  Query param {@code id} (formato IPN v1)
     * @param topic    Query param {@code topic} (formato IPN v1) — "payment"
     * @param body     Corpo JSON (formato Webhook v2), pode ser nulo
     * @return HTTP 200 sempre (para o MP não reenviar indefinidamente)
     */
    @PostMapping
    public ResponseEntity<Void> handleWebhook(
            @RequestParam(name = "id",    required = false) String idParam,
            @RequestParam(name = "topic", required = false) String topic,
            @RequestBody(required = false) MercadoPagoWebhookRequest body
    ) {
        // Determina o ID do pagamento priorizando o body JSON (v2) sobre query param (v1)
        String externalPaymentId = null;

        if (body != null) {
            externalPaymentId = body.resolvePaymentId();
        }

        // Fallback: IPN v1 via query params (topic=payment)
        if (externalPaymentId == null && "payment".equalsIgnoreCase(topic) && idParam != null && !idParam.isBlank()) {
            externalPaymentId = idParam;
        }

        // Fallback: id direto na query sem topic
        if (externalPaymentId == null && idParam != null && !idParam.isBlank()) {
            externalPaymentId = idParam;
        }

        if (externalPaymentId == null || externalPaymentId.isBlank()) {
            logger.warn("[Webhook MP] Notificação recebida sem ID de pagamento identificável. "
                    + "topic={} idParam={} body={}", topic, idParam, body);
            // Retorna 200 para evitar que o MP re-enfileire a notificação
            return ResponseEntity.ok().build();
        }

        logger.info("[Webhook MP] Processando notificação: externalPaymentId={} topic={}", externalPaymentId, topic);

        try {
            webhookService.processPaymentNotification(externalPaymentId);
        } catch (Exception e) {
            // Captura exceções não tratadas para sempre retornar 200 ao MP
            logger.error("[Webhook MP] Erro inesperado ao processar notificação para externalId={}: {}",
                    externalPaymentId, e.getMessage(), e);
        }

        return ResponseEntity.ok().build();
    }
}
