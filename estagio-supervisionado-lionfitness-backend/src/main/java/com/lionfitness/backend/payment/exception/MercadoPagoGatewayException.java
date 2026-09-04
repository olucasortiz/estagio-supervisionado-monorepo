package com.lionfitness.backend.payment.exception;

/**
 * Exceção lançada quando ocorre falha de comunicação com a API do Mercado Pago.
 * Cobre cenários como: timeout, recusa HTTP 4xx/5xx, resposta malformada.
 */
public class MercadoPagoGatewayException extends RuntimeException {

    private final Integer httpStatus;

    public MercadoPagoGatewayException(String message) {
        super(message);
        this.httpStatus = null;
    }

    public MercadoPagoGatewayException(String message, Throwable cause) {
        super(message, cause);
        this.httpStatus = null;
    }

    public MercadoPagoGatewayException(String message, Integer httpStatus, Throwable cause) {
        super(message, cause);
        this.httpStatus = httpStatus;
    }

    public Integer getHttpStatus() {
        return httpStatus;
    }
}
