import { Calendar, FileText, Lock, User } from "lucide-react";
import type { CardBrand } from "./CreditCardPreview";

type CreditCardFormProps = {
  cardNumber: string;
  cardholderName: string;
  expiration: string;
  cvv: string;
  cpf: string;
  brand: CardBrand;
  disabled?: boolean;
  onCardNumberChange: (event: React.ChangeEvent<HTMLInputElement>) => void;
  onCardholderNameChange: (value: string) => void;
  onExpirationChange: (event: React.ChangeEvent<HTMLInputElement>) => void;
  onCvvChange: (value: string) => void;
  onCpfChange: (event: React.ChangeEvent<HTMLInputElement>) => void;
  onCvvFocus: () => void;
  onCvvBlur: () => void;
  onFrontFocus: () => void;
};

const fieldClass =
  "h-11 w-full rounded-xl border border-input bg-card px-3.5 text-sm text-foreground outline-none transition-colors placeholder:text-muted-foreground/70 hover:border-primary/40 focus:border-primary focus:ring-2 focus:ring-primary/15 disabled:cursor-not-allowed disabled:opacity-60";
const labelClass = "mb-1.5 block text-sm font-medium text-foreground";

function FieldIcon({ children }: { children: React.ReactNode }) {
  return <span className="pointer-events-none absolute right-3.5 top-1/2 -translate-y-1/2 text-muted-foreground">{children}</span>;
}

export function CreditCardForm({
  cardNumber,
  cardholderName,
  expiration,
  cvv,
  cpf,
  brand,
  disabled = false,
  onCardNumberChange,
  onCardholderNameChange,
  onExpirationChange,
  onCvvChange,
  onCpfChange,
  onCvvFocus,
  onCvvBlur,
  onFrontFocus,
}: CreditCardFormProps) {
  const brandLabel = brand === "generic" ? "" : brand === "master" ? "Mastercard" : brand.toUpperCase();

  return (
    <div className="grid gap-4">
      <div>
        <label htmlFor="payment-card-number" className={labelClass}>Número do cartão</label>
        <div className="relative">
          <input
            id="payment-card-number"
            type="text"
            inputMode="numeric"
            autoComplete="off"
            value={cardNumber}
            onChange={onCardNumberChange}
            onFocus={onFrontFocus}
            placeholder="0000 0000 0000 0000"
            maxLength={19}
            disabled={disabled}
            className={`${fieldClass} pr-24 font-mono tracking-wide tabular-nums`}
            required
          />
          {brandLabel ? <span className="absolute right-3.5 top-1/2 -translate-y-1/2 text-xs font-bold text-muted-foreground">{brandLabel}</span> : null}
        </div>
      </div>

      <div>
        <label htmlFor="payment-card-holder" className={labelClass}>Nome do titular</label>
        <div className="relative">
          <input
            id="payment-card-holder"
            type="text"
            autoComplete="off"
            value={cardholderName}
            onChange={(event) => onCardholderNameChange(event.target.value.toUpperCase())}
            onFocus={onFrontFocus}
            placeholder="Como está impresso no cartão"
            disabled={disabled}
            className={`${fieldClass} pr-10 uppercase`}
            required
          />
          <FieldIcon><User className="size-4" /></FieldIcon>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label htmlFor="payment-card-expiry" className={labelClass}>Validade</label>
          <div className="relative">
            <input
              id="payment-card-expiry"
              type="text"
              inputMode="numeric"
              autoComplete="off"
              value={expiration}
              onChange={onExpirationChange}
              onFocus={onFrontFocus}
              placeholder="MM/AA"
              maxLength={5}
              disabled={disabled}
              className={`${fieldClass} pr-10 font-mono tabular-nums`}
              required
            />
            <FieldIcon><Calendar className="size-4" /></FieldIcon>
          </div>
        </div>

        <div>
          <label htmlFor="payment-card-cvv" className={labelClass}>CVV</label>
          <div className="relative">
            <input
              id="payment-card-cvv"
              type="password"
              inputMode="numeric"
              autoComplete="off"
              value={cvv}
              onChange={(event) => onCvvChange(event.target.value.replace(/\D/g, "").slice(0, 4))}
              onFocus={onCvvFocus}
              onBlur={onCvvBlur}
              placeholder="123"
              maxLength={4}
              disabled={disabled}
              className={`${fieldClass} pr-10 font-mono tracking-[0.2em]`}
              required
            />
            <FieldIcon><Lock className="size-4" /></FieldIcon>
          </div>
        </div>
      </div>

      <div>
        <label htmlFor="payment-card-cpf" className={labelClass}>CPF do titular</label>
        <div className="relative">
          <input
            id="payment-card-cpf"
            type="text"
            inputMode="numeric"
            autoComplete="off"
            value={cpf}
            onChange={onCpfChange}
            onFocus={onFrontFocus}
            placeholder="000.000.000-00"
            maxLength={14}
            disabled={disabled}
            className={`${fieldClass} pr-10 font-mono tabular-nums`}
            required
          />
          <FieldIcon><FileText className="size-4" /></FieldIcon>
        </div>
      </div>
    </div>
  );
}
