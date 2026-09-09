import { CreditCard, QrCode, ReceiptText, ShieldCheck } from "lucide-react";

type PaymentSummaryProps = {
  amount: number | string | null | undefined;
  method: "Pix" | "Cartão de crédito" | "Cartão de débito";
  planName?: string | null;
  memberName?: string | null;
  transactionIdentifier?: string | null;
  installments?: number | null;
  compact?: boolean;
};

export function formatBRL(value: number | string | null | undefined) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return "—";
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(parsed);
}

export function PaymentSummary({
  amount,
  method,
  planName,
  memberName,
  transactionIdentifier,
  installments,
  compact = false,
}: PaymentSummaryProps) {
  const MethodIcon = method === "Pix" ? QrCode : CreditCard;

  return (
    <section aria-label="Resumo do pagamento" className="rounded-xl border border-border bg-muted/45 p-4">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <p className="flex items-center gap-1.5 text-[0.68rem] font-bold uppercase tracking-[0.1em] text-muted-foreground">
            <ReceiptText className="size-3.5" /> Resumo do pagamento
          </p>
          {planName ? <h3 className="mt-1 truncate text-sm font-semibold text-foreground">{planName}</h3> : null}
          {memberName ? <p className="truncate text-xs text-muted-foreground">Aluno: {memberName}</p> : null}
          {!planName && !memberName ? <p className="mt-1 text-sm font-semibold text-foreground">Assinatura</p> : null}
        </div>
        <div className="shrink-0 text-right">
          <p className="text-xl font-bold tracking-tight text-foreground tabular-nums sm:text-2xl">{formatBRL(amount)}</p>
          <p className="mt-0.5 flex items-center justify-end gap-1 text-xs text-muted-foreground">
            <MethodIcon className="size-3.5" /> {method}
          </p>
        </div>
      </div>

      {!compact && installments && installments > 1 ? (
        <p className="mt-3 border-t border-border pt-3 text-right text-xs text-muted-foreground">
          {installments}x de {formatBRL(Number(amount) / installments)} sem juros
        </p>
      ) : !compact && method !== "Pix" ? (
        <p className="mt-3 border-t border-border pt-3 text-right text-xs text-muted-foreground">
          Pagamento à vista
        </p>
      ) : null}

      {transactionIdentifier ? (
        <div className="mt-3 flex items-center justify-between gap-3 border-t border-border pt-3 text-xs">
          <span className="text-muted-foreground">Identificador</span>
          <span className="max-w-[65%] truncate font-mono text-foreground" title={transactionIdentifier}>
            {transactionIdentifier}
          </span>
        </div>
      ) : null}

      <p className="mt-3 flex items-center gap-2 border-t border-border pt-3 text-[0.68rem] text-muted-foreground">
        <ShieldCheck className="size-3.5 shrink-0 text-primary" />
        Pagamento protegido e processado pelo Mercado Pago
      </p>
    </section>
  );
}
