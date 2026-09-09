"use client";

import { useMemo, useState, type FormEvent } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import {
  Lock,
  Eye,
  EyeOff,
  CheckCircle2,
  Loader2,
  X,
  Check,
  ArrowLeft,
  AlertCircle,
} from "lucide-react";

import ProtectedRoute from "@/components/auth/ProtectedRoute";
import { LionLogo } from "@/components/branding/LionLogo";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { ThemeToggle } from "@/components/ui/ThemeToggle";
import { resetPassword } from "@/services/api";
import { cn } from "@/lib/utils";

type Requirement = {
  label: string;
  met: boolean;
};

export default function ResetPasswordClient() {
  const searchParams = useSearchParams();
  const token = useMemo(() => searchParams.get("token") || "", [searchParams]);

  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [successMessage, setSuccessMessage] = useState("");
  const [error, setError] = useState<string | null>(null);

  const requirements: Requirement[] = useMemo(
    () => [
      { label: "Mínimo de 6 caracteres", met: password.length >= 6 },
      { label: "Pelo menos uma letra maiúscula", met: /[A-Z]/.test(password) },
      { label: "Pelo menos um número", met: /[0-9]/.test(password) },
      { label: "Pelo menos um caractere especial", met: /[^A-Za-z0-9]/.test(password) },
    ],
    [password]
  );

  const strength = useMemo(() => {
    let score = 0;
    if (password.length >= 6) score += 1;
    if (password.length >= 8) score += 1;
    if (/[A-Z]/.test(password)) score += 1;
    if (/[0-9]/.test(password)) score += 1;
    if (/[^A-Za-z0-9]/.test(password)) score += 1;
    return score;
  }, [password]);

  const passwordsMatch = password === confirmPassword && confirmPassword.length > 0;

  const strengthLabels = ["Muito fraca", "Fraca", "Regular", "Boa", "Forte", "Muito forte"];
  const strengthColors = [
    "bg-destructive",
    "bg-destructive",
    "bg-amber-500",
    "bg-amber-500",
    "bg-emerald-500",
    "bg-emerald-600",
  ];

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);

    if (!token) {
      setError("Token de redefinição não encontrado. Solicite um novo link de recuperação.");
      return;
    }

    if (password.length < 6) {
      setError("A senha deve conter no mínimo 6 caracteres.");
      return;
    }

    if (password !== confirmPassword) {
      setError("As senhas não coincidem.");
      return;
    }

    try {
      setIsLoading(true);
      setError(null);
      const response = await resetPassword(token, password, confirmPassword);
      setSuccessMessage(
        response?.message || "Sua senha foi redefinida com sucesso! Você já pode entrar."
      );
      setIsSuccess(true);
    } catch (err) {
      setError(
        err instanceof Error && err.message
          ? err.message
          : "Não foi possível redefinir a senha. O link pode ter expirado."
      );
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <ProtectedRoute guestOnly>
      <main className="relative flex min-h-screen items-center justify-center bg-background px-5 py-10 sm:px-8">
        <div className="absolute top-5 right-5">
          <ThemeToggle />
        </div>
        <div className="w-full max-w-md animate-fade-in">
          {/* Logo */}
          <div className="mb-6 flex flex-col items-center text-center">
            <LionLogo variant="dark" size="lg" layout="vertical" />
          </div>

          {/* Card */}
          <div className="rounded-3xl border border-border bg-card p-8 shadow-[0_20px_50px_-12px_rgba(0,0,0,0.08)] sm:p-10">
            {!isSuccess ? (
              <form onSubmit={handleSubmit} className="flex flex-col gap-5">
                <div className="text-center">
                  <h1 className="text-2xl font-semibold tracking-tight text-foreground">
                    Definir nova senha
                  </h1>
                  <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                    Crie uma nova senha para recuperar o acesso à sua conta.
                  </p>
                </div>

                {!token && (
                  <Alert variant="destructive" className="border-lion-red-light/30 bg-lion-red-light/10 text-lion-red-dark py-2.5">
                    <AlertCircle className="h-4 w-4 text-lion-red" />
                    <AlertDescription className="text-xs font-medium text-lion-red-dark">
                      Link de redefinição ausente ou inválido. Verifique o link recebido por e-mail.
                    </AlertDescription>
                  </Alert>
                )}

                {error && (
                  <Alert variant="destructive" className="border-lion-red-light/30 bg-lion-red-light/10 text-lion-red-dark py-2.5">
                    <AlertCircle className="h-4 w-4 text-lion-red" />
                    <AlertDescription className="text-xs font-medium text-lion-red-dark">
                      {error}
                    </AlertDescription>
                  </Alert>
                )}

                {/* Nova senha */}
                <div className="flex flex-col gap-2">
                  <Label htmlFor="new-password">Nova senha</Label>
                  <div className="relative">
                    <Lock className="pointer-events-none absolute left-3.5 top-1/2 size-5 -translate-y-1/2 text-muted-foreground" />
                    <Input
                      id="new-password"
                      name="password"
                      type={showPassword ? "text" : "password"}
                      autoComplete="new-password"
                      placeholder="••••••••"
                      value={password}
                      onChange={(e) => {
                        setPassword(e.target.value);
                        if (error) setError(null);
                      }}
                      disabled={isLoading}
                      required
                      className="h-12 w-full rounded-xl border-border bg-lion-slate-100 dark:bg-card pl-11 pr-11 text-sm text-foreground placeholder:text-muted-foreground/60 transition-colors focus-visible:ring-2 focus-visible:ring-lion-red/20 focus-visible:border-lion-red disabled:cursor-not-allowed disabled:opacity-60"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword((s) => !s)}
                      disabled={isLoading}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground transition-colors hover:text-foreground cursor-pointer focus:outline-none"
                      aria-label={showPassword ? "Ocultar senha" : "Mostrar senha"}
                    >
                      {showPassword ? <EyeOff className="size-5" /> : <Eye className="size-5" />}
                    </button>
                  </div>

                  {/* Indicador de força */}
                  {password.length > 0 && (
                    <div className="flex flex-col gap-2 rounded-xl bg-muted/40 p-3 mt-1">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-medium text-muted-foreground">
                          Força da senha
                        </span>
                        <span className="text-xs font-semibold text-foreground">
                          {strengthLabels[strength]}
                        </span>
                      </div>
                      <div className="flex gap-1">
                        {[0, 1, 2, 3].map((index) => (
                          <div
                            key={index}
                            className={`h-1.5 flex-1 rounded-full transition-colors duration-300 ${
                              index < strength ? strengthColors[strength] : "bg-border"
                            }`}
                          />
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Requisitos */}
                  <ul className="mt-1 flex flex-col gap-1.5">
                    {requirements.map((req) => (
                      <li
                        key={req.label}
                        className={`flex items-center gap-2 text-xs transition-colors ${
                          req.met ? "text-emerald-600 dark:text-emerald-400" : "text-muted-foreground"
                        }`}
                      >
                        <span
                          className={`flex size-4 items-center justify-center rounded-full ${
                            req.met ? "bg-emerald-500/12 text-emerald-600 dark:bg-emerald-500/20 dark:text-emerald-400" : "bg-muted text-muted-foreground"
                          }`}
                        >
                          {req.met ? (
                            <Check className="size-3" />
                          ) : (
                            <X className="size-3" />
                          )}
                        </span>
                        {req.label}
                      </li>
                    ))}
                  </ul>
                </div>

                {/* Confirmar senha */}
                <div className="flex flex-col gap-2">
                  <Label htmlFor="confirm-password">Confirmar nova senha</Label>
                  <div className="relative">
                    <Lock className="pointer-events-none absolute left-3.5 top-1/2 size-5 -translate-y-1/2 text-muted-foreground" />
                    <Input
                      id="confirm-password"
                      name="confirm-password"
                      type={showConfirm ? "text" : "password"}
                      autoComplete="new-password"
                      placeholder="••••••••"
                      value={confirmPassword}
                      onChange={(e) => {
                        setConfirmPassword(e.target.value);
                        if (error) setError(null);
                      }}
                      disabled={isLoading}
                      required
                      className="h-12 w-full rounded-xl border-border bg-lion-slate-100 dark:bg-card pl-11 pr-11 text-sm text-foreground placeholder:text-muted-foreground/60 transition-colors focus-visible:ring-2 focus-visible:ring-lion-red/20 focus-visible:border-lion-red disabled:cursor-not-allowed disabled:opacity-60"
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirm((s) => !s)}
                      disabled={isLoading}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground transition-colors hover:text-foreground cursor-pointer focus:outline-none"
                      aria-label={showConfirm ? "Ocultar senha" : "Mostrar senha"}
                    >
                      {showConfirm ? <EyeOff className="size-5" /> : <Eye className="size-5" />}
                    </button>
                  </div>
                  {confirmPassword.length > 0 && !passwordsMatch && (
                    <p className="text-xs text-destructive font-medium" role="alert">
                      As senhas não coincidem.
                    </p>
                  )}
                </div>

                <Button
                  type="submit"
                  disabled={isLoading || !token}
                  className={cn(
                    "h-12 w-full items-center justify-center gap-2 rounded-xl bg-lion-red px-6 text-sm font-semibold text-white shadow-soft transition-all duration-200 hover:bg-lion-red-dark active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-70 cursor-pointer",
                    isLoading && "opacity-80"
                  )}
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="size-4 animate-spin" />
                      Redefinindo...
                    </>
                  ) : (
                    "Redefinir senha"
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
              <div className="flex flex-col items-center gap-6 text-center py-2">
                <div className="flex size-16 items-center justify-center rounded-full bg-emerald-500/12 text-emerald-600 dark:bg-emerald-500/20 dark:text-emerald-400">
                  <CheckCircle2 className="size-8 animate-check-pop" />
                </div>

                <div>
                  <h2 className="text-2xl font-semibold tracking-tight text-foreground">
                    Senha redefinida!
                  </h2>
                  <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                    {successMessage || "Agora você pode acessar sua conta com sua nova senha."}
                  </p>
                </div>

                <Link
                  href="/login"
                  className="inline-flex h-12 w-full items-center justify-center rounded-xl bg-lion-red px-6 text-sm font-semibold text-white shadow-soft transition-all duration-200 hover:bg-lion-red-dark active:scale-[0.99]"
                >
                  Ir para o login
                </Link>
              </div>
            )}
          </div>
        </div>
      </main>
    </ProtectedRoute>
  );
}
