package com.lionfitness.backend.payment.mercadopago;

import org.junit.jupiter.api.Test;

import java.math.BigDecimal;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;

class MercadoPagoOrderStatusMapperTest {
    @Test
    void mapsOrdersStatusesWithoutTreatingPixWaitingTransferAsFailure() {
        assertThat(MercadoPagoOrderStatusMapper.toInternalStatus(order("processed", "accredited")))
                .isEqualTo("APPROVED");
        assertThat(MercadoPagoOrderStatusMapper.toInternalStatus(order("action_required", "waiting_transfer")))
                .isEqualTo("PENDING");
        assertThat(MercadoPagoOrderStatusMapper.toInternalStatus(order("processing", "in_process")))
                .isEqualTo("PENDING");
        assertThat(MercadoPagoOrderStatusMapper.toInternalStatus(order("failed", "rejected_by_issuer")))
                .isEqualTo("REJECTED");
        assertThat(MercadoPagoOrderStatusMapper.toInternalStatus(order("expired", "expired")))
                .isEqualTo("EXPIRED");
    }

    private MercadoPagoOrder order(String status, String detail) {
        MercadoPagoOrder.OrderPayment payment = new MercadoPagoOrder.OrderPayment(
                "PAY-1", BigDecimal.TEN, null, status, detail, null, null,
                new MercadoPagoOrder.OrderPaymentMethod("pix", "bank_transfer", null,
                        null, null, null, null));
        return new MercadoPagoOrder("ORD-1", "online", "automatic", "ref", BigDecimal.TEN,
                status, detail, new MercadoPagoOrder.Transactions(List.of(payment)));
    }
}
