"use client";

import { useEffect } from "react";

export default function Drawer({ open, onClose, title, subtitle, children, footer }) {
  useEffect(() => {
    if (!open) return;
    const handleKey = (e) => { if (e.key === "Escape") onClose?.(); };
    document.addEventListener("keydown", handleKey);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", handleKey);
      document.body.style.overflow = "";
    };
  }, [open, onClose]);

  if (!open) return null;

  return (
    <>
      <div className="drawer-overlay" onClick={onClose} />
      <div className="drawer-panel" role="dialog" aria-modal="true">
        <div className="drawer-header">
          <div>
            {title && (
              <h2 style={{ fontSize: "var(--font-xl)", fontWeight: 700, color: "var(--text-primary)", margin: 0 }}>
                {title}
              </h2>
            )}
            {subtitle && (
              <p style={{ fontSize: "var(--font-sm)", color: "var(--text-muted)", marginTop: 4 }}>
                {subtitle}
              </p>
            )}
          </div>
          {onClose && (
            <button className="btn-icon" onClick={onClose} aria-label="Fechar">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <path d="M18 6L6 18M6 6l12 12" />
              </svg>
            </button>
          )}
        </div>

        <div className="drawer-body">{children}</div>

        {footer && <div className="drawer-footer">{footer}</div>}
      </div>
    </>
  );
}
