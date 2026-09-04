import { Suspense } from "react";
import ResetPasswordClient from "./ResetPasswordClient";

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={
      <div style={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "#0f172a",
        color: "#94a3b8",
        fontFamily: "sans-serif"
      }}>
        Carregando...
      </div>
    }>
      <ResetPasswordClient />
    </Suspense>
  );
}
