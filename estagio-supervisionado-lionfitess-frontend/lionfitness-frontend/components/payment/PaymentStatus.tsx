import { AlertCircle, Check, Clock3, LoaderCircle, TimerOff } from "lucide-react";
import { cn } from "@/lib/utils";

export type PaymentViewState = "idle" | "loading" | "waiting" | "processing" | "success" | "error" | "expired";

type PaymentStatusProps = {
  state: PaymentViewState;
  title?: string;
  message?: string;
  className?: string;
};

const DEFAULT_COPY: Record<Exclude<PaymentViewState, "idle">, { title: string; message: string }> = {
  loading: {
    title: "Preparando pagamento...",
    message: "Estamos carregando os dados seguros da cobrança.",
  },
  waiting: {
    title: "Aguardando pagamento",
    message: "A confirmação aparecerá aqui automaticamente.",
  },
  processing: {
    title: "Processando pagamento...",
    message: "Aguarde enquanto confirmamos os dados informados.",
  },
  success: {
    title: "Pagamento aprovado!",
    message: "A confirmação foi recebida com sucesso.",
  },
  error: {
    title: "Não foi possível concluir",
    message: "Revise os dados apresentados e tente novamente.",
  },
  expired: {
    title: "Cobrança expirada",
    message: "Feche esta janela e gere uma nova cobrança Pix.",
  },
};

export function PaymentStatus({ state, title, message, className }: PaymentStatusProps) {
  if (state === "idle") return null;

  const copy = DEFAULT_COPY[state];
  const isSuccess = state === "success";
  const isError = state === "error";
  const isExpired = state === "expired";
  const isWaiting = state === "waiting";
  const isLoading = state === "loading" || state === "processing";

  return (
    <div
      role={isError || isExpired ? "alert" : "status"}
      aria-live="polite"
      className={cn(
        "flex items-center gap-3 rounded-xl border p-3.5 animate-rise",
        isSuccess && "border-success/30 bg-success/10",
        (isError || isExpired) && "border-destructive/30 bg-destructive/10",
        isWaiting && "border-warning/30 bg-warning/10",
        isLoading && "border-border bg-muted/60",
        className,
      )}
    >
      <span
        className={cn(
          "flex size-9 shrink-0 items-center justify-center rounded-full",
          isSuccess && "bg-success text-white",
          (isError || isExpired) && "bg-destructive text-destructive-foreground",
          isWaiting && "bg-warning/15 text-warning",
          isLoading && "bg-muted text-muted-foreground",
        )}
      >
        {isSuccess && <Check className="size-5" />}
        {isError && <AlertCircle className="size-5" />}
        {isExpired && <TimerOff className="size-5" />}
        {isWaiting && <Clock3 className="size-5 animate-pulse" />}
        {isLoading && <LoaderCircle className="size-5 animate-spin" />}
      </span>
      <div className="min-w-0">
        <p
          className={cn(
            "text-sm font-semibold",
            isSuccess && "text-success",
            (isError || isExpired) && "text-destructive",
            !isSuccess && !isError && !isExpired && "text-foreground",
          )}
        >
          {title || copy.title}
        </p>
        <p className="mt-0.5 text-xs leading-relaxed text-muted-foreground">{message || copy.message}</p>
      </div>
    </div>
  );
}
