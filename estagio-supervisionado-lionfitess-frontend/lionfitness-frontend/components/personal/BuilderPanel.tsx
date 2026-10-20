"use client";

import React, { useMemo, useRef, useState } from "react";
import { Plus, Search, Repeat2, Timer, FileText, Dumbbell, Loader2, Check, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Toast } from "@/components/ui/Toast";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  StudentViewModel,
  WorkoutSheetViewModel,
  WorkoutExerciseViewModel,
  CatalogExerciseViewModel,
  PrescriptionFormData,
  CustomExerciseFormData,
  WorkoutSheetUpdateData,
} from "./types";
import { cn } from "@/lib/utils";

interface BuilderPanelProps {
  student: StudentViewModel;
  sheet: WorkoutSheetViewModel;
  exercises: WorkoutExerciseViewModel[];
  catalogResults: CatalogExerciseViewModel[];
  loadingExercises: boolean;
  loadingCatalog: boolean;
  savingExercise: boolean;
  creatingCustom: boolean;
  error?: string;
  successMessage?: string;
  editing?: boolean;
  onUpdateSheet?: (data: WorkoutSheetUpdateData) => Promise<boolean>;
  onCancelEdit?: () => void;
  onSearchCatalog: (query: { name?: string; muscle?: string; category?: string; equipment?: string }) => Promise<void>;
  onSaveExercise: (data: PrescriptionFormData, exercise: CatalogExerciseViewModel) => Promise<boolean>;
  onCreateCustomExercise: (data: CustomExerciseFormData) => Promise<{
    success: boolean;
    catalogUpdated: boolean;
  }>;
  onClearSuccess?: () => void;
}

