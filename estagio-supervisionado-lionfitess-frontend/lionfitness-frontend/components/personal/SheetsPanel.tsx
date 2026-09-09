"use client";

import React, { useState } from "react";
import { Plus, Download, CalendarDays, FileText, Dumbbell, ArrowRight, Loader2, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { StudentViewModel, WorkoutSheetViewModel, WorkoutExerciseViewModel, NewSheetFormData } from "./types";
import { formatCpf } from "./formatters";
import { cn } from "@/lib/utils";

interface SheetsPanelProps {
  student: StudentViewModel;
  sheets: WorkoutSheetViewModel[];
  selectedSheetId?: string;
  exercises?: WorkoutExerciseViewModel[];
  loading: boolean;
  creatingSheet: boolean;
  error?: string;
  successMessage?: string;
  onSelectSheet: (sheetId: string) => void;
  onCreateSheet: (data: NewSheetFormData) => Promise<boolean>;
  onGoToBuilder: () => void;
  onExportPdf: () => void;
  pdfLoading?: boolean;
}

const WEEK_DAY_OPTIONS = [
  { value: "MONDAY", label: "Segunda-feira" },
  { value: "TUESDAY", label: "Terça-feira" },
  { value: "WEDNESDAY", label: "Quarta-feira" },
  { value: "THURSDAY", label: "Quinta-feira" },
  { value: "FRIDAY", label: "Sexta-feira" },
  { value: "SATURDAY", label: "Sábado" },
  { value: "SUNDAY", label: "Domingo" },
];

export function SheetsPanel({
  student,
  sheets,
  selectedSheetId,
  exercises = [],
  loading,
  creatingSheet,
  error,
  successMessage,
  onSelectSheet,
  onCreateSheet,
  onGoToBuilder,
  onExportPdf,
  pdfLoading = false,
}: SheetsPanelProps) {
  const [openModal, setOpenModal] = useState(false);
  const [sheetTitle, setSheetTitle] = useState("Treino A");
  const [sheetWeekDay, setSheetWeekDay] = useState("MONDAY");

  // Identificar ficha atualmente selecionada ou ativa
  const currentSheet = React.useMemo(() => {
    if (selectedSheetId) {
      const found = sheets.find((s) => s.id === selectedSheetId);
      if (found) return found;
    }
    const active = sheets.find((s) => s.active);
    return active || sheets[0] || null;
  }, [sheets, selectedSheetId]);

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!sheetTitle.trim() || creatingSheet) return;
    const created = await onCreateSheet({
      title: sheetTitle.trim(),
      weekDay: sheetWeekDay,
    });
    if (!created) return;

    setOpenModal(false);
    setSheetTitle("Treino A");
    setSheetWeekDay("MONDAY");
  };

  return (
    <section className="space-y-5 animate-slide-in">
      {/* Student Banner Bar */}
      <div className="surface-card flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:justify-between">
        <div className="space-y-1">
          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Aluno
          </p>
          <h2 className="text-xl font-bold tracking-tight text-foreground">{student.name}</h2>
          <p className="text-xs text-muted-foreground font-medium">
            CPF: {formatCpf(student.cpf)} · Situação: <span className="font-semibold text-foreground">{student.status}</span>
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          {/* Botão Exportar PDF */}
          <Button
            variant="outline"
            onClick={onExportPdf}
            disabled={pdfLoading || sheets.length === 0}
            className="h-10 rounded-lg border-border hover:bg-muted text-foreground font-semibold text-xs gap-2"
          >
            {pdfLoading ? (
              <Loader2 className="size-4 animate-spin text-primary" />
            ) : (
              <Download className="size-4 text-primary" />
            )}
            Exportar PDF
          </Button>

          {/* Botão Nova Ficha */}
          <Button
            onClick={() => setOpenModal(true)}
            className="h-10 rounded-lg bg-primary hover:bg-primary-strong text-primary-foreground font-semibold text-xs shadow-brand gap-2"
          >
            <Plus className="size-4" /> Nova Ficha
          </Button>
        </div>
      </div>

      {/* Messages */}
      {error && (
        <div className="rounded-xl border border-destructive/20 bg-destructive/10 p-4 text-sm text-destructive font-medium">
          {error}
        </div>
      )}
      {successMessage && (
        <div className="rounded-xl border border-success/20 bg-success/10 p-4 text-sm text-success font-medium flex items-center gap-2">
          <CheckCircle2 className="size-4 text-success" />
          {successMessage}
        </div>
      )}

      {/* Main Content */}
      {loading ? (
        <div className="surface-card flex flex-col items-center justify-center p-16 text-center text-muted-foreground">
          <Loader2 className="size-8 animate-spin text-primary mb-2" />
          <p className="text-sm font-semibold">Carregando fichas de treino...</p>
        </div>
      ) : (
        <div className="grid gap-5 lg:grid-cols-[1.4fr_1fr]">
          {/* Left Card: Selected / Active Sheet Details */}
          <div className="surface-card animate-rise p-5 flex flex-col justify-between">
            {currentSheet ? (
              <div className="space-y-5">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                      Ficha atual
                    </p>
                    <h3 className="mt-1 text-lg font-semibold text-foreground tracking-tight">
                      {currentSheet.title}
                    </h3>
                  </div>
                  <Badge
                    variant={currentSheet.active ? "success" : "outline"}
                    className={cn(
                      "rounded-full text-xs font-medium px-2.5 py-0.5",
                      currentSheet.active && "border-success/25 bg-success/12 text-success",
                    )}
                  >
                    {currentSheet.active ? "Ativa" : "Inativa"}
                  </Badge>
                </div>

                {/* Metrics Grid */}
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                  <div className="rounded-lg border border-border bg-muted/40 p-3">
                    <CalendarDays className="size-4 text-primary" />
                    <p className="mt-2 text-xs text-muted-foreground font-medium">Dia da semana</p>
                    <p className="text-sm font-semibold text-foreground mt-0.5">
                      {currentSheet.weekDayLabel || currentSheet.weekDay || "—"}
                    </p>
                  </div>

                  <div className="rounded-lg border border-border bg-muted/40 p-3">
                    <FileText className="size-4 text-primary" />
                    <p className="mt-2 text-xs text-muted-foreground font-medium">Criada em</p>
                    <p className="text-sm font-semibold text-foreground mt-0.5">
                      {currentSheet.createdAtFormatted || "—"}
                    </p>
                  </div>

                  <div className="rounded-lg border border-border bg-muted/40 p-3 col-span-2 sm:col-span-1">
                    <CheckCircle2 className="size-4 text-primary" />
                    <p className="mt-2 text-xs text-muted-foreground font-medium">Exercícios</p>
                    <p className="text-sm font-semibold text-foreground mt-0.5">
                      {exercises.length}
                    </p>
                  </div>
                </div>

                {/* Exercícios Prescritos na Ficha */}
                <div className="space-y-3">
                  <div className="rounded-lg border border-border p-4 transition-colors duration-200 hover:border-primary/40">
                    <div className="flex items-center justify-between">
                      <p className="font-semibold text-sm text-foreground">
                        Exercícios Prescritos <span className="text-muted-foreground font-normal">· {exercises.length}</span>
                      </p>
                    </div>
                    {exercises.length > 0 ? (
                      <ul className="mt-3 flex flex-wrap gap-2">
                        {exercises.map((e) => (
                          <li
                            key={e.id}
                            className="rounded-md bg-muted px-2.5 py-1.5 text-xs text-muted-foreground font-medium flex items-center gap-1.5"
                          >
                            <span className="font-semibold text-foreground">{e.exerciseName}</span>
                            <span>·</span>
                            <span>{e.sets}×{e.reps}</span>
                            {e.muscle && (
                              <>
                                <span>·</span>
                                <span className="text-[11px] text-muted-foreground/80">{e.muscle}</span>
                              </>
                            )}
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <p className="mt-2 text-xs text-muted-foreground">
                        Esta ficha ainda não possui exercícios.
                      </p>
                    )}
                  </div>
                </div>

                {/* Direct Action to Builder */}
                <div className="pt-2">
                  <Button
                    onClick={onGoToBuilder}
                    className="w-full h-11 rounded-lg bg-primary hover:bg-primary-strong text-primary-foreground font-semibold text-xs shadow-brand flex items-center justify-center gap-2"
                  >
                    <Dumbbell className="size-4" />
                    Montar / Editar Exercícios desta Ficha
                    <ArrowRight className="size-4 ml-1" />
                  </Button>
                </div>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-16 text-center space-y-3">
                <FileText className="size-10 text-muted-foreground/50" />
                <p className="font-semibold text-base text-foreground">Nenhuma ficha cadastrada</p>
                <p className="text-xs text-muted-foreground max-w-sm">
                  Este aluno ainda não possui uma ficha de treino. Clique em &quot;Nova Ficha&quot; para iniciar a prescrição.
                </p>
              </div>
            )}
          </div>

          {/* Right Card: Sheets History */}
          <div className="surface-card animate-rise p-5">
            <div className="flex items-center justify-between mb-4">
              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Histórico de fichas
              </p>
              <span className="text-xs text-muted-foreground font-medium">({sheets.length})</span>
            </div>

            {sheets.length > 0 ? (
              <div className="space-y-3 max-h-[480px] overflow-y-auto pr-1">
                {sheets.map((s) => {
                  const isSelected = s.id === currentSheet?.id;

                  return (
                    <div
                      key={s.id}
                      onClick={() => onSelectSheet(s.id)}
                      className={cn(
                        "row-raise rounded-lg border p-3 transition-all cursor-pointer flex items-center justify-between gap-3",
                        isSelected
                          ? "border-primary/50 bg-primary-soft/30 shadow-sm"
                          : "border-border bg-card hover:border-primary/30",
                      )}
                    >
                      <div className="min-w-0 flex-1">
                        <p className={cn("text-sm font-semibold truncate", isSelected ? "text-primary" : "text-foreground")}>
                          {s.title}
                        </p>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          {s.weekDayLabel || s.weekDay ? `${s.weekDayLabel || s.weekDay} · ` : ""}criada em {s.createdAtFormatted}
                        </p>
                      </div>

                      <Badge
                        variant={s.active ? "success" : "outline"}
                        className={cn(
                          "text-[11px] shrink-0 font-medium rounded-full",
                          s.active && "border-success/25 bg-success/12 text-success",
                        )}
                      >
                        {s.active ? "Ativa" : "Inativa"}
                      </Badge>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="py-10 text-center text-xs text-muted-foreground">
                Histórico vazio para este aluno.
              </div>
            )}
          </div>
        </div>
      )}

      {/* Modal: Nova Ficha */}
      <Dialog open={openModal} onOpenChange={setOpenModal}>
        <DialogContent className="sm:max-w-md" preventClose={creatingSheet}>
          <form onSubmit={handleFormSubmit}>
            <DialogHeader>
              <DialogTitle className="text-lg font-bold">Criar Nova Ficha</DialogTitle>
              <DialogDescription className="text-xs">
                Preencha os dados da ficha de treino para o aluno {student.name}.
              </DialogDescription>
            </DialogHeader>

            <div className="grid gap-4 py-4">
              <div className="space-y-1.5">
                <Label htmlFor="sheet-title" className="text-xs font-semibold">
                  Título da Ficha
                </Label>
                <Input
                  id="sheet-title"
                  value={sheetTitle}
                  onChange={(e) => setSheetTitle(e.target.value)}
                  placeholder="Ex: Treino A - Peito e Tríceps"
                  className="h-10 rounded-lg text-sm"
                  required
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="sheet-weekday" className="text-xs font-semibold">
                  Dia da Semana
                </Label>
                <Select value={sheetWeekDay} onValueChange={setSheetWeekDay}>
                  <SelectTrigger id="sheet-weekday" className="h-10 rounded-lg text-sm">
                    <SelectValue placeholder="Selecione o dia" />
                  </SelectTrigger>
                  <SelectContent>
                    {WEEK_DAY_OPTIONS.map((opt) => (
                      <SelectItem key={opt.value} value={opt.value} className="text-sm">
                        {opt.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <DialogFooter>
              <Button
                type="button"
                 variant="outline"
                 onClick={() => setOpenModal(false)}
                 disabled={creatingSheet}
                className="h-9 rounded-lg text-xs"
              >
                Cancelar
              </Button>
              <Button
                type="submit"
                disabled={creatingSheet || !sheetTitle.trim()}
                className="h-9 rounded-lg bg-primary hover:bg-primary-strong text-primary-foreground text-xs shadow-brand"
              >
                {creatingSheet ? <Loader2 className="size-4 animate-spin" /> : "Criar Ficha"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </section>
  );
}
