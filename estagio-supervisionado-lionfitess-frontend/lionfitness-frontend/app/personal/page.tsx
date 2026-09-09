"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Users, ClipboardList, LayoutGrid } from "lucide-react";
import ProtectedRoute from "@/components/auth/ProtectedRoute";
import { useAuth } from "@/hooks/useAuth";
import { cn } from "@/lib/utils";
import {
  createExerciseCatalog,
  createWorkoutExercise,
  createWorkoutSheet,
  getMyStudents,
  getWorkoutExercisesBySheet,
  getWorkoutSheetsByMember,
  searchExerciseCatalog,
} from "@/services/api";
import exportWorkoutPdf from "@/components/reports/exportWorkoutPdf";
import { Button } from "@/components/ui/button";
import { PersonalHeader, PersonalTabKey } from "@/components/personal/PersonalHeader";
import { StudentsPanel } from "@/components/personal/StudentsPanel";
import { SheetsPanel } from "@/components/personal/SheetsPanel";
import { BuilderPanel } from "@/components/personal/BuilderPanel";
import {
  StudentViewModel,
  WorkoutSheetViewModel,
  WorkoutExerciseViewModel,
  CatalogExerciseViewModel,
  NewSheetFormData,
  PrescriptionFormData,
  CustomExerciseFormData,
} from "@/components/personal/types";
import {
  mapStudent,
  mapWorkoutSheet,
  mapWorkoutExercise,
  mapCatalogExercise,
} from "@/components/personal/mappers";

const tabs: { key: PersonalTabKey; label: string; icon: React.ElementType }[] = [
  { key: "alunos", label: "Meus Alunos", icon: Users },
  { key: "fichas", label: "Fichas do Aluno", icon: ClipboardList },
  { key: "montar", label: "Montar Treino", icon: LayoutGrid },
];