export function BuilderPanel({
  student,
  sheet,
  exercises,
  catalogResults,
  loadingExercises,
  loadingCatalog,
  savingExercise,
  creatingCustom,
  error,
  successMessage,
  editing = false,
  onUpdateSheet,
  onCancelEdit,
  onSearchCatalog,
  onSaveExercise,
  onCreateCustomExercise,
  onClearSuccess,
}: BuilderPanelProps) {
  const [draftTitle, setDraftTitle] = useState(sheet.title);
  const [draftWeekDay, setDraftWeekDay] = useState(sheet.weekDay);
  const [changeReason, setChangeReason] = useState("");
  const [draftExercises, setDraftExercises] = useState<WorkoutExerciseViewModel[]>(() => exercises.map((exercise) => ({ ...exercise })));
  const updateInFlightRef = useRef(false);
  const visibleExercises = editing ? draftExercises : exercises;

  const changeExercise = (id: string, values: Partial<WorkoutExerciseViewModel>) => {
    setDraftExercises((current) => current.map((exercise) => exercise.id === id ? { ...exercise, ...values } : exercise));
  };

  const moveExercise = (index: number, offset: number) => {
    setDraftExercises((current) => {
      const reordered = [...current];
      [reordered[index], reordered[index + offset]] = [reordered[index + offset], reordered[index]];
      return reordered;
    });
  };

  const saveSheet = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!onUpdateSheet || savingExercise || updateInFlightRef.current) return;
    updateInFlightRef.current = true;
    try {
      await onUpdateSheet({ title: draftTitle.trim(), weekDay: draftWeekDay, version: sheet.version,
        changeReason: changeReason.trim(), exercises: draftExercises.map((exercise) => ({
          ...(exercise.catalogExerciseId ? { catalogExerciseId: exercise.catalogExerciseId } : { id: exercise.id }),
          sets: exercise.sets, reps: exercise.reps, restSeconds: exercise.restSeconds,
          instructions: exercise.instructions, notes: exercise.notes,
        })),
      });
    } finally { updateInFlightRef.current = false; }
  };
  // Estado do modal de biblioteca
  const [openLibrary, setOpenLibrary] = useState(false);
  const [catalogQuery, setCatalogQuery] = useState("");
  const [selectedMuscle, setSelectedMuscle] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("");
  const [selectedEquipment, setSelectedEquipment] = useState("");

  // Estado da prescrição do exercício selecionado
  const [selectedCatalogItem, setSelectedCatalogItem] = useState<CatalogExerciseViewModel | null>(null);
  const [sets, setSets] = useState(4);
  const [reps, setReps] = useState(12);
  const [restSeconds, setRestSeconds] = useState(60);
  const [notes, setNotes] = useState("");

  // Estado do modal de exercício personalizado
  const [showCustomModal, setShowCustomModal] = useState(false);
  const [customName, setCustomName] = useState("");
  const [customCategory, setCustomCategory] = useState("Peito");
  const [customMuscle, setCustomMuscle] = useState("Peitoral");
  const [customEquipment, setCustomEquipment] = useState("");
  const [customInstructions, setCustomInstructions] = useState("");
  const saveInFlightRef = useRef(false);
  const customInFlightRef = useRef(false);

  // Filtro local sobre o catálogo caso a API retorne conjunto
  const filteredCatalog = useMemo(() => {
    return catalogResults.filter((e) => {
      const matchQuery =
        !catalogQuery ||
        e.name.toLowerCase().includes(catalogQuery.toLowerCase()) ||
        e.muscle.toLowerCase().includes(catalogQuery.toLowerCase());
      const matchMuscle = !selectedMuscle || e.muscle.toLowerCase().includes(selectedMuscle.toLowerCase());
      const matchCategory = !selectedCategory || e.category.toLowerCase().includes(selectedCategory.toLowerCase());
      const matchEquipment = !selectedEquipment || e.equipment.toLowerCase().includes(selectedEquipment.toLowerCase());
      return e.isActive && matchQuery && matchMuscle && matchCategory && matchEquipment;
    });
  }, [catalogResults, catalogQuery, selectedMuscle, selectedCategory, selectedEquipment]);

  const addedExerciseNames = useMemo(
    () => new Set(visibleExercises.map((exercise) => exercise.exerciseName.trim().toLocaleLowerCase("pt-BR"))),
    [visibleExercises],
  );

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSearchCatalog({
      name: catalogQuery,
      muscle: selectedMuscle,
      category: selectedCategory,
      equipment: selectedEquipment,
    });
  };

  const handleSelectToPrescribe = (item: CatalogExerciseViewModel) => {
    setSelectedCatalogItem(item);
    setSets(4);
    setReps(12);
    setRestSeconds(60);
    setNotes("");
  };

  const handleConfirmPrescription = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCatalogItem || savingExercise || saveInFlightRef.current) return;

    saveInFlightRef.current = true;
    try {
      if (editing) {
        setDraftExercises((current) => [...current, {
          id: `draft-${crypto.randomUUID()}`, catalogExerciseId: selectedCatalogItem.id,
          workoutSheetId: sheet.id, exerciseName: selectedCatalogItem.name, muscle: selectedCatalogItem.muscle,
          exerciseType: selectedCatalogItem.category, equipment: selectedCatalogItem.equipment,
          instructions: selectedCatalogItem.instructions, sets, reps, restSeconds, notes,
        }]);
        setSelectedCatalogItem(null);
        return;
      }
      const saved = await onSaveExercise(
        {
          workoutSheetId: sheet.id,
          sets,
          reps,
          restSeconds,
          notes,
        },
        selectedCatalogItem,
      );
      if (!saved) return;

      // Volta para o catálogo, mantendo Biblioteca, busca, filtros e scroll abertos.
      setSelectedCatalogItem(null);
    } finally {
      saveInFlightRef.current = false;
    }
  };

  const handleCustomSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!customName.trim() || creatingCustom || customInFlightRef.current) return;

    customInFlightRef.current = true;
    try {
      const result = await onCreateCustomExercise({
        name: customName.trim(),
        category: customCategory,
        muscle: customMuscle,
        equipment: customEquipment.trim(),
        instructions: customInstructions.trim(),
      });
      if (!result.success) return;

      // A resposta real normalmente é inserida localmente. Caso o endpoint não
      // devolva o item, refaz a busca com os filtros atuais sem inventar dados.
      if (!result.catalogUpdated) {
        await onSearchCatalog({ name: catalogQuery, muscle: selectedMuscle, category: selectedCategory, equipment: selectedEquipment });
      }

      setShowCustomModal(false);
      setCustomName("");
      setCustomEquipment("");
      setCustomInstructions("");
    } finally {
      customInFlightRef.current = false;
    }
  };

  return (
    <section className="gp-workout gp-builder">
      {/* Top Banner Card */}
      <div className="surface-card gp-workout-banner">
        <div>
          <p className="text-xs font-semibold  text-muted-foreground">
            Montando Treino de {student.name}
          </p>
          <h2 className="mt-1 text-xl font-bold tracking-tight text-foreground">
            {sheet.title} <span className="text-muted-foreground font-medium text-base">· {sheet.weekDayLabel || sheet.weekDay}</span>
          </h2>
          <p className="mt-1 text-xs text-muted-foreground">
            Prescreva os exercícios a partir do catálogo oficial e personalizado.
          </p>
        </div>

        <Button
          onClick={() => {
            setOpenLibrary(true);
            onSearchCatalog({ name: catalogQuery, muscle: selectedMuscle, category: selectedCategory, equipment: selectedEquipment });
          }}
          disabled={savingExercise}
          className="h-10 rounded-lg bg-primary hover:bg-primary-strong text-primary-foreground font-semibold text-xs  gap-2"
        >
          <Plus aria-hidden="true" className="size-4" /> Adicionar Exercício
        </Button>
      </div>

      {editing && (
        <form id="sheet-edit" onSubmit={saveSheet} className="surface-card gp-sheet-edit space-y-4 p-5">
          <p className="text-sm font-semibold">Editar ficha · versão {sheet.version}</p>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="edit-title">Objetivo da ficha</Label>
              <Input id="edit-title" value={draftTitle} onChange={(event) => setDraftTitle(event.target.value)} required maxLength={255} disabled={savingExercise} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="edit-week-day">Dia da semana</Label>
              <select id="edit-week-day" className="select w-full" value={draftWeekDay} onChange={(event) => setDraftWeekDay(event.target.value)} required disabled={savingExercise}>
                {[["MONDAY", "Segunda-feira"], ["TUESDAY", "Terça-feira"], ["WEDNESDAY", "Quarta-feira"], ["THURSDAY", "Quinta-feira"], ["FRIDAY", "Sexta-feira"], ["SATURDAY", "Sábado"], ["SUNDAY", "Domingo"]].map(([value, label]) => <option key={value} value={value}>{label}</option>)}
              </select>
            </div>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="edit-reason">Motivo da alteração</Label>
            <Textarea id="edit-reason" value={changeReason} onChange={(event) => setChangeReason(event.target.value)} required maxLength={2000} disabled={savingExercise} placeholder="Descreva o motivo da atualização." />
          </div>
          <p className="text-xs text-muted-foreground">As alterações dos exercícios abaixo serão salvas junto com a ficha. A versão anterior ficará disponível no histórico.</p>
          <div className="gp-workout-form-actions">
            <Button type="button" variant="outline" onClick={onCancelEdit} disabled={savingExercise}>Cancelar edição</Button>
            <Button type="submit" disabled={savingExercise}>{savingExercise ? "Salvando…" : "Salvar ficha e histórico"}</Button>
          </div>
        </form>
      )}

      {/* Messages */}
      {error && (
        <div role="alert" className="rounded-xl border border-destructive/20 bg-destructive/10 p-4 text-sm text-destructive font-medium">
          {error}
        </div>
      )}

      {/* Exercises List in Sheet */}
      {loadingExercises ? (
        <div className="surface-card flex flex-col items-center justify-center p-16 text-center text-muted-foreground">
          <Loader2 aria-hidden="true" className="size-8 animate-spin text-primary mb-2" />
          <p className="text-sm font-semibold">Carregando exercícios da ficha…</p>
        </div>
      ) : visibleExercises.length > 0 ? (
        <div className="space-y-3">
          {visibleExercises.map((ex, i) => (
            <div
              key={ex.id}
              className="surface-card gp-exercise-row"
            >
              {/* Index number badge */}
              <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-ink text-sm font-semibold text-background">
                {i + 1}
              </div>
              {editing && (
                <div className="order-last w-full space-y-3 border-t border-border pt-3">
                  <div className="gp-prescription-fields">
                    {([['sets', 'Séries', 1], ['reps', 'Repetições', 1], ['restSeconds', 'Descanso (seg)', 0]] as const).map(([field, label, min]) => (
                      <div key={field} className="space-y-1.5">
                        <Label htmlFor={`edit-${ex.id}-${field}`}>{label}</Label>
                        <Input id={`edit-${ex.id}-${field}`} form="sheet-edit" type="number" value={ex[field]} min={min} required disabled={savingExercise}
                          onChange={(event) => changeExercise(ex.id, { [field]: Number(event.target.value) })} />
                      </div>
                    ))}
                  </div>
                  <div className="grid gap-3 sm:grid-cols-2">
                    <div className="space-y-1.5"><Label htmlFor={`instructions-${ex.id}`}>Instruções</Label>
                      <Textarea id={`instructions-${ex.id}`} form="sheet-edit" value={ex.instructions} disabled={savingExercise} onChange={(event) => changeExercise(ex.id, { instructions: event.target.value })} />
                    </div>
                    <div className="space-y-1.5"><Label htmlFor={`notes-${ex.id}`}>Observações</Label>
                      <Textarea id={`notes-${ex.id}`} form="sheet-edit" value={ex.notes} disabled={savingExercise} onChange={(event) => changeExercise(ex.id, { notes: event.target.value })} />
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <Button type="button" variant="outline" size="sm" disabled={savingExercise || i === 0} onClick={() => moveExercise(i, -1)}>Mover para cima</Button>
                    <Button type="button" variant="outline" size="sm" disabled={savingExercise || i === visibleExercises.length - 1} onClick={() => moveExercise(i, 1)}>Mover para baixo</Button>
                    <Button type="button" variant="outline" size="sm" disabled={savingExercise} onClick={() => setDraftExercises((current) => current.filter((exercise) => exercise.id !== ex.id))}>Remover da ficha</Button>
                  </div>
                </div>
              )}

              {/* Exercise info */}
              <div className="min-w-0 flex-1">
                <p className="font-semibold text-sm text-foreground gp-workout-wrap">{ex.exerciseName}</p>
                <div className="flex items-center gap-2 mt-0.5">
                  <span className="text-xs text-muted-foreground">{ex.muscle}</span>
                  {ex.equipment && (
                    <>
                      <span className="text-muted-foreground/50">·</span>
                      <span className="text-xs text-muted-foreground">{ex.equipment}</span>
                    </>
                  )}
                </div>
              </div>

              {/* Metrics */}
              <div className="gp-exercise-metrics">
                <Metric icon={Repeat2} label="Séries x Reps" value={`${ex.sets} x ${ex.reps}`} />
                <Metric icon={Timer} label="Descanso" value={`${ex.restSeconds}s`} />
                {ex.notes && (
                  <div className="gp-exercise-notes">
                    <p className="flex items-center gap-1 text-[11px]  text-muted-foreground">
                      <FileText aria-hidden="true" className="size-3 text-primary" /> Notas
                    </p>
                    <p className="mt-0.5 font-medium text-foreground text-xs gp-workout-wrap">{ex.notes}</p>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="surface-card flex flex-col items-center justify-center py-16 text-center space-y-3">
          <Dumbbell aria-hidden="true" className="size-10 text-muted-foreground/50" />
          <p className="font-semibold text-base text-foreground">Nenhum exercício nesta ficha</p>
          <p className="text-xs text-muted-foreground max-w-sm">
            Clique em &quot;Adicionar Exercício&quot; para consultar o catálogo e prescrever a rotina de treinos.
          </p>
        </div>
      )}

      {/* Dialog: Biblioteca de Exercícios */}
      <Dialog open={openLibrary} onOpenChange={setOpenLibrary}>
        <DialogContent
          className="graphite-personal gp-workout-dialog gp-library-dialog max-h-[calc(100dvh-1.5rem)] sm:max-w-3xl sm:max-h-[calc(100dvh-2rem)] flex flex-col"
          preventClose={savingExercise}
        >
          <DialogHeader>
            <div className="flex flex-col items-start gap-3 pr-6 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <DialogTitle>Biblioteca de Exercícios</DialogTitle>
                <DialogDescription>
                  Pesquise no catálogo para prescrever no {sheet.title}.
                </DialogDescription>
              </div>

              {/* Ação: Criar exercício personalizado */}
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setShowCustomModal(true)}
                className="text-xs font-semibold gap-1.5"
              >
                <Plus aria-hidden="true" className="size-3.5" />
                Criar Personalizado
              </Button>
            </div>
          </DialogHeader>

          {successMessage ? (
            <div
              role="status"
              className="flex items-center gap-2 rounded-xl border border-border bg-muted/60 p-3 text-xs font-semibold text-foreground"
            >
              <CheckCircle2 aria-hidden="true" className="size-4 shrink-0 text-emerald-500" />
              {successMessage}
            </div>
          ) : null}

          {/* Seletor ou Prescrição ativa */}
          {selectedCatalogItem ? (
            /* Formulário de Prescrição */
            <form onSubmit={handleConfirmPrescription} className="space-y-4 py-2">
              <div className="rounded-xl border border-primary/30 bg-primary-soft/30 p-3.5">
                <p className="text-xs font-bold  text-primary">Exercício Selecionado</p>
                <h4 className="text-base font-extrabold text-foreground mt-0.5">{selectedCatalogItem.name}</h4>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Músculo: {selectedCatalogItem.muscle} · Categoria: {selectedCatalogItem.category}
                </p>
              </div>

              {error ? (
                <div role="alert" className="rounded-xl border border-destructive/25 bg-destructive/10 p-3 text-xs font-medium text-destructive">
                  {error}
                </div>
              ) : null}

              <div className="gp-prescription-fields">
                <div className="grid gap-1.5">
                  <Label htmlFor="sets">Séries</Label>
                  <Input
                    id="sets"
                    type="number"
                    min="1"
                    value={sets}
                    onChange={(e) => setSets(Number(e.target.value))}
                    required
                  />
                </div>

                <div className="grid gap-1.5">
                  <Label htmlFor="reps">Repetições</Label>
                  <Input
                    id="reps"
                    type="number"
                    min="1"
                    value={reps}
                    onChange={(e) => setReps(Number(e.target.value))}
                    required
                  />
                </div>

                <div className="grid gap-1.5">
                  <Label htmlFor="restSeconds">Descanso (seg)</Label>
                  <Input
                    id="restSeconds"
                    type="number"
                    min="0"
                    value={restSeconds}
                    onChange={(e) => setRestSeconds(Number(e.target.value))}
                    required
                  />
                </div>
              </div>

              <div className="grid gap-1.5">
                <Label htmlFor="notes">Notas / Observações (opcional)</Label>
                <Textarea
                  id="notes"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Ex: Carga progressiva, cadência 2-0-2..."
                  rows={2}
                />
              </div>

              <div className="gp-workout-form-actions">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setSelectedCatalogItem(null)}
                  disabled={savingExercise}
                >
                  Voltar ao Catálogo
                </Button>
                <Button
                  type="submit"
                  className="bg-primary hover:bg-primary-strong text-primary-foreground font-semibold"
                  disabled={savingExercise}
                >
                  {savingExercise ? (
                    <>
                      <Loader2 aria-hidden="true" className="size-4 animate-spin mr-2" />
                      Salvando…
                    </>
                  ) : (
                    "Salvar na Ficha"
                  )}
                </Button>
              </div>
            </form>
          ) : (
            /* Lista do Catálogo */
            <div className="gp-catalog-picker space-y-3 flex-1 flex flex-col">
              <form onSubmit={handleSearchSubmit} className="space-y-2">
                <div className="flex gap-2">
                <div className="relative flex-1">
                  <Search aria-hidden="true" className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    id="workout-catalog-query" name="catalogSearch" aria-label="Buscar por nome ou músculo" autoComplete="off" value={catalogQuery}
                    onChange={(e) => setCatalogQuery(e.target.value)}
                    placeholder="Nome ou músculo…"
                    className="pl-9 h-10"
                  />
                </div>
                <Button type="submit" size="sm" className="h-10 px-4" disabled={loadingCatalog}>
                  Buscar
                </Button>
                </div>
                <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
                  <Input aria-label="Filtrar por categoria" placeholder="Categoria" value={selectedCategory} onChange={(e) => setSelectedCategory(e.target.value)} />
                  <Input aria-label="Filtrar por músculo" placeholder="Músculo" value={selectedMuscle} onChange={(e) => setSelectedMuscle(e.target.value)} />
                  <Input aria-label="Filtrar por equipamento" placeholder="Equipamento" value={selectedEquipment} onChange={(e) => setSelectedEquipment(e.target.value)} />
                </div>
              </form>

              {error ? (
                <div role="alert" className="rounded-xl border border-destructive/25 bg-destructive/10 p-3 text-xs font-medium text-destructive">
                  {error}
                </div>
              ) : null}

              {loadingCatalog ? (
                <div className="flex flex-col items-center justify-center p-12 text-center text-muted-foreground">
                  <Loader2 aria-hidden="true" className="size-6 animate-spin text-primary mb-2" />
                  <p className="text-xs font-semibold">Buscando exercícios no catálogo…</p>
                </div>
              ) : (
                <div className="gp-catalog-results space-y-2 overflow-y-auto pr-1 flex-1">
                  {filteredCatalog.map((item) => {
                    const alreadyAdded = addedExerciseNames.has(item.name.trim().toLocaleLowerCase("pt-BR"));
                    return (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => handleSelectToPrescribe(item)}
                      disabled={alreadyAdded}
                      className={cn(
                        " flex w-full items-center justify-between rounded-xl border p-3 text-left transition-colors duration-200",
                        alreadyAdded
                          ? "cursor-default border-success/25 bg-success/5"
                          : "cursor-pointer border-border hover:border-primary/50 hover:bg-primary-soft/30",
                      )}
                    >
                      <div className="min-w-0 pr-3">
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="text-sm font-bold text-foreground">{item.name}</p>
                          {item.isCustom && (
                            <Badge variant="outline" className="text-[10px] bg-primary-soft text-primary border-primary/20">
                              Personalizado
                            </Badge>
                          )}
                        </div>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          {item.muscle} {item.equipment ? `· ${item.equipment}` : ""}
                        </p>
                      </div>

                      <span
                        className={cn(
                          "flex shrink-0 items-center justify-center rounded-lg text-xs font-semibold",
                          alreadyAdded ? "h-7 gap-1 bg-success/10 px-2 text-success" : "size-7 bg-primary/10 text-primary",
                        )}
                      >
                        {alreadyAdded ? <><Check aria-hidden="true" className="size-3.5" /> Adicionado</> : <Plus aria-hidden="true" className="size-4" />}
                      </span>
                    </button>
                    );
                  })}

                  {filteredCatalog.length === 0 && (
                    <div className="py-12 text-center text-xs text-muted-foreground">
                      Nenhum exercício encontrado para essa busca.
                    </div>
                  )}
                </div>
              )}

              <DialogFooter>
                <Button variant="outline" onClick={() => setOpenLibrary(false)}>
                  Fechar
                </Button>
              </DialogFooter>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Modal Secundário: Criar Exercício Personalizado */}
      <Dialog open={showCustomModal} onOpenChange={setShowCustomModal}>
        <DialogContent className="graphite-personal gp-workout-dialog sm:max-w-lg" overlay="subtle" preventClose={creatingCustom}>
          <form onSubmit={handleCustomSubmit}>
            <DialogHeader>
              <DialogTitle>Novo Exercício Personalizado</DialogTitle>
              <DialogDescription>
                Cadastre um exercício para ficar disponível no seu catálogo.
              </DialogDescription>
            </DialogHeader>

            <div className="grid gap-3 py-4">
              <div className="grid gap-1.5">
                <Label htmlFor="customName">Nome do Exercício</Label>
                <Input
                  id="customName"
                  value={customName}
                  onChange={(e) => setCustomName(e.target.value)}
                  placeholder="Ex: Supino Inclinado com Halteres"
                  required
                />
              </div>

              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div className="grid gap-1.5">
                  <Label htmlFor="customCategory">Categoria</Label>
                  <Input
                    id="customCategory"
                    value={customCategory}
                    onChange={(e) => setCustomCategory(e.target.value)}
                    placeholder="Ex: Peito, Costas"
                    required
                  />
                </div>

                <div className="grid gap-1.5">
                  <Label htmlFor="customMuscle">Músculo Alvo</Label>
                  <Input
                    id="customMuscle"
                    value={customMuscle}
                    onChange={(e) => setCustomMuscle(e.target.value)}
                    placeholder="Ex: Peitoral, Dorsal"
                    required
                  />
                </div>
              </div>

              {error ? (
                <div role="alert" className="rounded-xl border border-destructive/25 bg-destructive/10 p-3 text-xs font-medium text-destructive">
                  {error}
                </div>
              ) : null}

              <div className="grid gap-1.5">
                <Label htmlFor="customEquipment">Equipamento</Label>
                <Input
                  id="customEquipment"
                  value={customEquipment}
                  onChange={(e) => setCustomEquipment(e.target.value)}
                  placeholder="Ex: Halteres, Barra, Máquina"
                />
              </div>

              <div className="grid gap-1.5">
                <Label htmlFor="customInstructions">Instruções / Execução</Label>
                <Textarea
                  id="customInstructions"
                  value={customInstructions}
                  onChange={(e) => setCustomInstructions(e.target.value)}
                  placeholder="Orientações posturais ou biomecânicas..."
                  rows={2}
                />
              </div>
            </div>

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setShowCustomModal(false)}
                disabled={creatingCustom}
              >
                Cancelar
              </Button>
              <Button
                type="submit"
                className="bg-primary hover:bg-primary-strong text-primary-foreground font-semibold"
                disabled={creatingCustom || !customName.trim()}
              >
                {creatingCustom ? (
                  <>
                    <Loader2 aria-hidden="true" className="size-4 animate-spin mr-2" />
                    Salvando…
                  </>
                ) : (
                  "Cadastrar Exercício"
                )}
              </Button>
            </DialogFooter>
          </form>
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

function Metric({
  icon: Icon,
  label,
  value,
}: {
  icon: React.ElementType;
  label: string;
  value: string;
}) {
  return (
    <div>
      <p className="flex items-center gap-1 text-[11px]  text-muted-foreground">
        <Icon aria-hidden="true" className="size-3 text-primary" /> {label}
      </p>
      <p className="mt-0.5 font-semibold tabular-nums text-foreground">{value}</p>
    </div>
  );
}
