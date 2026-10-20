"use client";

import React from "react";
import { Dumbbell, LogOut } from "lucide-react";
import { ThemeToggle } from "@/components/ui/ThemeToggle";
import { NotificationBell } from "@/components/notification/NotificationBell";

export type PersonalTabKey = "alunos" | "fichas" | "montar" | "catalogo";

interface PersonalHeaderProps {
  userName?: string;
  onLogout: () => void;
}

export function PersonalHeader({
  userName = "Personal Trainer",
  onLogout,
}: PersonalHeaderProps) {
  const initials = React.useMemo(() => {
    const parts = userName.trim().split(" ");
    if (parts.length > 1) {
      return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
    }
    return (parts[0]?.[0] || "P").toUpperCase();
  }, [userName]);

  return (
    <header className="gp-personal-header">
      <div className="gp-personal-header-inner">
        <div className="gp-personal-brand">
          <Dumbbell size={28} aria-hidden="true" />
          <div><strong>Lion Fitness</strong><span>Área do Personal</span></div>
        </div>
        <div className="gp-personal-header-actions">
          <div className="gp-personal-account"><strong>{userName}</strong><span>Personal Trainer</span></div>
          <span className="gp-personal-avatar" aria-label={userName}>{initials}</span>
          <ThemeToggle className="gp-personal-icon-button" />
          <NotificationBell canReply />
          <button type="button" onClick={onLogout} className="gp-personal-icon-button" aria-label="Sair do sistema" title="Sair do sistema"><LogOut size={18} aria-hidden="true" /></button>
        </div>
      </div>
    </header>
  );
}
