"use client";

import { useState, type FormEvent } from "react";
import Link from "next/link";
import { Mail, ArrowLeft, CheckCircle2, Loader2, AlertCircle } from "lucide-react";

import "@/app/graphite-tokens.css";
import "@/app/auth.css";
import ProtectedRoute from "@/components/auth/ProtectedRoute";
import { LionLogo } from "@/components/branding/LionLogo";
import { ThemeToggle } from "@/components/ui/ThemeToggle";
import { forgotPassword } from "@/services/api";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [feedback, setFeedback] = useState("");
  const [error, setError] = useState<string | null>(null);

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
          : "Não foi possível solicitar a redefinição agora."
      );
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <ProtectedRoute guestOnly>
      <main className="graphite-auth gp-auth-shell">
        <div className="gp-auth-main">
          <div className="gp-auth-topbar">
            <ThemeToggle />
          </div>

          <div className="gp-auth-brand-mobile" style={{ display: "flex" }}>
            <LionLogo variant="dark" size="lg" layout="vertical" />
          </div>

          <div className="gp-auth-card">
            {!isSuccess ? (
              <form onSubmit={handleSubmit} className="gp-auth-form">
                <div className="gp-auth-card-head" style={{ marginBottom: 0 }}>
                  <h1>Recuperar senha</h1>
                  <p>Informe seu e-mail e enviaremos as instruções para redefinir sua senha.</p>
                </div>

                <div className="gp-auth-field">
                  <label htmlFor="email" className="gp-auth-label">E-mail</label>
                  <div className="gp-auth-input-wrap">
                    <Mail size={18} aria-hidden="true" />
                    <input
                      id="email"
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
                      aria-invalid={error ? true : undefined}
                      aria-describedby={error ? "forgot-error" : undefined}
                    />
                  </div>
                  {error && (
                    <p id="forgot-error" className="gp-auth-alert" role="alert">
                      <AlertCircle size={16} aria-hidden="true" />
                      <span>{error}</span>
                    </p>
                  )}
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
                  <Link href="/login" className="gp-auth-link gp-auth-link-muted">
                    <ArrowLeft size={16} aria-hidden="true" />
                    Voltar para o login
                  </Link>
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

                <Link href="/login" className="gp-auth-primary">
                  Voltar para o login
                </Link>

                <button
                  type="button"
                  className="gp-auth-link gp-auth-link-muted"
                  onClick={() => {
                    setIsSuccess(false);
                    setEmail("");
                    setError(null);
                    setFeedback("");
                  }}
                >
                  Enviar para outro e-mail
                </button>
              </div>
            )}
          </div>
        </div>
      </main>
    </ProtectedRoute>
  );
}
