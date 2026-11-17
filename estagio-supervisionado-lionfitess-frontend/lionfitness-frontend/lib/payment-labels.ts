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
