"use client";

import { useState, type FormEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "../../hooks/useAuth";
import { getDefaultRouteByRole } from "../../services/auth";
import { forgotPassword } from "../../services/api";

export default function LoginForm() {
  const router = useRouter();
  const { login } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // Recovery modal states
  const [isRecoveryModalOpen, setIsRecoveryModalOpen] = useState(false);
  const [recoveryEmail, setRecoveryEmail] = useState("");
  const [recoveryLoading, setRecoveryLoading] = useState(false);
  const [recoverySuccess, setRecoverySuccess] = useState(false);
  const [recoveryError, setRecoveryError] = useState("");

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
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
          : "Não foi possível entrar. Verifique seus dados e tente novamente."
      );
    } finally {
      setLoading(false);
    }
  };

  const handleRecoverySubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!recoveryEmail.trim()) {
      setRecoveryError("O e-mail é obrigatório.");
      return;
    }
    try {
      setRecoveryLoading(true);
      setRecoveryError("");
      await forgotPassword(recoveryEmail.trim());
      setRecoverySuccess(true);
    } catch (err) {
      setRecoveryError(
        err instanceof Error && err.message
          ? err.message
          : "Não foi possível solicitar a redefinição agora."
      );
    } finally {
      setRecoveryLoading(false);
    }
  };

  return (
    <div style={{ minHeight: "100vh", display: "flex", background: "#F8F9FB" }}>
      {/* ── Coluna esquerda — Hero ── */}
      <div style={{
        flex: "0 0 55%", position: "relative", overflow: "hidden",
        display: "flex", flexDirection: "column", justifyContent: "flex-end",
        minHeight: "100vh",
      }}
        className="login-hero-col"
      >
        {/* Hero image */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/login-hero.png"
          alt="Academia Lion Fitness — Performance e Resultados"
          style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover", objectPosition: "center" }}
        />

        {/* Gradient overlay */}
        <div style={{
          position: "absolute", inset: 0,
          background: "linear-gradient(to top, rgba(0,0,0,0.85) 0%, rgba(0,0,0,0.4) 50%, rgba(0,0,0,0.15) 100%)",
        }} />

        {/* Content */}
        <div style={{ position: "relative", zIndex: 1, padding: "48px 56px" }}>
          {/* Logo */}
          <div style={{ marginBottom: 32 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 8 }}>
              <div style={{
                width: 44, height: 44, borderRadius: 10,
                background: "#C0392B",
                display: "flex", alignItems: "center", justifyContent: "center",
                fontSize: 22,
              }}>
                🦁
              </div>
              <div>
                <p style={{ fontSize: 22, fontWeight: 800, color: "#fff", letterSpacing: "-0.02em", margin: 0, lineHeight: 1 }}>
                  LION FITNESS
                </p>
                <p style={{ fontSize: 11, color: "rgba(255,255,255,0.5)", letterSpacing: "0.12em", textTransform: "uppercase", margin: 0, marginTop: 2 }}>
                  Sistema de Gestão
                </p>
              </div>
            </div>
          </div>

          {/* Slogan */}
          <h2 style={{
            fontSize: 38, fontWeight: 800, color: "#ffffff",
            lineHeight: 1.15, letterSpacing: "-0.03em", margin: "0 0 12px",
            maxWidth: 500,
          }}>
            Gestão inteligente para academias modernas.
          </h2>
          <p style={{ fontSize: 16, color: "rgba(255,255,255,0.65)", maxWidth: 440, lineHeight: 1.6, margin: 0 }}>
            Controle total sobre alunos, planos, pagamentos e performance em um único lugar.
          </p>

          {/* Social proof pills */}
          <div style={{ display: "flex", gap: 12, marginTop: 28, flexWrap: "wrap" }}>
            {["🏆 Gestão completa", "📊 Relatórios avançados", "💳 Controle financeiro"].map((tag) => (
              <span key={tag} style={{
                background: "rgba(255,255,255,0.12)", backdropFilter: "blur(8px)",
                border: "1px solid rgba(255,255,255,0.2)",
                borderRadius: 999, padding: "6px 14px",
                fontSize: 12, color: "rgba(255,255,255,0.85)", fontWeight: 500,
              }}>
                {tag}
              </span>
            ))}
          </div>
        </div>
      </div>

      {/* ── Coluna direita — Auth card ── */}
      <div style={{
        flex: 1, display: "flex", alignItems: "center", justifyContent: "center",
        padding: "32px 24px", minHeight: "100vh",
      }}>
        <div style={{ width: "100%", maxWidth: 420 }}>
          {/* Card */}
          <div style={{
            background: "#ffffff",
            borderRadius: 20,
            border: "1px solid #E2E8F0",
            padding: "40px 36px",
            boxShadow: "0 4px 6px rgba(15,23,42,0.06), 0 20px 40px rgba(15,23,42,0.08)",
          }}>
            {/* Header */}
            <div style={{ marginBottom: 32 }}>
              <h1 style={{ fontSize: 26, fontWeight: 800, color: "#1E293B", margin: "0 0 6px", letterSpacing: "-0.02em" }}>
                Bem-vindo de volta
              </h1>
              <p style={{ fontSize: 14, color: "#64748B", margin: 0 }}>
                Acesse sua conta para continuar
              </p>
            </div>

            {/* Form */}
            <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 18 }}>
              {/* Email */}
              <div className="form-field">
                <label className="label" htmlFor="login-email">E-mail</label>
                <input
                  id="login-email"
                  type="email"
                  className="input"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="seuemail@lionfitness.com"
                  autoComplete="email"
                  required
                  style={{ height: 44 }}
                />
              </div>

              {/* Password */}
              <div className="form-field">
                <label className="label" htmlFor="login-password">Senha</label>
                <div style={{ position: "relative" }}>
                  <input
                    id="login-password"
                    type={showPassword ? "text" : "password"}
                    className="input"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    autoComplete="current-password"
                    required
                    style={{ height: 44, paddingRight: 44 }}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((v) => !v)}
                    style={{
                      position: "absolute", right: 12, top: "50%", transform: "translateY(-50%)",
                      background: "none", border: "none", color: "#94A3B8", cursor: "pointer", padding: 4,
                      display: "flex", alignItems: "center",
                    }}
                    aria-label={showPassword ? "Ocultar senha" : "Mostrar senha"}
                  >
                    {showPassword ? (
                      <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94" />
                        <path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19" />
                        <line x1="1" y1="1" x2="23" y2="23" />
                      </svg>
                    ) : (
                      <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                        <circle cx="12" cy="12" r="3" />
                      </svg>
                    )}
                  </button>
                </div>
              </div>

              {/* Error */}
              {error && (
                <div className="feedback-error" style={{ display: "flex", alignItems: "flex-start", gap: 8 }}>
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ flexShrink: 0, marginTop: 1 }}>
                    <circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" />
                  </svg>
                  {error}
                </div>
              )}

              {/* Submit */}
              <button
                id="login-submit-btn"
                type="submit"
                className="btn btn-primary btn-lg"
                disabled={loading}
                style={{ width: "100%", marginTop: 4, height: 46, fontSize: 15 }}
              >
                {loading ? (
                  <span style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
                      style={{ animation: "spin 0.8s linear infinite" }}>
                      <path d="M21 12a9 9 0 1 1-6.219-8.56" />
                    </svg>
                    Entrando...
                  </span>
                ) : "Entrar"}
              </button>

              {/* Forgot password */}
              <Link
                href="/forgot-password"
                onClick={(e) => {
                  e.preventDefault();
                  setIsRecoveryModalOpen(true);
                }}
                style={{
                  textAlign: "center", color: "#C0392B", fontSize: 13,
                  fontWeight: 600, textDecoration: "none",
                  transition: "color 0.15s",
                  cursor: "pointer",
                }}
              >
                Esqueci minha senha
              </Link>
            </form>
          </div>

          {/* Footer */}
          <p style={{ textAlign: "center", fontSize: 12, color: "#94A3B8", marginTop: 20 }}>
            © {new Date().getFullYear()} Lion Fitness · Sistema de Gestão
          </p>
        </div>
      </div>

      {/* Modal de Recuperação de Senha */}
      {isRecoveryModalOpen && (
        <div 
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 100,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            background: "rgba(15, 23, 42, 0.45)",
            backdropFilter: "blur(6px)",
            padding: "24px",
            animation: "fadeIn 0.2s ease-out",
          }}
          onClick={() => {
            setIsRecoveryModalOpen(false);
            setRecoveryEmail("");
            setRecoverySuccess(false);
            setRecoveryError("");
          }}
        >
          <div 
            style={{
              width: "100%",
              maxWidth: "420px",
              background: "#ffffff",
              borderRadius: "20px",
              border: "1px solid #E2E8F0",
              padding: "40px 36px",
              boxShadow: "0 10px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)",
              animation: "scaleIn 0.25s cubic-bezier(0.16, 1, 0.3, 1)",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {!recoverySuccess ? (
              <>
                {/* Header */}
                <div style={{ marginBottom: 28 }}>
                  <h2 style={{ fontSize: 24, fontWeight: 800, color: "#1E293B", margin: "0 0 8px", letterSpacing: "-0.02em" }}>
                    Recuperar senha
                  </h2>
                  <p style={{ fontSize: 13, color: "#64748B", margin: 0, lineHeight: 1.5 }}>
                    Informe seu e-mail para receber o link de redefinição.
                  </p>
                </div>

                {/* Form */}
                <form onSubmit={handleRecoverySubmit} style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                  {/* Email */}
                  <div className="form-field">
                    <label className="label" htmlFor="recovery-email">E-mail</label>
                    <input
                      id="recovery-email"
                      type="email"
                      className="input"
                      value={recoveryEmail}
                      onChange={(e) => setRecoveryEmail(e.target.value)}
                      placeholder="seuemail@lionfitness.com"
                      autoComplete="email"
                      required
                      style={{ height: 44 }}
                    />
                  </div>

                  {/* Error */}
                  {recoveryError && (
                    <div className="feedback-error" style={{ display: "flex", alignItems: "flex-start", gap: 8, fontSize: 13 }}>
                      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ flexShrink: 0, marginTop: 1 }}>
                        <circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" />
                      </svg>
                      {recoveryError}
                    </div>
                  )}

                  {/* Buttons */}
                  <div style={{ display: "flex", flexDirection: "column", gap: 12, marginTop: 8 }}>
                    <button
                      type="submit"
                      className="btn btn-primary btn-lg"
                      disabled={recoveryLoading}
                      style={{ width: "100%", height: 46, fontSize: 15 }}
                    >
                      {recoveryLoading ? (
                        <span style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}>
                          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
                            style={{ animation: "spin 0.8s linear infinite" }}>
                            <path d="M21 12a9 9 0 1 1-6.219-8.56" />
                          </svg>
                          Enviando...
                        </span>
                      ) : "Enviar instruções"}
                    </button>

                    <button
                      type="button"
                      className="btn"
                      onClick={() => {
                        setIsRecoveryModalOpen(false);
                        setRecoveryEmail("");
                        setRecoverySuccess(false);
                        setRecoveryError("");
                      }}
                      style={{ 
                        width: "100%", 
                        height: 46, 
                        fontSize: 14, 
                        background: "transparent", 
                        border: "1px solid #E2E8F0", 
                        color: "#64748B",
                        cursor: "pointer",
                        borderRadius: "12px",
                        fontWeight: 600,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        transition: "all 0.15s ease",
                      }}
                      onMouseEnter={(e) => { e.currentTarget.style.background = "#F8FAFC"; e.currentTarget.style.color = "#1E293B"; }}
                      onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; e.currentTarget.style.color = "#64748B"; }}
                    >
                      Voltar ao login
                    </button>
                  </div>
                </form>
              </>
            ) : (
              <>
                {/* Success View */}
                <div style={{ textAlign: "center" }}>
                  <div style={{
                    width: 56, height: 56, borderRadius: "50%",
                    background: "#EAF8EF", color: "#1A5C2A",
                    display: "flex", alignItems: "center", justifyContent: "center",
                    margin: "0 auto 20px", fontSize: 24,
                  }}>
                    ✓
                  </div>
                  <h2 style={{ fontSize: 24, fontWeight: 800, color: "#1E293B", margin: "0 0 12px", letterSpacing: "-0.02em" }}>
                    Verifique seu e-mail
                  </h2>
                  <p style={{ fontSize: 14, color: "#64748B", margin: "0 0 28px", lineHeight: 1.6 }}>
                    Enviamos as instruções de recuperação para o endereço informado.
                  </p>

                  <button
                    type="button"
                    className="btn btn-primary btn-lg"
                    onClick={() => {
                      setIsRecoveryModalOpen(false);
                      setRecoveryEmail("");
                      setRecoverySuccess(false);
                      setRecoveryError("");
                    }}
                    style={{ width: "100%", height: 46, fontSize: 15 }}
                  >
                    Voltar ao login
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      <style>{`
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
        @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
        @keyframes scaleIn { from { transform: scale(0.95); opacity: 0; } to { transform: scale(1); opacity: 1; } }
        @media (max-width: 768px) {
          .login-hero-col { display: none !important; }
        }
      `}</style>
    </div>
  );
}
