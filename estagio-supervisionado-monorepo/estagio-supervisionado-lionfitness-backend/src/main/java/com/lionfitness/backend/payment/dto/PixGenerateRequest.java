package com.lionfitness.backend.payment.dto;

import java.math.BigDecimal;
import java.nio.charset.StandardCharsets;
import java.util.UUID;
import jakarta.validation.constraints.NotBlank;

/**
 * Payload para requisição de geração de cobrança Pix.
 *
 * <p>O campo {@code subscriptionId} é aceito como {@code String} para máxima
 * tolerância, permitindo tanto UUIDs reais quanto identificadores de teste
 * (como "sub-mock-1"), prevenindo erros de deserialização do Jackson.
 */
public record PixGenerateRequest(
        @NotBlank(message = "O ID da assinatura é obrigatório.")
        String subscriptionId,

        BigDecimal amount
) {
    /**
     * Converte o subscriptionId em um UUID válido.
     * <ul>
     *   <li>Se for um UUID válido em formato texto, converte diretamente.</li>
     *   <li>Se for uma string textual (ex: "sub-mock-1"), gera um UUID v3 determinístico.</li>
     * </ul>
     */
    public UUID resolveSubscriptionUuid() {
        if (subscriptionId == null || subscriptionId.isBlank()) {
            return null;
        }
        try {
            return UUID.fromString(subscriptionId.trim());
        } catch (IllegalArgumentException e) {
            return UUID.nameUUIDFromBytes(subscriptionId.trim().getBytes(StandardCharsets.UTF_8));
        }
    }
}