export default function PersonalPage() {
  const router = useRouter();
  const { user, logout } = useAuth();

  // ── Navegação entre Abas ───────────────────────────────────────────────────
  const [activeTab, setActiveTab] = useState<PersonalTabKey>("alunos");

  // ── Alunos Reais ───────────────────────────────────────────────────────────
  const [members, setMembers] = useState<any[]>([]);
  const [selectedMemberId, setSelectedMemberId] = useState("");
  const [membersLoading, setMembersLoading] = useState(true);
  const [membersError, setMembersError] = useState("");

  // ── Fichas Reais ───────────────────────────────────────────────────────────
  const [workoutSheets, setWorkoutSheets] = useState<any[]>([]);
  const [selectedSheetId, setSelectedSheetId] = useState("");
  const [sheetsLoading, setSheetsLoading] = useState(false);
  const [sheetsError, setSheetsError] = useState("");
  const [sheetSuccess, setSheetSuccess] = useState("");
  const [creatingSheet, setCreatingSheet] = useState(false);

  // ── Exercícios da Ficha ────────────────────────────────────────────────────
  const [sheetExercises, setSheetExercises] = useState<any[]>([]);
  const [sheetExercisesLoading, setSheetExercisesLoading] = useState(false);
  const [sheetExercisesError, setSheetExercisesError] = useState("");

  // ── Catálogo de Exercícios ─────────────────────────────────────────────────
  const [catalogResults, setCatalogResults] = useState<any[]>([]);
  const [catalogLoading, setCatalogLoading] = useState(false);
  const [catalogError, setCatalogError] = useState("");

  // ── Estado de Prescrição e Exercício Personalizado ─────────────────────────
  const [saveLoading, setSaveLoading] = useState(false);
  const [saveError, setSaveError] = useState("");
  const [saveSuccess, setSaveSuccess] = useState("");

  const [customLoading, setCustomLoading] = useState(false);
  const [customError, setCustomError] = useState("");

  // ── PDF Loading ────────────────────────────────────────────────────────────
  const [pdfLoading, setPdfLoading] = useState(false);

  // ── ViewModels Mapeados com Dados 100% Reais ───────────────────────────────
  const studentViewModels: StudentViewModel[] = useMemo(() => {
    return members.map((m, i) => mapStudent(m, i));
  }, [members]);

  const selectedStudentViewModel: StudentViewModel | null = useMemo(() => {
    const found = studentViewModels.find((s) => s.id === selectedMemberId);
    return found || null;
  }, [studentViewModels, selectedMemberId]);

  const sheetViewModels: WorkoutSheetViewModel[] = useMemo(() => {
    return workoutSheets.map((s, i) => mapWorkoutSheet(s, i));
  }, [workoutSheets]);

  const selectedSheetViewModel: WorkoutSheetViewModel | null = useMemo(() => {
    if (selectedSheetId) {
      const found = sheetViewModels.find((s) => s.id === selectedSheetId);
      if (found) return found;
    }
    const active = sheetViewModels.find((s) => s.active);
    return active || sheetViewModels[0] || null;
  }, [sheetViewModels, selectedSheetId]);

  const exerciseViewModels: WorkoutExerciseViewModel[] = useMemo(() => {
    return sheetExercises.map((e, i) => mapWorkoutExercise(e, i));
  }, [sheetExercises]);

  const catalogViewModels: CatalogExerciseViewModel[] = useMemo(() => {
    return catalogResults.map((c, i) => mapCatalogExercise(c, i));
  }, [catalogResults]);

  // ── Carga de Dados (APIs Reais) ────────────────────────────────────────────
  const loadMembers = useCallback(async (preferredMemberId?: string) => {
    try {
      setMembersLoading(true);
      setMembersError("");
      const response = await getMyStudents();
      const list = Array.isArray(response) ? response : [];
      setMembers(list);

      if (preferredMemberId && list.some((m: any) => String(m.id || m.memberId) === preferredMemberId)) {
        setSelectedMemberId(preferredMemberId);
      } else if (selectedMemberId && !list.some((m: any) => String(m.id || m.memberId) === selectedMemberId)) {
        setSelectedMemberId("");
      }
    } catch {
      setMembersError("Não foi possível carregar a lista de alunos.");
    } finally {
      setMembersLoading(false);
    }
  }, [selectedMemberId]);

  const loadWorkoutSheets = useCallback(async (memberId: string, preferredSheetId?: string) => {
    try {
      setSheetsLoading(true);
      setSheetsError("");
      const response = await getWorkoutSheetsByMember(memberId);
      const list = Array.isArray(response) ? response : [];
      setWorkoutSheets(list);

      if (preferredSheetId && list.some((s: any) => String(s.id) === preferredSheetId)) {
        setSelectedSheetId(preferredSheetId);
      } else {
        const active = list.find((s: any) => s.active);
        setSelectedSheetId(active?.id ? String(active.id) : list[0]?.id ? String(list[0].id) : "");
      }
    } catch {
      setWorkoutSheets([]);
      setSelectedSheetId("");
      setSheetsError("Não foi possível carregar as fichas deste aluno.");
    } finally {
      setSheetsLoading(false);
    }
  }, []);

  const loadSheetExercises = useCallback(async (workoutSheetId: string) => {
    try {
      setSheetExercisesLoading(true);
      setSheetExercisesError("");
      const response = await getWorkoutExercisesBySheet(workoutSheetId);
      setSheetExercises(Array.isArray(response) ? response : []);
    } catch {
      setSheetExercises([]);
      setSheetExercisesError("Não foi possível carregar os exercícios da ficha.");
    } finally {
      setSheetExercisesLoading(false);
    }
  }, []);

  const loadCatalog = useCallback(async (filters: { name?: string; muscle?: string; category?: string } = {}) => {
    try {
      setCatalogLoading(true);
      setCatalogError("");
      const response = await searchExerciseCatalog(filters);
      setCatalogResults(Array.isArray(response) ? response : []);
    } catch {
      setCatalogResults([]);
      setCatalogError("Não foi possível carregar os exercícios do catálogo.");
    } finally {
      setCatalogLoading(false);
    }
  }, []);

  // ── Efeitos ────────────────────────────────────────────────────────────────
  useEffect(() => {
    loadMembers();
  }, [loadMembers]);

  useEffect(() => {
    if (!selectedMemberId) {
      setWorkoutSheets([]);
      setSelectedSheetId("");
      setSheetExercises([]);
      return;
    }
    loadWorkoutSheets(selectedMemberId);
  }, [selectedMemberId, loadWorkoutSheets]);

  useEffect(() => {
    if (!selectedSheetId) {
      setSheetExercises([]);
      return;
    }
    loadSheetExercises(selectedSheetId);
  }, [selectedSheetId, loadSheetExercises]);

  // ── Handlers Funcionais ────────────────────────────────────────────────────
  const handleManageStudent = (student: StudentViewModel) => {
    setSelectedMemberId(student.id);
    setActiveTab("fichas");
  };

  const handleSelectSheet = (sheetId: string) => {
    setSelectedSheetId(sheetId);
  };

  const handleCreateSheet = async (formData: NewSheetFormData) => {
    if (!selectedMemberId) return false;

    try {
      setCreatingSheet(true);
      setSheetsError("");
      setSheetSuccess("");

      const response = await createWorkoutSheet({
        memberId: selectedMemberId,
        title: formData.title,
        weekDay: formData.weekDay,
      });

      const newId = response?.id ? String(response.id) : undefined;
      await Promise.all([
        loadMembers(selectedMemberId),
        loadWorkoutSheets(selectedMemberId, newId),
      ]);

      setSheetSuccess(`Ficha "${formData.title}" criada com sucesso!`);
      return true;
    } catch (err: any) {
      setSheetsError(err?.message || "Não foi possível criar a ficha de treino.");
      return false;
    } finally {
      setCreatingSheet(false);
    }
  };

  const handleSearchCatalog = (query: { name?: string; muscle?: string; category?: string }) => {
    return loadCatalog(query);
  };

  const handleSaveExercise = async (prescription: PrescriptionFormData, catalogItem: CatalogExerciseViewModel) => {
    try {
      setSaveLoading(true);
      setSaveError("");
      setSaveSuccess("");

      await createWorkoutExercise({
        workoutSheetId: prescription.workoutSheetId,
        externalName: catalogItem.name,
        muscle: catalogItem.muscle === "Geral" ? "" : catalogItem.muscle,
        exerciseType: catalogItem.category === "Geral" ? "" : catalogItem.category,
        equipment: catalogItem.equipment || "",
        difficulty: "",
        instructions: catalogItem.instructions || "",
        sets: prescription.sets,
        reps: prescription.reps,
        restSeconds: prescription.restSeconds,
        notes: prescription.notes || "",
      });

      await loadSheetExercises(prescription.workoutSheetId);
      setSaveSuccess(`Exercício "${catalogItem.name}" adicionado à ficha com sucesso!`);
      return true;
    } catch (err: any) {
      setSaveError(err?.message || "Não foi possível adicionar o exercício à ficha.");
      return false;
    } finally {
      setSaveLoading(false);
    }
  };

  const handleCreateCustomExercise = async (data: CustomExerciseFormData) => {
    try {
      setCustomLoading(true);
      setCustomError("");
      setSaveSuccess("");

      const response = await createExerciseCatalog({
        name: data.name,
        category: data.category,
        muscle: data.muscle,
        equipment: data.equipment,
        instructions: data.instructions,
      });

      const canInsertLocally = Boolean(response && typeof response === "object" && !Array.isArray(response));
      if (canInsertLocally) {
        setCatalogResults((current) => {
          const responseId = response?.id ? String(response.id) : "";
          const alreadyPresent = current.some((item) =>
            responseId
              ? String(item?.id) === responseId
              : String(item?.name || "").toLocaleLowerCase("pt-BR") === data.name.toLocaleLowerCase("pt-BR"),
          );
          return alreadyPresent ? current : [...current, response];
        });
      }

      setSaveSuccess(`Exercício personalizado "${data.name}" cadastrado com sucesso.`);
      return { success: true, catalogUpdated: canInsertLocally };
    } catch (err: any) {
      setCustomError(err?.message || "Não foi possível cadastrar o exercício personalizado.");
      return { success: false, catalogUpdated: false };
    } finally {
      setCustomLoading(false);
    }
  };

  const handleExportPdf = async () => {
    if (!selectedStudentViewModel) return;

    try {
      setPdfLoading(true);

      // Mapeia todas as fichas do aluno com os exercícios carregados
      const workoutsPayload = sheetViewModels.map((s) => ({
        weekDay: s.weekDay,
        title: s.title,
        exercises: (s.id === selectedSheetId ? exerciseViewModels : []).map((ex) => ({
          name: ex.exerciseName,
          muscle: ex.muscle,
          sets: ex.sets,
          reps: ex.reps,
          restSeconds: ex.restSeconds,
          instructions: ex.notes || ex.instructions,
        })),
      }));

      await exportWorkoutPdf({
        studentName: selectedStudentViewModel.name,
        planName: "Musculação",
        status: selectedStudentViewModel.status,
        workouts: workoutsPayload,
      });
    } catch (err) {
      console.error("Erro ao gerar PDF:", err);
    } finally {
      setPdfLoading(false);
    }
  };

  const handleLogout = () => {
    logout();
    router.replace("/login");
  };

  return (
    <ProtectedRoute allowedRoles={["PERSONAL_TRAINER"]}>
      <div className="min-h-screen bg-background text-foreground">
        {/* Header Exclusivo e Moderno do Personal */}
        <PersonalHeader
          userName={user?.name || "Personal Trainer"}
          onLogout={handleLogout}
        />

        {/* Workspace Principal Responsivo Centralizado (1400px) */}
        <main className="mx-auto max-w-[1400px] space-y-6 px-4 py-6 sm:px-6 lg:py-8">
          {/* Header row: Gestão de treinos + Segmented Tabs (Estrutura Fiel do Lovable) */}
          <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <h1 className="text-2xl font-bold tracking-tight sm:text-3xl text-foreground">Gestão de treinos</h1>
              <p className="mt-1 text-sm text-muted-foreground">
                {members.length} {members.length === 1 ? "aluno sob sua supervisão" : "alunos sob sua supervisão"}
              </p>
            </div>
            <nav className="flex w-full gap-1 overflow-x-auto rounded-xl border border-border bg-card p-1 lg:w-auto">
              {tabs.map((t) => {
                const isActive = activeTab === t.key;
                const isDisabled =
                  (t.key === "fichas" && !selectedMemberId) ||
                  (t.key === "montar" && (!selectedMemberId || !selectedSheetViewModel));

                return (
                  <button
                    key={t.key}
                    type="button"
                    onClick={() => {
                      if (!isDisabled) setActiveTab(t.key);
                    }}
                    disabled={isDisabled}
                    className={cn(
                      "flex flex-1 items-center justify-center gap-2 whitespace-nowrap rounded-lg px-4 py-2 text-sm font-medium transition-all duration-200 lg:flex-none cursor-pointer",
                      isActive
                        ? "bg-primary text-primary-foreground shadow-brand"
                        : "text-muted-foreground hover:bg-muted hover:text-foreground",
                      isDisabled && "cursor-not-allowed opacity-40 hover:bg-transparent hover:text-muted-foreground",
                    )}
                  >
                    <t.icon className="size-4" />
                    {t.label}
                  </button>
                );
              })}
            </nav>
          </div>

          {/* Breadcrumb / Botão de Voltar Contextual */}
          {activeTab !== "alunos" && (
            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setActiveTab(activeTab === "montar" ? "fichas" : "alunos")}
                className="h-8 px-2 text-muted-foreground hover:text-foreground text-sm font-medium"
              >
                <ArrowLeft className="size-4 mr-1" />
                {activeTab === "montar" ? "Voltar para Fichas do Aluno" : "Voltar para Meus Alunos"}
              </Button>
            </div>
          )}

          {/* Renderização Condicional da Aba Ativa */}
          <div key={activeTab}>
            {/* Aba 1: Meus Alunos */}
            {activeTab === "alunos" && (
              <StudentsPanel
                students={studentViewModels}
                loading={membersLoading}
                error={membersError}
                onManage={handleManageStudent}
                selectedStudentId={selectedMemberId}
              />
            )}

            {/* Aba 2: Fichas do Aluno */}
            {activeTab === "fichas" && selectedStudentViewModel && (
              <SheetsPanel
                student={selectedStudentViewModel}
                sheets={sheetViewModels}
                selectedSheetId={selectedSheetId}
                exercises={exerciseViewModels}
                loading={sheetsLoading}
                creatingSheet={creatingSheet}
                error={sheetsError}
                successMessage={sheetSuccess}
                onSelectSheet={handleSelectSheet}
                onCreateSheet={handleCreateSheet}
                onGoToBuilder={() => setActiveTab("montar")}
                onExportPdf={handleExportPdf}
                pdfLoading={pdfLoading}
              />
            )}

            {/* Aba 3: Montar Treino / Builder */}
            {activeTab === "montar" && selectedStudentViewModel && selectedSheetViewModel && (
              <BuilderPanel
                student={selectedStudentViewModel}
                sheet={selectedSheetViewModel}
                exercises={exerciseViewModels}
                catalogResults={catalogViewModels}
                loadingExercises={sheetExercisesLoading}
                loadingCatalog={catalogLoading}
                savingExercise={saveLoading}
                creatingCustom={customLoading}
                error={sheetExercisesError || catalogError || saveError || customError}
                successMessage={saveSuccess}
                onSearchCatalog={handleSearchCatalog}
                onSaveExercise={handleSaveExercise}
                onCreateCustomExercise={handleCreateCustomExercise}
              />
            )}
          </div>
        </main>
      </div>
    </ProtectedRoute>
  );
}
