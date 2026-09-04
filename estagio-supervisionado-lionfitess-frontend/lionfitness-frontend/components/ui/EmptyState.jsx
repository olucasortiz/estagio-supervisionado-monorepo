"use client";

export default function EmptyState({ icon, title = "Nenhum resultado encontrado", description, action }) {
  return (
    <div className="empty-state animate-fade-in">
      {icon ? (
        <div className="empty-state-icon">{icon}</div>
      ) : (
        <div className="empty-state-icon">
          <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
            <rect x="3" y="3" width="18" height="18" rx="3" />
            <path d="M8 12h8M8 8h8M8 16h5" />
          </svg>
        </div>
      )}
      <p className="empty-state-title">{title}</p>
      {description && <p className="empty-state-desc">{description}</p>}
      {action && <div style={{ marginTop: "var(--space-3)" }}>{action}</div>}
    </div>
  );
}
