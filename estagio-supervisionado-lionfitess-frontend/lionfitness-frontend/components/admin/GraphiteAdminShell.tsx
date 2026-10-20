"use client";

import { useId, useMemo, useState, type ReactNode } from "react";
import { ChevronDown, Dumbbell, LayoutDashboard, LogOut, Menu, Moon, Sun } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useThemeMode } from "@/hooks/useThemeMode";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { adminMenuGroupsDef } from "./AdminShell";

interface ShellProps {
  children: ReactNode;
  activeItem: number | string;
  onSelectItem: (item: { id: number | string; label: string }) => void;
}

function getInitials(name?: string) {
  const parts = name?.trim().split(/\s+/).filter(Boolean) || [];
  return parts.length ? (parts[0][0] + (parts.at(-1)?.[0] || "")).toUpperCase() : "AD";
}

function Sidebar({ activeItem, onSelectItem, onNavigate }: Omit<ShellProps, "children"> & { onNavigate?: () => void }) {
  const { user, logout } = useAuth();
  const groupId = useId();
  const [expanded, setExpanded] = useState<Record<string, boolean>>({ Cadastros: true, Financeiro: true });
  const navigate = (item: { id: string | number; label: string }) => {
    onSelectItem(item);
    onNavigate?.();
  };
  const groups = [...adminMenuGroupsDef].sort((a, b) => ["Cadastros", "Financeiro", "Relatórios"].indexOf(a.label) - ["Cadastros", "Financeiro", "Relatórios"].indexOf(b.label));

  return (
    <div className="gp-sidebar-inner">
      <div className="gp-brand"><Dumbbell size={28} aria-hidden="true" /><div><span>Lion Fitness</span><small>Gestão da academia</small></div></div>
      <nav className="gp-navigation" aria-label="Navegação administrativa">
        <button type="button" data-nav-id="dashboard" aria-current={String(activeItem) === "dashboard" ? "page" : undefined} className="gp-nav-item" onClick={() => navigate({ id: "dashboard", label: "Visão geral" })}>
          <LayoutDashboard size={18} aria-hidden="true" /><span>Visão geral</span>
        </button>
        {groups.map((group, index) => {
          const hasActive = group.children.some((item) => String(item.id) === String(activeItem));
          const isExpanded = expanded[group.label] ?? hasActive;
          const id = `${groupId}-${index}`;
          return (
            <div className="gp-nav-group" key={group.label}>
              <button type="button" className="gp-nav-heading" aria-expanded={isExpanded} aria-controls={id} onClick={() => setExpanded((previous) => ({ ...previous, [group.label]: !isExpanded }))}>
                {group.label}<ChevronDown size={14} aria-hidden="true" className={`gp-chevron ${isExpanded ? "" : "gp-chevron-closed"}`} />
              </button>
              <div id={id} hidden={!isExpanded}>
                {group.children.map((item) => {
                  const Icon = item.icon;
                  return <button key={item.id} type="button" className="gp-nav-item" data-nav-id={item.id} aria-current={String(activeItem) === String(item.id) ? "page" : undefined} onClick={() => navigate(item)}><span aria-hidden="true"><Icon className="size-[18px]" /></span><span>{item.label}</span></button>;
                })}
              </div>
            </div>
          );
        })}
      </nav>
      <div className="gp-sidebar-account"><span className="gp-avatar">{getInitials(user?.name)}</span><div><strong>{user?.name || "Administrador"}</strong><small>Administrador</small></div><button type="button" className="gp-icon-button" onClick={logout} aria-label="Sair do sistema"><LogOut size={18} aria-hidden="true" /></button></div>
    </div>
  );
}

export function GraphiteAdminShell({ children, activeItem, onSelectItem }: ShellProps) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const { user, logout } = useAuth();
  const { isDark, toggleTheme } = useThemeMode();
  const today = useMemo(() => new Date().toLocaleDateString("pt-BR", { day: "numeric", month: "long", year: "numeric", timeZone: "America/Sao_Paulo" }), []);

  return (
    <div className="graphite-admin gp-shell">
      <a href="#admin-content" className="gp-skip-link">Pular para o conteúdo</a>
      <aside className="gp-desktop-sidebar"><Sidebar activeItem={activeItem} onSelectItem={onSelectItem} /></aside>
      <Dialog open={mobileOpen} onOpenChange={setMobileOpen}>
        <DialogContent className="graphite-admin gp-mobile-navigation" aria-describedby={undefined}>
          <DialogTitle className="sr-only">Menu da academia</DialogTitle>
          <Sidebar activeItem={activeItem} onSelectItem={onSelectItem} onNavigate={() => setMobileOpen(false)} />
        </DialogContent>
      </Dialog>
      <div className="gp-main-column">
        <header className="gp-topbar">
          <button type="button" className="gp-icon-button gp-menu-trigger" aria-label="Abrir menu" aria-haspopup="dialog" aria-expanded={mobileOpen} onClick={() => setMobileOpen(true)}><Menu size={20} aria-hidden="true" /></button>
          <div className="gp-greeting"><p>Olá, {user?.name?.split(" ")[0] || "Admin"}</p><span>{today}</span></div>
          <div className="gp-topbar-actions">
            <button type="button" className="gp-icon-button" onClick={toggleTheme} aria-label={isDark ? "Ativar tema claro" : "Ativar tema escuro"}>{isDark ? <Sun size={19} aria-hidden="true" /> : <Moon size={19} aria-hidden="true" />}</button>
            <span className="gp-avatar" aria-label={user?.name || "Administrador"}>{getInitials(user?.name)}</span>
            <button type="button" className="gp-icon-button gp-topbar-logout" onClick={logout} aria-label="Encerrar sessão"><LogOut size={18} aria-hidden="true" /></button>
          </div>
        </header>
        <main id="admin-content" tabIndex={-1} className="gp-content">{children}</main>
      </div>
    </div>
  );
}
