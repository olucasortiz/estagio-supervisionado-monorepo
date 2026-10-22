"use client";

import React, { useState } from "react";
import { Plus, Download, FileText, Dumbbell, ArrowRight, Loader2, Trash2, History } from "lucide-react";
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
import { StudentViewModel, WorkoutSheetViewModel, WorkoutExerciseViewModel, NewSheetFormData } from "./types";
import { formatCpf } from "./formatters";
import { cn } from "@/lib/utils";
import { getWorkoutSheetHistory } from "@/services/api";
import { Toast } from "@/components/ui/Toast";

type SheetHistoryEntry = {
  id: string;
  workoutSheetId: string;
  changeReason: string;
  createdAt: string;
  changedByUserId: string | null;
  changedByName: string | null;
  snapshot: {
    sheet: { title: string; weekDay: string; weekDayLabel: string; version: number; active: boolean };
    exercises: { id: string; exerciseName: string; muscle: string; exerciseType: string; equipment: string;
      difficulty: string | null; instructions: string | null; sets: number; reps: number; restSeconds: number; notes: string | null }[];
  } | null;
};

interface SheetsPanelProps {
  student: StudentViewModel;
  sheets: WorkoutSheetViewModel[];
  selectedSheetId?: string;
  exercises?: WorkoutExerciseViewModel[];
  loading: boolean;
  creatingSheet: boolean;
  deletingSheet: boolean;
  error?: string;
  successMessage?: string;
  onSelectSheet: (sheetId: string) => void;
  onCreateSheet: (data: NewSheetFormData) => Promise<boolean>;
  onDeleteSheet: (sheet: WorkoutSheetViewModel) => Promise<boolean>;
  onGoToBuilder: () => void;
  onEditSheet: (sheet: WorkoutSheetViewModel) => Promise<void>;
  editingLoading: boolean;
  onExportPdf: () => void;
  pdfLoading?: boolean;
  onClearSuccess?: () => void;
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
  deletingSheet,
  error,
  successMessage,
  onSelectSheet,
  onCreateSheet,
  onDeleteSheet,
  onGoToBuilder,
  onEditSheet,
  editingLoading,
  onExportPdf,
  pdfLoading = false,
  onClearSuccess,
}: SheetsPanelProps) {
  const [openModal, setOpenModal] = useState(false);
  const [deleteConfirmationOpen, setDeleteConfirmationOpen] = useState(false);
  const [sheetTitle, setSheetTitle] = useState("Treino A");
  const [sheetWeekDay, setSheetWeekDay] = useState("MONDAY");
  const [historyOpen, setHistoryOpen] = useState(false);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [historyError, setHistoryError] = useState("");
  const [historyEntries, setHistoryEntries] = useState<SheetHistoryEntry[]>([]);
  const [historySheetTitle, setHistorySheetTitle] = useState("");
  const [selectedHistoryId, setSelectedHistoryId] = useState("");
  const selectedHistory = historyEntries.find((entry) => entry.id === selectedHistoryId);

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

  const handleDeleteSheet = async () => {
    if (!currentSheet || deletingSheet) return;

    const deleted = await onDeleteSheet(currentSheet);
    if (deleted) setDeleteConfirmationOpen(false);
  };

  const openHistory = async () => {
    if (!currentSheet) return;
    setHistorySheetTitle(currentSheet.title);
    setHistoryEntries([]);
    setSelectedHistoryId("");
    setHistoryError("");
    setHistoryOpen(true);
    setHistoryLoading(true);
    try {
      const result = await getWorkoutSheetHistory(currentSheet.id);
      setHistoryEntries(Array.isArray(result) ? result : []);
    } catch (error) {
      setHistoryError(error instanceof Error ? error.message : "Não foi possível carregar o histórico.");
    } finally {
      setHistoryLoading(false);
    }
  };

  return (
    <section className="gp-workout gp-sheets">
      {/* Student Banner Bar */}
      <div className="surface-card gp-workout-banner">
        <div className="space-y-1">
          <p className="text-xs font-semibold  text-muted-foreground">
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
              <Loader2 aria-hidden="true" className="size-4 animate-spin text-primary" />
            ) : (
              <Download aria-hidden="true" className="size-4 text-primary" />
            )}
            Exportar PDF
          </Button>

          {/* Botão Nova Ficha */}
          <Button
            onClick={() => setOpenModal(true)}
            className="h-10 rounded-lg bg-primary hover:bg-primary-strong text-primary-foreground font-semibold text-xs  gap-2"
          >
            <Plus aria-hidden="true" className="size-4" /> Nova Ficha
          </Button>
        </div>
      </div>

      {/* Messages */}
      {error && (
        <div role="alert" className="rounded-xl border border-destructive/20 bg-destructive/10 p-4 text-sm text-destructive font-medium">
          {error}
        </div>
      )}

      {/* Main Content */}
      {loading ? (
        <div className="surface-card flex flex-col items-center justify-center p-16 text-center text-muted-foreground">
          <Loader2 aria-hidden="true" className="size-8 animate-spin text-primary mb-2" />
          <p className="text-sm font-semibold">Carregando fichas de treino…</p>
        </div>
      ) : (
        <div className="gp-sheets-grid">
          {/* Left Card: Selected / Active Sheet Details */}
          <div className="surface-card gp-sheet-detail">
            {currentSheet ? (
              <div className="space-y-5">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="text-xs font-semibold  text-muted-foreground">
                      Ficha atual
                    </p>
                    <h3 className="mt-1 text-lg font-semibold text-foreground tracking-tight">
                      {currentSheet.title}
                    </h3>
                  </div>
                  <Badge
                    variant="outline"
                    className={cn(
                      "rounded-full text-xs font-semibold px-2.5 py-0.5 border-border bg-muted/60 text-foreground flex items-center gap-1.5",
                      currentSheet.active && "border-border/80"
                    )}
                  >
                    <span
                      className={cn(
                        "size-1.5 rounded-full shrink-0",
                        currentSheet.active ? "bg-emerald-500" : "bg-muted-foreground/60"
                      )}
                      aria-hidden="true"
                    />
                    {currentSheet.active ? "Ativa" : "Inativa"}
                  </Badge>
                </div>

                <dl className="gp-sheet-facts">
                  <div><dt>Dia da semana</dt><dd>{currentSheet.weekDayLabel || currentSheet.weekDay || "—"}</dd></div>
                  <div><dt>Criada em</dt><dd>{currentSheet.createdAtFormatted || "Data não registrada"}</dd></div>
                  <div><dt>Exercícios</dt><dd>{exercises.length}</dd></div>
                </dl>

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
                    type="button"
                    variant="outline"
                    onClick={openHistory}
                    className="mb-2 w-full h-10 rounded-lg border-border text-foreground text-xs font-semibold gap-2"
                  >
                    <History aria-hidden="true" className="size-4" /> Histórico de alterações
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => onEditSheet(currentSheet)}
                    disabled={editingLoading || !currentSheet.active}
                    className="mb-2 w-full h-10 rounded-lg text-xs font-semibold"
                  >
                    {editingLoading ? <Loader2 aria-hidden="true" className="size-4 animate-spin" /> : <FileText aria-hidden="true" className="size-4" />} Editar ficha completa
                  </Button>
                  <Button
                    onClick={onGoToBuilder}
                    className="w-full h-11 rounded-lg bg-primary hover:bg-primary-strong text-primary-foreground font-semibold text-xs  flex items-center justify-center gap-2"
                  >
                    <Dumbbell aria-hidden="true" className="size-4" />
                    Adicionar exercícios à ficha
                    <ArrowRight aria-hidden="true" className="size-4 ml-1" />
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setDeleteConfirmationOpen(true)}
                    disabled={deletingSheet}
                    className="mt-2 w-full h-10 rounded-lg border-destructive/30 text-destructive hover:bg-destructive/10 hover:text-destructive text-xs font-semibold"
                  >
                    {deletingSheet ? <Loader2 aria-hidden="true" className="size-4 animate-spin" /> : <Trash2 aria-hidden="true" className="size-4" />}
                    Excluir ficha
                  </Button>
                </div>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-16 text-center space-y-3">
                <FileText aria-hidden="true" className="size-10 text-muted-foreground/50" />
                <p className="font-semibold text-base text-foreground">Nenhuma ficha cadastrada</p>
                <p className="text-xs text-muted-foreground max-w-sm">
                  Este aluno ainda não possui uma ficha de treino. Clique em &quot;Nova Ficha&quot; para iniciar a prescrição.
                </p>
              </div>
            )}
          </div>

          {/* Right Card: Current sheets */}
          <div className="surface-card gp-sheet-list">
            <div className="flex items-center justify-between mb-4">
              <p className="text-xs font-semibold  text-muted-foreground">
                Fichas do aluno
              </p>
              <span className="text-xs text-muted-foreground font-medium">({sheets.length})</span>
            </div>

            {sheets.length > 0 ? (
              <div className="space-y-3 max-h-[480px] overflow-y-auto pr-1">
                {sheets.map((s) => {
                  const isSelected = s.id === currentSheet?.id;

                  return (
                    <button type="button" aria-pressed={isSelected}
                      key={s.id}
                      onClick={() => onSelectSheet(s.id)}
                      className={cn(
                        "gp-sheet-choice rounded-lg border p-3 transition-colors cursor-pointer flex items-center justify-between gap-3",
                        isSelected
                          ? "border-primary/50 bg-primary-soft/30 "
                          : "border-border bg-card hover:border-primary/30",
                      )}
                    >
                      <div className="min-w-0 flex-1">
                        <p className={cn("text-sm font-semibold truncate", isSelected ? "text-primary" : "text-foreground")}>
                          {s.title}
                        </p>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          {s.weekDayLabel || s.weekDay ? `${s.weekDayLabel || s.weekDay} · ` : ""}
                          {s.createdAtFormatted === "Data não registrada"
                            ? s.createdAtFormatted
                            : `criada em ${s.createdAtFormatted}`}
                        </p>
                      </div>

                      <Badge
                        variant="outline"
                        className="text-[11px] shrink-0 font-semibold rounded-full border-border bg-muted/60 text-foreground flex items-center gap-1.5"
                      >
                        <span
                          className={cn(
                            "size-1.5 rounded-full shrink-0",
                            s.active ? "bg-emerald-500" : "bg-muted-foreground/60"
                          )}
                          aria-hidden="true"
                        />
                        {s.active ? "Ativa" : "Inativa"}
                      </Badge>
                    </button>
                  );
                })}
              </div>
            ) : (
              <div className="py-10 text-center text-xs text-muted-foreground">
                Nenhuma ficha cadastrada para este aluno.
              </div>
            )}
          </div>
        </div>
      )}

      {/* Modal: Nova Ficha */}
      <Dialog open={historyOpen} onOpenChange={setHistoryOpen}>
        <DialogContent className="graphite-personal gp-workout-dialog sm:max-w-4xl max-h-[90dvh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Histórico de alterações</DialogTitle>
            <DialogDescription>{historySheetTitle}. Selecione uma alteração para consultar a versão anterior. Eventos legados podem não possuir snapshot.</DialogDescription>
          </DialogHeader>
          {historyLoading ? (
            <p className="flex items-center gap-2 text-sm text-muted-foreground"><Loader2 aria-hidden="true" className="size-4 animate-spin" /> Carregando…</p>
          ) : historyError ? (
            <p role="alert" className="text-sm text-destructive">{historyError}</p>
          ) : historyEntries.length === 0 ? (
            <p className="text-sm text-muted-foreground">Nenhuma alteração registrada para esta ficha.</p>
          ) : (
            <div className="grid gap-4 md:grid-cols-[1fr_1.5fr]">
            <ol className="max-h-[60dvh] space-y-3 overflow-y-auto">
              {historyEntries.map((entry) => (
                <li key={entry.id}>
                  <button type="button" onClick={() => setSelectedHistoryId(entry.id)} aria-pressed={selectedHistoryId === entry.id} className={cn("w-full rounded-lg border p-3 text-left", selectedHistoryId === entry.id ? "border-primary bg-primary-soft/30" : "border-border")}>
                  <p className="text-sm font-medium text-foreground">{entry.changeReason}</p>
                  <time className="text-xs text-muted-foreground" dateTime={entry.createdAt}>
                    {new Date(entry.createdAt).toLocaleString("pt-BR")}
                  </time>
                  <p className="mt-1 text-xs text-muted-foreground">{entry.changedByName || "Responsável não registrado"}</p>
                  <Badge variant="outline" className="mt-2">{entry.snapshot ? `Versão anterior ${entry.snapshot.sheet.version}` : "Evento legado sem snapshot"}</Badge>
                  </button>
                </li>
              ))}
            </ol>
            <div className="space-y-3 rounded-lg border border-border p-4">
              {!selectedHistory ? <p className="text-sm text-muted-foreground">Selecione uma alteração ao lado.</p> : (
                <>
                  <h3 className="font-semibold">{selectedHistory.changeReason}</h3>
                  <p className="text-xs text-muted-foreground">{new Date(selectedHistory.createdAt).toLocaleString("pt-BR")} · {selectedHistory.changedByName || "Responsável não registrado"}</p>
                  {selectedHistory.snapshot ? (
                    <>
                      <p className="text-sm"><strong>Objetivo anterior:</strong> {selectedHistory.snapshot.sheet.title}</p>
                      <p className="text-sm"><strong>Dia anterior:</strong> {selectedHistory.snapshot.sheet.weekDayLabel || selectedHistory.snapshot.sheet.weekDay || "Não registrado"}</p>
                      <p className="text-sm"><strong>Situação anterior:</strong> {selectedHistory.snapshot.sheet.active ? "Ativa" : "Inativa"}</p>
                      {selectedHistory.snapshot.exercises.length === 0 && <p className="text-sm text-muted-foreground">A versão anterior não possuía exercícios.</p>}
                      <ol className="space-y-3">
                        {selectedHistory.snapshot.exercises.map((exercise, index) => (
                          <li key={exercise.id} className="rounded-lg border border-border p-3 text-sm">
                            <p className="font-semibold">{index + 1}. {exercise.exerciseName}</p>
                            <p className="text-xs text-muted-foreground">{exercise.muscle} · {exercise.exerciseType} · {exercise.equipment || "Sem equipamento"}</p>
                            {exercise.difficulty && <p>Dificuldade: {exercise.difficulty}</p>}
                            <p className="mt-1">{exercise.sets} séries × {exercise.reps} repetições · descanso {exercise.restSeconds}s</p>
                            <p className="mt-1 whitespace-pre-wrap"><strong>Instruções:</strong> {exercise.instructions || "—"}</p>
                            <p className="mt-1 whitespace-pre-wrap"><strong>Observações:</strong> {exercise.notes || "—"}</p>
                          </li>
                        ))}
                      </ol>
                    </>
                  ) : <p className="text-sm text-muted-foreground">Este registro legado contém somente o evento textual. O conteúdo anterior da ficha e a autoria não foram reconstruídos.</p>}
                </>
              )}
            </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={openModal} onOpenChange={setOpenModal}>
        <DialogContent className="graphite-personal gp-workout-dialog sm:max-w-md" preventClose={creatingSheet}>
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
                  id="sheet-title" name="sheetTitle" autoComplete="off" disabled={creatingSheet}
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
                <select id="sheet-weekday" className="select w-full" value={sheetWeekDay} onChange={(event) => setSheetWeekDay(event.target.value)} disabled={creatingSheet}>
                  {WEEK_DAY_OPTIONS.map((opt) => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
                </select>
              </div>
            </div>

            {error && <p role="alert" className="gp-workout-error">{error}</p>}
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
                className="h-9 rounded-lg bg-primary hover:bg-primary-strong text-primary-foreground text-xs "
              >
                {creatingSheet ? <Loader2 aria-hidden="true" className="size-4 animate-spin" /> : "Criar Ficha"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={deleteConfirmationOpen} onOpenChange={setDeleteConfirmationOpen}>
        <DialogContent className="graphite-personal gp-workout-dialog max-w-sm " overlay="subtle" preventClose={deletingSheet}>
          <DialogHeader>
            <DialogTitle className="pr-7">Excluir ficha?</DialogTitle>
            <DialogDescription className="leading-relaxed">
              A ficha &quot;{currentSheet?.title}&quot; será inativada e deixará de aparecer para uso. Os exercícios permanecerão preservados no histórico.
            </DialogDescription>
          </DialogHeader>
          {error && <p role="alert" className="gp-workout-error">{error}</p>}

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setDeleteConfirmationOpen(false)}
              disabled={deletingSheet}
              className="h-9 rounded-lg text-xs"
            >
              Cancelar
            </Button>
            <Button
              type="button"
              onClick={handleDeleteSheet}
              disabled={deletingSheet || !currentSheet}
              className="h-9 rounded-lg bg-destructive text-destructive-foreground hover:bg-destructive/90 text-xs "
            >
              {deletingSheet ? <Loader2 aria-hidden="true" className="size-4 animate-spin" /> : <Trash2 aria-hidden="true" className="size-4" />}
              Excluir ficha
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Toast
        open={Boolean(successMessage)}
        message={successMessage || ""}
        onClose={onClearSuccess || (() => {})}
      />
    </section>
  );
}
