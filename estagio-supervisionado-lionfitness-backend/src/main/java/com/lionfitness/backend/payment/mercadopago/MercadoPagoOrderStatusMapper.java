package com.lionfitness.backend.payment.mercadopago;

import java.util.Locale;

public final class MercadoPagoOrderStatusMapper {

    private MercadoPagoOrderStatusMapper() {}

    public static String toInternalStatus(MercadoPagoOrder order) {
        String orderStatus = normalized(order != null ? order.status() : null);
        String orderDetail = normalized(order != null ? order.statusDetail() : null);
        MercadoPagoOrder.OrderPayment payment = order != null ? order.firstPayment().orElse(null) : null;
        String paymentStatus = normalized(payment != null ? payment.status() : null);
        String paymentDetail = normalized(payment != null ? payment.statusDetail() : null);

        if ("processed".equals(orderStatus)
                && "accredited".equals(orderDetail)
                && "processed".equals(paymentStatus)
                && "accredited".equals(paymentDetail)) {
            return "APPROVED";
        }

        if ("failed".equals(orderStatus) || "failed".equals(paymentStatus)) {
            return "REJECTED";
        }
        if ("expired".equals(orderStatus) || "expired".equals(paymentStatus)) {
            return "EXPIRED";
        }
        if ("canceled".equals(orderStatus) || "cancelled".equals(orderStatus)
                || "canceled".equals(paymentStatus) || "cancelled".equals(paymentStatus)) {
            return "CANCELED";
        }
        if ("refunded".equals(orderStatus)) {
            return "REFUNDED";
        }
        if ("charged_back".equals(orderStatus)) {
            return "CHARGED_BACK";
        }
        return "PENDING";
    }

    public static String statusDetail(MercadoPagoOrder order) {
        if (order == null) return "";
        String paymentDetail = order.firstPayment()
                .map(MercadoPagoOrder.OrderPayment::statusDetail)
                .orElse(null);
        return paymentDetail != null && !paymentDetail.isBlank()
                ? paymentDetail
                : order.statusDetail() != null ? order.statusDetail() : "";
    }

    private static String normalized(String value) {
        return value == null ? "" : value.trim().toLowerCase(Locale.ROOT);
    }
}
