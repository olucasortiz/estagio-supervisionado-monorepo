"use client";

import React, { useMemo, useState } from "react";
import { createPhysicalAssessment } from "@/services/api";
import {
  BODY_FAT_METHODS,
  CIRCUMFERENCE_FIELDS,
  PARQ_QUESTIONS,
  SKINFOLD_FIELDS,
  formatNumber,
  requiredSkinfolds,
  type BodyFatMethod,
  type CircumferenceKey,
  type PhysicalAssessment,
  type SkinfoldKey,
} from "@/lib/training-records";
import "./training.css";

type Sex = "M" | "F" | "";

function todayIso(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
}

/** Aceita vírgula ou ponto; vazio vira null. */
function parseDecimal(value: string): number | null {
  const normalized = value.trim().replace(/\s/g, "").replace(",", ".");
  if (!normalized) return null;
  const number = Number(normalized);
  return Number.isFinite(number) ? number : Number.NaN;
}

function DecimalField({ id, label, value, onChange, unit, required, hint }: {
  id: string; label: string; value: string; onChange: (value: string) => void; unit: string;
  required?: boolean; hint?: string;
}) {
  return (
    <div className="form-field">
      <label className={`label${required ? " gp-tr-required" : ""}`} htmlFor={id}>{label} ({unit})</label>
      <input id={id} name={id} className="input" inputMode="decimal" autoComplete="off" value={value}
        onChange={(event) => onChange(event.target.value)} required={required} aria-describedby={hint ? `${id}-hint` : undefined} />
      {hint && <span id={`${id}-hint`} className="gp-tr-field-hint">{hint}</span>}
    </div>
  );
}

