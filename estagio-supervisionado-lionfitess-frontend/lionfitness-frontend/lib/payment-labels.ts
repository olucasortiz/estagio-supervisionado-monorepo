const METHOD_LABELS: Record<string, string> = {
  PIX: "Pix",
  CASH: "Dinheiro",
  CARD: "Cartão",
  CREDIT_CARD: "Cartão de crédito",
  DEBIT_CARD: "Cartão de débito",
  BOLETO: "Boleto",
};

/** Converte o valor do backend (ex.: CREDIT_CARD) no texto exibido ao usuário. */
export function paymentMethodLabel(method?: string | null): string {
  if (!method) return "—";
  const key = String(method).trim();
  return METHOD_LABELS[key.toUpperCase()] ?? key;
}

/** "1 dia" / "30 dias". */
export function daysLabel(value: number | string | null | undefined): string {
  const n = Number(value);
  if (!Number.isFinite(n)) return "—";
  return `${n} ${n === 1 ? "dia" : "dias"}`;
}

/**
 * Status com que um pagamento manual é registrado, conforme o método.
 * Dinheiro é recebido na hora (Pago); Pix, cartão e boleto aguardam confirmação (Pendente).
 */
export function statusForMethod(method?: string | null): "Pago" | "Pendente" {
  const key = String(method || "").trim().toUpperCase().normalize("NFD").replace(/[̀-ͯ]/g, "");
  return key === "DINHEIRO" || key === "CASH" ? "Pago" : "Pendente";
}

/**
 * Status exibido: um pagamento pendente cuja assinatura já venceu aparece como Atrasado,
 * a mesma regra que o backend usa na consulta de inadimplência.
 */
export function displayPaymentStatus(status?: string | null, subscriptionEndDate?: string | null): string {
  const key = String(status || "").trim().toUpperCase();
  if ((key === "PENDING" || key === "PENDENTE") && subscriptionEndDate) {
    const end = new Date(String(subscriptionEndDate).slice(0, 10) + "T00:00:00");
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    if (!Number.isNaN(end.getTime()) && end < today) return "OVERDUE";
  }
  return status || "—";
}
