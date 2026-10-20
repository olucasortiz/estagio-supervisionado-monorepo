import { Archivo, Inter } from "next/font/google";
import type { ReactNode } from "react";
import "../graphite-tokens.css";
import "./aluno.css";

/* ── Fontes do Portal do Aluno (Graphite Performance) ── */
const archivo = Archivo({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
  variable: "--font-archivo",
  display: "swap",
});

const inter = Inter({
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700"],
  variable: "--font-inter-aluno",
  display: "swap",
});

export const metadata = {
  title: "Área do Aluno — Lion Fitness",
  description: "Acompanhe sua rotina de treinos e gerencie sua mensalidade.",
};

/**
 * Layout isolado da rota /aluno com Graphite Performance.
 */
export default function AlunoLayout({ children }: { children: ReactNode }) {
  return (
    <div
      id="aluno-root"
      className={`graphite-aluno ${archivo.variable} ${inter.variable}`}
    >
      {children}
    </div>
  );
}

