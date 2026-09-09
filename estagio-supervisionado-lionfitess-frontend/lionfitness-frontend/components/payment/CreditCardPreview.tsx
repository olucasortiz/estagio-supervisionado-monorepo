import { CreditCard, Wifi } from "lucide-react";
import { cn } from "@/lib/utils";

export type CardBrand = "visa" | "master" | "elo" | "hipercard" | "amex" | "generic";

function BrandMark({ brand }: { brand: CardBrand }) {
  if (brand === "master") {
    return (
      <span className="flex items-center" aria-label="Mastercard">
        <span className="size-6 rounded-full bg-[#e85d37]" />
        <span className="-ml-2.5 size-6 rounded-full bg-[#f5b842] opacity-90" />
      </span>
    );
  }

  const labels: Record<CardBrand, string> = {
    visa: "VISA",
    master: "MASTERCARD",
    elo: "ELO",
    hipercard: "HIPERCARD",
    amex: "AMEX",
    generic: "",
  };

  return labels[brand] ? (
    <span className="text-xs font-black uppercase italic tracking-wider text-white/90 sm:text-sm">{labels[brand]}</span>
  ) : (
    <CreditCard className="size-6 text-white/70" aria-label="Bandeira ainda não identificada" />
  );
}

function maskedNumber(number: string, brand: CardBrand) {
  const digits = number.replace(/\D/g, "");
  const maxLength = brand === "amex" ? 15 : 16;
  const visible = digits.slice(-4);
  const hiddenLength = Math.max(0, maxLength - visible.length);
  const combined = `${"•".repeat(hiddenLength)}${visible}`;

  if (brand === "amex") {
    return `${combined.slice(0, 4)} ${combined.slice(4, 10)} ${combined.slice(10)}`;
  }
  return combined.match(/.{1,4}/g)?.join(" ") || "•••• •••• •••• ••••";
}

type CreditCardPreviewProps = {
  number: string;
  holder: string;
  expiry: string;
  cvv: string;
  brand: CardBrand;
  flipped: boolean;
  onToggle: () => void;
};

export function CreditCardPreview({ number, holder, expiry, cvv, brand, flipped, onToggle }: CreditCardPreviewProps) {
  return (
    <div className="mx-auto w-full max-w-[22rem] [perspective:1400px]">
      <button
        type="button"
        onClick={onToggle}
        aria-label={flipped ? "Mostrar frente do cartão" : "Mostrar verso do cartão"}
        className="block w-full rounded-2xl focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
      >
        <span
          className={cn(
            "relative block aspect-[1.586/1] w-full transition-transform duration-700 [transform-style:preserve-3d] motion-reduce:duration-0",
            flipped && "[transform:rotateY(180deg)]",
          )}
          style={{ transitionTimingFunction: "cubic-bezier(0.22, 1, 0.36, 1)" }}
        >
          <span className="absolute inset-0 flex flex-col justify-between overflow-hidden rounded-2xl border border-white/10 bg-[linear-gradient(135deg,#343437_0%,#232326_48%,#151517_100%)] p-5 text-left text-white shadow-2xl [backface-visibility:hidden] sm:p-6">
            <span className="pointer-events-none absolute -right-12 -top-16 size-48 rounded-full bg-primary/20 blur-3xl" />
            <span className="relative flex items-start justify-between">
              <span className="text-xs font-bold tracking-[0.18em] text-white/75">LION FITNESS</span>
              <BrandMark brand={brand} />
            </span>
            <span className="relative flex items-center gap-3">
              <span className="h-8 w-11 rounded-md bg-gradient-to-br from-amber-200 via-yellow-400 to-amber-600 ring-1 ring-white/20" />
              <Wifi className="size-5 rotate-90 text-white/65" />
            </span>
            <span className="relative block font-mono text-[clamp(0.88rem,4.4vw,1.25rem)] tracking-[0.08em] text-white tabular-nums">
              {maskedNumber(number, brand)}
            </span>
            <span className="relative flex items-end justify-between gap-4">
              <span className="min-w-0">
                <span className="block text-[0.58rem] uppercase tracking-widest text-white/45">Titular</span>
                <span className="block truncate text-xs font-semibold uppercase tracking-wide text-white sm:text-sm">
                  {holder || "NOME DO TITULAR"}
                </span>
              </span>
              <span className="shrink-0 text-right">
                <span className="block text-[0.58rem] uppercase tracking-widest text-white/45">Validade</span>
                <span className="block font-mono text-xs text-white tabular-nums sm:text-sm">{expiry || "MM/AA"}</span>
              </span>
            </span>
          </span>

          <span className="absolute inset-0 flex flex-col overflow-hidden rounded-2xl border border-white/10 bg-[linear-gradient(135deg,#343437_0%,#232326_48%,#151517_100%)] text-left text-white shadow-2xl [backface-visibility:hidden] [transform:rotateY(180deg)]">
            <span className="mt-6 h-11 w-full bg-black/80" />
            <span className="flex items-center gap-3 px-5 pt-5 sm:px-6">
              <span className="flex h-9 flex-1 items-center rounded-sm bg-white/90 px-3 font-[cursive] text-sm text-slate-500">Assinatura</span>
              <span className="flex h-9 min-w-14 items-center justify-center rounded-sm bg-white px-3 font-mono text-sm font-semibold text-slate-800 tabular-nums">
                {cvv ? "•".repeat(cvv.length) : "•••"}
              </span>
            </span>
            <span className="mt-auto px-5 pb-5 text-[0.65rem] leading-relaxed text-white/45 sm:px-6">
              Preview visual. Os dados são tokenizados diretamente pelo Mercado Pago e não são armazenados.
            </span>
          </span>
        </span>
      </button>
    </div>
  );
}
