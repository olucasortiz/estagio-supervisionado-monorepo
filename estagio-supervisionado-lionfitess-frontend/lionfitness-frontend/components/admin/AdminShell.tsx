"use client";

import React, { useEffect, useMemo, useState, type ReactNode } from "react";
import {
  AlertCircle,
  AlertTriangle,
  ChevronDown,
  CreditCard,
  Dumbbell,
  Layers,
  LayoutDashboard,
  LogOut,
  Menu,
  Moon,
  ShieldCheck,
  Sun,
  UserMinus,
  UserPlus,
  Users,
  UserX,
  Wallet,
  X,
} from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useThemeMode } from "@/hooks/useThemeMode";
import { cn } from "@/lib/utils";

interface AdminShellProps {
  children: ReactNode;
  activeItem: number | string;
  onSelectItem: (item: { id: number | string; label: string }) => void;
}

interface NavGroup {
  label: string;
  children: {
    id: number | string;
    label: string;
    icon: React.ComponentType<{ className?: string }>;
  }[];
}

export const adminMenuGroupsDef: NavGroup[] = [
  {
    label: "Relatórios",
    children: [
      { id: 19, label: "Novos Alunos", icon: UserPlus },
      { id: 20, label: "Cancelamentos", icon: UserX },
      { id: 21, label: "Ativos e Inativos", icon: Users },
      { id: 22, label: "Relatório de Inadimplência", icon: AlertTriangle },
    ],
  },
  {
    label: "Cadastros",
    children: [
      { id: 30, label: "Alunos", icon: Users },
      { id: 31, label: "Planos", icon: Layers },
      { id: 32, label: "Usuários", icon: ShieldCheck },
      { id: 33, label: "Personal Trainers", icon: Dumbbell },
    ],
  },
  {
    label: "Financeiro",
    children: [
      { id: 34, label: "Assinaturas", icon: Wallet },
      { id: 35, label: "Pagamentos", icon: CreditCard },
      { id: 36, label: "Inadimplência", icon: AlertCircle },
      { id: 37, label: "Registrar Cancelamento", icon: UserMinus },
    ],
  },
];

