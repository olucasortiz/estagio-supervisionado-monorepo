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
import "@/app/graphite-tokens.css";
import "@/app/auth.css";
import { forgotPassword } from "@/services/api";

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
        response?.message || "Se o e-mail estiver cadastrado e ativo, você receberá as instruções de recuperação."
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
      <DialogContent className="graphite-auth w-full max-w-md rounded-xl border border-border bg-card p-6 sm:p-8 shadow-none">
        {!isSuccess ? (
          <form onSubmit={handleSubmit} className="gp-auth-form">
            <DialogHeader className="text-center sm:text-center">
              <DialogTitle className="text-2xl font-extrabold tracking-tight text-foreground">
                Recuperar senha
              </DialogTitle>
              <DialogDescription className="mt-1.5 text-sm leading-relaxed text-muted-foreground">
                Informe seu e-mail e enviaremos as instruções para redefinir sua senha.
              </DialogDescription>
            </DialogHeader>

            {error && (
              <div className="gp-auth-alert" role="alert">
                <AlertCircle size={16} aria-hidden="true" />
                <span>{error}</span>
              </div>
            )}

            <div className="gp-auth-field">
              <label htmlFor="forgot-email" className="gp-auth-label">E-mail</label>
              <div className="gp-auth-input-wrap">
                <Mail size={18} aria-hidden="true" />
                <input
                  id="forgot-email"
                  name="email"
                  type="email"
                  autoComplete="email"
                  placeholder="seu@email.com"
                  className="gp-auth-input"
                  data-icon="true"
                  value={email}
                  onChange={(e) => {
                    setEmail(e.target.value);
                    if (error) setError(null);
                  }}
                  disabled={isLoading}
                  required
                />
              </div>
            </div>

            <button type="submit" disabled={isLoading} className="gp-auth-primary">
              {isLoading ? (
                <>
                  <Loader2 size={16} className="gp-auth-spin" aria-hidden="true" />
                  Enviando...
                </>
              ) : (
                "Enviar instruções"
              )}
            </button>

            <div className="gp-auth-center">
              <button type="button" onClick={handleClose} className="gp-auth-link gp-auth-link-muted">
                Voltar para o login
              </button>
            </div>
          </form>
        ) : (
          <div className="gp-auth-success">
            <div className="gp-auth-success-icon">
              <CheckCircle2 size={28} aria-hidden="true" />
            </div>

            <div>
              <h2>Verifique seu e-mail</h2>
              <p role="status">{feedback || "Se o e-mail estiver cadastrado e ativo, você receberá as instruções de recuperação."}</p>
            </div>

            <div className="gp-auth-recipient">
              <span>E-mail de destino:</span>
              <strong>{email}</strong>
            </div>

            <button type="button" onClick={handleClose} className="gp-auth-primary">
              Voltar para o login
            </button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
