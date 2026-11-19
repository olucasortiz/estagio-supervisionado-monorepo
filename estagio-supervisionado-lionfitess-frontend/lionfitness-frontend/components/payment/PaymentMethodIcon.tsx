import { Banknote, Barcode, CreditCard } from "lucide-react";
import { PixIcon } from "./PixIcon";

/** Ícone de cada forma de pagamento: Pix, cartão, dinheiro e boleto. */
export function PaymentMethodIcon({ method, size = 16 }: { method?: string | null; size?: number }) {
  const key = String(method || "").trim().toUpperCase().normalize("NFD").replace(/[̀-ͯ]/g, "");
  if (key === "PIX") return <PixIcon size={size} />;
  if (["CARTAO", "CARD", "CREDIT_CARD", "DEBIT_CARD"].includes(key)) return <CreditCard size={size} aria-hidden="true" />;
  if (["DINHEIRO", "CASH"].includes(key)) return <Banknote size={size} aria-hidden="true" />;
  if (key === "BOLETO") return <Barcode size={size} aria-hidden="true" />;
  return null;
}

export default PaymentMethodIcon;
