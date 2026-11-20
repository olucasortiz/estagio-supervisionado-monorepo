"use client";

import React, { useMemo, useState } from "react";
import {
  CIRCUMFERENCE_FIELDS,
  PARQ_QUESTIONS,
  SKINFOLD_FIELDS,
  delta,
  formatDateBr,
  formatNumber,
  methodLabel,
  type PhysicalAssessment,
} from "@/lib/training-records";
import "./training.css";

type Tone = "good" | "bad" | "neutral";

function Delta({ value, unit, better }: { value: number | null; unit: string; better?: "up" | "down" }) {
  if (value == null || value === 0) return null;
  const tone: Tone = !better ? "neutral" : (value > 0) === (better === "up") ? "good" : "bad";
  const sign = value > 0 ? "+" : "−";
  return (
    <span className="gp-tr-delta" data-tone={tone} title="Diferença em relação à avaliação anterior">
      {sign}{formatNumber(Math.abs(value))}{unit}
    </span>
  );
}

function Metric({ label, value, unit, hint, change, better, digits = 1 }: {
  label: string; value: number | null | undefined; unit: string; hint?: string | null;
  change?: number | null; better?: "up" | "down"; digits?: number;
}) {
  return (
    <div className="gp-tr-metric">
      <dt>{label}</dt>
      <dd>
        {value == null ? "—" : `${formatNumber(value, digits)}${unit}`}
        {change !== undefined && <Delta value={change ?? null} unit={unit} better={better} />}
      </dd>
      {hint && <small>{hint}</small>}
    </div>
  );
}

