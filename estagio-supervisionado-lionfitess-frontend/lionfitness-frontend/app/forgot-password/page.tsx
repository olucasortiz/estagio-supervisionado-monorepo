"use client";

import { useState, type FormEvent } from "react";
import Link from "next/link";
import { Mail, ArrowLeft, CheckCircle2, Loader2 } from "lucide-react";

import ProtectedRoute from "@/components/auth/ProtectedRoute";
import { LionLogo } from "@/components/branding/LionLogo";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ThemeToggle } from "@/components/ui/ThemeToggle";
import { forgotPassword } from "@/services/api";
import { cn } from "@/lib/utils";

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
        response?.message || "Enviamos as instruções para redefinir sua senha."
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
      <main className="relative flex min-h-screen items-center justify-center bg-background px-5 py-12 sm:px-8">
        <div className="absolute top-5 right-5">
          <ThemeToggle />
        </div>
        <div className="w-full max-w-md animate-fade-in">
          {/* Logo */}
          <div className="mb-8 flex flex-col items-center text-center">
            <LionLogo variant="dark" size="lg" layout="vertical" />
          </div>

          {/* Card */}
          <div className="rounded-3xl border border-border bg-card p-8 shadow-[0_20px_50px_-12px_rgba(0,0,0,0.08)] sm:p-10">
            {!isSuccess ? (
              <form onSubmit={handleSubmit} className="flex flex-col gap-6">
                <div className="text-center">
                  <h1 className="text-2xl font-semibold tracking-tight text-foreground">
                    Recuperar senha
                  </h1>
                  <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                    Informe seu e-mail e enviaremos as instruções para redefinir sua senha.
                  </p>
                </div>

                <div className="flex flex-col gap-2">
                  <Label htmlFor="email">E-mail</Label>
                  <div className="relative">
                    <Mail className="pointer-events-none absolute left-3.5 top-1/2 size-5 -translate-y-1/2 text-muted-foreground" />
                    <Input
                      id="email"
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
                      className="h-12 w-full rounded-xl border-border bg-lion-slate-100 dark:bg-card pl-11 pr-4 text-sm text-foreground placeholder:text-muted-foreground/60 transition-colors focus-visible:ring-2 focus-visible:ring-lion-red/20 focus-visible:border-lion-red disabled:cursor-not-allowed disabled:opacity-60"
                    />
                  </div>
                  {error && (
                    <p className="text-sm text-destructive font-medium" role="alert">
                      {error}
                    </p>
                  )}
                </div>

                <Button
                  type="submit"
                  disabled={isLoading}
                  className={cn(
                    "h-12 w-full items-center justify-center gap-2 rounded-xl bg-lion-red px-6 text-sm font-semibold text-white shadow-soft transition-all duration-200 hover:bg-lion-red-dark active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-70",
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
                  <Link
                    href="/login"
                    className="inline-flex items-center gap-1.5 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
                  >
                    <ArrowLeft className="size-4" />
                    Voltar para o login
                  </Link>
                </div>
              </form>
            ) : (
              <div className="flex flex-col items-center gap-6 text-center">
                <div className="flex size-16 items-center justify-center rounded-full bg-emerald-500/12 text-emerald-600 dark:bg-emerald-500/20 dark:text-emerald-400">
                  <CheckCircle2 className="size-8" />
                </div>

                <div>
                  <h2 className="text-2xl font-semibold tracking-tight text-foreground">
                    Verifique seu e-mail
                  </h2>
                  <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                    {feedback || "Enviamos as instruções para redefinir sua senha."}
                  </p>
                </div>

                <div className="w-full rounded-xl border border-border bg-muted/40 p-4">
                  <p className="text-sm text-muted-foreground">
                    E-mail de destino:
                  </p>
                  <p className="mt-1 break-all text-sm font-medium text-foreground">
                    {email}
                  </p>
                </div>

                <Link
                  href="/login"
                  className="inline-flex h-12 w-full items-center justify-center rounded-xl bg-lion-red px-6 text-sm font-semibold text-white shadow-soft transition-all duration-200 hover:bg-lion-red-dark active:scale-[0.99]"
                >
                  Voltar para o login
                </Link>

                <button
                  type="button"
                  onClick={() => {
                    setIsSuccess(false);
                    setEmail("");
                    setError(null);
                    setFeedback("");
                  }}
                  className="text-sm font-medium text-muted-foreground transition-colors hover:text-foreground cursor-pointer"
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
