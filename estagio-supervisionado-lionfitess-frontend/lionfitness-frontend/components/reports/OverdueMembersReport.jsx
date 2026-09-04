"use client";

import { useState } from "react";
import PageHeader from "../ui/PageHeader";
import DashboardCard from "../ui/DashboardCard";
import DataTable from "../ui/DataTable";
import StatusBadge from "../ui/StatusBadge";

function maskCPF(cpf) {
  if (!cpf) return "—";
  const d = String(cpf).replace(/\D/g, "");
  return d.length === 11 ? d.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, "$1.$2.$3-$4") : cpf;
}

function formatSecureDate(value) {
  if (!value) return "—";
  if (value instanceof Date) {
    if (isNaN(value.getTime())) return "—";
    return value.toLocaleDateString("pt-BR", { timeZone: "UTC" });
  }
  if (Array.isArray(value)) {
    const [y, m, d] = value;
    if (y && m && d) {
      return `${String(d).padStart(2, "0")}/${String(m).padStart(2, "0")}/${String(y).padStart(4, "0")}`;
    }
    return "—";
  }
  try {
    const str = typeof value === "string" && value.includes("T") ? value.split("T")[0] : String(value);
    const parts = str.split("-");
    if (parts.length === 3) {
      const [y, m, d] = parts;
      if (y.length <= 4 && m.length <= 2 && d.length <= 2) {
        return `${d.padStart(2, "0")}/${m.padStart(2, "0")}/${y.padStart(4, "0")}`;
      }
    }
    return "—";
  } catch { return "—"; }
}

