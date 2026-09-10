package com.lionfitness.backend.payment.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Pattern;

import java.util.UUID;

/**
 * Payload recebido pelo frontend para processamento seguro de pagamento com cartão.
 *
 * <p><b>SEGURANÇA:</b> Este DTO NUNCA recebe número de cartão, CVV ou validade bruta.
 * O cartão é tokenizado diretamente no navegador do usuário pelos servidores do Mercado Pago
 * e o frontend envia apenas o {@code token} temporário de uso único.
 */
public record CardPaymentRequest(
        @NotNull(message = "subscriptionId é obrigatório.")
        UUID subscriptionId,

        @NotBlank(message = "Token do cartão gerado pelo Mercado Pago é obrigatório.")
        String token,

        @NotBlank(message = "paymentMethodId (ex: visa, master, elo) é obrigatório.")
        String paymentMethodId,

        @NotBlank(message = "paymentTypeId é obrigatório.")
        @Pattern(regexp = "(?i)credit_card", message = "Apenas cartão de crédito é aceito.")
        String paymentTypeId,

        Integer installments, // Número de parcelas (padrão 1)

        String payerEmail, // E-mail do pagador (opcional)

        String identificationType, // ex: CPF

        String identificationNumber // CPF limpo
) {
    public int resolveInstallments() {
        return (installments != null && installments > 0) ? installments : 1;
    }
}
