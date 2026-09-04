"use client";

import Link from "next/link";
import { FormEvent, useState, type CSSProperties } from "react";
import ProtectedRoute from "../../components/auth/ProtectedRoute";
import { dashboardStyles } from "../../components/layout/DashboardLayout";
import { forgotPassword } from "../../services/api";

const BLACK = "#1a1a1a";
const RED = "#C0392B";

type ForgotPasswordStyles = {
  root: CSSProperties;
  card: CSSProperties;
  pageHeader: CSSProperties;
  pageTitle: CSSProperties;
  pageDesc: CSSProperties;
  fieldGroup: CSSProperties;
  label: CSSProperties;
  input: CSSProperties;
  btn: CSSProperties;
  btnOutline: CSSProperties;
};

export default function ForgotPasswordPage() {
  const styles = dashboardStyles as unknown as ForgotPasswordStyles;
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [feedback, setFeedback] = useState("");
  const [error, setError] = useState("");

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    try {
      setLoading(true);
      setFeedback("");
      setError("");

      const response = await forgotPassword(email.trim());
      setFeedback(response?.message || "Se o email estiver cadastrado, enviaremos instruções para redefinir sua senha.");
    } catch (err) {
      setError(
        err instanceof Error && err.message
          ? err.message
          : "Não foi possível solicitar a redefinição agora."
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <ProtectedRoute guestOnly>
      <div
        style={{
          ...styles.root,
          minHeight: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: 24,
        }}
      >
        <div style={{ width: "100%", maxWidth: 440 }}>
          <div
            style={{
              background: BLACK,
              color: "#FFFFFF",
              borderRadius: "10px 10px 0 0",
              padding: "24px 24px 18px",
              borderBottom: `3px solid ${RED}`,
            }}
          >
            <div style={{ fontSize: 18, fontWeight: 700, letterSpacing: 1 }}>LION FITNESS</div>
            <div style={{ color: RED, fontSize: 11, letterSpacing: 3, textTransform: "uppercase", marginTop: 4 }}>
              Recuperacao de senha
            </div>
          </div>

          <div
            style={{
              ...styles.card,
              marginBottom: 0,
              borderRadius: "0 0 10px 10px",
              borderTop: "none",
            }}
          >
            <div style={styles.pageHeader}>
              <h1 style={styles.pageTitle}>Esqueci minha senha</h1>
              <p style={styles.pageDesc}>Informe seu e-mail para receber o link de redefinição.</p>
            </div>

            <form onSubmit={handleSubmit}>
              <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                <div style={styles.fieldGroup}>
                  <label htmlFor="email" style={styles.label}>
                    E-mail
                  </label>
                  <input
                    id="email"
                    type="email"
                    value={email}
                    onChange={(event) => setEmail(event.target.value)}
                    style={styles.input}
                    placeholder="seuemail@lionfitness.com"
                    autoComplete="email"
                    required
                  />
                </div>

                {feedback ? (
                  <div
                    style={{
                      border: "1px solid #BBE7C8",
                      background: "#EAF8EF",
                      color: "#1A5C2A",
                      borderRadius: 6,
                      padding: "10px 12px",
                      fontSize: 13,
                    }}
                  >
                    {feedback}
                  </div>
                ) : null}

                {error ? (
                  <div
                    style={{
                      border: "1px solid #F2C1BB",
                      background: "#FDECEA",
                      color: RED,
                      borderRadius: 6,
                      padding: "10px 12px",
                      fontSize: 13,
                    }}
                  >
                    {error}
                  </div>
                ) : null}

                <button type="submit" style={styles.btn} disabled={loading}>
                  {loading ? "Enviando..." : "Enviar instruções"}
                </button>

                <Link href="/login" style={{ ...styles.btnOutline, display: "inline-flex", alignItems: "center", justifyContent: "center", textDecoration: "none" }}>
                  Voltar ao login
                </Link>
              </div>
            </form>
          </div>
        </div>
      </div>
    </ProtectedRoute>
  );
}
