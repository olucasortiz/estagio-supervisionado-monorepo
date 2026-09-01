"use client";

import React, { createContext, useContext, useState, ReactNode } from "react";
import { X } from "lucide-react";

interface SheetContextType {
  open: boolean;
  setOpen: (open: boolean) => void;
}

const SheetContext = createContext<SheetContextType | null>(null);

export function Sheet({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(false);
  return (
    <SheetContext.Provider value={{ open, setOpen }}>
      {children}
    </SheetContext.Provider>
  );
}

export function SheetTrigger({ children, asChild }: { children: React.ReactElement; asChild?: boolean }) {
  const context = useContext(SheetContext);
  if (!context) return children;

  return React.cloneElement(children, {
    onClick: (e: React.MouseEvent) => {
      children.props.onClick?.(e);
      context.setOpen(true);
    },
  });
}

export function SheetContent({
  children,
  side = "left",
  className = "",
}: {
  children: ReactNode;
  side?: "left" | "right";
  className?: string;
}) {
  const context = useContext(SheetContext);
  if (!context || !context.open) return null;

  return (
    <div className="fixed inset-0 z-50 flex">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/60 backdrop-blur-xs transition-opacity"
        onClick={() => context.setOpen(false)}
      />
      {/* Content drawer */}
      <div
        className={`relative z-50 flex h-full flex-col bg-sidebar shadow-2xl transition-transform duration-300 ease-in-out ${
          side === "left" ? "animate-in slide-in-from-left" : "animate-in slide-in-from-right ml-auto"
        } ${className}`}
      >
        <button
          onClick={() => context.setOpen(false)}
          className="absolute right-4 top-4 rounded-md p-1.5 text-sidebar-foreground/60 hover:bg-sidebar-accent hover:text-sidebar-foreground cursor-pointer z-10"
          aria-label="Fechar"
        >
          <X className="size-4" />
        </button>
        {children}
      </div>
    </div>
  );
}
