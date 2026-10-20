"use client";

import React, { useMemo, useState } from "react";
import { Search, ChevronRight, Users, MessageSquare } from "lucide-react";
import { StudentViewModel, StudentStatus } from "./types";
import { formatCpf } from "./formatters";

interface StudentsPanelProps {
  students: StudentViewModel[];
  loading: boolean;
  error?: string;
  onManage: (student: StudentViewModel) => void;
  selectedStudentId?: string;
  onRetry?: () => void;
}

type FilterOption = "todos" | StudentStatus;

const filterOptions: { key: FilterOption; label: string }[] = [
  { key: "todos", label: "Todos" },
  { key: "Ativo", label: "Ativos" },
  { key: "Inativo", label: "Inativos" },
];

export function StudentsPanel({
  students,
  loading,
  error,
  onManage,
  selectedStudentId,
  onRetry,
}: StudentsPanelProps) {
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<FilterOption>("todos");

  const filteredStudents = useMemo(() => {
    return students.filter((s) => {
      const matchesFilter = filter === "todos" || s.status === filter;
      const term = query.toLowerCase().trim();
      const matchesQuery =
        !term ||
        s.name.toLowerCase().includes(term) ||
        s.cpf.toLowerCase().includes(term);
      return matchesFilter && matchesQuery;
    });
  }, [students, query, filter]);

  return (
    <section className="gp-students" aria-labelledby="personal-students-title">
      <div className="gp-students-heading"><div><h2 id="personal-students-title">Meus alunos</h2><p>Encontre um aluno e continue a prescrição do treino.</p></div>
        {!loading && !error && <p className="gp-students-count" role="status">{filteredStudents.length} de {students.length} alunos</p>}
      </div>
      <div className="gp-students-toolbar">
        <div className="gp-students-search-field">
          <label htmlFor="personal-student-search">Buscar aluno</label>
          <div><Search size={18} aria-hidden="true" /><input id="personal-student-search" name="studentSearch" className="gp-students-search" autoComplete="off" type="search" value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Nome ou CPF…" /></div>
        </div>
        <fieldset className="gp-students-filters"><legend>Situação do aluno</legend><div>{filterOptions.map((f) => <button key={f.key} type="button" aria-pressed={filter === f.key} onClick={() => setFilter(f.key)}>{f.label}</button>)}</div></fieldset>
      </div>
      {error ? <div className="gp-personal-state"><p role="alert">{error}</p>{onRetry && <button type="button" className="gp-personal-button" onClick={onRetry}>Tentar novamente</button>}</div> : loading ? <div className="gp-personal-state" role="status"><span className="gp-personal-loading" aria-hidden="true" /><p>Carregando lista de alunos…</p></div> : filteredStudents.length === 0 ? <div className="gp-personal-state"><Users size={28} aria-hidden="true" /><h3>Nenhum aluno encontrado</h3><p>{query || filter !== "todos" ? "Ajuste a busca ou os filtros." : "Nenhum aluno está vinculado ao seu perfil no momento."}</p></div> : <div className="gp-students-table-wrapper">
        <table className="gp-students-table"><caption className="sr-only">Alunos vinculados ao personal e acesso às fichas</caption><thead><tr><th scope="col">Aluno</th><th scope="col">CPF</th><th scope="col">Situação</th><th scope="col">Ficha ativa</th><th scope="col">Treino</th></tr></thead>
          <tbody>{filteredStudents.map((s) => <tr key={s.id} data-selected={s.id === selectedStudentId || undefined}>
            <th scope="row"><div className="gp-student-identity"><span className="gp-personal-avatar" aria-hidden="true">{s.initials}</span><strong>{s.name}</strong></div></th>
            <td data-label="CPF">{formatCpf(s.cpf)}</td>
            <td data-label="Situação"><span className="gp-student-status" data-active={s.status === "Ativo"}>{s.status}</span></td>
            <td data-label="Ficha ativa">{s.hasActiveSheet ? "Ficha vigente" : "Sem ficha ativa"}</td>
            <td className="gp-student-action">
              <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
                <button type="button" className="gp-personal-button" onClick={() => onManage(s)} aria-label={`Gerenciar ficha de ${s.name}`}>
                  Gerenciar ficha<ChevronRight size={16} aria-hidden="true" />
                </button>
                <button
                  type="button"
                  className="gp-personal-button"
                  style={{ minWidth: "40px", padding: "8px 10px", background: "var(--muted)", color: "var(--foreground)", border: "1px solid var(--border)" }}
                  onClick={() => {
                    window.dispatchEvent(new CustomEvent("open-lion-chat", { detail: { memberId: s.id } }));
                  }}
                  aria-label={`Conversar com ${s.name}`}
                  title={`Conversar com ${s.name}`}
                >
                  <MessageSquare size={15} aria-hidden="true" />
                </button>
              </div>
            </td>
          </tr>)}</tbody>
        </table>
      </div>}
    </section>
  );
}
