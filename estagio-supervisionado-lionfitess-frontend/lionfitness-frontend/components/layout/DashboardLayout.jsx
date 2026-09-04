"use client";

import { createContext, useContext, useMemo, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import Sidebar from "./Sidebar";
import { useAuth } from "../../hooks/useAuth";
import { useThemeMode } from "../../hooks/useThemeMode";

/* ──────────────────────────────────────────────
   Context de navegação
────────────────────────────────────────────── */
const DashboardNavigationContext = createContext(null);
export function useDashboardNavigation() { return useContext(DashboardNavigationContext); }

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
      { id: 22, label: "Inadimplentes" },
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
      { id: 36, label: "Inadimplentes" },
      { id: 37, label: "Cancelamentos" },
    ],
  },
];

export const userMenuGroups = [
  {
    label: "Aluno",
    children: [
      { id: "aluno-plano",       label: "Meu Plano",  href: "/aluno" },
      { id: "aluno-pagamentos",  label: "Pagamentos", href: "/aluno" },
      { id: "aluno-treino",      label: "Treino",     href: "/aluno" },
    ],
  },
];

export const personalMenuGroups = [
  {
    label: "Personal",
    children: [
      { id: "personal-alunos",  label: "Meus Alunos", href: "/personal" },
      { id: "personal-treinos", label: "Treinos",      href: "/personal" },
    ],
  },
];

function getMenuGroupsByRole(role) {
  if (role === "OPERATIONAL")    return userMenuGroups;
  if (role === "PERSONAL_TRAINER") return personalMenuGroups;
  return adminMenuGroups;
}

function getActiveItem(role, activeReport) {
  if (role === "OPERATIONAL")    return "aluno-plano";
  if (role === "PERSONAL_TRAINER") return "personal-alunos";
  return activeReport;
}

