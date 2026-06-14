"use client";

import PageHeader from "../../ui/PageHeader";
import DataTable from "../../ui/DataTable";
import DashboardCard from "../../ui/DashboardCard";
import StatusBadge from "../../ui/StatusBadge";

const maskCPF = (v) => { if (!v) return "—"; const d = String(v).replace(/\D/g, ""); return d.length === 11 ? d.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, "$1.$2.$3-$4") : v; };

export default function OverdueSection({ data }) {
  const overdue = data.overdueMembers || [];
  const total = data.members?.length || 0;
  const taxa  = total > 0 ? Math.round((overdue.length / total) * 100) : 0;

  return (
    <div className="animate-fade-in">
      <PageHeader
        title="Inadimplentes"
        subtitle="Alunos com pagamento pendente ou vencido"
        breadcrumb={<><span>Financeiro</span><span style={{ opacity: 0.4 }}>›</span><span>Inadimplentes</span></>}
      />

      {overdue.length > 0 && (
        <div className="alert alert-error" style={{ marginBottom: 20 }}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ flexShrink: 0 }}>
            <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/>
            <line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/>
          </svg>
          <div>
            <strong>Atenção:</strong> {overdue.length} {overdue.length === 1 ? "aluno está" : "alunos estão"} com situação financeira irregular.
            Taxa de inadimplência: <strong>{taxa}%</strong>.
          </div>
        </div>
      )}

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: 16, marginBottom: 20 }}>
        <DashboardCard value={overdue.length} label="Inadimplentes" accentColor="#EF4444" icon="⚠️" />
        <DashboardCard value={total}          label="Total de alunos" accentColor="#3B82F6" icon="👥" />
        <DashboardCard value={`${taxa}%`}     label="Taxa de inadimplência" accentColor="#F59E0B" icon="📊" />
      </div>

      {/* Barra */}
      {total > 0 && (
        <div className="card card-md" style={{ marginBottom: 20 }}>
          <p style={{ fontSize: "var(--font-xs)", fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 8 }}>
            Proporção de inadimplência
          </p>
          <div style={{ height: 10, borderRadius: 999, overflow: "hidden", background: "var(--bg-subtle)" }}>
            <div style={{ width: `${taxa}%`, height: "100%", background: "linear-gradient(90deg, #EF4444, #DC2626)", transition: "width 0.5s ease" }} />
          </div>
          <div style={{ display: "flex", justifyContent: "space-between", marginTop: 6 }}>
            <span style={{ fontSize: "var(--font-xs)", color: "var(--error-text)", fontWeight: 600 }}>Inadimplentes: {taxa}%</span>
            <span style={{ fontSize: "var(--font-xs)", color: "var(--success-text)", fontWeight: 500 }}>Em dia: {100 - taxa}%</span>
          </div>
        </div>
      )}

      <div className="card card-md">
        <DataTable
          data={overdue}
          keyField="id"
          searchPlaceholder="Buscar por nome, CPF ou plano..."
          searchFields={["nome", "name", "cpf", "plano"]}
          emptyTitle="Nenhum aluno inadimplente"
          emptyDescription="Todos os alunos estão em dia com os pagamentos. 🎉"
          columns={[
            { key: "nome",       label: "Nome", render: (r) => r.nome || r.name || "—" },
            { key: "cpf",        label: "CPF",  render: (r) => <span style={{ fontFamily: "monospace", fontSize: 12 }}>{maskCPF(r.cpf)}</span> },
            { key: "plano",      label: "Plano vinculado" },
            { key: "situacaoFin", label: "Situação financeira", render: () => <StatusBadge status="Inadimplente" /> },
          ]}
        />
      </div>
    </div>
  );
}
