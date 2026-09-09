"use client";

import React, { useMemo, useRef, useState } from "react";
import { Plus, Search, Repeat2, Timer, FileText, Dumbbell, Loader2, Check, Sparkles, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
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
  onSearchCatalog: (query: { name?: string; muscle?: string; category?: string }) => Promise<void>;
  onSaveExercise: (data: PrescriptionFormData, exercise: CatalogExerciseViewModel) => Promise<boolean>;
  onCreateCustomExercise: (data: CustomExerciseFormData) => Promise<{
    success: boolean;
    catalogUpdated: boolean;
  }>;
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
  onSearchCatalog,
  onSaveExercise,
  onCreateCustomExercise,
}: BuilderPanelProps) {
  // Estado do modal de biblioteca
  const [openLibrary, setOpenLibrary] = useState(false);
  const [catalogQuery, setCatalogQuery] = useState("");
  const [selectedMuscle] = useState("");

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
      const matchMuscle = !selectedMuscle || e.muscle.toLowerCase() === selectedMuscle.toLowerCase();
      return matchQuery && matchMuscle;
    });
  }, [catalogResults, catalogQuery, selectedMuscle]);

  const addedExerciseNames = useMemo(
    () => new Set(exercises.map((exercise) => exercise.exerciseName.trim().toLocaleLowerCase("pt-BR"))),
    [exercises],
  );

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSearchCatalog({
      name: catalogQuery,
      muscle: selectedMuscle,
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
        await onSearchCatalog({ name: catalogQuery, muscle: selectedMuscle });
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
    <section className="space-y-5 animate-slide-in">
      {/* Top Banner Card */}
      <div className="surface-card flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
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
            onSearchCatalog({});
          }}
          className="h-10 rounded-lg bg-primary hover:bg-primary-strong text-primary-foreground font-semibold text-xs shadow-brand gap-2"
        >
          <Plus className="size-4" /> Adicionar Exercício
        </Button>
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

      {/* Exercises List in Sheet */}
      {loadingExercises ? (
        <div className="surface-card flex flex-col items-center justify-center p-16 text-center text-muted-foreground">
          <Loader2 className="size-8 animate-spin text-primary mb-2" />
          <p className="text-sm font-semibold">Carregando exercícios da ficha...</p>
        </div>
      ) : exercises.length > 0 ? (
        <div className="space-y-3">
          {exercises.map((ex, i) => (
            <div
              key={ex.id}
              style={{ animationDelay: `${i * 30}ms` }}
              className="surface-card animate-rise row-raise flex items-center gap-4 p-4"
            >
              {/* Index number badge */}
              <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-ink text-sm font-semibold text-background">
                {i + 1}
              </div>

              {/* Exercise info */}
              <div className="min-w-0 flex-1">
                <p className="truncate font-semibold text-sm text-foreground">{ex.exerciseName}</p>
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
              <div className="hidden gap-6 text-sm sm:flex items-center">
                <Metric icon={Repeat2} label="Séries x Reps" value={`${ex.sets} x ${ex.reps}`} />
                <Metric icon={Timer} label="Descanso" value={`${ex.restSeconds}s`} />
                {ex.notes && (
                  <div className="max-w-[150px]">
                    <p className="flex items-center gap-1 text-[11px] uppercase tracking-wide text-muted-foreground">
                      <FileText className="size-3 text-primary" /> Notas
                    </p>
                    <p className="mt-0.5 font-medium text-foreground truncate text-xs">{ex.notes}</p>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="surface-card flex flex-col items-center justify-center py-16 text-center space-y-3">
          <Dumbbell className="size-10 text-muted-foreground/50" />
          <p className="font-semibold text-base text-foreground">Nenhum exercício nesta ficha</p>
          <p className="text-xs text-muted-foreground max-w-sm">
            Clique em &quot;Adicionar Exercício&quot; para consultar o catálogo e prescrever a rotina de treinos.
          </p>
        </div>
      )}

      {/* Dialog: Biblioteca de Exercícios */}
      <Dialog open={openLibrary} onOpenChange={setOpenLibrary}>
        <DialogContent
          className="max-h-[calc(100dvh-1.5rem)] sm:max-w-3xl sm:max-h-[calc(100dvh-2rem)] flex flex-col"
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
                className="text-xs font-semibold gap-1.5 border-dashed border-primary/50 text-primary hover:bg-primary-soft/50"
              >
                <Sparkles className="size-3.5" />
                Criar Personalizado
              </Button>
            </div>
          </DialogHeader>

          {successMessage ? (
            <div
              role="status"
              className="flex items-center gap-2 rounded-xl border border-success/25 bg-success/10 p-3 text-xs font-semibold text-success"
            >
              <CheckCircle2 className="size-4 shrink-0" />
              {successMessage}
            </div>
          ) : null}

          {/* Seletor ou Prescrição ativa */}
          {selectedCatalogItem ? (
            /* Formulário de Prescrição */
            <form onSubmit={handleConfirmPrescription} className="space-y-4 py-2">
              <div className="rounded-xl border border-primary/30 bg-primary-soft/30 p-3.5">
                <p className="text-xs font-bold uppercase tracking-wider text-primary">Exercício Selecionado</p>
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

              <div className="grid grid-cols-3 gap-3">
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

              <div className="flex justify-end gap-3 pt-2">
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
                      <Loader2 className="size-4 animate-spin mr-2" />
                      Salvando...
                    </>
                  ) : (
                    "Salvar na Ficha"
                  )}
                </Button>
              </div>
            </form>
          ) : (
            /* Lista do Catálogo */
            <div className="space-y-3 flex-1 overflow-hidden flex flex-col">
              <form onSubmit={handleSearchSubmit} className="relative flex gap-2">
                <div className="relative flex-1">
                  <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    value={catalogQuery}
                    onChange={(e) => setCatalogQuery(e.target.value)}
                    placeholder="Buscar por nome ou músculo..."
                    className="pl-9 h-10"
                  />
                </div>
                <Button type="submit" size="sm" className="h-10 px-4">
                  Buscar
                </Button>
              </form>

              {error ? (
                <div role="alert" className="rounded-xl border border-destructive/25 bg-destructive/10 p-3 text-xs font-medium text-destructive">
                  {error}
                </div>
              ) : null}

              {loadingCatalog ? (
                <div className="flex flex-col items-center justify-center p-12 text-center text-muted-foreground">
                  <Loader2 className="size-6 animate-spin text-primary mb-2" />
                  <p className="text-xs font-semibold">Buscando exercícios no catálogo...</p>
                </div>
              ) : (
                <div className="max-h-80 space-y-2 overflow-y-auto pr-1 flex-1">
                  {filteredCatalog.map((item) => {
                    const alreadyAdded = addedExerciseNames.has(item.name.trim().toLocaleLowerCase("pt-BR"));
                    return (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => handleSelectToPrescribe(item)}
                      disabled={alreadyAdded}
                      className={cn(
                        "animate-rise flex w-full items-center justify-between rounded-xl border p-3 text-left transition-all duration-200",
                        alreadyAdded
                          ? "cursor-default border-success/25 bg-success/5"
                          : "cursor-pointer border-border hover:border-primary/50 hover:bg-primary-soft/30",
                      )}
                    >
                      <div className="min-w-0 pr-3">
                        <div className="flex items-center gap-2">
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
                        {alreadyAdded ? <><Check className="size-3.5" /> Adicionado</> : <Plus className="size-4" />}
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
        <DialogContent className="sm:max-w-lg" overlay="subtle" preventClose={creatingCustom}>
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
                    <Loader2 className="size-4 animate-spin mr-2" />
                    Salvando...
                  </>
                ) : (
                  "Cadastrar Exercício"
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
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
      <p className="flex items-center gap-1 text-[11px] uppercase tracking-wide text-muted-foreground">
        <Icon className="size-3 text-primary" /> {label}
      </p>
      <p className="mt-0.5 font-semibold tabular-nums text-foreground">{value}</p>
    </div>
  );
}
