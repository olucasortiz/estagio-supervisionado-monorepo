"use client";

import { useEffect, useRef } from "react";

export default function Modal({ open, onClose, title, subtitle, size = "md", children, footer }) {
  const overlayRef = useRef(null);

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

  const handleOverlayClick = (e) => {
    if (e.target === overlayRef.current) onClose?.();
  };

  return (
    <div className="modal-overlay" ref={overlayRef} onClick={handleOverlayClick}>
      <div className={`modal-content modal-${size}`} role="dialog" aria-modal="true">
        {(title || onClose) && (
          <div className="modal-header">
            <div>
              {title && (
                <h2 style={{
                  fontSize: "var(--font-xl)", fontWeight: 700,
                  color: "var(--text-primary)", margin: 0,
                }}>
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
              <button
                className="btn-icon"
                onClick={onClose}
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
