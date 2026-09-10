package com.lionfitness.backend.payment.exception;

/**
 * Exceção lançada quando ocorre falha de comunicação com a API do Mercado Pago.
 * Cobre cenários como: timeout, recusa HTTP 4xx/5xx, resposta malformada.
 */
public class MercadoPagoGatewayException extends RuntimeException {

    private final Integer httpStatus;
    private final String gatewayCode;

    public MercadoPagoGatewayException(String message) {
        super(message);
        this.httpStatus = null;
        this.gatewayCode = null;
    }

    public MercadoPagoGatewayException(String message, Throwable cause) {
        super(message, cause);
        this.httpStatus = null;
        this.gatewayCode = null;
    }

    public MercadoPagoGatewayException(String message, Integer httpStatus, Throwable cause) {
        super(message, cause);
        this.httpStatus = httpStatus;
        this.gatewayCode = null;
    }

    public MercadoPagoGatewayException(String message, Integer httpStatus, String gatewayCode, Throwable cause) {
        super(message, cause);
        this.httpStatus = httpStatus;
        this.gatewayCode = gatewayCode;
    }

    public Integer getHttpStatus() {
        return httpStatus;
    }

    public String getGatewayCode() {
        return gatewayCode;
    }

    public boolean isIdempotencyKeyAlreadyUsed() {
        return "idempotency_key_already_used".equalsIgnoreCase(gatewayCode);
    }

    public boolean isDefinitiveClientRejection() {
        return httpStatus != null
                && httpStatus >= 400
                && httpStatus < 500
                && httpStatus != 408
                && httpStatus != 425
                && httpStatus != 429;
    }
}
