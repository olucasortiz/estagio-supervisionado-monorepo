"use client";

import { useEffect, useRef, useState } from "react";
import { searchExerciseCatalog, updateExerciseCatalogStatus } from "../../../services/api";
import PageHeader from "../../ui/PageHeader";
import DataTable from "../../ui/DataTable";
import Modal from "../../ui/Modal";
import StatusBadge from "../../ui/StatusBadge";
import { Toast } from "../../ui/Toast";

const initialFilters = { name: "", category: "", muscle: "", equipment: "" };

export default function ExerciseCatalogSection() {
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
          {!loading && <dl className="gp-catalog-totals" aria-label="Resumo da consulta autorizada">
            <div><dt>Na consulta</dt><dd>{exercises.length}</dd></div>
            <div><dt>Ativos</dt><dd>{exercises.filter((exercise) => exercise.isActive).length}</dd></div>
            <div><dt>Gerenciáveis</dt><dd>{exercises.filter((exercise) => exercise.canManage).length}</dd></div>
          </dl>}
        </div>
        <DataTable data={visible} loading={loading} searchable={false} caption="Exercícios autorizados e disponibilidade" emptyTitle="Nenhum exercício encontrado" emptyDescription="Revise os filtros de busca e a situação selecionada." columns={[
          { key: "name", label: "Nome", sortValue: (exercise) => exercise.name, render: (exercise) => <strong className="gp-catalog-name">{exercise.name}</strong> },
          { key: "category", label: "Categoria" },
          { key: "muscle", label: "Músculo" },
          { key: "equipment", label: "Equipamento", render: (exercise) => exercise.equipment || "—" },
          { key: "isCustom", label: "Origem", render: (exercise) => exercise.isCustom ? "Personalizado" : "Padrão" },
          { key: "isActive", label: "Situação", render: (exercise) => <StatusBadge status={exercise.isActive ? "Ativo" : "Inativo"} /> },
        ]} actions={(exercise) => exercise.canManage ? (
          <button type="button" className="btn btn-outline btn-sm" aria-label={`${exercise.isActive ? "Inativar" : "Ativar"} ${exercise.name}`} disabled={saving || loading} onClick={() => { setError(""); setPending(exercise); }}>
            {exercise.isActive ? "Inativar" : "Ativar"}
          </button>
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
    </section>
  );
}
