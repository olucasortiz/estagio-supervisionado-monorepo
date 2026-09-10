package com.lionfitness.backend.payment.controller;

import com.lionfitness.backend.payment.dto.MercadoPagoWebhookRequest;
import com.lionfitness.backend.payment.exception.MercadoPagoGatewayException;
import com.lionfitness.backend.payment.exception.WebhookProcessingException;
import com.lionfitness.backend.payment.mercadopago.MercadoPagoWebhookSignatureValidator;
import com.lionfitness.backend.payment.service.MercadoPagoWebhookService;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/payments/webhook")
public class MercadoPagoWebhookController {

    private static final Logger logger = LoggerFactory.getLogger(MercadoPagoWebhookController.class);
    private final MercadoPagoWebhookService webhookService;
    private final MercadoPagoWebhookSignatureValidator signatureValidator;

    public MercadoPagoWebhookController(MercadoPagoWebhookService webhookService,
                                        MercadoPagoWebhookSignatureValidator signatureValidator) {
        this.webhookService = webhookService;
        this.signatureValidator = signatureValidator;
    }

    @PostMapping
    public ResponseEntity<Void> handleWebhook(
            @RequestParam(name = "data.id", required = false) String queryOrderId,
            @RequestParam(name = "type", required = false) String queryType,
            @RequestHeader(name = "x-signature", required = false) String xSignature,
            @RequestHeader(name = "x-request-id", required = false) String xRequestId,
            @RequestBody(required = false) MercadoPagoWebhookRequest body
    ) {
        String bodyOrderId = body != null ? body.resolveOrderId() : null;
        String orderId = queryOrderId;
        String eventType = firstNonBlank(queryType, body != null ? body.type() : null);

        if (!"order".equalsIgnoreCase(eventType)
                || (!isBlank(queryType) && !"order".equalsIgnoreCase(queryType))
                || (body != null && !isBlank(body.type()) && !"order".equalsIgnoreCase(body.type()))) {
            return ResponseEntity.badRequest().build();
        }
        if (isBlank(orderId) || (!isBlank(bodyOrderId) && !queryOrderId.equals(bodyOrderId))) {
            return ResponseEntity.badRequest().build();
        }
        MercadoPagoWebhookSignatureValidator.ReservationResult reservation =
                signatureValidator.validateAndReserve(xSignature, xRequestId, orderId);
        if (reservation == MercadoPagoWebhookSignatureValidator.ReservationResult.INVALID) {
            logger.warn("Webhook do Mercado Pago rejeitado por assinatura inválida.");
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();
        }
        if (reservation == MercadoPagoWebhookSignatureValidator.ReservationResult.COMPLETED) {
            return ResponseEntity.ok().build();
        }
        if (reservation == MercadoPagoWebhookSignatureValidator.ReservationResult.PROCESSING) {
            return ResponseEntity.status(HttpStatus.CONFLICT).build();
        }

        try {
            webhookService.processOrderNotification(orderId);
            signatureValidator.markCompleted(xRequestId);
            return ResponseEntity.ok().build();
        } catch (MercadoPagoGatewayException | WebhookProcessingException exception) {
            signatureValidator.release(xRequestId);
            logger.error("Falha transitória ao processar webhook de Order: orderId={}", orderId, exception);
            return ResponseEntity.status(HttpStatus.SERVICE_UNAVAILABLE).build();
        } catch (IllegalArgumentException exception) {
            signatureValidator.release(xRequestId);
            logger.warn("Webhook de Order rejeitado após validação de conteúdo: orderId={} reason={}",
                    orderId, exception.getMessage());
            return ResponseEntity.unprocessableEntity().build();
        } catch (Exception exception) {
            signatureValidator.release(xRequestId);
            logger.error("Falha inesperada ao processar webhook de Order: orderId={}", orderId, exception);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).build();
        }
    }

    private String firstNonBlank(String preferred, String fallback) {
        return !isBlank(preferred) ? preferred : fallback;
    }

    private boolean isBlank(String value) {
        return value == null || value.isBlank();
    }
}
