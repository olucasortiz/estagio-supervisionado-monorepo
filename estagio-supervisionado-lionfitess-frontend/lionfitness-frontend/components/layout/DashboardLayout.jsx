"use client";

import { createContext, useContext, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { AdminShell } from "../admin/AdminShell";

/* ──────────────────────────────────────────────
   Context de navegação
────────────────────────────────────────────── */
const DashboardNavigationContext = createContext(null);
export function useDashboardNavigation() {
  return useContext(DashboardNavigationContext);
}

/* ──────────────────────────────────────────────
   Menu Groups — totalmente em português, sem EU codes
────────────────────────────────────────────── */
export const adminMenuGroups = [
  {
    label: "Relatórios",
    children: [
      { id: 19, label: "Novos Alunos" },
      { id: 20, label: "Cancelamentos" },
      { id: 21, label: "Ativos e Inativos" },
      { id: 22, label: "Relatório de Inadimplência" },
    ],
  },
  {
    label: "Cadastros",
    children: [
      { id: 30, label: "Alunos" },
      { id: 31, label: "Planos" },
      { id: 32, label: "Usuários" },
      { id: 33, label: "Personal Trainers" },
    ],
  },
  {
    label: "Financeiro",
    children: [
      { id: 34, label: "Assinaturas" },
      { id: 35, label: "Pagamentos" },
      { id: 36, label: "Inadimplência" },
      { id: 37, label: "Registrar Cancelamento" },
    ],
  },
];

export const userMenuGroups = [
  {
    label: "Aluno",
    children: [
      { id: "aluno-plano",      label: "Meu Plano",  href: "/aluno" },
      { id: "aluno-pagamentos", label: "Pagamentos", href: "/aluno" },
      { id: "aluno-treino",     label: "Treino",     href: "/aluno" },
    ],
  },
];

export const personalMenuGroups = [
  {
    label: "Personal",
    children: [
      { id: "personal-alunos",  label: "Meus Alunos", href: "/personal" },
      { id: "personal-treinos", label: "Treinos",     href: "/personal" },
    ],
  },
];

/* ──────────────────────────────────────────────
   Estilos legados — mantidos para compatibilidade retroativa
────────────────────────────────────────────── */
export const dashboardStyles = {};

export function createDashboardThemeStyles() {
  return dashboardStyles;
}

/* ──────────────────────────────────────────────
   Layout Component — Integração com AdminShell
────────────────────────────────────────────── */
export default function DashboardLayout({ children }) {
  const router = useRouter();
  const [activeReport, setActiveReport] = useState("dashboard");

  const handleSelectItem = (item) => {
    if (item?.href) {
      router.push(item.href);
      return;
    }
    if (item?.id !== undefined) {
      setActiveReport(item.id);
    }
  };

  const navigation = useMemo(
    () => ({
      activeReport,
      setActiveReport,
      styles: dashboardStyles,
    }),
    [activeReport]
  );

  return (
    <DashboardNavigationContext.Provider value={navigation}>
      <AdminShell activeItem={activeReport} onSelectItem={handleSelectItem}>
        {children}
      </AdminShell>
    </DashboardNavigationContext.Provider>
  );
}
