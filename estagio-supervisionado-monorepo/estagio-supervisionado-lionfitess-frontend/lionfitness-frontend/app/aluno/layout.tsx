import { Archivo, Inter } from "next/font/google";
import type { ReactNode } from "react";

/* ── Fontes do Design System Lovable ── */
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
 * Layout isolado da rota /aluno.
 *
 * Objetivos:
 * - Injetar Archivo (--font-archivo → font-display) e Inter como fontes ativas.
 * - Definir --font-display e --font-sans em escopo CSS local (#aluno-root)
 *   para que os componentes usem as fontes corretas sem interferência do admin.
 * - Sobrescrever o background e foreground globais com os tokens Lovable.
 */
export default function AlunoLayout({ children }: { children: ReactNode }) {
  return (
    <div
      id="aluno-root"
      className={`${archivo.variable} ${inter.variable}`}
      style={
        {
          /* Tokens de fonte do Design System Lovable aplicados em escopo local */
          "--font-display": `var(--font-archivo), "Archivo", ui-sans-serif, system-ui, sans-serif`,
          "--font-sans": `var(--font-inter-aluno), "Inter", ui-sans-serif, system-ui, sans-serif`,

          /* Background e foreground corretos (Lovable) */
          background: "var(--background, #F8F9FB)",
          color: "var(--foreground, #1E293B)",

          /* Fonte padrão do corpo = Inter */
          fontFamily: `var(--font-inter-aluno), "Inter", ui-sans-serif, system-ui, sans-serif`,

          /* Altura mínima de tela completa */
          minHeight: "100dvh",
        } as React.CSSProperties
      }
    >
      {children}
    </div>
  );
}
