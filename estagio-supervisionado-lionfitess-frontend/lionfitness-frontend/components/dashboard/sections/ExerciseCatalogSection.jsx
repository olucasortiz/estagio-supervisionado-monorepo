"use client";

import { useEffect, useRef, useState } from "react";
import { createExerciseCatalog, searchExerciseCatalog, updateExerciseCatalog, updateExerciseCatalogStatus } from "../../../services/api";
import PageHeader from "../../ui/PageHeader";
import DataTable from "../../ui/DataTable";
import Modal from "../../ui/Modal";
import StatusBadge from "../../ui/StatusBadge";
import { Toast } from "../../ui/Toast";

const initialFilters = { name: "", category: "", muscle: "", equipment: "" };
const emptyExercise = { name: "", category: "", muscle: "", equipment: "", instructions: "" };
const EXERCISE_FIELDS = [
  ["name", "Nome", 150, true],
  ["category", "Categoria", 80, true],
  ["muscle", "Músculo", 80, true],
  ["equipment", "Equipamento / aparelho", 100, false],
];

export default function ExerciseCatalogSection() {
  // Cadastro e edição: o ADMIN cria exercícios padrão e edita qualquer um;
  // o personal cria personalizados e edita só os seus (o backend decide pelo perfil).
  const [editor, setEditor] = useState(null);
  const [editorError, setEditorError] = useState("");
  const [exercises, setExercises] = useState([]);
  const [filters, setFilters] = useState(initialFilters);
  const [status, setStatus] = useState("all");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [pending, setPending] = useState(null);
  const [error, setError] = useState("");
  const [feedback, setFeedback] = useState("");
  const savingRef = useRef(false);
  const requestRef = useRef(0);
  const mountedRef = useRef(false);

  useEffect(() => {
    mountedRef.current = true;
    const requestId = ++requestRef.current;
    searchExerciseCatalog({ includeInactive: true }).then((result) => {
      if (mountedRef.current && requestId === requestRef.current) setExercises(Array.isArray(result) ? result : []);
    }).catch((err) => {
      if (mountedRef.current && requestId === requestRef.current) setError(err.message || "Não foi possível carregar o catálogo.");
    }).finally(() => {
      if (mountedRef.current && requestId === requestRef.current) setLoading(false);
    });
    return () => { mountedRef.current = false; };
  }, []);

  async function search(event) {
    event.preventDefault();
    if (savingRef.current || loading) return;
    const requestId = ++requestRef.current;
    setLoading(true);
    setError("");
    setFeedback("");
    try {
      const result = await searchExerciseCatalog({ ...filters, includeInactive: true });
      if (mountedRef.current && requestId === requestRef.current) setExercises(Array.isArray(result) ? result : []);
    } catch (err) {
      if (mountedRef.current && requestId === requestRef.current) setError(err.message || "Não foi possível buscar exercícios.");
    } finally {
      if (mountedRef.current && requestId === requestRef.current) setLoading(false);
    }
  }

  async function confirmStatus() {
    if (!pending || savingRef.current) return;
    savingRef.current = true;
    setSaving(true);
    setError("");
    setFeedback("");
    try {
      const updated = await updateExerciseCatalogStatus(pending.id, !pending.isActive);
      setExercises((current) => current.map((exercise) => exercise.id === updated.id ? updated : exercise));
      setFeedback(`Exercício "${updated.name}" ${updated.isActive ? "ativado" : "inativado"} com sucesso.`);
      setPending(null);
    } catch (err) {
      setError(err.message || "Não foi possível atualizar o exercício.");
    } finally {
      savingRef.current = false;
      setSaving(false);
    }
  }

  function openEditor(exercise) {
    setError("");
    setFeedback("");
    setEditorError("");
    setEditor(exercise
      ? { id: exercise.id, form: { name: exercise.name || "", category: exercise.category || "", muscle: exercise.muscle || "", equipment: exercise.equipment || "", instructions: exercise.instructions || "" } }
      : { id: null, form: { ...emptyExercise } });
  }

  async function saveEditor(event) {
    event.preventDefault();
    if (!editor || savingRef.current) return;
    const form = Object.fromEntries(Object.entries(editor.form).map(([key, value]) => [key, value.trim()]));
    if (!form.name || !form.category || !form.muscle || !form.instructions) {
      setEditorError("Preencha nome, categoria, músculo e instruções.");
      return;
    }
    savingRef.current = true;
    setSaving(true);
    setEditorError("");
    try {
      const payload = { ...form, equipment: form.equipment || null };
      const saved = editor.id ? await updateExerciseCatalog(editor.id, payload) : await createExerciseCatalog(payload);
      setExercises((current) => editor.id
        ? current.map((exercise) => exercise.id === saved.id ? saved : exercise)
        : [saved, ...current]);
      setFeedback(`Exercício "${saved.name}" ${editor.id ? "atualizado" : "cadastrado"} com sucesso.`);
      setEditor(null);
    } catch (err) {
      setEditorError(err.message || "Não foi possível salvar o exercício.");
    } finally {
      savingRef.current = false;
      setSaving(false);
    }
  }

  const visible = exercises.filter((exercise) => status === "all" || exercise.isActive === (status === "active"));

  return (
    <section className="gp-registry gp-catalog">
      <PageHeader title="Catálogo de Exercícios" breadcrumb="Cadastros / Catálogo" subtitle="Consulte a biblioteca e gerencie a disponibilidade dos exercícios autorizados." />
      <form onSubmit={search} className="card gp-registry-panel gp-catalog-filters" aria-label="Filtros do catálogo">
        <div className="gp-registry-panel-heading">
          <h2>Filtros de busca</h2>
          <p>Combine os campos para encontrar o exercício desejado.</p>
        </div>
        <div className="gp-catalog-fields">
          {[["name", "Nome"], ["category", "Categoria"], ["muscle", "Músculo"], ["equipment", "Equipamento"]].map(([field, label]) => (
            <div className="form-field" key={field}>
              <label className="label" htmlFor={`catalog-${field}`}>{label}</label>
              <input id={`catalog-${field}`} className="input" autoComplete="off" value={filters[field]} onChange={(event) => setFilters((current) => ({ ...current, [field]: event.target.value }))} />
            </div>
          ))}
        </div>
        <div className="gp-catalog-toolbar">
          <div className="form-field">
            <label className="label" htmlFor="catalog-status">Situação</label>
            <select id="catalog-status" className="select" value={status} onChange={(event) => setStatus(event.target.value)}>
              <option value="all">Ativos e inativos autorizados</option>
              <option value="active">Ativos</option>
              <option value="inactive">Inativos</option>
            </select>
          </div>
          <button className="btn btn-primary" type="submit" disabled={loading || saving}>{loading ? "Buscando…" : "Buscar exercícios"}</button>
        </div>
      </form>
      {error && !pending && <div className="alert alert-error" role="alert">{error}</div>}
      <Toast open={Boolean(feedback)} message={feedback} onClose={() => setFeedback("")} />
      <div className="card gp-registry-panel gp-catalog-library">
        <div className="gp-catalog-library-heading">
          <div className="gp-registry-panel-heading">
            <h2>Biblioteca de exercícios</h2>
            <p>As ações disponíveis respeitam sua permissão em cada exercício.</p>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 20, flexWrap: "wrap", justifyContent: "flex-end" }}>
          {!loading && <dl className="gp-catalog-totals" aria-label="Resumo da consulta autorizada">
            <div><dt>Na consulta</dt><dd>{exercises.length}</dd></div>
            <div><dt>Ativos</dt><dd>{exercises.filter((exercise) => exercise.isActive).length}</dd></div>
            <div><dt>Gerenciáveis</dt><dd>{exercises.filter((exercise) => exercise.canManage).length}</dd></div>
          </dl>}
          <button type="button" className="btn btn-primary btn-sm" disabled={saving} onClick={() => openEditor(null)}>Novo exercício</button>
          </div>
        </div>
        <DataTable data={visible} loading={loading} searchable={false} caption="Exercícios autorizados e disponibilidade" emptyTitle="Nenhum exercício encontrado" emptyDescription="Revise os filtros de busca e a situação selecionada." columns={[
          { key: "name", label: "Nome", sortValue: (exercise) => exercise.name, render: (exercise) => <strong className="gp-catalog-name">{exercise.name}</strong> },
          { key: "category", label: "Categoria" },
          { key: "muscle", label: "Músculo" },
          { key: "equipment", label: "Equipamento", render: (exercise) => exercise.equipment || "—" },
          { key: "isCustom", label: "Origem", render: (exercise) => exercise.isCustom ? "Personalizado" : "Padrão" },
          { key: "isActive", label: "Situação", render: (exercise) => <StatusBadge status={exercise.isActive ? "Ativo" : "Inativo"} /> },
        ]} actions={(exercise) => exercise.canManage ? (
          <span style={{ display: "inline-flex", gap: 6, flexWrap: "wrap", justifyContent: "flex-end" }}>
            <button type="button" className="btn btn-ghost btn-sm" aria-label={`Editar ${exercise.name}`} disabled={saving || loading} onClick={() => openEditor(exercise)}>
              Editar
            </button>
            <button type="button" className="btn btn-outline btn-sm" aria-label={`${exercise.isActive ? "Inativar" : "Ativar"} ${exercise.name}`} disabled={saving || loading} onClick={() => { setError(""); setPending(exercise); }}>
              {exercise.isActive ? "Inativar" : "Ativar"}
            </button>
          </span>
        ) : <span className="gp-catalog-readonly">Somente consulta</span>} />
      </div>
      <Modal open={Boolean(pending)} onClose={() => { if (!saving) { setPending(null); setError(""); } }} preventClose={saving}
        title={pending?.isActive ? "Inativar exercício" : "Ativar exercício"} footer={
          <>
            <button type="button" className="btn btn-ghost" disabled={saving} onClick={() => { setPending(null); setError(""); }}>Cancelar</button>
            <button type="button" className="btn btn-primary" disabled={saving} onClick={confirmStatus}>{saving ? "Salvando…" : pending?.isActive ? "Inativar exercício" : "Ativar exercício"}</button>
          </>
        }>
        <p>Confirmar {pending?.isActive ? "inativação" : "ativação"} de <strong className="gp-catalog-name">{pending?.name}</strong>?</p>
        <p className="mt-2 text-sm text-muted-foreground">A disponibilidade para novas prescrições será atualizada. As fichas já salvas serão preservadas.</p>
        {error && <div className="alert alert-error mt-3" role="alert">{error}</div>}
      </Modal>
      <Modal open={Boolean(editor)} onClose={() => { if (!saving) { setEditor(null); setEditorError(""); } }} preventClose={saving}
        title={editor?.id ? "Editar exercício" : "Novo exercício"} footer={
          <>
            <button type="button" className="btn btn-ghost" disabled={saving} onClick={() => { setEditor(null); setEditorError(""); }}>Cancelar</button>
            <button type="submit" form="catalog-exercise-form" className="btn btn-primary" disabled={saving}>{saving ? "Salvando…" : "Salvar exercício"}</button>
          </>
        }>
        {editor && (
          <form id="catalog-exercise-form" onSubmit={saveEditor} noValidate style={{ display: "grid", gap: 12 }}>
            {!editor.id && <p className="text-sm text-muted-foreground" style={{ margin: 0 }}>Exercícios criados pelo administrador entram no catálogo padrão; os criados por personal trainer ficam como personalizados dele.</p>}
            {EXERCISE_FIELDS.map(([field, label, maxLength, required]) => (
              <div className="form-field" key={field}>
                <label className="label" htmlFor={`exercise-${field}`}>{label}{required ? " *" : ""}</label>
                <input id={`exercise-${field}`} className="input" autoComplete="off" maxLength={maxLength} required={required}
                  value={editor.form[field]} onChange={(event) => setEditor((current) => ({ ...current, form: { ...current.form, [field]: event.target.value } }))} />
              </div>
            ))}
            <div className="form-field">
              <label className="label" htmlFor="exercise-instructions">Instruções *</label>
              <textarea id="exercise-instructions" className="input" rows={4} required style={{ height: "auto", minHeight: 96, paddingTop: 8, resize: "vertical" }}
                value={editor.form.instructions} onChange={(event) => setEditor((current) => ({ ...current, form: { ...current.form, instructions: event.target.value } }))} />
            </div>
            {editor.id && <p className="text-sm text-muted-foreground" style={{ margin: 0 }}>Fichas já montadas mantêm a cópia do exercício como estava; a alteração vale para novas prescrições.</p>}
            {editorError && <div className="alert alert-error" role="alert">{editorError}</div>}
          </form>
        )}
      </Modal>
    </section>
  );
}
