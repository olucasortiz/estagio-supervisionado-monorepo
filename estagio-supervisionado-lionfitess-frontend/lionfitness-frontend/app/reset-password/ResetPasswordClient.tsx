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

import "@/app/graphite-tokens.css";
import "@/app/auth.css";
import ProtectedRoute from "@/components/auth/ProtectedRoute";
import { LionLogo } from "@/components/branding/LionLogo";
import { ThemeToggle } from "@/components/ui/ThemeToggle";
import { resetPassword } from "@/services/api";

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
  const strengthLevels = ["bad", "bad", "mid", "mid", "good", "good"];

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
                  <h1>Definir nova senha</h1>
                  <p>Crie uma nova senha para recuperar o acesso à sua conta.</p>
                </div>

                {!token && (
                  <div className="gp-auth-alert" role="alert">
                    <AlertCircle size={16} aria-hidden="true" />
                    <span>Link de redefinição ausente ou inválido. Verifique o link recebido por e-mail.</span>
                  </div>
                )}

                {error && (
                  <div className="gp-auth-alert" role="alert">
                    <AlertCircle size={16} aria-hidden="true" />
                    <span>{error}</span>
                  </div>
                )}

                {/* Nova senha */}
                <div className="gp-auth-field">
                  <label htmlFor="new-password" className="gp-auth-label">Nova senha</label>
                  <div className="gp-auth-input-wrap">
                    <Lock size={18} aria-hidden="true" />
                    <input
                      id="new-password"
                      name="password"
                      type={showPassword ? "text" : "password"}
                      autoComplete="new-password"
                      placeholder="••••••••"
                      className="gp-auth-input"
                      data-icon="true"
                      data-toggle="true"
                      value={password}
                      onChange={(e) => {
                        setPassword(e.target.value);
                        if (error) setError(null);
                      }}
                      disabled={isLoading}
                      required
                      aria-describedby="password-requirements"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword((s) => !s)}
                      disabled={isLoading}
                      className="gp-auth-toggle"
                      aria-label={showPassword ? "Ocultar senha" : "Mostrar senha"}
                      aria-pressed={showPassword}
                    >
                      {showPassword ? <EyeOff size={18} aria-hidden="true" /> : <Eye size={18} aria-hidden="true" />}
                    </button>
                  </div>

                  {/* Indicador de força */}
                  {password.length > 0 && (
                    <div className="gp-auth-strength">
                      <div className="gp-auth-strength-head">
                        <span>Força da senha</span>
                        <strong role="status">{strengthLabels[strength]}</strong>
                      </div>
                      <div className="gp-auth-strength-bars" aria-hidden="true">
                        {[0, 1, 2, 3].map((index) => (
                          <i key={index} data-level={index < strength ? strengthLevels[strength] : undefined} />
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Requisitos */}
                  <ul id="password-requirements" className="gp-auth-reqs">
                    {requirements.map((req) => (
                      <li key={req.label} className="gp-auth-req" data-met={req.met}>
                        <span aria-hidden="true">
                          {req.met ? <Check size={12} /> : <X size={12} />}
                        </span>
                        {req.label}
                        <span className="sr-only" style={{ position: "absolute", width: 1, height: 1, overflow: "hidden", clip: "rect(0 0 0 0)" }}>
                          {req.met ? " — atendido" : " — pendente"}
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>

                {/* Confirmar senha */}
                <div className="gp-auth-field">
                  <label htmlFor="confirm-password" className="gp-auth-label">Confirmar nova senha</label>
                  <div className="gp-auth-input-wrap">
                    <Lock size={18} aria-hidden="true" />
                    <input
                      id="confirm-password"
                      name="confirm-password"
                      type={showConfirm ? "text" : "password"}
                      autoComplete="new-password"
                      placeholder="••••••••"
                      className="gp-auth-input"
                      data-icon="true"
                      data-toggle="true"
                      value={confirmPassword}
                      onChange={(e) => {
                        setConfirmPassword(e.target.value);
                        if (error) setError(null);
                      }}
                      disabled={isLoading}
                      required
                      aria-invalid={confirmPassword.length > 0 && !passwordsMatch ? true : undefined}
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirm((s) => !s)}
                      disabled={isLoading}
                      className="gp-auth-toggle"
                      aria-label={showConfirm ? "Ocultar senha" : "Mostrar senha"}
                      aria-pressed={showConfirm}
                    >
                      {showConfirm ? <EyeOff size={18} aria-hidden="true" /> : <Eye size={18} aria-hidden="true" />}
                    </button>
                  </div>
                  {confirmPassword.length > 0 && !passwordsMatch && (
                    <p className="gp-auth-field-error" role="alert">
                      As senhas não coincidem.
                    </p>
                  )}
                </div>

                <button type="submit" disabled={isLoading || !token} className="gp-auth-primary">
                  {isLoading ? (
                    <>
                      <Loader2 size={16} className="gp-auth-spin" aria-hidden="true" />
                      Redefinindo...
                    </>
                  ) : (
                    "Redefinir senha"
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
                  <h2>Senha redefinida!</h2>
                  <p role="status">{successMessage || "Agora você pode acessar sua conta com sua nova senha."}</p>
                </div>

                <Link href="/login" className="gp-auth-primary">
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