function getInitials(name?: string) {
  if (!name) return "AD";
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0].substring(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

function SidebarInner({
  activeItem,
  onSelectItem,
  onNavigate,
}: {
  activeItem: number | string;
  onSelectItem: (item: { id: number | string; label: string }) => void;
  onNavigate?: () => void;
}) {
  const { user, logout } = useAuth();
  const { isDark, toggleTheme } = useThemeMode();

  // Encontra qual grupo contém o activeItem para mantê-lo aberto por padrão
  const activeGroupLabel = useMemo(() => {
    return adminMenuGroupsDef.find((g) =>
      g.children.some((item) => String(item.id) === String(activeItem))
    )?.label;
  }, [activeItem]);

  const [expanded, setExpanded] = useState<Record<string, boolean>>({
    Relatórios: true,
    Cadastros: true,
    Financeiro: true,
    ...(activeGroupLabel ? { [activeGroupLabel]: true } : {}),
  });

  const toggleGroup = (label: string) => {
    setExpanded((prev) => ({ ...prev, [label]: !prev[label] }));
  };

  const handleItemClick = (item: { id: number | string; label: string }) => {
    onSelectItem(item);
    if (onNavigate) onNavigate();
  };

  const isDashboardActive = String(activeItem) === "dashboard";

  return (
    <div className="flex h-full flex-col bg-sidebar text-sidebar-foreground select-none">
      {/* Logo Lion Fitness */}
      <div className="flex h-16 items-center gap-3 border-b border-sidebar-border px-5">
        <span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-sm">
          <Dumbbell className="size-5" />
        </span>
        <div className="leading-tight min-w-0">
          <span className="block font-bold text-[15px] tracking-tight text-sidebar-foreground truncate">
            Lion Fitness
          </span>
          <span className="block text-[10px] font-semibold tracking-wider text-sidebar-muted uppercase">
            Painel Admin
          </span>
        </div>
      </div>

      {/* Navegação */}
      <nav className="flex-1 space-y-3 overflow-y-auto px-3 py-4">
        {/* Item Top: Dashboard */}
        <button
          type="button"
          data-nav-id="dashboard"
          onClick={() => handleItemClick({ id: "dashboard", label: "Dashboard" })}
          className={cn(
            "group flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-all duration-200",
            isDashboardActive
              ? "bg-primary text-primary-foreground shadow-sm"
              : "text-sidebar-muted hover:bg-sidebar-accent hover:text-sidebar-foreground hover:translate-x-0.5"
          )}
        >
          <LayoutDashboard className="size-4 shrink-0" />
          <span className="flex-1 text-left">Dashboard</span>
        </button>

        {/* Grupos Colapsáveis */}
        {adminMenuGroupsDef.map((group) => {
          const isExpanded = expanded[group.label] ?? true;
          const hasActiveChild = group.children.some(
            (c) => String(c.id) === String(activeItem)
          );

          return (
            <div key={group.label} className="space-y-1">
              <button
                type="button"
                onClick={() => toggleGroup(group.label)}
                className="flex w-full items-center justify-between px-3 py-1.5 text-left text-[11px] font-bold tracking-wider text-sidebar-muted uppercase transition-colors hover:text-sidebar-foreground"
              >
                <span className={cn(hasActiveChild && "text-primary")}>
                  {group.label}
                </span>
                <ChevronDown
                  className={cn(
                    "size-3.5 transition-transform duration-200",
                    isExpanded ? "rotate-0" : "-rotate-90"
                  )}
                />
              </button>

              {isExpanded && (
                <div className="space-y-0.5 pl-1">
                  {group.children.map((item) => {
                    const isActive = String(item.id) === String(activeItem);
                    const Icon = item.icon;

                    return (
                      <button
                        key={item.id}
                        type="button"
                        data-nav-id={item.id}
                        onClick={() => handleItemClick(item)}
                        className={cn(
                          "group flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-xs font-medium transition-all duration-200",
                          isActive
                            ? "bg-primary text-primary-foreground shadow-sm"
                            : "text-sidebar-muted hover:bg-sidebar-accent hover:text-sidebar-foreground hover:translate-x-0.5"
                        )}
                      >
                        <Icon className="size-4 shrink-0" />
                        <span className="flex-1 text-left truncate">{item.label}</span>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </nav>

      {/* Footer da Sidebar: Tema, Perfil e Logout */}
      <div className="border-t border-sidebar-border p-3 space-y-2">
        {/* Alternador de Tema */}
        <button
          type="button"
          onClick={toggleTheme}
          className="flex w-full items-center justify-between rounded-lg px-3 py-2 text-xs font-medium text-sidebar-muted transition-colors hover:bg-sidebar-accent hover:text-sidebar-foreground"
        >
          <span className="flex items-center gap-2">
            {isDark ? <Sun className="size-4 text-amber-400" /> : <Moon className="size-4" />}
            <span>{isDark ? "Tema Claro" : "Tema Escuro"}</span>
          </span>
          <span className="text-[10px] uppercase tracking-wider text-sidebar-muted">
            {isDark ? "Dark" : "Light"}
          </span>
        </button>

        {/* Card do Usuário Admin */}
        <div className="flex items-center justify-between rounded-lg bg-sidebar-accent/50 p-2.5">
          <div className="flex items-center gap-2.5 min-w-0">
            <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-primary font-bold text-xs text-primary-foreground shadow-xs">
              {getInitials(user?.name)}
            </span>
            <div className="min-w-0">
              <p className="truncate text-xs font-semibold text-sidebar-foreground leading-none">
                {user?.name || "Administrador"}
              </p>
              <p className="mt-1 text-[10px] text-sidebar-muted uppercase tracking-wider leading-none">
                Administrador
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={logout}
            title="Sair do sistema"
            className="rounded-md p-1.5 text-sidebar-muted transition-colors hover:bg-destructive/20 hover:text-destructive"
          >
            <LogOut className="size-4" />
          </button>
        </div>
      </div>
    </div>
  );
}

export function AdminShell({ children, activeItem, onSelectItem }: AdminShellProps) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const { user, logout } = useAuth();
  const { isDark, toggleTheme } = useThemeMode();

  useEffect(() => {
    document.body.style.overflow = mobileOpen ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [mobileOpen]);

  const todayFormatted = useMemo(() => {
    try {
      const now = new Date();
      return now.toLocaleDateString("pt-BR", {
        weekday: "long",
        day: "2-digit",
        month: "long",
      });
    } catch {
      return "Visão geral da academia";
    }
  }, []);

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Sidebar Desktop Fixa */}
      <aside className="fixed inset-y-0 left-0 z-40 hidden w-[260px] border-r border-sidebar-border lg:block">
        <SidebarInner activeItem={activeItem} onSelectItem={onSelectItem} />
      </aside>

      {/* Drawer Mobile */}
      {mobileOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <button
            type="button"
            aria-label="Fechar menu lateral"
            onClick={() => setMobileOpen(false)}
            className="animate-fade-in absolute inset-0 bg-black/60 backdrop-blur-xs"
          />
          <div className="animate-slide-in absolute inset-y-0 left-0 w-[270px] shadow-2xl">
            <button
              type="button"
              onClick={() => setMobileOpen(false)}
              className="absolute top-4 right-3 z-10 rounded-lg p-1.5 text-sidebar-muted transition-colors hover:bg-sidebar-accent hover:text-sidebar-foreground"
            >
              <X className="size-5" />
            </button>
            <SidebarInner
              activeItem={activeItem}
              onSelectItem={onSelectItem}
              onNavigate={() => setMobileOpen(false)}
            />
          </div>
        </div>
      )}

      {/* Área Principal de Conteúdo */}
      <div className="lg:pl-[260px]">
        {/* Header Superior Moderno */}
        <header className="sticky top-0 z-30 flex h-16 items-center gap-3 border-b border-border bg-card/85 px-4 backdrop-blur-md sm:px-6">
          <button
            type="button"
            onClick={() => setMobileOpen(true)}
            className="rounded-lg border border-border p-2 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground lg:hidden"
            aria-label="Abrir menu"
          >
            <Menu className="size-5" />
          </button>

          <div className="min-w-0 flex-1">
            <h1 className="truncate text-sm font-bold text-foreground sm:text-base">
              Olá, {user?.name || "Admin"}
            </h1>
            <p className="hidden text-xs text-muted-foreground capitalize sm:block">
              {todayFormatted}
            </p>
          </div>

          {/* Ações Rápidas no Header */}
          <div className="flex items-center gap-2">
            {/* Theme Toggle */}
            <button
              type="button"
              onClick={toggleTheme}
              className="flex size-9 items-center justify-center rounded-lg border border-border bg-card text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
              title={isDark ? "Alternar para tema claro" : "Alternar para tema escuro"}
            >
              {isDark ? <Sun className="size-4 text-amber-400" /> : <Moon className="size-4" />}
            </button>

            {/* Perfil Badge */}
            <div className="flex items-center gap-2 rounded-lg border border-border bg-card p-1 pr-2.5">
              <span className="flex size-7 items-center justify-center rounded-md bg-primary text-[11px] font-bold text-primary-foreground">
                {getInitials(user?.name)}
              </span>
              <span className="hidden text-left text-xs sm:block">
                <span className="block font-semibold text-foreground leading-tight">
                  {user?.name || "Admin Lion"}
                </span>
                <span className="block text-[10px] text-muted-foreground uppercase leading-tight">
                  Administrador
                </span>
              </span>
            </div>

            {/* Sair */}
            <button
              type="button"
              onClick={logout}
              className="flex size-9 items-center justify-center rounded-lg border border-border bg-card text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive"
              title="Encerrar sessão"
            >
              <LogOut className="size-4" />
            </button>
          </div>
        </header>

        {/* Conteúdo Injetado */}
        <main className="mx-auto w-full max-w-[1600px] px-4 py-6 sm:px-6">{children}</main>
      </div>
    </div>
  );
}
