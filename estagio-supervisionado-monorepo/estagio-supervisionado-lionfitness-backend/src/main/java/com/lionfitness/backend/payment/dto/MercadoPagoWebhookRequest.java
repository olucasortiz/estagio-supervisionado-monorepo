package com.lionfitness.backend.payment.dto;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import com.fasterxml.jackson.annotation.JsonProperty;

/**
 * Payload recebido pelo Mercado Pago no webhook (IPN).
 *
 * <p>O MP envia dois formatos principais:
 * <ul>
 *   <li>Notificação v1 (query params): {@code ?topic=payment&id=12345}</li>
 *   <li>Notificação v2 (body JSON): {@code {"action":"payment.updated","data":{"id":"12345"}}}</li>
 * </ul>
 * Este DTO cobre os dois casos.
 */
@JsonIgnoreProperties(ignoreUnknown = true)
public record MercadoPagoWebhookRequest(

        /** Tipo de evento — ex: "payment.created", "payment.updated" */
        String action,

        /** Tipo de tópico (formato v1) — ex: "payment" */
        String type,

        /** Bloco de dados do evento (formato v2) */
        @JsonProperty("data")
        WebhookData data,

        /** ID direto (formato v1 via query param ou body simples) */
        String id

) {

    @JsonIgnoreProperties(ignoreUnknown = true)
    public record WebhookData(String id) {}

    /**
     * Extrai o ID do pagamento de forma tolerante aos dois formatos.
     * @return ID como String, ou null se não encontrado.
     */
    public String resolvePaymentId() {
        if (data != null && data.id() != null && !data.id().isBlank()) {
            return data.id();
        }
        if (id != null && !id.isBlank()) {
            return id;
        }
        return null;
    }
}
