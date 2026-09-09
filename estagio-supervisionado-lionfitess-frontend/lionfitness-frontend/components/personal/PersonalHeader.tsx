"use client";

import React from "react";
import { Dumbbell, LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/ui/ThemeToggle";

export type PersonalTabKey = "alunos" | "fichas" | "montar";

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
    <header className="sticky top-0 z-30 border-b border-border bg-card/85 backdrop-blur-md">
      <div className="mx-auto flex max-w-[1400px] items-center justify-between gap-4 px-4 py-3.5 sm:px-6">
        <div className="flex items-center gap-2.5">
          <span className="flex size-9 items-center justify-center rounded-lg bg-primary text-primary-foreground shadow-brand">
            <Dumbbell className="size-5" />
          </span>
          <div className="leading-tight">
            <p className="text-sm font-bold tracking-tight text-foreground">Lion Fitness</p>
            <p className="text-xs text-muted-foreground">Área do Personal</p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="hidden text-right sm:block">
            <p className="text-sm font-semibold text-foreground">{userName}</p>
            <p className="text-xs text-muted-foreground">Personal Trainer</p>
          </div>
          <span className="flex size-9 items-center justify-center rounded-full bg-ink text-xs font-semibold text-background">
            {initials}
          </span>
          <ThemeToggle />
          <Button
            variant="ghost"
            size="sm"
            onClick={onLogout}
            className="text-muted-foreground hover:text-destructive hover:bg-destructive/10 ml-1 h-8 px-2.5"
            title="Sair do sistema"
          >
            <LogOut className="size-4" />
            <span className="hidden md:inline text-xs font-medium">Sair</span>
          </Button>
        </div>
      </div>
    </header>
  );
}
