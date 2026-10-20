"use client";

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Users, ClipboardList, LayoutGrid, Dumbbell } from "lucide-react";
import ProtectedRoute from "@/components/auth/ProtectedRoute";
import { useAuth } from "@/hooks/useAuth";
import "../graphite-tokens.css";
import "../dashboard/registry.css";
import "../dashboard/catalog.css";
import "../dashboard/microkit-focus.css";
import "./personal.css";
import "./workouts.css";
import {
  createExerciseCatalog,
  createWorkoutExercise,
  createWorkoutSheet,
  deleteWorkoutSheet,
  getMyStudents,
  getWorkoutExercisesBySheet,
  getWorkoutSheetsByMember,
  getWorkoutSheet,
  updateWorkoutSheet,
  searchExerciseCatalog,
} from "@/services/api";
import exportWorkoutPdf from "@/components/reports/exportWorkoutPdf";
import { Button } from "@/components/ui/button";
import { PersonalHeader, PersonalTabKey } from "@/components/personal/PersonalHeader";
import { StudentsPanel } from "@/components/personal/StudentsPanel";
import { SheetsPanel } from "@/components/personal/SheetsPanel";
import { BuilderPanel } from "@/components/personal/BuilderPanel";
import { FloatingChat } from "@/components/chat/FloatingChat";
import ExerciseCatalogSection from "@/components/dashboard/sections/ExerciseCatalogSection";
import {
  StudentViewModel,
  WorkoutSheetViewModel,
  WorkoutExerciseViewModel,
  CatalogExerciseViewModel,
  NewSheetFormData,
  PrescriptionFormData,
  CustomExerciseFormData,
  WorkoutSheetUpdateData,
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
  { key: "catalogo", label: "Catálogo", icon: Dumbbell },
];

