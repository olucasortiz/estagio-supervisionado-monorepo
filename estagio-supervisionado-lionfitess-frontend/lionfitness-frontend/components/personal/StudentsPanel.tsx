"use client";

import React, { useMemo, useState } from "react";
import { Search, SlidersHorizontal, Dumbbell, ChevronRight, Users, Loader2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { StudentViewModel, StudentStatus } from "./types";
import { formatCpf } from "./formatters";
import { cn } from "@/lib/utils";

interface StudentsPanelProps {
  students: StudentViewModel[];
  loading: boolean;
  error?: string;
  onManage: (student: StudentViewModel) => void;
  selectedStudentId?: string;
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
    <section className="space-y-5">
      {/* Header bar: Search and Status Filters */}
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div className="relative w-full lg:max-w-sm">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Buscar por nome ou CPF"
            className="h-11 rounded-xl pl-9 bg-card"
          />
        </div>

        <div className="flex items-center gap-2 overflow-x-auto pb-1">
          <SlidersHorizontal className="size-4 shrink-0 text-muted-foreground" />
          {filterOptions.map((f) => {
            const isActive = filter === f.key;
            return (
              <button
                key={f.key}
                type="button"
                onClick={() => setFilter(f.key)}
                className={cn(
                  "shrink-0 rounded-full border px-3.5 py-1.5 text-sm font-medium transition-all duration-200 cursor-pointer",
                  isActive
                    ? "border-primary bg-primary text-primary-foreground shadow-brand"
                    : "border-border bg-card text-muted-foreground hover:border-primary/40 hover:text-foreground",
                )}
              >
                {f.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Error state */}
      {error && (
        <div className="rounded-xl border border-destructive/20 bg-destructive/10 p-4 text-sm text-destructive font-medium">
          {error}
        </div>
      )}

      {/* Loading state */}
      {loading ? (
        <div className="surface-card flex flex-col items-center justify-center p-16 text-center text-muted-foreground">
          <Loader2 className="size-8 animate-spin text-primary mb-2" />
          <p className="text-sm font-semibold">Carregando lista de alunos...</p>
        </div>
      ) : (
        /* Students Table Card */
        <div className="surface-card overflow-hidden">
          {/* Table Header (Desktop) */}
          <div className="hidden grid-cols-[2.2fr_1.1fr_0.9fr_1.6fr_auto] gap-4 border-b border-border bg-muted/50 px-5 py-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground lg:grid">
            <span>Aluno</span>
            <span>CPF</span>
            <span>Status</span>
            <span>Ficha ativa</span>
            <span className="text-right">Treino</span>
          </div>

          {/* Table Body */}
          <div key={filter + query} className="divide-y divide-border">
            {filteredStudents.map((s, i) => {
              const isSelected = s.id === selectedStudentId;

              return (
                <div
                  key={s.id}
                  style={{ animationDelay: `${i * 40}ms` }}
                  className={cn(
                    "animate-rise row-raise grid grid-cols-1 gap-4 bg-card px-5 py-4 hover:bg-primary-soft/40 lg:grid-cols-[2.2fr_1.1fr_0.9fr_1.6fr_auto] lg:items-center",
                    isSelected && "border-l-4 border-l-primary bg-primary-soft/30",
                  )}
                >
                  {/* Name + Avatar */}
                  <div className="flex items-center gap-3">
                    <div className="flex size-10 shrink-0 items-center justify-center rounded-full border border-border bg-ink text-sm font-semibold text-background">
                      {s.initials}
                    </div>
                    <div className="min-w-0">
                      <p className="truncate font-semibold text-foreground text-sm">{s.name}</p>
                      <p className="text-xs text-muted-foreground lg:hidden">CPF: {formatCpf(s.cpf)}</p>
                    </div>
                  </div>

                  {/* CPF (Desktop) */}
                  <span className="hidden text-sm text-muted-foreground tabular-nums lg:inline">
                    {formatCpf(s.cpf)}
                  </span>

                  {/* Status Badge */}
                  <div>
                    <span
                      className={cn(
                        "inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium",
                        s.status === "Ativo"
                          ? "border-success/25 bg-success/12 text-success"
                          : "border-border bg-muted text-muted-foreground",
                      )}
                    >
                      {s.status}
                    </span>
                  </div>

                  {/* Active Sheet Indicator */}
                  <div className="text-sm">
                    {s.hasActiveSheet ? (
                      <span className="inline-flex items-center gap-1.5 text-foreground text-sm font-medium">
                        <Dumbbell className="size-3.5 text-primary shrink-0" />
                        Ficha Vigente
                      </span>
                    ) : (
                      <span className="text-sm text-muted-foreground">Sem ficha ativa</span>
                    )}
                  </div>

                  {/* Manage Button */}
                  <div className="lg:text-right">
                    <Button
                      size="sm"
                      onClick={() => onManage(s)}
                      className={cn(
                        "group h-9 rounded-lg bg-primary px-3.5 text-xs font-medium text-primary-foreground shadow-brand transition-all duration-200 hover:bg-primary-strong",
                        isSelected && "bg-foreground text-background hover:bg-foreground/90",
                      )}
                    >
                      Gerenciar ficha
                      <ChevronRight className="size-4 transition-transform duration-200 group-hover:translate-x-0.5" />
                    </Button>
                  </div>
                </div>
              );
            })}

            {/* Empty search or no students */}
            {filteredStudents.length === 0 && (
              <div className="animate-rise flex flex-col items-center gap-2 px-5 py-16 text-center">
                <Users className="size-8 text-muted-foreground" />
                <p className="font-medium text-foreground">Nenhum aluno encontrado</p>
                <p className="text-sm text-muted-foreground">
                  {query || filter !== "todos"
                    ? "Ajuste a busca ou os filtros."
                    : "Nenhum aluno está vinculado ao seu perfil no momento."}
                </p>
              </div>
            )}
          </div>
        </div>
      )}
    </section>
  );
}
