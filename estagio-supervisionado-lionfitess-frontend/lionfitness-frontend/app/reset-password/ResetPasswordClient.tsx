"use client";

import Link from "next/link";
import { FormEvent, useMemo, useState, type CSSProperties } from "react";
import { useSearchParams } from "next/navigation";
import ProtectedRoute from "../../components/auth/ProtectedRoute";
import { dashboardStyles } from "../../components/layout/DashboardLayout";
import { resetPassword } from "../../services/api";

const BLACK = "#1a1a1a";
const RED = "#C0392B";

type ResetPasswordStyles = {
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

export default function ResetPasswordClient() {
  const styles = dashboardStyles as unknown as ResetPasswordStyles;
  const searchParams = useSearchParams();
  const token = useMemo(() => searchParams.get("token") || "", [searchParams]);
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState("");
  const [error, setError] = useState("");

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!token) {
      setError("Link de redefinição inválido ou sem token.");
      return;
    }

    if (newPassword.length < 6) {
      setError("A senha deve ter pelo menos 6 caracteres.");
      return;
    }

    if (newPassword !== confirmPassword) {
      setError("As senhas devem ser iguais.");
      return;
    }

    try {
      setLoading(true);
      setSuccess("");
      setError("");

      const response = await resetPassword(token, newPassword, confirmPassword);
      setSuccess(response?.message || "Senha alterada com sucesso");
      setNewPassword("");
      setConfirmPassword("");
    } catch (err) {
      setError(
        err instanceof Error && err.message
          ? err.message
          : "Não foi possível redefinir a senha."
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
              Nova senha
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
              <h1 style={styles.pageTitle}>Redefinir senha</h1>
              <p style={styles.pageDesc}>Crie uma nova senha para acessar o Lion Fitness.</p>
            </div>

            <form onSubmit={handleSubmit}>
              <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                <div style={styles.fieldGroup}>
                  <label htmlFor="newPassword" style={styles.label}>
                    Nova senha
                  </label>
                  <input
                    id="newPassword"
                    type="password"
                    value={newPassword}
                    onChange={(event) => setNewPassword(event.target.value)}
                    style={styles.input}
                    placeholder="Minimo de 6 caracteres"
                    autoComplete="new-password"
                    required
                  />
                </div>

                <div style={styles.fieldGroup}>
                  <label htmlFor="confirmPassword" style={styles.label}>
                    Confirmar senha
                  </label>
                  <input
                    id="confirmPassword"
                    type="password"
                    value={confirmPassword}
                    onChange={(event) => setConfirmPassword(event.target.value)}
                    style={styles.input}
                    placeholder="Digite a senha novamente"
                    autoComplete="new-password"
                    required
                  />
                </div>

                {success ? (
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
                    {success}
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

                <button type="submit" style={styles.btn} disabled={loading || !token}>
                  {loading ? "Redefinindo..." : "Redefinir senha"}
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