export default function PersonalPage() {
  const router = useRouter();
  const { user, logout } = useAuth();

  // ── Navegação entre Abas ───────────────────────────────────────────────────
  const [activeTab, setActiveTab] = useState<PersonalTabKey>("alunos");

  // ── Alunos Reais ───────────────────────────────────────────────────────────
  const [members, setMembers] = useState<StudentViewModel[]>([]);
  const [selectedMemberId, setSelectedMemberId] = useState("");
  const [membersLoading, setMembersLoading] = useState(true);
  const [membersError, setMembersError] = useState("");

  // ── Fichas Reais ───────────────────────────────────────────────────────────
  const [workoutSheets, setWorkoutSheets] = useState<WorkoutSheetViewModel[]>([]);
  const [selectedSheetId, setSelectedSheetId] = useState("");
  const [sheetsLoading, setSheetsLoading] = useState(false);
  const [sheetsError, setSheetsError] = useState("");
  const [sheetSuccess, setSheetSuccess] = useState("");
  const [creatingSheet, setCreatingSheet] = useState(false);
  const [deletingSheet, setDeletingSheet] = useState(false);
  const [editSession, setEditSession] = useState<{ sheet: WorkoutSheetViewModel; exercises: WorkoutExerciseViewModel[] } | null>(null);
  const [editingLoading, setEditingLoading] = useState(false);
  const [savingSheet, setSavingSheet] = useState(false);
  const editRequestRef = useRef(0);

  // ── Exercícios da Ficha ────────────────────────────────────────────────────
  const [sheetExercises, setSheetExercises] = useState<WorkoutExerciseViewModel[]>([]);
  const [sheetExercisesLoading, setSheetExercisesLoading] = useState(false);
  const [sheetExercisesError, setSheetExercisesError] = useState("");

  // ── Catálogo de Exercícios ─────────────────────────────────────────────────
  const [catalogResults, setCatalogResults] = useState<CatalogExerciseViewModel[]>([]);
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

      if (preferredMemberId && list.some((m: StudentViewModel) => String(m.id || m.memberId) === preferredMemberId)) {
        setSelectedMemberId(preferredMemberId);
      } else if (selectedMemberId && !list.some((m: StudentViewModel) => String(m.id || m.memberId) === selectedMemberId)) {
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

      if (preferredSheetId && list.some((s: WorkoutSheetViewModel) => String(s.id) === preferredSheetId)) {
        setSelectedSheetId(preferredSheetId);
      } else {
        const active = list.find((s: WorkoutSheetViewModel) => s.active);
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

  const loadCatalog = useCallback(async (filters: { name?: string; muscle?: string; category?: string; equipment?: string } = {}) => {
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
    setSheetSuccess("");
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
    editRequestRef.current++;
    setEditSession(null);
    setEditingLoading(false);
    setSelectedSheetId(sheetId);
  };

  const handleEditSheet = async (sheet: WorkoutSheetViewModel) => {
    const requestId = ++editRequestRef.current;
    setEditingLoading(true);
    setSheetsError("");
    setSaveError("");
    setSaveSuccess("");
    try {
      const detail = await getWorkoutSheet(sheet.id);
      if (requestId !== editRequestRef.current) return;
      if (!detail?.sheet?.active) throw new Error("Ficha inativa não pode ser editada.");
      setEditSession({ sheet: mapWorkoutSheet(detail.sheet), exercises: (detail.exercises || []).map(mapWorkoutExercise) });
      setActiveTab("montar");
    } catch (err: unknown) {
      if (requestId === editRequestRef.current) setSheetsError(err instanceof Error ? err.message : "Não foi possível abrir a edição.");
    } finally {
      if (requestId === editRequestRef.current) setEditingLoading(false);
    }
  };

  const handleUpdateSheet = async (data: WorkoutSheetUpdateData) => {
    if (!editSession || savingSheet) return false;
    setSavingSheet(true);
    setSaveError("");
    try {
      const result = await updateWorkoutSheet(editSession.sheet.id, data);
      setWorkoutSheets((current) => current.map((sheet) => String(sheet.id) === String(result.sheet.id) ? result.sheet : sheet));
      setSheetExercises(result.exercises || []);
      setSheetSuccess("Ficha atualizada. A versão anterior está disponível no histórico.");
      setEditSession(null);
      setActiveTab("fichas");
      return true;
    } catch (err: unknown) {
      setSaveError(err instanceof Error ? err.message : "Não foi possível salvar a edição.");
      return false;
    } finally { setSavingSheet(false); }
  };

  const changeTab = (tab: PersonalTabKey) => {
    if (savingSheet) return;
    if (editSession && tab !== "montar" && !window.confirm("Descartar as alterações ainda não salvas desta ficha?")) return;
    if (tab !== "montar") setEditSession(null);
    editRequestRef.current++;
    setEditingLoading(false);
    setActiveTab(tab);
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
    } catch (err: unknown) {
      setSheetsError(err instanceof Error ? err.message : "Não foi possível criar a ficha de treino.");
      return false;
    } finally {
      setCreatingSheet(false);
    }
  };

  const handleDeleteSheet = async (sheet: WorkoutSheetViewModel) => {
    try {
      setDeletingSheet(true);
      setSheetsError("");
      setSheetSuccess("");

      await deleteWorkoutSheet(sheet.id);

      const remainingSheets = workoutSheets.filter((current) => String(current.id) !== sheet.id);
      const nextSheet = remainingSheets.find((current) => current.active) || remainingSheets[0];

      setWorkoutSheets(remainingSheets);
      setSelectedSheetId(nextSheet?.id ? String(nextSheet.id) : "");
      setSheetExercises([]);
      setSheetSuccess(`Ficha "${sheet.title}" inativada com sucesso!`);
      return true;
    } catch (err: unknown) {
      setSheetsError(err instanceof Error ? err.message : "NÃ£o foi possÃ­vel inativar a ficha de treino.");
      return false;
    } finally {
      setDeletingSheet(false);
    }
  };

  const handleSearchCatalog = (query: { name?: string; muscle?: string; category?: string; equipment?: string }) => {
    return loadCatalog(query);
  };

  const handleSaveExercise = async (prescription: PrescriptionFormData, catalogItem: CatalogExerciseViewModel) => {
    try {
      setSaveLoading(true);
      setSaveError("");
      setSaveSuccess("");

      await createWorkoutExercise({
        workoutSheetId: prescription.workoutSheetId,
        catalogExerciseId: catalogItem.id,
        externalName: catalogItem.name,
        muscle: catalogItem.muscle,
        exerciseType: catalogItem.category,
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
    } catch (err: unknown) {
      setSaveError(err instanceof Error ? err.message : "Não foi possível adicionar o exercício à ficha.");
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
          return alreadyPresent ? current : [...current, response as unknown as CatalogExerciseViewModel];
        });
      }

      setSaveSuccess(`Exercício personalizado "${data.name}" cadastrado com sucesso.`);
      return { success: true, catalogUpdated: canInsertLocally };
    } catch (err: unknown) {
      setCustomError(err instanceof Error ? err.message : "Não foi possível cadastrar o exercício personalizado.");
      return { success: false, catalogUpdated: false };
    } finally {
      setCustomLoading(false);
    }
  };

  const handleExportPdf = async () => {
    if (!selectedStudentViewModel) return;

    try {
      setPdfLoading(true);

      // Mapeia todas as fichas do aluno; a ficha selecionada reutiliza o que já está
      // carregado e as demais têm seus exercícios consultados (somente leitura).
      const workoutsPayload = await Promise.all(
        [...sheetViewModels].sort((a, b) => Number(b.active) - Number(a.active)).map(async (s) => {
          let sheetExerciseList: WorkoutExerciseViewModel[] = exerciseViewModels;
          if (s.id !== selectedSheetId) {
            const response = await getWorkoutExercisesBySheet(s.id);
            sheetExerciseList = (Array.isArray(response) ? response : []).map((e, i) => mapWorkoutExercise(e, i));
          }
          return {
            weekDay: s.weekDay,
            title: s.title,
            exercises: sheetExerciseList.map((ex) => ({
              name: ex.exerciseName,
              muscle: ex.muscle,
              sets: ex.sets,
              reps: ex.reps,
              restSeconds: ex.restSeconds,
              notes: ex.notes || ex.instructions,
            })),
          };
        }),
      );

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
      <div className="graphite-personal gp-personal-shell">
        <a className="gp-personal-skip" href="#personal-content">Pular para o conteúdo</a>
        {/* Header Exclusivo e Moderno do Personal */}
        <PersonalHeader
          userName={user?.name || "Personal Trainer"}
          onLogout={handleLogout}
        />

        <main id="personal-content" tabIndex={-1} className="gp-personal-main">
          <div className="gp-personal-title">
            <h1>Gestão de treinos</h1>
            <p>{membersLoading ? "Carregando alunos…" : membersError ? "Acompanhe seus alunos e organize suas fichas de treino." : `${members.length} ${members.length === 1 ? "aluno sob sua supervisão" : "alunos sob sua supervisão"}`}</p>
          </div>
          <nav className="gp-personal-navigation" aria-label="Áreas do personal" aria-describedby="personal-navigation-help">
            {tabs.map((t) => {
              const isDisabled = (t.key === "fichas" && !selectedMemberId) || (t.key === "montar" && (!selectedMemberId || !selectedSheetViewModel));
              return <button key={t.key} type="button" onClick={() => { if (!isDisabled) changeTab(t.key); }} disabled={isDisabled || savingSheet} aria-current={activeTab === t.key ? "page" : undefined} aria-controls="personal-workspace">
                <t.icon size={18} aria-hidden="true" />{t.label}
              </button>;
            })}
          </nav>
          <p id="personal-navigation-help" className="gp-personal-context">
            {selectedStudentViewModel ? <>Aluno selecionado: <strong>{selectedStudentViewModel.name}</strong>{!selectedSheetViewModel && " · Selecione ou crie uma ficha para montar o treino."}</> : "Selecione um aluno em Gerenciar ficha para acessar suas fichas e montar o treino."}
          </p>

          {/* Breadcrumb / Botão de Voltar Contextual */}
          {activeTab !== "alunos" && (
            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => changeTab(activeTab === "montar" ? "fichas" : "alunos")}
                disabled={savingSheet}
                className="gp-personal-back"
              >
                <ArrowLeft className="size-4 mr-1" aria-hidden="true" />
                {activeTab === "montar" ? "Voltar para Fichas do Aluno" : "Voltar para Meus Alunos"}
              </Button>
            </div>
          )}

          {/* Renderização Condicional da Aba Ativa */}
          <div id="personal-workspace" key={activeTab}>
            {activeTab === "catalogo" && <ExerciseCatalogSection />}
            {/* Aba 1: Meus Alunos */}
            {activeTab === "alunos" && (
              <StudentsPanel
                students={studentViewModels}
                loading={membersLoading}
                error={membersError}
                onManage={handleManageStudent}
                onRetry={() => loadMembers()}
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
                deletingSheet={deletingSheet}
                error={sheetsError}
                successMessage={sheetSuccess}
                onSelectSheet={handleSelectSheet}
                onCreateSheet={handleCreateSheet}
                onDeleteSheet={handleDeleteSheet}
                onGoToBuilder={() => setActiveTab("montar")}
                onEditSheet={handleEditSheet}
                editingLoading={editingLoading}
                onExportPdf={handleExportPdf}
                pdfLoading={pdfLoading}
                onClearSuccess={() => setSheetSuccess("")}
              />
            )}

            {/* Aba 3: Montar Treino / Builder */}
            {activeTab === "montar" && selectedStudentViewModel && selectedSheetViewModel && (
              <BuilderPanel
                key={`${selectedSheetId}-${editSession ? `edit-${editSession.sheet.version}` : "add"}`}
                student={selectedStudentViewModel}
                sheet={editSession?.sheet || selectedSheetViewModel}
                exercises={editSession?.exercises || exerciseViewModels}
                catalogResults={catalogViewModels}
                loadingExercises={sheetExercisesLoading}
                loadingCatalog={catalogLoading}
                savingExercise={saveLoading || savingSheet}
                editing={Boolean(editSession)}
                onUpdateSheet={handleUpdateSheet}
                onCancelEdit={() => changeTab("fichas")}
                creatingCustom={customLoading}
                error={sheetExercisesError || catalogError || saveError || customError}
                successMessage={saveSuccess}
                onSearchCatalog={handleSearchCatalog}
                onSaveExercise={handleSaveExercise}
                onCreateCustomExercise={handleCreateCustomExercise}
                onClearSuccess={() => setSaveSuccess("")}
              />
            )}
          </div>
        </main>

        {/* Chat Flutuante Persistente */}
        <FloatingChat
          userRole="PERSONAL"
          students={members.map((m) => ({ id: m.id, name: m.name }))}
          currentStudentId={selectedMemberId || undefined}
          onSelectStudent={(id) => setSelectedMemberId(id)}
        />
      </div>
    </ProtectedRoute>
  );
}
