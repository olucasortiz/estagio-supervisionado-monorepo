import { Check, Copy } from "lucide-react";

type CopyPixCodeButtonProps = {
  copied: boolean;
  disabled?: boolean;
  onClick: () => void;
};

export function CopyPixCodeButton({ copied, disabled = false, onClick }: CopyPixCodeButtonProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-live="polite"
      className={`inline-flex h-11 w-full items-center justify-center gap-2 rounded-xl px-4 text-sm font-semibold text-white transition-all focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary disabled:cursor-not-allowed disabled:opacity-50 ${
        copied ? "bg-success" : "bg-primary hover:bg-primary-strong active:scale-[0.99]"
      }`}
    >
      {copied ? <Check className="size-4" /> : <Copy className="size-4" />}
      {copied ? "Copiado!" : "Copiar código"}
    </button>
  );
}
