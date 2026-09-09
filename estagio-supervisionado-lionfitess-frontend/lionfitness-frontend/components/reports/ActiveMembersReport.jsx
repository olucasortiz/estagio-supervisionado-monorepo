"use client";

import { useState } from "react";
import PageHeader from "../ui/PageHeader";
import DashboardCard from "../ui/DashboardCard";
import DataTable from "../ui/DataTable";
import StatusBadge from "../ui/StatusBadge";

const isInactive = (m) => m.active === false || m.isActive === false || m.is_active === false;

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

import { useAuth } from "../../hooks/useAuth";
import exportReportPdf from "./exportReportPdf";

export default function ActiveMembersReport({ styles, members = [], Badge }) {
  const { user } = useAuth();
  const [filtro, setFiltro] = useState("todos");
  const [generated, setGenerated] = useState(false);

  const ativos  = members.filter((m) => !isInactive(m));
  const inativos = members.filter((m) => isInactive(m));
  const pctAtivo = members.length > 0 ? Math.round((ativos.length / members.length) * 100) : 0;

  const filtered = filtro === "ativos" ? ativos : filtro === "inativos" ? inativos : members;

  async function exportToPdf() {
    if (!filtered.length) {
      alert("Gere um relatório com dados antes de exportar.");
      return;
    }
    const filterLabels = {
      todos: "Todos os alunos",
      ativos: "Somente ativos",
      inativos: "Somente inativos / cancelados"
    };
    const filtersStr = {
      "Situação": filterLabels[filtro] || filtro
    };

    const pctInativo = 100 - pctAtivo;

    const kpiData = [
      { label: "Total de alunos", value: members.length },
      { label: "Alunos ativos", value: ativos.length },
      { label: "Inativos / Cancelados", value: inativos.length },
      { label: "Taxa de retenção", value: `${pctAtivo}%` }
    ];

    const chartData = members.length > 0 ? {
      type: "proportional_bar",
      title: "Proporção geral da base (Ativos x Inativos)",
      items: [
        { label: "Alunos Ativos", count: ativos.length, percentage: pctAtivo, color: [21, 128, 61] },
        { label: "Inativos / Cancelados", count: inativos.length, percentage: pctInativo, color: [148, 163, 184] },
      ]
    } : null;

    const exportColumns = [
      { title: "Nome", dataKey: "nome" },
      { title: "CPF", dataKey: "cpf" },
      { title: "Situação", dataKey: "situacao" },
      { title: "Data de Cadastro", dataKey: "dataCadastro" },
    ];
    const exportRows = filtered.map(m => ({
      nome: m.nome || m.name || "—",
      cpf: maskCPF(m.cpf),
      situacao: isInactive(m) ? "Inativo" : "Ativo",
      dataCadastro: formatSecureDate(m.dataCadastro || m.createdAt),
    }));

    const todayStr = new Date().toISOString().split("T")[0];
    await exportReportPdf({
      title: "Relatório de Ativos e Inativos",
      subtitle: "Situação cadastral da base de alunos",
      user,
      filters: filtersStr,
      columns: exportColumns,
      rows: exportRows,
      kpis: kpiData,
      chart: chartData,
      filename: `relatorio-ativos-inativos-${todayStr}.pdf`
    });
  }

  return (
    <div className="animate-fade-in">
      <PageHeader
        title="Ativos e Inativos"
        subtitle="Situação cadastral de todos os alunos"
        breadcrumb={<><span>Relatórios</span><span style={{ opacity: 0.4 }}>›</span><span>Ativos e Inativos</span></>}
        action={
          <div style={{ display: "flex", gap: "var(--space-2)", alignItems: "center" }}>
            {generated && filtered.length > 0 && (
              <button className="btn btn-outline" onClick={exportToPdf} style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" style={{ flexShrink: 0 }}>
                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/>
                </svg>
                Exportar PDF
              </button>
            )}
            <button className="btn btn-primary" id="btn-gerar-ativos" onClick={() => setGenerated(true)}>
              {generated ? "Atualizar" : "Gerar Relatório"}
            </button>
          </div>
        }
      />

      {/* Filtro */}
      <div className="card card-md" style={{ marginBottom: 20 }}>
        <div style={{ display: "flex", gap: 12, alignItems: "flex-end", flexWrap: "wrap" }}>
          <div className="form-field" style={{ flex: 1, minWidth: 200 }}>
            <label className="label">Situação</label>
            <select className="select" value={filtro} onChange={(e) => setFiltro(e.target.value)}>
              <option value="todos">Todos os alunos</option>
              <option value="ativos">Somente ativos</option>
              <option value="inativos">Somente inativos / cancelados</option>
            </select>
          </div>
        </div>
      </div>

      {/* KPI cards */}
      {generated && (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: 16, marginBottom: 20 }}>
          <DashboardCard value={members.length} label="Total de alunos" accentColor="#3B82F6" icon="👥" />
          <DashboardCard value={ativos.length} label="Alunos ativos" accentColor="#22C55E" icon="✅" />
          <DashboardCard value={inativos.length} label="Inativos / Cancelados" accentColor="#EF4444" icon="❌" />
          <DashboardCard value={`${pctAtivo}%`} label="Taxa de retenção" accentColor="#C0392B" icon="📊" />
        </div>
      )}

      {/* Barra de proporção */}
      {generated && members.length > 0 && (
        <div className="card card-md" style={{ marginBottom: 20 }}>
          <p style={{ fontSize: "var(--font-xs)", fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 10 }}>
            Distribuição geral
          </p>
          <div style={{ height: 14, borderRadius: 999, overflow: "hidden", background: "var(--bg-subtle)", display: "flex" }}>
            <div style={{ width: `${pctAtivo}%`, background: "linear-gradient(90deg, #22C55E, #16A34A)", transition: "width 0.6s ease", borderRadius: 999 }} />
          </div>
          <div style={{ display: "flex", justifyContent: "space-between", marginTop: 8 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <span style={{ width: 10, height: 10, borderRadius: 3, background: "#22C55E", display: "inline-block" }} />
              <span style={{ fontSize: "var(--font-xs)", color: "var(--success-text)", fontWeight: 600 }}>Ativos {pctAtivo}%</span>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <span style={{ width: 10, height: 10, borderRadius: 3, background: "#E2E8F0", display: "inline-block" }} />
              <span style={{ fontSize: "var(--font-xs)", color: "var(--text-muted)", fontWeight: 500 }}>Inativos {100 - pctAtivo}%</span>
            </div>
          </div>
        </div>
      )}

      {/* Tabela */}
      {generated && (
        <div className="card card-md">
          <DataTable
            data={filtered}
            keyField="id"
            searchPlaceholder="Buscar por nome ou CPF..."
            searchFields={["nome", "name", "cpf"]}
            emptyTitle="Nenhum aluno encontrado"
            columns={[
              { key: "nome", label: "Nome", render: (r) => r.nome || r.name || "—" },
              { key: "cpf",  label: "CPF",  render: (r) => <span style={{ fontFamily: "monospace", fontSize: 12 }}>{maskCPF(r.cpf)}</span> },
              { key: "situacao", label: "Situação", render: (r) => <StatusBadge status={isInactive(r) ? "Inativo" : "Ativo"} /> },
            ]}
          />
        </div>
      )}
    </div>
  );
}
