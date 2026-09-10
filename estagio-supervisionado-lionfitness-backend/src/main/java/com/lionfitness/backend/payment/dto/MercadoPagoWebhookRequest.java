package com.lionfitness.backend.payment.dto;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import com.fasterxml.jackson.annotation.JsonProperty;

/**
 * Payload do webhook de Orders do Mercado Pago.
 */
@JsonIgnoreProperties(ignoreUnknown = true)
public record MercadoPagoWebhookRequest(

        /** Tipo de evento — ex: "order.processed" ou "order.action_required". */
        String action,

        /** Tópico esperado: "order". */
        String type,

        /** Bloco de dados do evento (formato v2) */
        @JsonProperty("data")
        WebhookData data,

        /** ID da própria notificação; não é o ID da Order. */
        String id

) {

    @JsonIgnoreProperties(ignoreUnknown = true)
    public record WebhookData(String id) {}

    /**
     * Extrai o ID do pagamento de forma tolerante aos dois formatos.
     * @return ID como String, ou null se não encontrado.
     */
    public String resolveOrderId() {
        if (data != null && data.id() != null && !data.id().isBlank()) {
            return data.id();
        }
        return null;
    }
}