export function AssessmentForm({ memberId, memberName, onSaved, onCancel }: {
  memberId: string;
  memberName: string;
  onSaved: (assessment: PhysicalAssessment) => void;
  onCancel: () => void;
}) {
  const [assessmentDate, setAssessmentDate] = useState(todayIso());
  const [sex, setSex] = useState<Sex>("");
  const [objective, setObjective] = useState("");
  const [parq, setParq] = useState<(boolean | null)[]>(() => PARQ_QUESTIONS.map(() => null));
  const [parqApplied, setParqApplied] = useState(true);
  const [healthNotes, setHealthNotes] = useState("");
  const [heartRate, setHeartRate] = useState("");
  const [systolic, setSystolic] = useState("");
  const [diastolic, setDiastolic] = useState("");
  const [weight, setWeight] = useState("");
  const [height, setHeight] = useState("");
  const [circumferences, setCircumferences] = useState<Record<CircumferenceKey, string>>(
    () => Object.fromEntries(CIRCUMFERENCE_FIELDS.map((field) => [field.key, ""])) as Record<CircumferenceKey, string>);
  const [method, setMethod] = useState<BodyFatMethod>("NONE");
  const [skinfolds, setSkinfolds] = useState<Record<SkinfoldKey, string>>(
    () => Object.fromEntries(SKINFOLD_FIELDS.map((field) => [field.key, ""])) as Record<SkinfoldKey, string>);
  const [informedFat, setInformedFat] = useState("");
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  // PAR-Q sem nenhuma resposta conta como não aplicado; não é obrigatório.
  const parqStarted = parqApplied && parq.some((answer) => answer !== null);
  const requiredSites = requiredSkinfolds(method, sex);
  const visibleSkinfolds = method === "POLLOCK_3" && !sex ? [] : SKINFOLD_FIELDS.filter((field) => requiredSites.includes(field.key));

  const bmiPreview = useMemo(() => {
    const w = parseDecimal(weight);
    const h = parseDecimal(height);
    if (!w || !h || Number.isNaN(w) || Number.isNaN(h) || h < 100) return null;
    return w / ((h / 100) * (h / 100));
  }, [weight, height]);

  function validate(): string | null {
    if (!assessmentDate) return "Informe a data da avaliação.";
    if (!sex && (method === "POLLOCK_3" || method === "POLLOCK_7")) return "Informe o sexo do aluno: as equações de dobras cutâneas dependem dele.";
    if (assessmentDate > todayIso()) return "A data da avaliação não pode estar no futuro.";
    if (parqStarted && parq.some((answer) => answer === null)) return "O PAR-Q foi iniciado: responda as 7 perguntas ou marque que ele não foi aplicado.";
    const numbers = [weight, height, heartRate, systolic, diastolic, informedFat,
      ...Object.values(circumferences), ...visibleSkinfolds.map((field) => skinfolds[field.key])];
    if (numbers.some((value) => Number.isNaN(parseDecimal(value)))) return "Use apenas números nos campos de medida (ex.: 72,5).";
    if (parseDecimal(weight) == null || parseDecimal(height) == null) return "Peso e altura são obrigatórios.";
    if ((parseDecimal(systolic) == null) !== (parseDecimal(diastolic) == null)) return "Informe a pressão sistólica e a diastólica juntas.";
    if (requiredSites.some((key) => parseDecimal(skinfolds[key]) == null)) return "Preencha todas as dobras do protocolo escolhido.";
    if (method === "BIOIMPEDANCE" && parseDecimal(informedFat) == null) return "Informe o % de gordura medido na bioimpedância.";
    return null;
  }

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (saving) return;
    const problem = validate();
    if (problem) { setError(problem); return; }
    setError("");
    setSaving(true);
    const integer = (value: string) => { const n = parseDecimal(value); return n == null ? null : Math.round(n); };
    try {
      const saved = await createPhysicalAssessment({
        memberId,
        assessmentDate,
        sex: sex || null,
        objective: objective.trim() || null,
        parqAnswers: parqStarted ? parq : null,
        healthNotes: healthNotes.trim() || null,
        restingHeartRate: integer(heartRate),
        systolicPressure: integer(systolic),
        diastolicPressure: integer(diastolic),
        weightKg: parseDecimal(weight),
        heightCm: parseDecimal(height),
        circumferences: Object.fromEntries(CIRCUMFERENCE_FIELDS.map((field) => [field.key, parseDecimal(circumferences[field.key])])),
        bodyFatMethod: method,
        skinfolds: Object.fromEntries(SKINFOLD_FIELDS.map((field) => [field.key, requiredSites.includes(field.key) ? parseDecimal(skinfolds[field.key]) : null])),
        informedBodyFatPercent: method === "BIOIMPEDANCE" ? parseDecimal(informedFat) : null,
        notes: notes.trim() || null,
      });
      onSaved(saved as PhysicalAssessment);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Não foi possível salvar a avaliação física.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <form className="gp-tr-form" onSubmit={handleSubmit} noValidate aria-label={`Nova avaliação física de ${memberName}`}>
      <p className="gp-tr-field-hint" style={{ margin: 0, fontSize: 13 }}>
        Só a data, o peso e a altura são obrigatórios. Preencha o que foi medido; o restante pode ficar em branco.
      </p>
      <fieldset className="gp-tr-fieldset">
        <legend>Identificação</legend>
        <div className="gp-tr-fields">
          <div className="form-field">
            <label className="label gp-tr-required" htmlFor="pa-date">Data da avaliação</label>
            <input id="pa-date" type="date" className="input" value={assessmentDate} max={todayIso()} onChange={(event) => setAssessmentDate(event.target.value)} required />
          </div>
          <div className="form-field">
            <span className={`label${method === "POLLOCK_3" || method === "POLLOCK_7" ? " gp-tr-required" : ""}`} id="pa-sex-label">Sexo</span>
            <div className="gp-tr-toggle" role="group" aria-labelledby="pa-sex-label">
              <button type="button" aria-pressed={sex === "F"} onClick={() => setSex((current) => current === "F" ? "" : "F")}>Feminino</button>
              <button type="button" aria-pressed={sex === "M"} onClick={() => setSex((current) => current === "M" ? "" : "M")}>Masculino</button>
            </div>
            <span className="gp-tr-field-hint">Exigido só no protocolo de dobras.</span>
          </div>
          <div className="form-field form-field-full">
            <label className="label" htmlFor="pa-objective">Objetivo</label>
            <input id="pa-objective" className="input" maxLength={255} value={objective} onChange={(event) => setObjective(event.target.value)} placeholder="Ex.: hipertrofia, emagrecimento, condicionamento…" />
          </div>
        </div>
      </fieldset>

      <fieldset className="gp-tr-fieldset">
        <legend>Anamnese (PAR-Q)</legend>
        <p>Opcional. Questionário de prontidão para atividade física: qualquer “sim” indica que o aluno deve buscar liberação médica. Se começar a responder, responda as 7 perguntas.</p>
        <label style={{ display: "flex", gap: 8, alignItems: "center", fontSize: 13, marginBottom: 10 }}>
          <input type="checkbox" checked={!parqApplied} onChange={(event) => setParqApplied(!event.target.checked)} />
          PAR-Q não aplicado nesta avaliação
        </label>
        {parqApplied && (
          <ol className="gp-tr-parq">
            {PARQ_QUESTIONS.map((question, index) => (
              <li key={question}>
                <span id={`parq-${index}`}>{question}</span>
                <div className="gp-tr-toggle" role="group" aria-labelledby={`parq-${index}`}>
                  <button type="button" aria-pressed={parq[index] === true} onClick={() => setParq((current) => current.map((answer, i) => i === index ? true : answer))}>Sim</button>
                  <button type="button" aria-pressed={parq[index] === false} onClick={() => setParq((current) => current.map((answer, i) => i === index ? false : answer))}>Não</button>
                </div>
              </li>
            ))}
          </ol>
        )}
        <div className="form-field" style={{ marginTop: 12 }}>
          <label className="label" htmlFor="pa-health">Histórico de saúde</label>
          <textarea id="pa-health" className="input gp-tr-textarea" maxLength={2000} value={healthNotes} onChange={(event) => setHealthNotes(event.target.value)}
            placeholder="Lesões, cirurgias, doenças, medicamentos em uso, restrições…" />
        </div>
      </fieldset>

      <fieldset className="gp-tr-fieldset">
        <legend>Sinais vitais em repouso</legend>
        <div className="gp-tr-fields gp-tr-fields-3">
          <DecimalField id="pa-hr" label="Frequência cardíaca" unit="bpm" value={heartRate} onChange={setHeartRate} />
          <DecimalField id="pa-sys" label="Pressão sistólica" unit="mmHg" value={systolic} onChange={setSystolic} />
          <DecimalField id="pa-dia" label="Pressão diastólica" unit="mmHg" value={diastolic} onChange={setDiastolic} />
        </div>
      </fieldset>

      <fieldset className="gp-tr-fieldset">
        <legend>Antropometria</legend>
        <div className="gp-tr-fields">
          <DecimalField id="pa-weight" label="Peso" unit="kg" value={weight} onChange={setWeight} required />
          <DecimalField id="pa-height" label="Altura" unit="cm" value={height} onChange={setHeight} required
            hint={bmiPreview ? `IMC estimado: ${formatNumber(bmiPreview)}` : "Ex.: 172"} />
        </div>
        <p className="gp-tr-subtitle">Perímetros (opcional)</p>
        <div className="gp-tr-fields">
          {CIRCUMFERENCE_FIELDS.map((field) => (
            <DecimalField key={field.key} id={`pa-c-${field.key}`} label={field.label} unit="cm" value={circumferences[field.key]}
              onChange={(value) => setCircumferences((current) => ({ ...current, [field.key]: value }))} />
          ))}
        </div>
      </fieldset>

      <fieldset className="gp-tr-fieldset">
        <legend>Composição corporal</legend>
        <div className="form-field">
          <label className="label" htmlFor="pa-method">Método</label>
          <select id="pa-method" className="select" value={method} onChange={(event) => setMethod(event.target.value as BodyFatMethod)}>
            {BODY_FAT_METHODS.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}
          </select>
          <span className="gp-tr-field-hint">{BODY_FAT_METHODS.find((item) => item.value === method)?.hint}</span>
        </div>
        {(method === "POLLOCK_3" || method === "POLLOCK_7") && (
          visibleSkinfolds.length === 0
            ? <p className="gp-tr-field-hint" style={{ marginTop: 10 }}>Escolha o sexo para ver as dobras do protocolo de 3 dobras.</p>
            : <div className="gp-tr-fields" style={{ marginTop: 12 }}>
              {visibleSkinfolds.map((field) => (
                <DecimalField key={field.key} id={`pa-s-${field.key}`} label={field.label} unit="mm" required value={skinfolds[field.key]}
                  onChange={(value) => setSkinfolds((current) => ({ ...current, [field.key]: value }))} />
              ))}
            </div>
        )}
        {method === "BIOIMPEDANCE" && (
          <div className="gp-tr-fields" style={{ marginTop: 12 }}>
            <DecimalField id="pa-fat" label="Gordura corporal" unit="%" required value={informedFat} onChange={setInformedFat} />
          </div>
        )}
      </fieldset>

      <div className="form-field">
        <label className="label" htmlFor="pa-notes">Observações do avaliador</label>
        <textarea id="pa-notes" className="input gp-tr-textarea" maxLength={2000} value={notes} onChange={(event) => setNotes(event.target.value)} />
      </div>

      {error && <div className="alert alert-error" role="alert">{error}</div>}

      <div className="gp-tr-actions">
        <button type="button" className="btn btn-ghost" onClick={onCancel} disabled={saving}>Cancelar</button>
        <button type="submit" className="btn btn-primary" disabled={saving}>{saving ? "Salvando…" : "Salvar avaliação"}</button>
      </div>
    </form>
  );
}
