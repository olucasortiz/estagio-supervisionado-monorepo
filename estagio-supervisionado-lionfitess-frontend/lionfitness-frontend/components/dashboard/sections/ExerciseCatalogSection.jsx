"use client";

import { useEffect, useRef, useState } from "react";
import { searchExerciseCatalog, updateExerciseCatalogStatus } from "../../../services/api";
import PageHeader from "../../ui/PageHeader";
import DataTable from "../../ui/DataTable";
import Modal from "../../ui/Modal";
import StatusBadge from "../../ui/StatusBadge";

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
    <section className="animate-fade-in space-y-4">
      <PageHeader title="Catálogo de Exercícios" subtitle="Consulte a biblioteca e gerencie a disponibilidade dos exercícios autorizados." />
      <form onSubmit={search} className="card card-md space-y-4">
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {[["name", "Nome"], ["category", "Categoria"], ["muscle", "Músculo"], ["equipment", "Equipamento"]].map(([field, label]) => (
            <div className="form-field" key={field}>
              <label className="label" htmlFor={`catalog-${field}`}>{label}</label>
              <input id={`catalog-${field}`} className="input" value={filters[field]} onChange={(event) => setFilters((current) => ({ ...current, [field]: event.target.value }))} />
            </div>
          ))}
        </div>
        <div className="flex flex-wrap items-end gap-3">
          <div className="form-field">
            <label className="label" htmlFor="catalog-status">Situação</label>
            <select id="catalog-status" className="select" value={status} onChange={(event) => setStatus(event.target.value)}>
              <option value="all">Ativos e inativos autorizados</option>
              <option value="active">Ativos</option>
              <option value="inactive">Inativos</option>
            </select>
          </div>
          <button className="btn btn-primary" type="submit" disabled={loading || saving}>{loading ? "Buscando..." : "Buscar"}</button>
        </div>
      </form>
      {error && !pending && <div className="alert alert-error" role="alert">{error}</div>}
      {feedback && <div className="alert alert-success" role="status">{feedback}</div>}
      <div className="card card-md">
        <DataTable data={visible} loading={loading} searchable={false} emptyTitle="Nenhum exercício encontrado" columns={[
          { key: "name", label: "Nome" },
          { key: "category", label: "Categoria" },
          { key: "muscle", label: "Músculo" },
          { key: "equipment", label: "Equipamento", render: (exercise) => exercise.equipment || "—" },
          { key: "isCustom", label: "Origem", render: (exercise) => exercise.isCustom ? "Personalizado" : "Padrão" },
          { key: "isActive", label: "Situação", render: (exercise) => <StatusBadge status={exercise.isActive ? "Ativo" : "Inativo"} /> },
        ]} actions={(exercise) => exercise.canManage ? (
          <button type="button" className="btn btn-outline btn-sm" disabled={saving || loading} onClick={() => { setError(""); setPending(exercise); }}>
            {exercise.isActive ? "Inativar" : "Ativar"}
          </button>
        ) : <span className="text-xs text-muted-foreground">Somente consulta</span>} />
      </div>
      <Modal open={Boolean(pending)} onClose={() => { if (!saving) { setPending(null); setError(""); } }} preventClose={saving}
        title={pending?.isActive ? "Inativar exercício" : "Ativar exercício"} footer={
          <>
            <button type="button" className="btn btn-ghost" disabled={saving} onClick={() => { setPending(null); setError(""); }}>Cancelar</button>
            <button type="button" className="btn btn-primary" disabled={saving} onClick={confirmStatus}>{saving ? "Salvando..." : "Confirmar"}</button>
          </>
        }>
        <p>Confirmar {pending?.isActive ? "inativação" : "ativação"} de <strong>{pending?.name}</strong>?</p>
        <p className="mt-2 text-sm text-muted-foreground">A disponibilidade para novas prescrições será atualizada. As fichas já salvas serão preservadas.</p>
        {error && <div className="alert alert-error mt-3" role="alert">{error}</div>}
      </Modal>
    </section>
  );
}
