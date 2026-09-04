"use client";

import { useMemo, useState } from "react";
import Avatar from "../ui/Avatar";

function ChevronIcon({ open }) {
  return (
    <svg
      width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"
      style={{ flexShrink: 0, transition: "transform 0.2s ease", transform: open ? "rotate(90deg)" : "rotate(0deg)" }}
    >
      <path d="M9 18l6-6-6-6" />
    </svg>
  );
}

function SidebarGroup({ group, activeItem, expanded, onToggle, onSelectItem }) {
  const hasActive = group.children.some((item) => (item.id ?? item.href) === activeItem);

  return (
    <div style={{ marginBottom: 2 }}>
      {/* Group header */}
      <button
        type="button"
        onClick={onToggle}
        style={{
          width: "100%", display: "flex", alignItems: "center", justifyContent: "space-between",
          padding: "8px 16px", background: "transparent", border: "none",
          cursor: "pointer", borderRadius: 8,
          transition: "background 0.15s",
        }}
        onMouseEnter={(e) => { e.currentTarget.style.background = "rgba(255,255,255,0.04)"; }}
        onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; }}
      >
        <span style={{
          fontSize: 10, fontWeight: 700, color: "rgba(255,255,255,0.35)",
          letterSpacing: "0.1em", textTransform: "uppercase",
        }}>
          {group.label}
        </span>
        <span style={{ color: hasActive ? "#C0392B" : "rgba(255,255,255,0.25)" }}>
          <ChevronIcon open={expanded} />
        </span>
      </button>

      {/* Children */}
      <div style={{
        overflow: "hidden",
        maxHeight: expanded ? 500 : 0,
        transition: "max-height 0.25s ease",
      }}>
        <div style={{ paddingBottom: 4 }}>
          {group.children.map((item) => {
            const key = item.id ?? item.href;
            const isActive = activeItem === key;
            return (
              <button
                key={key}
                type="button"
                onClick={() => onSelectItem(item)}
                style={{
                  width: "100%", display: "flex", alignItems: "center", gap: 10,
                  padding: "9px 16px 9px 20px",
                  background: isActive ? "rgba(192,57,43,0.18)" : "transparent",
                  border: "none", cursor: "pointer",
                  borderRadius: 8, textAlign: "left",
                  position: "relative",
                  transition: "all 0.15s",
                }}
                onMouseEnter={(e) => { if (!isActive) e.currentTarget.style.background = "rgba(255,255,255,0.06)"; }}
                onMouseLeave={(e) => { if (!isActive) e.currentTarget.style.background = "transparent"; }}
              >
                {isActive && (
                  <span style={{
                    position: "absolute", left: 0, top: "20%", bottom: "20%",
                    width: 3, background: "#C0392B", borderRadius: "0 2px 2px 0",
                  }} />
                )}
                <NavIcon id={key} active={isActive} />
                <span style={{
                  fontSize: 13, fontWeight: isActive ? 600 : 400,
                  color: isActive ? "#ffffff" : "rgba(255,255,255,0.55)",
                  whiteSpace: "nowrap",
                }}>
                  {item.label}
                </span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function NavIcon({ id, active }) {
  const color = active ? "#ffffff" : "rgba(255,255,255,0.4)";
  const icons = {
    19: <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>,
    20: <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg>,
    21: <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2"><rect x="3" y="3" width="18" height="18" rx="2"/><path d="M3 9h18M9 21V9"/></svg>,
    22: <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2"><path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>,
    30: <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2"><circle cx="9" cy="7" r="4"/><path d="M3 21v-2a4 4 0 0 1 4-4h4a4 4 0 0 1 4 4v2"/></svg>,
    31: <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2"><path d="M3 7h18M6 3h12l3 4v14H3V7l3-4Z"/></svg>,
    32: <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2"><circle cx="12" cy="8" r="4"/><path d="M20 21a8 8 0 1 0-16 0"/></svg>,
    33: <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2"><path d="M4 8h4v8H4zM16 8h4v8h-4zM8 12h8"/></svg>,
    34: <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2"><rect x="2" y="5" width="20" height="14" rx="2"/><path d="M2 10h20"/></svg>,
    35: <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2"><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 3"/></svg>,
    36: <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>,
    37: <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg>,
    "aluno-plano": <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2"><path d="M3 7h18M6 3h12l3 4v14H3V7l3-4Z"/></svg>,
    "aluno-pagamentos": <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2"><rect x="2" y="5" width="20" height="14" rx="2"/><path d="M2 10h20"/></svg>,
    "aluno-treino": <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2"><path d="M6 6h4v12H6zM14 6h4v12h-4zM10 12h4"/></svg>,
    "personal-alunos": <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2"><circle cx="9" cy="7" r="4"/><path d="M17 11a4 4 0 1 0 0-8"/><path d="M3 21v-2a4 4 0 0 1 4-4h4a4 4 0 0 1 4 4v2"/></svg>,
    "personal-treinos": <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2"><path d="M4 8h4v8H4zM16 8h4v8h-4zM8 12h8"/></svg>,
  };
  return icons[id] || null;
}

export { NavIcon };

export default function Sidebar({ menuGroups, activeItem, onSelectItem, user, role, onLogout, isDark, onToggleTheme }) {
  const activeGroupLabel = useMemo(
    () => menuGroups.find((g) => g.children.some((item) => (item.id ?? item.href) === activeItem))?.label,
    [activeItem, menuGroups]
  );

  const [expandedGroups, setExpandedGroups] = useState(() =>
    activeGroupLabel ? { [activeGroupLabel]: true } : {}
  );

  const toggleGroup = (label) => {
    setExpandedGroups((prev) => ({ ...prev, [label]: !prev[label] }));
  };

  const roleLabel = { ADMIN: "Administrador", OPERATIONAL: "Aluno", PERSONAL_TRAINER: "Personal Trainer" };

  return (
    <aside style={{
      width: "var(--sidebar-width)", background: "var(--sidebar-bg)",
      minHeight: "100vh", display: "flex", flexDirection: "column",
      position: "fixed", top: 0, left: 0, zIndex: 100,
      borderRight: "1px solid var(--sidebar-border)",
    }}>
      {/* Logo */}
      <div style={{
        padding: "20px 20px 16px",
        borderBottom: "1px solid rgba(255,255,255,0.06)",
        display: "flex", alignItems: "center", gap: 12,
      }}>
        <div style={{
          width: 36, height: 36, borderRadius: 8, background: "#C0392B",
          display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18, flexShrink: 0,
        }}>
          🦁
        </div>
        <div>
          <p style={{ fontSize: 14, fontWeight: 800, color: "#ffffff", margin: 0, letterSpacing: "-0.01em" }}>LION FITNESS</p>
          <p style={{ fontSize: 10, color: "rgba(255,255,255,0.35)", letterSpacing: "0.08em", textTransform: "uppercase", margin: 0 }}>
            Gestão de Academia
          </p>
        </div>
      </div>

      {/* Nav */}
      <nav style={{ flex: 1, padding: "12px 12px", overflowY: "auto", display: "flex", flexDirection: "column", gap: 4 }}>
        {menuGroups.map((group) => (
          <SidebarGroup
            key={group.label}
            group={group}
            activeItem={activeItem}
            expanded={Boolean(expandedGroups[group.label])}
            onToggle={() => toggleGroup(group.label)}
            onSelectItem={onSelectItem}
          />
        ))}
      </nav>

      {/* Theme toggle */}
      <div style={{ padding: "8px 12px", borderTop: "1px solid rgba(255,255,255,0.06)" }}>
        <button
          type="button"
          onClick={onToggleTheme}
          style={{
            width: "100%", display: "flex", alignItems: "center", gap: 10, padding: "8px 12px",
            background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)",
            borderRadius: 8, cursor: "pointer",
            fontSize: 12, color: "rgba(255,255,255,0.5)", fontWeight: 500,
            transition: "all 0.15s",
          }}
          onMouseEnter={(e) => { e.currentTarget.style.background = "rgba(255,255,255,0.08)"; e.currentTarget.style.color = "rgba(255,255,255,0.8)"; }}
          onMouseLeave={(e) => { e.currentTarget.style.background = "rgba(255,255,255,0.04)"; e.currentTarget.style.color = "rgba(255,255,255,0.5)"; }}
        >
          <span>{isDark ? "☀️" : "🌙"}</span>
          <span>{isDark ? "Tema claro" : "Tema escuro"}</span>
        </button>
      </div>

      {/* User footer */}
      <div style={{
        padding: "16px 16px 20px",
        borderTop: "1px solid rgba(255,255,255,0.06)",
        display: "flex", flexDirection: "column", gap: 12,
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <Avatar name={user?.name || "U"} size="sm" style={{ background: "linear-gradient(135deg, #C0392B, #E74C3C)" }} />
          <div style={{ flex: 1, minWidth: 0 }}>
            <p style={{ fontSize: 13, fontWeight: 600, color: "#ffffff", margin: 0, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
              {user?.name || "Usuário"}
            </p>
            <p style={{ fontSize: 10, color: "rgba(255,255,255,0.35)", margin: 0, textTransform: "uppercase", letterSpacing: "0.06em" }}>
              {roleLabel[role] || role || "Perfil"}
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={onLogout}
          style={{
            width: "100%", height: 34, background: "rgba(192,57,43,0.15)",
            border: "1px solid rgba(192,57,43,0.25)", borderRadius: 8, cursor: "pointer",
            fontSize: 12, fontWeight: 600, color: "#E74C3C",
            display: "flex", alignItems: "center", justifyContent: "center", gap: 6,
            transition: "all 0.15s",
          }}
          onMouseEnter={(e) => { e.currentTarget.style.background = "rgba(192,57,43,0.25)"; }}
          onMouseLeave={(e) => { e.currentTarget.style.background = "rgba(192,57,43,0.15)"; }}
        >
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
            <polyline points="16 17 21 12 16 7" />
            <line x1="21" y1="12" x2="9" y2="12" />
          </svg>
          Sair
        </button>
      </div>
    </aside>
  );
}
