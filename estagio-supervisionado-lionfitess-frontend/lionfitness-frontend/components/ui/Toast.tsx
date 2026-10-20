"use client";

import React, { useEffect, useRef, useState } from "react";
import { Check, AlertCircle, Info, X } from "lucide-react";
import { cn } from "@/lib/utils";
import "./toast.css";

export interface ToastProps {
  open: boolean;
  message: string;
  type?: "success" | "error" | "info";
  duration?: number;
  onClose: () => void;
  className?: string;
}

export function Toast({ open, message, type = "success", duration = 5000, onClose, className }: ToastProps) {
  const closeRef = useRef(onClose);
  const [paused, setPaused] = useState(false);
  useEffect(() => { closeRef.current = onClose; }, [onClose]);
  useEffect(() => {
    if (!open || !message || !duration || paused) return;
    const timer = setTimeout(() => closeRef.current(), duration);
    return () => clearTimeout(timer);
  }, [open, message, duration, paused]);

  if (!open || !message) return null;
  const Icon = type === "error" ? AlertCircle : type === "info" ? Info : Check;
  const title = type === "error" ? "Não foi possível concluir" : type === "info" ? "Informação" : "Concluído";
  const description = message.charAt(0).toLocaleUpperCase("pt-BR") + message.slice(1);

  return <div className={cn("lf-toast", className)} data-kind={type} role={type === "error" ? "alert" : "status"} aria-atomic="true"
    onMouseEnter={() => setPaused(true)} onMouseLeave={() => setPaused(false)}
    onFocusCapture={() => setPaused(true)} onBlurCapture={(event) => { if (!event.currentTarget.contains(event.relatedTarget as Node | null)) setPaused(false); }}>
    <span className="lf-toast-icon"><Icon size={18} aria-hidden="true" /></span>
    <div className="lf-toast-copy"><strong>{title}</strong><p>{description}</p></div>
    <button type="button" onClick={onClose} className="lf-toast-close" aria-label="Fechar notificação"><X size={16} aria-hidden="true" /></button>
  </div>;
}
