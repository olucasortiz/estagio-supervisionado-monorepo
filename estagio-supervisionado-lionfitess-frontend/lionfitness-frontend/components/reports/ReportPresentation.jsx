import { FileBarChart, LoaderCircle } from "lucide-react";

export function ReportMetrics({ items }) {
  return <dl className="gp-report-metrics" aria-label="Indicadores do relatório">
    {items.map(({ label, value, text }) => <div key={label}><dt>{label}</dt><dd className={text ? "gp-report-metric-text" : undefined}>{value}</dd></div>)}
  </dl>;
}

export function ReportState({ busy, failed }) {
  if (failed) return null;
  const Icon = busy ? LoaderCircle : FileBarChart;
  return <section className="gp-report-state" role="status" aria-live="polite" aria-busy={busy}>
    <Icon size={24} aria-hidden="true" className={busy ? "gp-report-spinner" : undefined} />
    <div><h2>{busy ? "Gerando relatório…" : "Pronto para consultar"}</h2><p>{busy ? "Aguarde o resultado da consulta." : "Revise os filtros, quando disponíveis, e selecione Gerar Relatório para visualizar os dados."}</p></div>
  </section>;
}
