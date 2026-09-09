"use client";

import { useState, useEffect, type FormEvent } from "react";
import { Mail, CheckCircle2, Loader2, AlertCircle } from "lucide-react";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { forgotPassword } from "@/services/api";
import { cn } from "@/lib/utils";

interface ForgotPasswordDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ForgotPasswordDialog({ open, onOpenChange }: ForgotPasswordDialogProps) {
  const [email, setEmail] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [feedback, setFeedback] = useState("");
  const [error, setError] = useState<string | null>(null);

  // Reset form states when dialog closes
  useEffect(() => {
    if (!open) {
      const timer = setTimeout(() => {
        setEmail("");
        setIsLoading(false);
        setIsSuccess(false);
        setFeedback("");
        setError(null);
      }, 200);
      return () => clearTimeout(timer);
    }
  }, [open]);

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);

    const cleanEmail = email.trim();
    if (!cleanEmail) {
      setError("Informe seu e-mail.");
      return;
    }

    try {
      setIsLoading(true);
      setError(null);
      const response = await forgotPassword(cleanEmail);
      setFeedback(
        response?.message || "Enviamos as instruções para redefinir sua senha."
      );
      setIsSuccess(true);
    } catch (err) {
      setError(
        err instanceof Error && err.message
          ? err.message
          : "Não foi possível solicitar a redefinição agora. Tente novamente mais tarde."
      );
    } finally {
      setIsLoading(false);
    }
  };

  const handleClose = () => {
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-full max-w-md rounded-3xl border border-border bg-card p-6 sm:p-8 shadow-[0_25px_60px_-15px_rgba(0,0,0,0.3)]">
        {!isSuccess ? (
          <form onSubmit={handleSubmit} className="flex flex-col gap-5">
            <DialogHeader className="text-center sm:text-center">
              <DialogTitle className="text-2xl font-semibold tracking-tight text-foreground">
                Recuperar senha
              </DialogTitle>
              <DialogDescription className="mt-1.5 text-sm leading-relaxed text-muted-foreground">
                Informe seu e-mail e enviaremos as instruções para redefinir sua senha.
              </DialogDescription>
            </DialogHeader>

            {error && (
              <Alert variant="destructive" className="border-lion-red-light/30 bg-lion-red-light/10 text-lion-red-dark py-2.5">
                <AlertCircle className="h-4 w-4 text-lion-red" />
                <AlertDescription className="text-xs font-medium text-lion-red-dark">
                  {error}
                </AlertDescription>
              </Alert>
            )}

            <div className="flex flex-col gap-1.5 text-left">
              <Label htmlFor="forgot-email" className="text-sm font-medium text-foreground">
                E-mail
              </Label>
              <div className="relative">
                <Mail className="pointer-events-none absolute left-3.5 top-1/2 size-5 -translate-y-1/2 text-muted-foreground" />
                <Input
                  id="forgot-email"
                  name="email"
                  type="email"
                  autoComplete="email"
                  placeholder="seu@email.com"
                  value={email}
                  onChange={(e) => {
                    setEmail(e.target.value);
                    if (error) setError(null);
                  }}
                  disabled={isLoading}
                  required
                  className="h-11 w-full rounded-xl border-border bg-lion-slate-100 dark:bg-card pl-11 pr-4 text-sm text-foreground placeholder:text-muted-foreground/60 transition-colors focus-visible:ring-2 focus-visible:ring-lion-red/20 focus-visible:border-lion-red disabled:cursor-not-allowed disabled:opacity-60"
                />
              </div>
            </div>

            <Button
              type="submit"
              disabled={isLoading}
              className={cn(
                "h-12 w-full items-center justify-center gap-2 rounded-xl bg-lion-red px-6 text-sm font-semibold text-white shadow-soft transition-all duration-200 hover:bg-lion-red-dark active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-70 cursor-pointer",
                isLoading && "opacity-80"
              )}
            >
              {isLoading ? (
                <>
                  <Loader2 className="size-4 animate-spin" />
                  Enviando...
                </>
              ) : (
                "Enviar instruções"
              )}
            </Button>

            <div className="text-center">
              <button
                type="button"
                onClick={handleClose}
                className="text-xs font-medium text-muted-foreground transition-colors hover:text-foreground cursor-pointer"
              >
                Voltar para o login
              </button>
            </div>
          </form>
        ) : (
          <div className="flex flex-col items-center gap-5 text-center py-2">
            <div className="flex size-14 items-center justify-center rounded-full bg-emerald-500/12 text-emerald-600 dark:bg-emerald-500/20 dark:text-emerald-400">
              <CheckCircle2 className="size-7 animate-check-pop" />
            </div>

            <div>
              <h2 className="text-2xl font-semibold tracking-tight text-foreground">
                Verifique seu e-mail
              </h2>
              <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">
                {feedback || "Enviamos as instruções para redefinir sua senha."}
              </p>
            </div>

            <div className="w-full rounded-xl border border-border bg-muted/40 p-3.5 text-left">
              <p className="text-xs text-muted-foreground">
                E-mail de destino:
              </p>
              <p className="mt-0.5 break-all text-sm font-medium text-foreground">
                {email}
              </p>
            </div>

            <Button
              type="button"
              onClick={handleClose}
              className="h-12 w-full items-center justify-center rounded-xl bg-lion-red px-6 text-sm font-semibold text-white shadow-soft transition-all duration-200 hover:bg-lion-red-dark active:scale-[0.99] cursor-pointer"
            >
              Voltar para o login
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
