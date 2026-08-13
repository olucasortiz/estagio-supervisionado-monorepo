"use client";

export default function PageHeader({ title, subtitle, action, breadcrumb }) {
  return (
    <div className="page-header animate-fade-in">
      <div style={{ flex: 1, minWidth: 0 }}>
        {breadcrumb && (
          <div style={{
            display: "flex", alignItems: "center", gap: 6,
            fontSize: "var(--font-xs)", color: "var(--text-muted)",
            fontWeight: 500, marginBottom: 4,
            textTransform: "uppercase", letterSpacing: "0.05em",
          }}>
            {breadcrumb}
          </div>
        )}
        <h1 className="page-title">{title}</h1>
        {subtitle && <p className="page-subtitle">{subtitle}</p>}
      </div>
      {action && (
        <div style={{ display: "flex", gap: "var(--space-2)", flexShrink: 0, alignItems: "center" }}>
          {action}
        </div>
      )}
    </div>
  );
}