export function AssessmentSummary({
  assessments,
  onDelete,
  deletingId,
  emptyTitle = "Nenhuma avaliação física registrada",
  emptyText = "As avaliações aparecem aqui assim que forem registradas.",
}: {
  assessments: PhysicalAssessment[];
  onDelete?: (assessment: PhysicalAssessment) => void;
  deletingId?: string | null;
  emptyTitle?: string;
  emptyText?: string;
}) {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const selectedIndex = useMemo(() => {
    const index = assessments.findIndex((item) => item.id === selectedId);
    return index >= 0 ? index : 0;
  }, [assessments, selectedId]);

  if (assessments.length === 0) {
    return <div className="gp-tr-empty"><strong>{emptyTitle}</strong>{emptyText}</div>;
  }

  const current = assessments[selectedIndex];
  const previous = assessments[selectedIndex + 1];
  const r = current.results;
  const p = previous?.results;
  const compare = Boolean(previous);
  const circumferences = CIRCUMFERENCE_FIELDS.filter((field) => current.circumferences?.[field.key] != null);
  const skinfolds = SKINFOLD_FIELDS.filter((field) => current.skinfolds?.[field.key] != null);
  const parqYes = (current.parqAnswers ?? []).map((answer, index) => answer ? index : -1).filter((index) => index >= 0);

  return (
    <div>
      <div className="gp-tr-meta-row">
        <strong style={{ color: "var(--foreground)" }}>Avaliação de {formatDateBr(current.assessmentDate)}</strong>
        {current.ageYears != null && <span>· {current.ageYears} anos</span>}
        {current.sex && <span>· {current.sex === "M" ? "Masculino" : "Feminino"}</span>}
        {current.assessedByName && <span>· por {current.assessedByName}</span>}
        {compare && <span>· comparada com {formatDateBr(previous!.assessmentDate)}</span>}
      </div>

      <dl className="gp-tr-metrics" aria-label="Resultados da avaliação física">
        <Metric label="Peso" value={current.weightKg} unit=" kg" change={compare ? delta(current.weightKg, previous!.weightKg) : undefined} />
        <Metric label="IMC" value={r.bmi} unit="" hint={r.bmiClassification} change={compare ? delta(r.bmi, p?.bmi) : undefined} better="down" />
        <Metric label="Gordura corporal" value={r.bodyFatPercent} unit="%" hint={r.bodyFatPercent == null ? "Sem composição corporal" : methodLabel(current.bodyFatMethod)}
          change={compare ? delta(r.bodyFatPercent, p?.bodyFatPercent) : undefined} better="down" />
        <Metric label="Massa magra" value={r.leanMassKg} unit=" kg" change={compare ? delta(r.leanMassKg, p?.leanMassKg) : undefined} better="up" />
        <Metric label="Massa gorda" value={r.fatMassKg} unit=" kg" change={compare ? delta(r.fatMassKg, p?.fatMassKg) : undefined} better="down" />
        <Metric label="Relação cintura-quadril" value={r.waistHipRatio} unit="" digits={2}
          hint={r.waistHipRiskElevated == null ? null : r.waistHipRiskElevated ? "Risco elevado (OMS)" : "Dentro da referência (OMS)"} />
      </dl>

      <div className="gp-tr-meta-row" style={{ marginTop: 14, marginBottom: 0 }}>
        {r.parqPositive != null && (
          <span className="gp-tr-flag" data-tone={r.parqPositive ? "warning" : "ok"}>
            {r.parqPositive ? "PAR-Q com resposta “sim”: recomenda-se liberação médica" : "PAR-Q sem restrições"}
          </span>
        )}
        {current.systolicPressure != null && (
          <span className="gp-tr-flag">PA {current.systolicPressure}/{current.diastolicPressure} mmHg</span>
        )}
        {current.restingHeartRate != null && <span className="gp-tr-flag">FC repouso {current.restingHeartRate} bpm</span>}
      </div>

      <details className="gp-tr-details">
        <summary>Ver medidas e anamnese</summary>
        {current.objective && <><p className="gp-tr-subtitle">Objetivo</p><p className="gp-tr-note">{current.objective}</p></>}
        <p className="gp-tr-subtitle">Antropometria</p>
        <dl className="gp-tr-kv">
          <div><dt>Altura</dt><dd>{formatNumber(current.heightCm)} cm</dd></div>
          <div><dt>Peso</dt><dd>{formatNumber(current.weightKg)} kg</dd></div>
          {r.skinfoldSum != null && <div><dt>Soma das dobras</dt><dd>{formatNumber(r.skinfoldSum)} mm</dd></div>}
          {r.bodyDensity != null && <div><dt>Densidade corporal</dt><dd>{formatNumber(r.bodyDensity, 4)} g/ml</dd></div>}
        </dl>
        {circumferences.length > 0 && <>
          <p className="gp-tr-subtitle">Perímetros (cm)</p>
          <dl className="gp-tr-kv">
            {circumferences.map((field) => (
              <div key={field.key}>
                <dt>{field.label}</dt>
                <dd>
                  {formatNumber(current.circumferences?.[field.key])}
                  {compare && <Delta value={delta(current.circumferences?.[field.key], previous!.circumferences?.[field.key])} unit="" />}
                </dd>
              </div>
            ))}
          </dl>
        </>}
        {skinfolds.length > 0 && <>
          <p className="gp-tr-subtitle">Dobras cutâneas (mm)</p>
          <dl className="gp-tr-kv">
            {skinfolds.map((field) => <div key={field.key}><dt>{field.label}</dt><dd>{formatNumber(current.skinfolds?.[field.key])}</dd></div>)}
          </dl>
        </>}
        {parqYes.length > 0 && <>
          <p className="gp-tr-subtitle">PAR-Q: respostas “sim”</p>
          <ul className="gp-tr-note" style={{ paddingLeft: 18, margin: 0 }}>
            {parqYes.map((index) => <li key={index}>{PARQ_QUESTIONS[index]}</li>)}
          </ul>
        </>}
        {current.healthNotes && <><p className="gp-tr-subtitle">Histórico de saúde</p><p className="gp-tr-note">{current.healthNotes}</p></>}
        {current.notes && <><p className="gp-tr-subtitle">Observações do avaliador</p><p className="gp-tr-note">{current.notes}</p></>}
      </details>

      {assessments.length >= 2 && (() => {
        const latest = assessments[0];
        const first = assessments[assessments.length - 1];
        type Item = { label: string; value: number | null; unit: string; better?: "up" | "down" };
        const all: Item[] = [
          { label: "Peso", value: delta(latest.weightKg, first.weightKg), unit: " kg" },
          { label: "IMC", value: delta(latest.results.bmi, first.results.bmi), unit: "", better: "down" },
          { label: "Gordura", value: delta(latest.results.bodyFatPercent, first.results.bodyFatPercent), unit: " p.p.", better: "down" },
          { label: "Massa magra", value: delta(latest.results.leanMassKg, first.results.leanMassKg), unit: " kg", better: "up" },
          { label: "Cintura", value: delta(latest.circumferences?.waist, first.circumferences?.waist), unit: " cm", better: "down" },
        ];
        const items = all.filter((item) => item.value != null);
        return (
          <section className="gp-tr-evolution" aria-label="Evolução desde a primeira avaliação">
            <p className="gp-tr-subtitle" style={{ margin: 0 }}>
              Evolução desde a primeira avaliação ({formatDateBr(first.assessmentDate)} → {formatDateBr(latest.assessmentDate)}, {assessments.length} avaliações)
            </p>
            {items.length === 0 ? (
              <p className="gp-tr-note">As avaliações não têm medidas em comum para comparar.</p>
            ) : (
              <ul>
                {items.map((item) => (
                  <li key={item.label}>
                    <span>{item.label}</span>
                    {item.value === 0
                      ? <span className="gp-tr-delta" style={{ marginLeft: 0 }}>sem alteração</span>
                      : <Delta value={item.value} unit={item.unit} better={item.better} />}
                  </li>
                ))}
              </ul>
            )}
          </section>
        );
      })()}

      <p className="gp-tr-subtitle" style={{ marginTop: 18 }}>Histórico de avaliações</p>
      <div className="gp-tr-table-wrap">
        <table className="gp-tr-table gp-tr-table-stack">
          <caption className="sr-only">Avaliações físicas registradas, da mais recente para a mais antiga</caption>
          <thead>
            <tr>
              <th scope="col">Data</th>
              <th scope="col" className="gp-tr-num">Peso</th>
              <th scope="col" className="gp-tr-num">IMC</th>
              <th scope="col" className="gp-tr-num">% gordura</th>
              <th scope="col" className="gp-tr-num">Massa magra</th>
              {onDelete && <th scope="col"><span className="sr-only">Ações</span></th>}
            </tr>
          </thead>
          <tbody>
            {assessments.map((item, index) => (
              <tr key={item.id} data-selected={index === selectedIndex || undefined}>
                <td data-label="Data">
                  <button type="button" className="gp-tr-row-btn" aria-pressed={index === selectedIndex} onClick={() => setSelectedId(item.id)}>
                    {formatDateBr(item.assessmentDate)}
                  </button>
                </td>
                <td data-label="Peso" className="gp-tr-num">{formatNumber(item.weightKg)} kg</td>
                <td data-label="IMC" className="gp-tr-num">{formatNumber(item.results.bmi)}</td>
                <td data-label="% gordura" className="gp-tr-num">{item.results.bodyFatPercent == null ? "—" : `${formatNumber(item.results.bodyFatPercent)}%`}</td>
                <td data-label="Massa magra" className="gp-tr-num">{item.results.leanMassKg == null ? "—" : `${formatNumber(item.results.leanMassKg)} kg`}</td>
                {onDelete && (
                  <td data-label="Ações" className="gp-tr-num">
                    <button type="button" className="btn btn-ghost btn-sm" style={{ color: "var(--error)" }} disabled={deletingId === item.id}
                      onClick={() => onDelete(item)} aria-label={`Excluir avaliação de ${formatDateBr(item.assessmentDate)}`}>
                      {deletingId === item.id ? "Excluindo…" : "Excluir"}
                    </button>
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
