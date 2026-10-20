"use client";

import { useState } from "react";
import { getCancellationsReport } from "../../services/api";
import PageHeader from "../ui/PageHeader";
import { ReportMetrics, ReportState } from "./ReportPresentation";
import DataTable from "../ui/DataTable";

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

export default function CancellationsReport() {
  const { user } = useAuth();
  const [di, setDi] = useState(() => { const d = new Date(); d.setDate(d.getDate() - 30); return toDateInput(d); });
  const [df, setDf] = useState(() => toDateInput(new Date()));
  const [cancellations, setCancellations] = useState([]);
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
      const data = await getCancellationsReport(di, df);
      setCancellations(Array.isArray(data) ? data : []);
      setGenerated(true);
    } catch (err) {
      setError(err.message || "Erro ao gerar o relatório.");
    } finally {
      setLoading(false);
    }
  }

  // Motivos mais frequentes
  const motivoCount = cancellations.reduce((acc, c) => {
    const m = c.reason || c.cancellationReason || "Não informado";
    acc[m] = (acc[m] || 0) + 1;
    return acc;
  }, {});
  const topMotivo = Object.entries(motivoCount).sort((a, b) => b[1] - a[1])[0]?.[0] || "—";

  async function exportToPdf() {
    if (!cancellations.length) {
      alert("Gere um relatório com dados antes de exportar.");
      return;
    }
    const filtersStr = {
      "Período": `${formatSecureDate(di)} — ${formatSecureDate(df)}`
    };

    const kpiData = [
      { label: "Cancelamentos no período", value: cancellations.length },
      { label: "Motivo mais frequente", value: topMotivo }
    ];

    const sortedMotivos = Object.entries(motivoCount).sort((a, b) => b[1] - a[1]);
    const chartData = cancellations.length > 0 && sortedMotivos.length > 0 ? {
      type: "category_bars",
      title: "Distribuição de cancelamentos por motivo",
      items: sortedMotivos.slice(0, 5).map(([motivo, count]) => ({
        label: motivo,
        count,
        percentage: Math.round((count / cancellations.length) * 100),
        color: [192, 57, 43],
      })),
    } : null;

    const exportColumns = [
      { title: "Nome do Aluno", dataKey: "memberName" },
      { title: "CPF", dataKey: "memberCpf" },
      { title: "Data do Cancelamento", dataKey: "cancellationDate" },
      { title: "Motivo", dataKey: "reason" },
    ];

    const exportRows = cancellations.map(c => ({
      memberName: c.memberName || "—",
      memberCpf: maskCPF(c.memberCpf),
      cancellationDate: formatSecureDate(c.cancellationDate),
      reason: c.reason || c.cancellationReason || "Não informado",
    }));

    const todayStr = new Date().toISOString().split("T")[0];
    await exportReportPdf({
      title: "Relatório de Cancelamentos",
      subtitle: "Cancelamentos registrados no período selecionado",
      user,
      filters: filtersStr,
      columns: exportColumns,
      rows: exportRows,
      kpis: kpiData,
      chart: chartData,
      filename: `relatorio-cancelamentos-${todayStr}.pdf`
    });
  }

  return (
    <div className="gp-registry gp-report">
      <PageHeader
        title="Cancelamentos"
        subtitle="Cancelamentos registrados em um período específico"
        breadcrumb={<><span>Relatórios</span><span style={{ opacity: 0.4 }}>›</span><span>Cancelamentos</span></>}
        action={
          <div className="gp-report-actions">
            {generated && cancellations.length > 0 && (
              <button className="btn btn-outline" onClick={exportToPdf} style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <svg aria-hidden="true" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" style={{ flexShrink: 0 }}>
                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/>
                </svg>
                Exportar PDF
              </button>
            )}
            <button className="btn btn-primary" onClick={generate} disabled={loading} id="btn-gerar-cancelamentos">
              {loading ? "Gerando…" : "Gerar Relatório"}
            </button>
          </div>
        }
      />

      {/* Filtros */}
      <section className="card gp-report-filters" aria-label="Filtros do relatório">
        <h2>Filtros da consulta</h2>
        <div style={{ display: "flex", gap: 16, alignItems: "flex-end", flexWrap: "wrap" }}>
          <div className="form-field" style={{ flex: 1, minWidth: 160 }}>
            <label className="label" htmlFor="cancellations-di">Data inicial</label>
            <input id="cancellations-di" name="di" disabled={loading} autoComplete="off" className="input" type="date" value={di} onChange={(e) => setDi(e.target.value)} />
          </div>
          <div className="form-field" style={{ flex: 1, minWidth: 160 }}>
            <label className="label" htmlFor="cancellations-df">Data final</label>
            <input id="cancellations-df" name="df" disabled={loading} autoComplete="off" className="input" type="date" value={df} onChange={(e) => setDf(e.target.value)} />
          </div>
          {error && <p role="alert" className="feedback-error" style={{ flex: "100%", margin: 0 }}>{error}</p>}
        </div>
      </section>

      {/* KPI cards */}
      {generated && (
        <ReportMetrics items={[{label:"Cancelamentos no período",value:cancellations.length},{label:"Motivo mais frequente",value:topMotivo,text:true}]} />
      )}

      {/* Gráfico de motivos */}
      {generated && cancellations.length > 0 && Object.keys(motivoCount).length > 1 && (
        <div className="card gp-report-chart">
          <p style={{ fontSize: "var(--font-xs)", fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 12 }}>
            Motivos de cancelamento
          </p>
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {Object.entries(motivoCount).sort((a, b) => b[1] - a[1]).slice(0, 5).map(([motivo, count]) => {
              const pct = Math.round((count / cancellations.length) * 100);
              return (
                <div key={motivo}>
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 3 }}>
                    <span style={{ fontSize: "var(--font-xs)", color: "var(--text-secondary)", fontWeight: 500 }}>{motivo}</span>
                    <span style={{ fontSize: "var(--font-xs)", color: "var(--text-muted)" }}>{count} ({pct}%)</span>
                  </div>
                  <div style={{ height: 8, background: "var(--bg-subtle)", borderRadius: 999, overflow: "hidden" }}>
                    <div style={{ width: `${pct}%`, height: "100%", background: "var(--primary)", borderRadius: 999 }} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {!generated && <ReportState busy={loading} failed={!!error} />}
      {/* Tabela */}
      {generated && (
        <section className="card gp-registry-panel gp-report-results" aria-label="Resultado do relatório">
          <div className="gp-registry-panel-heading"><h2>Resultado detalhado</h2><p>Use a busca para localizar registros nesta consulta.</p></div>
          <DataTable
            data={cancellations}
            loading={loading}
            keyField="cancellationId"
            caption="Cancelamentos"
            searchPlaceholder="Buscar por nome, CPF ou motivo..."
            searchFields={["memberName", "memberCpf", "reason"]}
            emptyTitle="Nenhum cancelamento no período"
            emptyDescription="Ajuste o intervalo de datas e gere novamente."
            columns={[
              { key: "memberName", label: "Nome" },
              { key: "memberCpf", label: "CPF", render: (r) => <span style={{ fontFamily: "monospace", fontSize: 12 }}>{maskCPF(r.memberCpf)}</span> },
              { key: "cancellationDate", label: "Data", render: (r) => formatSecureDate(r.cancellationDate) },
              { key: "reason", label: "Motivo", render: (r) => <span style={{ color: "var(--text-secondary)" }}>{r.reason || "—"}</span> },
            ]}
          />
        </section>
      )}
    </div>
  );
}
