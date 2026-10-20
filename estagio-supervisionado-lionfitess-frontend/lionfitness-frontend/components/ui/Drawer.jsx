"use client";

import { useEffect, useId, useRef } from "react";

export default function Drawer({ open, onClose, title, subtitle, children, footer }) {
  const panelRef = useRef(null);
  const onCloseRef = useRef(onClose);
  const titleId = useId();
  const descriptionId = useId();
  useEffect(() => { onCloseRef.current = onClose; }, [onClose]);
  useEffect(() => {
    if (!open) return;
    const previousFocus = document.activeElement;
    const previousOverflow = document.body.style.overflow;
    const focusFrame = requestAnimationFrame(() => panelRef.current?.focus());
    const handleKey = (event) => {
      if ([...document.querySelectorAll('[role="dialog"]')].at(-1) !== panelRef.current) return;
      if (event.key === "Escape") { event.preventDefault(); onCloseRef.current?.(); }
      if (event.key !== "Tab") return;
      const controls = [...panelRef.current.querySelectorAll('button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), a[href], [tabindex="0"]')].filter((element) => element.getClientRects().length > 0);
      const first = controls[0];
      const last = controls.at(-1);
      if (!first) { event.preventDefault(); panelRef.current.focus(); }
      else if (document.activeElement === panelRef.current) { event.preventDefault(); (event.shiftKey ? last : first).focus(); }
      else if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
    };
    document.addEventListener("keydown", handleKey);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", handleKey);
      cancelAnimationFrame(focusFrame);
      document.body.style.overflow = previousOverflow;
      if (previousFocus instanceof HTMLElement && previousFocus.isConnected) previousFocus.focus();
    };
  }, [open]);

  if (!open) return null;

  return (
    <>
      <div className="drawer-overlay" onClick={onClose} />
      <div ref={panelRef} tabIndex={-1} className="drawer-panel" role="dialog" aria-modal="true" aria-labelledby={title ? titleId : undefined} aria-describedby={subtitle ? descriptionId : undefined}>
        <div className="drawer-header">
          <div>
            {title && (
              <h2 id={titleId} style={{ fontSize: "var(--font-xl)", fontWeight: 700, color: "var(--text-primary)", margin: 0 }}>
                {title}
              </h2>
            )}
            {subtitle && (
              <p id={descriptionId} style={{ fontSize: "var(--font-sm)", color: "var(--text-muted)", marginTop: 4 }}>
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
