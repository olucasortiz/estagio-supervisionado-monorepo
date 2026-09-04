"use client";

import { useState } from "react";
import { getNewMembersReport } from "../../services/api";
import PageHeader from "../ui/PageHeader";
import DashboardCard from "../ui/DashboardCard";
import DataTable from "../ui/DataTable";
import StatusBadge from "../ui/StatusBadge";

function toDateInput(date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
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

function maskCPF(cpf) {
  if (!cpf) return "—";
  const digits = String(cpf).replace(/\D/g, "");
  if (digits.length === 0) return "—";
  return digits.replace(/(\d{3})(\d)/, "$1.$2")
               .replace(/(\d{3})(\d)/, "$1.$2")
               .replace(/(\d{3})(\d{1,2})/, "$1-$2")
               .replace(/(-\d{2})\d+?$/, "$1");
}

import { useAuth } from "../../hooks/useAuth";
import exportReportPdf from "./exportReportPdf";

export default function NewMembersReport({ styles }) {
  const { user } = useAuth();
  const [di, setDi] = useState(() => { const d = new Date(); d.setDate(d.getDate() - 30); return toDateInput(d); });
  const [df, setDf] = useState(() => toDateInput(new Date()));
  const [members, setMembers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [generated, setGenerated] = useState(false);

  async function generate() {
    setError("");
    if (!di || !df) { setError("Selecione as datas inicial e final."); return; }
    if (di > df) { setError("A data inicial não pode ser posterior à data final."); return; }
    setLoading(true);
    setGenerated(false);
    try {
      const data = await getNewMembersReport(di, df);
      setMembers(Array.isArray(data) ? data : []);
      setGenerated(true);
    } catch (err) {
      setError(err.message || "Erro ao gerar o relatório.");
    } finally {
      setLoading(false);
    }
  }

  const avgPerDay = generated && di && df
    ? (() => { const days = Math.max(1, Math.ceil((new Date(df) - new Date(di)) / 86400000)); return (members.length / days).toFixed(1); })()
    : "—";

  async function exportToPdf() {
    if (!members.length) {
      alert("Gere um relatório com dados antes de exportar.");
      return;
    }
    const filtersStr = {
      "Período": `${formatSecureDate(di)} até ${formatSecureDate(df)}`
    };
    const summaryData = [
      { label: "Novos alunos no período", value: members.length },
      { label: "Média por dia", value: avgPerDay },
      { label: "Alunos ativos", value: members.filter(m => m.active !== false).length }
    ];
    const exportColumns = [
      { title: "Nome", dataKey: "name" },
      { title: "CPF", dataKey: "cpf" },
      { title: "E-mail", dataKey: "email" },
      { title: "Data de Cadastro", dataKey: "createdAt" },
    ];
    const exportRows = members.map(m => ({
      name: m.name || m.nome || "—",
      cpf: maskCPF(m.cpf),
      email: m.email || "—",
      createdAt: formatSecureDate(m.createdAt || m.dataCadastro),
    }));

    const todayStr = new Date().toISOString().split("T")[0];
    await exportReportPdf({
      title: "Relatório de Novos Alunos por Período",
      user,
      filters: filtersStr,
      columns: exportColumns,
      rows: exportRows,
      summary: summaryData,
      filename: `relatorio-novos-alunos-${todayStr}.pdf`
    });
  }

  return (
    <div className="animate-fade-in">
      <PageHeader
        title="Novos Alunos"
        subtitle="Alunos cadastrados em um período específico"
        breadcrumb={<><span>Relatórios</span><span style={{ opacity: 0.4 }}>›</span><span>Novos Alunos</span></>}
        action={
          <div style={{ display: "flex", gap: "var(--space-2)", alignItems: "center" }}>
            {generated && members.length > 0 && (
              <button className="btn btn-outline" onClick={exportToPdf} style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" style={{ flexShrink: 0 }}>
                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/>
                </svg>
                Exportar PDF
              </button>
            )}
            <button className="btn btn-primary" onClick={generate} disabled={loading} id="btn-gerar-novos-alunos">
              {loading ? "Gerando..." : "Gerar Relatório"}
            </button>
          </div>
        }
      />

      {/* Filtros */}
      <div className="card card-md" style={{ marginBottom: 20 }}>
        <div style={{ display: "flex", gap: 16, alignItems: "flex-end", flexWrap: "wrap" }}>
          <div className="form-field" style={{ flex: 1, minWidth: 160 }}>
            <label className="label">Data inicial</label>
            <input className="input" type="date" value={di} onChange={(e) => setDi(e.target.value)} />
          </div>
          <div className="form-field" style={{ flex: 1, minWidth: 160 }}>
            <label className="label">Data final</label>
            <input className="input" type="date" value={df} onChange={(e) => setDf(e.target.value)} />
          </div>
          {error && <p className="feedback-error" style={{ flex: "100%", margin: 0 }}>{error}</p>}
        </div>
      </div>

      {/* KPI cards */}
      {generated && (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 16, marginBottom: 20 }}>
          <DashboardCard value={members.length} label="Novos alunos no período" accentColor="#22C55E" icon="👥" />
          <DashboardCard value={avgPerDay} label="Média por dia" accentColor="#3B82F6" icon="📅" />
          <DashboardCard
            value={members.filter(m => m.active !== false).length}
            label="Alunos ativos"
            accentColor="#C0392B"
            icon="✅"
          />
        </div>
      )}

      {/* Barra visual de proporção */}
      {generated && members.length > 0 && (
        <div className="card card-md" style={{ marginBottom: 20 }}>
          <p style={{ fontSize: "var(--font-xs)", fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 8 }}>
            Distribuição por status
          </p>
          {(() => {
            const ativos = members.filter(m => m.active !== false).length;
            const inativos = members.length - ativos;
            const pct = members.length > 0 ? Math.round((ativos / members.length) * 100) : 0;
            return (
              <div>
                <div style={{ display: "flex", height: 10, borderRadius: 999, overflow: "hidden", background: "var(--bg-subtle)" }}>
                  <div style={{ width: `${pct}%`, background: "#22C55E", transition: "width 0.5s ease" }} />
                  <div style={{ flex: 1, background: "#E2E8F0" }} />
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", marginTop: 6 }}>
                  <span style={{ fontSize: "var(--font-xs)", color: "var(--success-text)", fontWeight: 600 }}>✓ Ativos: {ativos} ({pct}%)</span>
                  <span style={{ fontSize: "var(--font-xs)", color: "var(--text-muted)", fontWeight: 500 }}>Inativos: {inativos}</span>
                </div>
              </div>
            );
          })()}
        </div>
      )}

      {/* Tabela */}
      {generated && (
        <div className="card card-md">
          <DataTable
            data={members}
            loading={loading}
            keyField="memberId"
            searchPlaceholder="Buscar por nome, CPF ou e-mail..."
            searchFields={["name", "cpf", "email"]}
            emptyTitle="Nenhum aluno novo no período"
            emptyDescription="Ajuste o intervalo de datas e gere novamente."
            columns={[
              { key: "name", label: "Nome" },
              { key: "cpf",  label: "CPF",  render: (r) => <span style={{ fontFamily: "monospace", fontSize: 12 }}>{maskCPF(r.cpf)}</span> },
              { key: "email", label: "E-mail", render: (r) => r.email || "—" },
              { key: "createdAt", label: "Cadastro", render: (r) => formatSecureDate(r.createdAt) },
              { key: "active", label: "Status", render: (r) => <StatusBadge status={r.active === false ? "Inativo" : "Ativo"} /> },
            ]}
          />
        </div>
      )}
    </div>
  );
}
