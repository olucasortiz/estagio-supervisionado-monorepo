"use client";

import React from "react";
import { PaymentMethodIcon } from "@/components/payment/PaymentMethodIcon";
import { formatDateBr } from "@/lib/training-records";
import "./training.css";

export type MyPayment = {
  id: string;
  subscriptionId: string;
  planName: string | null;
  amount: number;
  method: string;
  status: string;
  paidAt: string | number[] | null;
  subscriptionEndDate: string | number[] | null;
  createdAt: string | number[] | null;
};

// O backend grava boleto como ONLINE_GATEWAY (PaymentMethod.fromRequestValue).
const METHOD_LABELS: Record<string, string> = {
  CASH: "Dinheiro", PIX: "Pix", CREDIT_CARD: "Cartão de crédito", DEBIT_CARD: "Cartão de débito",
  ONLINE_GATEWAY: "Boleto", BOLETO: "Boleto",
};
const STATUS_LABELS: Record<string, string> = {
  PAID: "Pago", PENDING: "Pendente", OVERDUE: "Atrasado", CANCELED: "Cancelado", REFUNDED: "Estornado",
};

function currency(value: number): string {
  return Number(value).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

/** Estória 17: o aluno consulta os pagamentos registrados, sem poder alterá-los. */
export function PaymentHistory({ payments }: { payments: MyPayment[] }) {
  if (payments.length === 0) {
    return <div className="gp-tr-empty"><strong>Nenhum pagamento registrado</strong>Os pagamentos feitos na recepção ou pelo painel aparecem aqui.</div>;
  }
  return (
    <div className="gp-tr-table-wrap">
      <table className="gp-tr-table gp-tr-table-stack">
        <caption className="sr-only">Pagamentos registrados, do mais recente para o mais antigo</caption>
        <thead>
          <tr>
            <th scope="col">Data</th>
            <th scope="col">Plano</th>
            <th scope="col">Forma</th>
            <th scope="col" className="gp-tr-num">Valor</th>
            <th scope="col">Situação</th>
          </tr>
        </thead>
        <tbody>
          {payments.map((payment) => (
            <tr key={payment.id}>
              <td data-label="Data">{formatDateBr(payment.paidAt ?? payment.createdAt)}</td>
              <td data-label="Plano">{payment.planName || "—"}</td>
              <td data-label="Forma">
                <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
                  <PaymentMethodIcon method={payment.method === "ONLINE_GATEWAY" ? "BOLETO" : payment.method} />
                  {METHOD_LABELS[payment.method] ?? payment.method}
                </span>
              </td>
              <td data-label="Valor" className="gp-tr-num">{currency(payment.amount)}</td>
              <td data-label="Situação">
                <span className="gp-tr-status" data-status={payment.status}>{STATUS_LABELS[payment.status] ?? payment.status}</span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
