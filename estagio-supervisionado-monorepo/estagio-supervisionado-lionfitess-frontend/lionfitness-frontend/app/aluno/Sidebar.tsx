"use client";

import { CalendarDays, CreditCard, Dumbbell, LogOut } from "lucide-react";

const itens = [
  { id: "plano", label: "Meu Plano", icon: CalendarDays },
  { id: "pagamentos", label: "Pagamentos", icon: CreditCard },
  { id: "treino", label: "Treino", icon: Dumbbell },
];

/** Gera as iniciais a partir do nome completo (ex: "Lucas Ortiz" → "LO") */
function getIniciais(nome: string): string {
  const partes = nome.trim().split(" ").filter(Boolean);
  if (partes.length === 0) return "?";
  if (partes.length === 1) return partes[0].charAt(0).toUpperCase();
  return (partes[0].charAt(0) + partes[partes.length - 1].charAt(0)).toUpperCase();
}

export function SidebarContent({
  onLogout,
  userName = "",
}: {
  onLogout: () => void;
  userName?: string;
}) {
  const iniciais = userName ? getIniciais(userName) : "?";
  const nomeExibido = userName || "Aluno";

  return (
    <div className="flex h-full flex-col bg-sidebar text-sidebar-foreground">
      {/* Cabeçalho da Sidebar */}
      <div
        className="flex items-center gap-2.5 px-4 py-5"
        style={{
          padding: "16px 12px",
          display: "flex",
          alignItems: "center",
          gap: "10px",
        }}
      >
        <span className="grid size-8 shrink-0 place-items-center rounded-lg bg-sidebar-primary text-sidebar-primary-foreground">
          <Dumbbell className="size-4" />
        </span>
        <div className="min-w-0">
          <span className="block truncate font-display text-sm font-bold" style={{ letterSpacing: "-0.02em" }}>
            Lion Fitness
          </span>
          <span className="block text-[11px] text-sidebar-foreground/60">Área do aluno</span>
        </div>
      </div>

      {/* Navegação */}
      <nav
        className="flex-1 space-y-0.5 px-2"
        style={{
          paddingLeft: "8px",
          paddingRight: "8px",
          display: "flex",
          flexDirection: "column",
          gap: "3px",
        }}
      >
        {itens.map((item, i) => (
          <button
            key={item.id}
            className={`flex w-full items-center gap-2.5 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors cursor-pointer ${
              i === 0
                ? "bg-sidebar-accent text-sidebar-accent-foreground"
                : "text-sidebar-foreground/70 hover:bg-sidebar-accent/50 hover:text-sidebar-accent-foreground"
            }`}
            style={{
              paddingTop: "7px",
              paddingBottom: "7px",
              paddingLeft: "10px",
              paddingRight: "10px",
              display: "flex",
              alignItems: "center",
              gap: "10px",
              minHeight: "34px",
            }}
          >
            <item.icon className="size-4 shrink-0" />
            <span className="truncate">{item.label}</span>
          </button>
        ))}
      </nav>

      {/* Rodapé da Sidebar */}
      <div
        className="border-t border-sidebar-border px-2 py-3"
        style={{ padding: "10px 8px" }}
      >
        <div
          className="flex items-center gap-2.5 rounded-lg bg-sidebar-accent/30 px-2 py-2"
          style={{
            padding: "8px 10px",
            display: "flex",
            alignItems: "center",
            gap: "10px",
          }}
        >
          <span className="grid size-8 shrink-0 place-items-center rounded-full bg-sidebar-accent font-semibold text-xs">
            {iniciais}
          </span>
          <div className="min-w-0 flex-1">
            <span className="block truncate text-xs font-semibold">{nomeExibido}</span>
            <span className="block text-[11px] text-sidebar-foreground/60">Aluno</span>
          </div>
          <button
            type="button"
            onClick={onLogout}
            aria-label="Sair da conta"
            className="shrink-0 rounded-md p-1.5 text-sidebar-foreground/60 transition-colors hover:bg-sidebar-accent hover:text-destructive cursor-pointer"
            style={{ padding: "6px" }}
          >
            <LogOut className="size-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
}

export default SidebarContent;
