"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { AlertCircle, CreditCard, Dumbbell, Eye, EyeOff, Loader2, Users, ClipboardList } from "lucide-react";

import "@/app/graphite-tokens.css";
import "@/app/auth.css";
import { LionLogo } from "@/components/branding/LionLogo";
import { ForgotPasswordDialog } from "./ForgotPasswordDialog";
import { useAuth } from "@/hooks/useAuth";
import { getDefaultRouteByRole } from "@/services/auth";

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
    <main data-theme="light" className="graphite-auth gp-auth-shell">
      {/* Institucional (somente desktop) */}
      <section className="gp-auth-aside" aria-label="Institucional">
        <LionLogo variant="light" size="lg" />

        <div>
          <h1>
            Gestão inteligente
            <br />
            para academias
          </h1>
          <p>Tudo o que sua academia precisa em um só lugar: alunos, treinos, planos e pagamentos.</p>

          <ul className="gp-auth-modules" style={{ listStyle: "none", padding: 0, marginBottom: 0 }}>
            {features.map((feature) => (
              <li key={feature.label} className="gp-auth-module">
                <feature.icon size={18} strokeWidth={2} aria-hidden="true" />
                {feature.label}
              </li>
            ))}
          </ul>
        </div>

        <div className="gp-auth-copy">© {new Date().getFullYear()} Lion Fitness. Todos os direitos reservados.</div>
      </section>

      {/* Formulário */}
      <section className="gp-auth-main" aria-label="Login">
        <div className="gp-auth-brand-mobile">
          <LionLogo variant="dark" size="lg" />
          <p>Gestão inteligente para academias</p>
        </div>

        <div className="gp-auth-card">
          <div className="gp-auth-card-head">
            <h2>Bem-vindo de volta</h2>
            <p>Entre para acessar sua conta.</p>
          </div>

          <form onSubmit={handleSubmit} className="gp-auth-form">
            {error && (
              <div className="gp-auth-alert" role="alert">
                <AlertCircle size={16} aria-hidden="true" />
                <span>{error}</span>
              </div>
            )}

            <div className="gp-auth-field">
              <label htmlFor="email" className="gp-auth-label">E-mail</label>
              <input
                id="email"
                name="email"
                type="email"
                className="gp-auth-input"
                placeholder="seu@email.com"
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value);
                  handleInputChange();
                }}
                disabled={loading}
                required
                autoComplete="email"
              />
            </div>

            <div className="gp-auth-field">
              <div className="gp-auth-label-row">
                <label htmlFor="password" className="gp-auth-label">Senha</label>
                <button type="button" className="gp-auth-link" onClick={() => setForgotPasswordOpen(true)}>
                  Esqueci minha senha
                </button>
              </div>
              <div className="gp-auth-input-wrap">
                <input
                  id="password"
                  name="password"
                  type={showPassword ? "text" : "password"}
                  className="gp-auth-input"
                  data-toggle="true"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => {
                    setPassword(e.target.value);
                    handleInputChange();
                  }}
                  disabled={loading}
                  required
                  autoComplete="current-password"
                />
                <button
                  type="button"
                  className="gp-auth-toggle"
                  onClick={() => setShowPassword((prev) => !prev)}
                  aria-label={showPassword ? "Ocultar senha" : "Mostrar senha"}
                  aria-pressed={showPassword}
                >
                  {showPassword ? <EyeOff size={18} aria-hidden="true" /> : <Eye size={18} aria-hidden="true" />}
                </button>
              </div>
            </div>

            <button id="login-submit-btn" type="submit" disabled={loading} className="gp-auth-primary">
              {loading ? (
                <>
                  <Loader2 size={16} className="gp-auth-spin" aria-hidden="true" />
                  Entrando...
                </>
              ) : (
                "Entrar"
              )}
            </button>
          </form>
        </div>
      </section>

      <ForgotPasswordDialog open={forgotPasswordOpen} onOpenChange={setForgotPasswordOpen} />
    </main>
  );
}
