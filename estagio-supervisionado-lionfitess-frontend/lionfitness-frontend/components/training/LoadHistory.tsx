"use client";

import React, { useMemo, useState } from "react";
import { formatDateBr, formatKg, summarizeLoads, toDate, type LoadLog } from "@/lib/training-records";
import "./training.css";

function formatDateTime(value: string | number[]): string {
  const date = toDate(value);
  return date ? date.toLocaleString("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" }) : "—";
}

/** Evolução de carga por exercício e aparelho: última carga, recorde e variação desde o primeiro registro. */
export function LoadHistory({
  logs,
  emptyTitle = "Nenhuma carga registrada",
  emptyText = "As cargas são registradas pelo aluno ao concluir cada série durante o treino.",
}: {
  logs: LoadLog[];
  emptyTitle?: string;
  emptyText?: string;
}) {
  const summaries = useMemo(() => summarizeLoads(logs), [logs]);
  const [openKey, setOpenKey] = useState<string | null>(null);

  if (summaries.length === 0) {
    return <div className="gp-tr-empty"><strong>{emptyTitle}</strong>{emptyText}</div>;
  }

  const open = summaries.find((item) => item.key === openKey) ?? null;

  return (
    <div>
      <div className="gp-tr-table-wrap">
        <table className="gp-tr-table gp-tr-table-stack">
          <caption className="sr-only">Cargas por exercício e aparelho</caption>
          <thead>
            <tr>
              <th scope="col">Exercício / aparelho</th>
              <th scope="col" className="gp-tr-num">Última carga</th>
              <th scope="col" className="gp-tr-num">Recorde</th>
              <th scope="col" className="gp-tr-num">Evolução</th>
              <th scope="col" className="gp-tr-num">Treinos</th>
            </tr>
          </thead>
          <tbody>
            {summaries.map((item) => {
              const change = Math.round((item.lastLoadKg - item.firstLoadKg) * 100) / 100;
              return (
                <tr key={item.key} data-selected={item.key === openKey || undefined}>
                  <td data-label="Exercício / aparelho">
                    <button type="button" className="gp-tr-row-btn" aria-expanded={item.key === openKey}
                      onClick={() => setOpenKey((current) => current === item.key ? null : item.key)}>
                      {item.exerciseName}
                    </button>
                    <span className="gp-tr-last-load">{item.equipment || "Sem aparelho informado"} · {formatDateBr(item.lastLoggedAt)}</span>
                  </td>
                  <td data-label="Última carga" className="gp-tr-num">{formatKg(item.lastLoadKg)} × {item.lastReps}</td>
                  <td data-label="Recorde" className="gp-tr-num">{formatKg(item.maxLoadKg)}</td>
                  <td data-label="Evolução" className="gp-tr-num">
                    <span className="gp-tr-delta" style={{ marginLeft: 0 }} data-tone={change > 0 ? "good" : change < 0 ? "bad" : undefined}>
                      {change === 0 ? "=" : `${change > 0 ? "+" : "−"}${formatKg(Math.abs(change))}`}
                    </span>
                  </td>
                  <td data-label="Treinos" className="gp-tr-num">{item.sessions}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {open && (
        <div className="gp-tr-details" aria-live="polite">
          <p className="gp-tr-subtitle" style={{ marginTop: 0 }}>Registros de {open.exerciseName}{open.equipment ? ` (${open.equipment})` : ""}</p>
          <div className="gp-tr-table-wrap">
            <table className="gp-tr-table">
              <caption className="sr-only">Séries registradas para {open.exerciseName}</caption>
              <thead>
                <tr>
                  <th scope="col">Data</th>
                  <th scope="col" className="gp-tr-num">Série</th>
                  <th scope="col" className="gp-tr-num">Carga</th>
                  <th scope="col" className="gp-tr-num">Repetições</th>
                </tr>
              </thead>
              <tbody>
                {open.entries.slice(0, 30).map((entry) => (
                  <tr key={entry.id}>
                    <td>{formatDateTime(entry.loggedAt)}</td>
                    <td className="gp-tr-num">{entry.setNumber}ª</td>
                    <td className="gp-tr-num">{formatKg(entry.loadKg)}</td>
                    <td className="gp-tr-num">{entry.reps}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