/* ──────────────────────────────────────────────
   Estilos legados — mantidos para compatibilidade
   com DashboardContent e relatórios existentes
────────────────────────────────────────────── */
export const dashboardStyles = {
  root:        { fontFamily: "var(--font-inter), var(--font-plus-jakarta), system-ui, sans-serif", color: "var(--text-primary)", minHeight: "100vh", background: "var(--bg-root)" },
  sidebar:     { width: "var(--sidebar-width)", background: "var(--sidebar-bg)", minHeight: "100vh", position: "fixed", top: 0, left: 0, zIndex: 100 },
  main:        { marginLeft: "var(--sidebar-width)", padding: "32px 40px", minHeight: "100vh", background: "var(--bg-root)" },
  pageHeader:  { marginBottom: 24 },
  pageTitle:   { fontSize: "var(--font-2xl)", fontWeight: 800, color: "var(--text-primary)", margin: 0, letterSpacing: "-0.02em" },
  pageDesc:    { fontSize: "var(--font-sm)", color: "var(--text-muted)", marginTop: 4 },
  card:        { background: "var(--bg-card)", borderRadius: "var(--radius-xl)", border: "1px solid var(--border-default)", padding: "20px 24px", marginBottom: 20, boxShadow: "var(--shadow-card)" },
  filterRow:   { display: "flex", gap: 12, alignItems: "flex-end", flexWrap: "wrap" },
  fieldGroup:  { display: "flex", flexDirection: "column", gap: 4 },
  label:       { fontSize: "var(--font-xs)", fontWeight: 600, color: "var(--text-secondary)", textTransform: "uppercase", letterSpacing: "0.04em" },
  input:       { height: 40, border: "1.5px solid var(--border-default)", borderRadius: "var(--radius-md)", padding: "0 12px", fontSize: "var(--font-base)", color: "var(--text-primary)", background: "var(--bg-card)", outline: "none" },
  select:      { height: 40, border: "1.5px solid var(--border-default)", borderRadius: "var(--radius-md)", padding: "0 32px 0 12px", fontSize: "var(--font-base)", color: "var(--text-primary)", background: "var(--bg-card)", outline: "none", cursor: "pointer", appearance: "none" },
  btn:         { height: 38, padding: "0 18px", borderRadius: "var(--radius-md)", background: "#C0392B", color: "#fff", border: "none", fontSize: "var(--font-sm)", fontWeight: 600, cursor: "pointer" },
  btnOutline:  { height: 38, padding: "0 18px", borderRadius: "var(--radius-md)", background: "transparent", color: "#C0392B", border: "1.5px solid #C0392B", fontSize: "var(--font-sm)", fontWeight: 600, cursor: "pointer" },
  statsRow:    { display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: 16, marginBottom: 20 },
  statCard:    (accent) => ({ background: "var(--bg-root)", borderRadius: "var(--radius-xl)", padding: "16px 20px", borderLeft: `4px solid ${accent || "#C0392B"}`, boxShadow: "var(--shadow-card)" }),
  statNum:     { fontSize: 30, fontWeight: 800, color: "var(--text-primary)", lineHeight: 1.1 },
  statLabel:   { fontSize: "var(--font-xs)", color: "var(--text-muted)", marginTop: 4, fontWeight: 500 },
  table:       { width: "100%", borderCollapse: "collapse", fontSize: "var(--font-base)" },
  th:          { padding: "10px 16px", textAlign: "left", fontSize: "var(--font-xs)", fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.06em", borderBottom: "1px solid var(--border-default)", background: "var(--bg-subtle)", whiteSpace: "nowrap" },
  td:          { padding: "12px 16px", borderBottom: "1px solid var(--border-default)", color: "var(--text-primary)" },
  badge:       (color, bg) => ({ display: "inline-flex", alignItems: "center", padding: "3px 10px", borderRadius: 999, fontSize: 11, fontWeight: 600, color, background: bg }),
  empty:       { textAlign: "center", padding: "48px 0", color: "var(--text-muted)", fontSize: "var(--font-base)" },
};

export function createDashboardThemeStyles(themeStyles) { return dashboardStyles; }

/* ──────────────────────────────────────────────
   Layout Component
────────────────────────────────────────────── */
export default function DashboardLayout({ children, menuGroups: menuGroupsProp = null }) {
  const pathname = usePathname();
  const router = useRouter();
  const { logout, role, user } = useAuth();
  const { isDark, toggleTheme } = useThemeMode();
  const [activeReport, setActiveReport] = useState(19);

  const resolvedMenuGroups = useMemo(
    () => menuGroupsProp || getMenuGroupsByRole(role),
    [menuGroupsProp, role]
  );
  const activeItem = getActiveItem(role, activeReport);

  const handleSelectItem = (item) => {
    if (item?.href) { router.push(item.href); return; }
    if (typeof item?.id === "number") setActiveReport(item.id);
  };

  const handleLogout = () => { logout(); router.replace("/login"); };

  const navigation = useMemo(() => ({ activeReport, styles: dashboardStyles }), [activeReport]);

  /* Aplica tema via data-attribute no html */
  if (typeof document !== "undefined") {
    document.documentElement.setAttribute("data-theme", isDark ? "dark" : "light");
  }

  return (
    <DashboardNavigationContext.Provider value={navigation}>
      <div style={{ display: "flex", minHeight: "100vh", background: "var(--bg-root)" }}>
        <Sidebar
          menuGroups={resolvedMenuGroups}
          activeItem={activeItem}
          onSelectItem={handleSelectItem}
          user={user}
          role={role}
          onLogout={handleLogout}
          isDark={isDark}
          onToggleTheme={toggleTheme}
        />
        <main style={{
          marginLeft: "var(--sidebar-width)", flex: 1,
          padding: "32px 40px", minHeight: "100vh",
          background: "var(--bg-root)", color: "var(--text-primary)",
        }}>
          {children}
        </main>
      </div>
    </DashboardNavigationContext.Provider>
  );
}
