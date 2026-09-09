"use client";

import React from "react";
import { Moon, Sun } from "lucide-react";
import { useThemeMode } from "@/hooks/useThemeMode";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export interface ThemeToggleProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "icon" | "full";
}

export function ThemeToggle({ className, variant = "icon", ...props }: ThemeToggleProps) {
  const { isDark, toggleTheme } = useThemeMode();

  const label = isDark ? "Ativar tema claro" : "Ativar tema escuro";

  if (variant === "full") {
    return (
      <button
        type="button"
        onClick={toggleTheme}
        className={cn(
          "flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-xs font-medium transition-colors cursor-pointer border border-border bg-card/50 hover:bg-muted text-muted-foreground hover:text-foreground",
          className
        )}
        aria-label={label}
        title={label}
        {...props}
      >
        {isDark ? (
          <Sun className="size-4 text-amber-400 transition-transform duration-200 hover:rotate-45" />
        ) : (
          <Moon className="size-4 text-slate-700 dark:text-slate-300 transition-transform duration-200 hover:-rotate-12" />
        )}
        <span>{isDark ? "Tema claro" : "Tema escuro"}</span>
      </button>
    );
  }

  return (
    <Button
      variant="ghost"
      size="sm"
      type="button"
      onClick={toggleTheme}
      className={cn(
        "h-8 w-8 p-0 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted/80 transition-colors cursor-pointer shrink-0",
        className
      )}
      aria-label={label}
      title={label}
      {...props}
    >
      {isDark ? (
        <Sun className="size-4 text-amber-400 transition-transform duration-200 hover:rotate-45" />
      ) : (
        <Moon className="size-4 text-slate-700 transition-transform duration-200 hover:-rotate-12" />
      )}
    </Button>
  );
}

export default ThemeToggle;