function formatSecureCurrency(value) {
  if (value === null || value === undefined || value === "") return "—";
  return Number(value).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

import { useAuth } from "../../hooks/useAuth";
import exportReportPdf from "./exportReportPdf";

export default function OverdueMembersReport({ styles, members = [], Badge }) {
  const { user } = useAuth();
  const [generated, setGenerated] = useState(false);

  const overdue = members.filter((m) =>
    m.situacaoFin === "Inadimplente" ||
    m.situacaoFin === "OVERDUE" ||
    m.financialStatus === "OVERDUE" ||
    m.financial_status === "OVERDUE"
  );

  const taxa = members.length > 0 ? Math.round((overdue.length / members.length) * 100) : 0;

  async function exportToPdf() {
    if (!overdue.length) {
      alert("Gere um relatório com dados antes de exportar.");
      return;
    }
    const filtersStr = {
      "Filtro": "Todos os inadimplentes"
    };
    const summaryData = [
      { label: "Alunos inadimplentes", value: overdue.length },
      { label: "Total no sistema", value: members.length },
      { label: "Taxa de inadimplência", value: `${taxa}%` }
    ];
    const exportColumns = [
      { title: "Nome do Aluno", dataKey: "nome" },
      { title: "CPF", dataKey: "cpf" },
      { title: "Plano", dataKey: "plano" },
      { title: "Situação Financeira", dataKey: "situacaoFin" },
      { title: "Valor Pendente", dataKey: "valorPendente" },
      { title: "Vencimento", dataKey: "vencimento" },
    ];
    const exportRows = overdue.map(m => ({
      nome: m.nome || m.name || "—",
      cpf: maskCPF(m.cpf),
      plano: m.plano || "—",
      situacaoFin: "Inadimplente",
      valorPendente: formatSecureCurrency(m.pendingAmount ?? m.valorPendente ?? m.value ?? m.valor ?? m.amount ?? ""),
      vencimento: formatSecureDate(m.dueDate ?? m.due_date ?? m.vencimento ?? m.nextPaymentDate ?? m.next_payment_date ?? m.venceEm ?? ""),
    }));

    const todayStr = new Date().toISOString().split("T")[0];
    await exportReportPdf({
      title: "Relatório de Alunos Inadimplentes",
      user,
      filters: filtersStr,
      columns: exportColumns,
      rows: exportRows,
      summary: summaryData,
      filename: `relatorio-inadimplentes-${todayStr}.pdf`
    });
  }

  return (
    <div className="animate-fade-in">
      <PageHeader
        title="Inadimplentes"
        subtitle="Alunos com pagamento pendente ou vencido"
        breadcrumb={<><span>Relatórios</span><span style={{ opacity: 0.4 }}>›</span><span>Inadimplentes</span></>}
        action={
          <div style={{ display: "flex", gap: "var(--space-2)", alignItems: "center" }}>
            {generated && overdue.length > 0 && (
              <button className="btn btn-outline" onClick={exportToPdf} style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" style={{ flexShrink: 0 }}>
                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/>
                </svg>
                Exportar PDF
              </button>
            )}
            <button className="btn btn-primary" id="btn-gerar-inadimplentes" onClick={() => setGenerated(true)}>
              {generated ? "Atualizar" : "Gerar Relatório"}
            </button>
          </div>
        }
      />

      {/* Alerta */}
      {generated && overdue.length > 0 && (
        <div className="alert alert-error" style={{ marginBottom: 20 }}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ flexShrink: 0 }}>
            <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/>
            <line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/>
          </svg>
          <div>
            <strong>Atenção:</strong> {overdue.length} {overdue.length === 1 ? "aluno está" : "alunos estão"} com pagamento em atraso.
            Taxa de inadimplência: {taxa}%.
          </div>
        </div>
      )}

      {/* KPI cards */}
      {generated && (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: 16, marginBottom: 20 }}>
          <DashboardCard value={overdue.length} label="Alunos inadimplentes" accentColor="#EF4444" icon="⚠️" />
          <DashboardCard value={members.length} label="Total no sistema" accentColor="#3B82F6" icon="👥" />
          <DashboardCard value={`${taxa}%`} label="Taxa de inadimplência" accentColor="#F59E0B" icon="📊" />
        </div>
      )}

      {/* Barra de inadimplência */}
      {generated && members.length > 0 && (
        <div className="card card-md" style={{ marginBottom: 20 }}>
          <p style={{ fontSize: "var(--font-xs)", fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 10 }}>
            Proporção de inadimplência
          </p>
          <div style={{ height: 14, borderRadius: 999, overflow: "hidden", background: "var(--bg-subtle)", display: "flex" }}>
            <div style={{ width: `${taxa}%`, background: "linear-gradient(90deg, #EF4444, #DC2626)", transition: "width 0.6s ease", borderRadius: 999 }} />
          </div>
          <div style={{ display: "flex", justifyContent: "space-between", marginTop: 8 }}>
            <span style={{ fontSize: "var(--font-xs)", color: "var(--error-text)", fontWeight: 600 }}>Inadimplentes: {taxa}%</span>
            <span style={{ fontSize: "var(--font-xs)", color: "var(--success-text)", fontWeight: 500 }}>Em dia: {100 - taxa}%</span>
          </div>
        </div>
      )}

      {/* Tabela */}
      {generated && (
        <div className="card card-md">
          <DataTable
            data={overdue}
            keyField="id"
            searchPlaceholder="Buscar por nome, CPF ou plano..."
            searchFields={["nome", "name", "cpf", "plano"]}
            emptyTitle="Nenhum aluno inadimplente"
            emptyDescription="Todos os alunos estão em dia com os pagamentos."
            columns={[
              { key: "nome", label: "Nome", render: (r) => r.nome || r.name || "—" },
              { key: "cpf",  label: "CPF",  render: (r) => <span style={{ fontFamily: "monospace", fontSize: 12 }}>{maskCPF(r.cpf)}</span> },
              { key: "plano", label: "Plano", render: (r) => r.plano || "—" },
              { key: "situacaoFin", label: "Situação financeira", render: (r) => <StatusBadge status="Inadimplente" /> },
            ]}
          />
        </div>
      )}
    </div>
  );
}
