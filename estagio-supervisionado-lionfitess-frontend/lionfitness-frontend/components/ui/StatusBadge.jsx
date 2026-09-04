"use client";

const STATUS_MAP = {
  Ativo:        { cls: "badge-success", label: "Ativo" },
  ACTIVE:       { cls: "badge-success", label: "Ativo" },
  Inativo:      { cls: "badge-neutral", label: "Inativo" },
  INACTIVE:     { cls: "badge-neutral", label: "Inativo" },
  Cancelado:    { cls: "badge-error",   label: "Cancelado" },
  CANCELED:     { cls: "badge-error",   label: "Cancelado" },
  Inadimplente: { cls: "badge-error",   label: "Inadimplente" },
  OVERDUE:      { cls: "badge-error",   label: "Inadimplente" },
  "Em dia":     { cls: "badge-success", label: "Em dia" },
  CURRENT:      { cls: "badge-success", label: "Em dia" },
  Pago:         { cls: "badge-success", label: "Pago" },
  PAID:         { cls: "badge-success", label: "Pago" },
  Pendente:     { cls: "badge-warning", label: "Pendente" },
  PENDING:      { cls: "badge-warning", label: "Pendente" },
  Atrasado:     { cls: "badge-error",   label: "Atrasado" },
  LATE:         { cls: "badge-error",   label: "Atrasado" },
  Sim:          { cls: "badge-success", label: "Ativo" },
  Não:          { cls: "badge-neutral", label: "Inativo" },
};

const DOT_COLORS = {
  "badge-success": "#22C55E",
  "badge-error":   "#EF4444",
  "badge-warning": "#F59E0B",
  "badge-info":    "#3B82F6",
  "badge-neutral": "#94A3B8",
};

export default function StatusBadge({ status, showDot = true }) {
  const entry = STATUS_MAP[status] || { cls: "badge-neutral", label: status || "—" };
  const dotColor = DOT_COLORS[entry.cls] || "#94A3B8";

  return (
    <span className={`badge ${entry.cls}`}>
      {showDot && (
        <span
          style={{
            width: 6, height: 6, borderRadius: "50%",
            background: dotColor, flexShrink: 0,
            display: "inline-block",
          }}
        />
      )}
      {entry.label}
    </span>
  );
}
