"use client";

import { useEffect, useId, useRef } from "react";
import { X } from "lucide-react";

export default function Modal({
  open,
  onClose,
  title,
  subtitle,
  size = "md",
  children,
  footer,
  icon = null,
  variant = "default",
  preventClose = false,
}) {
  const overlayRef = useRef(null);
  const panelRef = useRef(null);
  const onCloseRef = useRef(onClose);
  const titleId = useId();

  // Os formulários atualizam o estado a cada tecla e, consequentemente,
  // costumam receber uma nova referência de onClose. Mantemos a referência
  // atual sem reiniciar o efeito que controla o foco do modal.
  useEffect(() => {
    onCloseRef.current = onClose;
  }, [onClose]);

  useEffect(() => {
    if (!open) return;

    const previousOverflow = document.body.style.overflow;
    const previousActiveElement = document.activeElement;
    const handleKey = (event) => {
      if (event.key === "Escape" && !preventClose) onCloseRef.current?.();

      if (event.key === "Tab" && panelRef.current) {
        const focusable = panelRef.current.querySelectorAll(
          'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
        );
        if (!focusable.length) return;
        const first = focusable[0];
        const last = focusable[focusable.length - 1];
        if (event.shiftKey && document.activeElement === first) {
          event.preventDefault();
          last.focus();
        } else if (!event.shiftKey && document.activeElement === last) {
          event.preventDefault();
          first.focus();
        }
      }
    };

    document.addEventListener("keydown", handleKey);
    document.body.style.overflow = "hidden";
    panelRef.current?.focus();

    return () => {
      document.removeEventListener("keydown", handleKey);
      document.body.style.overflow = previousOverflow;
      previousActiveElement?.focus?.();
    };
  }, [open, preventClose]);

  if (!open) return null;

  const handleOverlayClick = (event) => {
    if (event.target === overlayRef.current && !preventClose) onClose?.();
  };

  if (variant === "payment") {
    const widthClass =
      size === "xl" ? "sm:max-w-[52rem]" : size === "lg" ? "sm:max-w-[42rem]" : "sm:max-w-[32rem]";

    return (
      <div className="fixed inset-0 z-[1000] flex items-end justify-center sm:items-center sm:p-4" role="presentation">
        <div
          ref={overlayRef}
          className="absolute inset-0 bg-black/60 backdrop-blur-[3px] animate-rise"
          onClick={handleOverlayClick}
          aria-hidden="true"
        />
        <div
          ref={panelRef}
          role="dialog"
          aria-modal="true"
          aria-labelledby={title ? titleId : undefined}
          tabIndex={-1}
          className={`relative flex max-h-[94dvh] w-full flex-col overflow-hidden rounded-t-2xl border border-border bg-card text-card-foreground shadow-2xl outline-none animate-rise sm:max-h-[92vh] sm:rounded-2xl ${widthClass}`}
        >
          <header className="flex shrink-0 items-start gap-3 border-b border-border px-5 py-4 sm:px-6">
            {icon ? (
              <span className="mt-0.5 flex size-10 shrink-0 items-center justify-center rounded-xl bg-primary-soft text-primary">
                {icon}
              </span>
            ) : null}
            <div className="min-w-0 flex-1">
              {title ? (
                <h2 id={titleId} className="truncate text-lg font-bold tracking-tight text-foreground">
                  {title}
                </h2>
              ) : null}
              {subtitle ? <div className="mt-0.5 truncate text-xs text-muted-foreground">{subtitle}</div> : null}
            </div>
            {onClose ? (
              <button
                type="button"
                onClick={onClose}
                disabled={preventClose}
                aria-label="Fechar"
                className="-mr-1 flex size-9 shrink-0 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary disabled:cursor-not-allowed disabled:opacity-40"
              >
                <X className="size-5" />
              </button>
            ) : null}
          </header>

          <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain">{children}</div>
          {footer ? <div className="shrink-0 border-t border-border p-5 sm:px-6">{footer}</div> : null}
        </div>
      </div>
    );
  }

  return (
    <div className="modal-overlay" ref={overlayRef} onClick={handleOverlayClick}>
      <div
        ref={panelRef}
        className={`modal-content modal-${size}`}
        role="dialog"
        aria-modal="true"
        aria-labelledby={title ? titleId : undefined}
        tabIndex={-1}
      >
        {(title || onClose) && (
          <div className="modal-header">
            <div>
              {title && (
                <h2
                  id={titleId}
                  style={{
                    fontSize: "var(--font-xl)",
                    fontWeight: 700,
                    color: "var(--text-primary)",
                    margin: 0,
                  }}
                >
                  {title}
                </h2>
              )}
              {subtitle && (
                <p style={{ fontSize: "var(--font-sm)", color: "var(--text-muted)", marginTop: 4 }}>{subtitle}</p>
              )}
            </div>
            {onClose && (
              <button
                type="button"
                className="btn-icon"
                onClick={onClose}
                disabled={preventClose}
                aria-label="Fechar"
                style={{ marginTop: 0, flexShrink: 0 }}
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <path d="M18 6L6 18M6 6l12 12" />
                </svg>
              </button>
            )}
          </div>
        )}

        <div className="modal-body">{children}</div>
        {footer && <div className="modal-footer">{footer}</div>}
      </div>
    </div>
  );
}
