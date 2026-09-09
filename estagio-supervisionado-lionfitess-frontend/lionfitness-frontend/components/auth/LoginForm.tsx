"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { AlertCircle, CreditCard, Dumbbell, Eye, EyeOff, Loader2, Users, ClipboardList } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { LionLogo } from "@/components/branding/LionLogo";
import { ForgotPasswordDialog } from "./ForgotPasswordDialog";
import { useAuth } from "@/hooks/useAuth";
import { getDefaultRouteByRole } from "@/services/auth";
import { cn } from "@/lib/utils";

const features = [
  { icon: Users, label: "Alunos" },
  { icon: Dumbbell, label: "Treinos" },
  { icon: ClipboardList, label: "Planos" },
  { icon: CreditCard, label: "Pagamentos" },
];

export default function LoginForm() {
  const router = useRouter();
  const { login } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [forgotPasswordOpen, setForgotPasswordOpen] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (loading) return;

    try {
      setLoading(true);
      setError("");
      const session = await login(email.trim(), password);
      const defaultRoute = getDefaultRouteByRole(session.user.role);
      router.replace(defaultRoute);
    } catch (err) {
      setError(
        err instanceof Error && err.message
          ? err.message
          : "Não foi possível realizar o login. Verifique suas credenciais."
      );
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = () => {
    if (error) setError("");
  };

  return (
    <main data-theme="light" className="flex min-h-screen w-full bg-background text-foreground">
      {/* Left — institutional / branding (Desktop only: 45%) */}
      <section
        className="relative hidden w-[45%] flex-col justify-between overflow-hidden bg-lion-sidebar px-10 py-12 text-white lg:flex xl:px-16"
        aria-label="Institucional"
      >
        {/* Soft ambient glow */}
        <div className="pointer-events-none absolute -right-24 top-1/4 h-72 w-72 rounded-full bg-lion-red/20 blur-[100px]" />
        <div className="pointer-events-none absolute -left-12 bottom-1/4 h-64 w-64 rounded-full bg-lion-red-light/10 blur-[90px]" />

        <div className="relative z-10">
          <LionLogo variant="light" size="lg" />
        </div>

        <div className="relative z-10 max-w-md">
          <h1 className="text-3xl font-semibold leading-tight tracking-tight text-white xl:text-4xl">
            Gestão inteligente
            <br />
            para academias
          </h1>
          <p className="mt-4 text-base text-white/60">
            Tudo o que sua academia precisa em um só lugar: alunos, treinos, planos e pagamentos.
          </p>

          {/* Visual system modules */}
          <div className="mt-10 grid grid-cols-2 gap-3">
            {features.map((feature, index) => (
              <div
                key={feature.label}
                className="flex items-center gap-3 rounded-xl border border-white/10 bg-white/5 px-4 py-3 backdrop-blur-sm transition-colors hover:bg-white/10"
                style={{ animationDelay: `${index * 80}ms` }}
              >
                <div className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-lion-red/20 text-lion-red-light">
                  <feature.icon className="h-4.5 w-4.5" strokeWidth={2} />
                </div>
                <span className="text-sm font-medium text-white/90">{feature.label}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="relative z-10 text-sm text-white/40">
          © {new Date().getFullYear()} Lion Fitness. Todos os direitos reservados.
        </div>
      </section>

      {/* Right — login card (Mobile: full width, Desktop: 55%) */}
      <section
        className="flex w-full flex-col items-center justify-center px-4 py-8 sm:px-6 lg:w-[55%] lg:px-10 xl:px-20"
        aria-label="Login"
      >
        {/* Mobile-only compact branding */}
        <div className="mb-6 flex w-full max-w-sm flex-col items-center lg:hidden">
          <LionLogo variant="dark" size="lg" />
          <p className="mt-2 text-center text-sm text-muted-foreground">Gestão inteligente para academias</p>
        </div>

        <div className="w-full max-w-sm rounded-2xl border border-border bg-card p-6 shadow-[0_8px_30px_rgb(0,0,0,0.04)] sm:p-8 lg:max-w-md">
          {/* Card header */}
          <div className="mb-6 flex flex-col items-center text-center sm:mb-8">
            <div className="mb-4 grid h-14 w-14 place-items-center rounded-2xl bg-lion-red/10 text-lion-red">
              <svg viewBox="0 0 32 32" fill="none" className="h-7 w-7" aria-hidden="true">
                <rect width="32" height="32" rx="8" fill="currentColor" />
                <path
                  d="M8 24c0-4.418 3.582-8 8-8s8 3.582 8 8M10 13c0-2.209 1.791-4 4-4s4 1.791 4 4"
                  stroke="white"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                />
                <circle cx="22" cy="11" r="2.5" fill="white" />
              </svg>
            </div>
            <h2 className="text-xl font-semibold tracking-tight text-card-foreground sm:text-2xl">Bem-vindo de volta</h2>
            <p className="mt-1.5 text-sm text-muted-foreground">Entre para acessar sua conta.</p>
          </div>

          {/* Error state */}
          {error && (
            <Alert variant="destructive" className="mb-5 border-lion-red-light/30 bg-lion-red-light/10 text-lion-red-dark">
              <AlertCircle className="h-4 w-4 text-lion-red" />
              <AlertDescription className="text-lion-red-dark font-medium">
                {error}
              </AlertDescription>
            </Alert>
          )}

          <form onSubmit={handleSubmit} className="space-y-4 sm:space-y-5">
            <div className="space-y-1.5">
              <Label htmlFor="email">E-mail</Label>
              <Input
                id="email"
                type="email"
                placeholder="seu@email.com"
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value);
                  handleInputChange();
                }}
                disabled={loading}
                required
                autoComplete="email"
                className="h-11 border-border bg-lion-slate-100 dark:bg-card px-4 text-foreground placeholder:text-muted-foreground/70 focus-visible:ring-lion-red/30"
              />
            </div>

            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <Label htmlFor="password">Senha</Label>
                <button
                  type="button"
                  onClick={() => setForgotPasswordOpen(true)}
                  className="text-xs font-medium text-lion-red transition-colors hover:text-lion-red-dark cursor-pointer"
                >
                  Esqueci minha senha
                </button>
              </div>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => {
                    setPassword(e.target.value);
                    handleInputChange();
                  }}
                  disabled={loading}
                  required
                  autoComplete="current-password"
                  className="h-11 border-border bg-lion-slate-100 dark:bg-card px-4 pr-10 text-foreground placeholder:text-muted-foreground/70 focus-visible:ring-lion-red/30"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((prev) => !prev)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground transition-colors hover:text-foreground cursor-pointer"
                  aria-label={showPassword ? "Ocultar senha" : "Mostrar senha"}
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            <Button
              id="login-submit-btn"
              type="submit"
              disabled={loading}
              className={cn(
                "h-12 w-full text-base font-semibold transition-all",
                "bg-lion-red text-white hover:bg-lion-red-dark shadow-brand",
                "focus-visible:ring-2 focus-visible:ring-lion-red/30",
                loading && "cursor-not-allowed hover:bg-lion-red opacity-80",
              )}
            >
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Entrando...
                </>
              ) : (
                "Entrar"
              )}
            </Button>
          </form>
        </div>
      </section>

      {/* Modal de Recuperação de Senha */}
      <ForgotPasswordDialog
        open={forgotPasswordOpen}
        onOpenChange={setForgotPasswordOpen}
      />
    </main>
  );
}
