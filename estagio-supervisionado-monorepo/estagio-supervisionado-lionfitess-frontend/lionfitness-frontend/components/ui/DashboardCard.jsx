"use client";

export default function DashboardCard({ value, label, icon, accentColor = "var(--brand-primary)", delta, deltaLabel, className = "" }) {
  const isPositive = delta > 0;
  const isNegative = delta < 0;

  return (
    <div className={`stat-card ${className}`}>
      <div
        className="stat-card-accent"
        style={{ background: accentColor }}
      />
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 12, paddingLeft: 8 }}>
        <div style={{ flex: 1 }}>
          <p className="stat-value">{value}</p>
          <p className="stat-label">{label}</p>
          {delta !== undefined && delta !== null && (
            <p className={`stat-delta ${isPositive ? "stat-delta-up" : isNegative ? "stat-delta-down" : ""}`}>
              {isPositive ? "↑" : isNegative ? "↓" : "→"} {Math.abs(delta)}%
              {deltaLabel ? ` ${deltaLabel}` : ""}
            </p>
          )}
        </div>
        {icon && (
          <div style={{
            width: 44, height: 44, borderRadius: "var(--radius-lg)",
            background: `${accentColor}14`,
            display: "flex", alignItems: "center", justifyContent: "center",
            flexShrink: 0,
          }}>
            <span style={{ color: accentColor, fontSize: 20 }}>{icon}</span>
          </div>
        )}
      </div>
    </div>
  );
}
