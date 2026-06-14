"use client";

import { CSSProperties, FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import DashboardLayout, { createDashboardThemeStyles } from "../../components/layout/DashboardLayout";
import ProtectedRoute from "../../components/auth/ProtectedRoute";
import { useThemeMode } from "../../hooks/useThemeMode";
import {
  createExerciseCatalog,
  createWorkoutExercise,
  createWorkoutSheet,
  getMyStudents,
  getWorkoutExercisesBySheet,
  getWorkoutSheetsByMember,
  searchExerciseCatalog,
} from "../../services/api";

// ── Tipos ─────────────────────────────────────────────────────────────────────

type MemberRow = {
  id: string;
  nome: string;
  cpf: string;
  situacao: string;
  activeWorkoutSheetId: string | null;
};

type WorkoutSheet = {
  id: string;
  memberId: string;
  title: string;
  weekDay: string;
  weekDayLabel: string;
  active: boolean;
  createdAt: string;
};

type WorkoutExerciseItem = {
  id: string;
  workoutSheetId: string;
  exerciseName: string;
  muscle: string;
  exerciseType: string;
  equipment: string;
  difficulty: string;
  instructions: string;
  sets: number;
  reps: number;
  restSeconds: number;
  notes: string;
};

/** Exercício do catálogo interno (campos em português) */
type ExerciseCatalogItem = {
  id: string;
  name: string;
  category: string;
  muscle: string;
  equipment: string;
  instructions: string;
  isCustom: boolean;
};

type ExerciseFormState = {
  workoutSheetId: string;
  sets: string;
  reps: string;
  restSeconds: string;
  notes: string;
};

type CustomExerciseFormState = {
  name: string;
  category: string;
  muscle: string;
  equipment: string;
  instructions: string;
};

type PersonalPageStyles = {
  pageHeader: CSSProperties;
  pageTitle: CSSProperties;
  pageDesc: CSSProperties;
  statsRow: CSSProperties;
  statCard: (accent?: string) => CSSProperties;
  statNum: CSSProperties;
  statLabel: CSSProperties;
  card: CSSProperties;
  empty: CSSProperties;
  table: CSSProperties;
  th: CSSProperties;
  td: CSSProperties;
  badge: (color: string, bg: string) => CSSProperties;
  filterRow: CSSProperties;
  fieldGroup: CSSProperties;
  label: CSSProperties;
  input: CSSProperties;
  select: CSSProperties;
  btn: CSSProperties;
  btnOutline: CSSProperties;
};

// ── Estilos fixos ─────────────────────────────────────────────────────────────

const MODAL_STYLES = {
  overlay: {
    position: "fixed",
    inset: 0,
    background: "rgba(0, 0, 0, 0.55)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    padding: 20,
    zIndex: 999,
  } as const,
  panel: {
    width: "100%",
    maxWidth: 640,
    borderRadius: 16,
    border: "1px solid #E0E0E0",
    padding: 24,
    boxShadow: "0 24px 48px rgba(0, 0, 0, 0.22)",
    maxHeight: "90vh",
    overflowY: "auto" as const,
  } as const,
};

// ── Constantes de filtro ───────────────────────────────────────────────────────

const CATEGORY_OPTIONS = [
  { value: "", label: "Todas as categorias" },
  { value: "Peito", label: "Peito" },
  { value: "Costas e Dorsais", label: "Costas e Dorsais" },
  { value: "Lombar", label: "Lombar" },
  { value: "Ombros", label: "Ombros" },
  { value: "Bíceps", label: "Bíceps" },
  { value: "Tríceps", label: "Tríceps" },
  { value: "Antebraço", label: "Antebraço" },
  { value: "Quadríceps", label: "Quadríceps" },
  { value: "Posterior de Coxa", label: "Posterior de Coxa" },
  { value: "Glúteos", label: "Glúteos" },
  { value: "Panturrilhas", label: "Panturrilhas" },
  { value: "Abdômen", label: "Abdômen" },
];

const MUSCLE_OPTIONS = [
  { value: "", label: "Todos os músculos" },
  { value: "Peitoral", label: "Peitoral" },
  { value: "Dorsal", label: "Dorsal" },
  { value: "Lombar", label: "Lombar" },
  { value: "Deltoides", label: "Deltoides" },
  { value: "Bíceps", label: "Bíceps" },
  { value: "Tríceps", label: "Tríceps" },
  { value: "Antebraço", label: "Antebraço" },
  { value: "Quadríceps", label: "Quadríceps" },
  { value: "Posterior", label: "Posterior de Coxa" },
  { value: "Glúteos", label: "Glúteos" },
  { value: "Panturrilha", label: "Panturrilha" },
  { value: "Abdômen", label: "Abdômen" },
];

const WEEK_DAY_OPTIONS = [
  { value: "MONDAY", label: "Segunda-feira" },
  { value: "TUESDAY", label: "Terça-feira" },
  { value: "WEDNESDAY", label: "Quarta-feira" },
  { value: "THURSDAY", label: "Quinta-feira" },
  { value: "FRIDAY", label: "Sexta-feira" },
  { value: "SATURDAY", label: "Sábado" },
  { value: "SUNDAY", label: "Domingo" },
];

const EMPTY_FORM: ExerciseFormState = {
  workoutSheetId: "",
  sets: "4",
  reps: "12",
  restSeconds: "60",
  notes: "",
};

const EMPTY_CUSTOM_FORM: CustomExerciseFormState = {
  name: "",
  category: "",
  muscle: "",
  equipment: "",
  instructions: "",
};

// ── Helpers ───────────────────────────────────────────────────────────────────

function readString(value: unknown, fallback = "") {
  return typeof value === "string" && value.trim() ? value : fallback;
}

function normalizeStudentStatus(member: Record<string, unknown>) {
  if (member.active === false || member.isActive === false || member.is_active === false) {
    return "Inativo";
  }
  return readString(member.situacao, "Ativo");
}

function normalizeStudents(response: unknown[]): MemberRow[] {
  return response.map((entry, index) => {
    const member = entry && typeof entry === "object" ? (entry as Record<string, unknown>) : {};
    return {
      id: String(member.id ?? member.memberId ?? member.member_id ?? `member-${index}`),
      nome: readString(member.name, readString(member.nome, "-")),
      cpf: readString(member.cpf, "-"),
      situacao: normalizeStudentStatus(member),
      activeWorkoutSheetId: (() => {
        const rawValue =
          member.activeWorkoutSheetId ??
          member.active_workout_sheet_id ??
          member.workoutSheetId ??
          member.workout_sheet_id;
        return rawValue ? String(rawValue) : null;
      })(),
    };
  });
}

function normalizeWorkoutSheets(response: unknown[]): WorkoutSheet[] {
  return response.map((entry, index) => {
    const sheet = entry && typeof entry === "object" ? (entry as Record<string, unknown>) : {};
    return {
      id: String(sheet.id ?? `sheet-${index}`),
      memberId: String(sheet.memberId ?? sheet.member_id ?? ""),
      title: readString(sheet.title, `Treino ${index + 1}`),
      weekDay: readString(sheet.weekDay, readString(sheet.week_day, "")),
      weekDayLabel: readString(sheet.weekDayLabel, readString(sheet.week_day_label, "Sem dia definido")),
      active: Boolean(sheet.active ?? sheet.isActive ?? sheet.is_active),
      createdAt: readString(sheet.createdAt, readString(sheet.created_at, "")),
    };
  });
}

function normalizeWorkoutExercises(response: unknown[]): WorkoutExerciseItem[] {
  return response.map((entry, index) => {
    const exercise = entry && typeof entry === "object" ? (entry as Record<string, unknown>) : {};
    return {
      id: String(exercise.id ?? `workout-exercise-${index}`),
      workoutSheetId: String(exercise.workoutSheetId ?? exercise.workout_sheet_id ?? ""),
      exerciseName: readString(exercise.exerciseName, readString(exercise.exercise_name, `Exercicio ${index + 1}`)),
      muscle: readString(exercise.muscle, "-"),
      exerciseType: readString(exercise.exerciseType, readString(exercise.exercise_type, "-")),
      equipment: readString(exercise.equipment, "-"),
      difficulty: readString(exercise.difficulty, ""),
      instructions: readString(exercise.instructions, "Sem instrucoes disponiveis."),
      sets: Number(exercise.sets ?? 0),
      reps: Number(exercise.reps ?? 0),
      restSeconds: Number(exercise.restSeconds ?? exercise.rest_seconds ?? 0),
      notes: readString(exercise.notes, ""),
    };
  });
}

function normalizeCatalogResults(response: unknown[]): ExerciseCatalogItem[] {
  return response.map((entry, index) => {
    const exercise = entry && typeof entry === "object" ? (entry as Record<string, unknown>) : {};
    return {
      id: String(exercise.id ?? `exercise-${index}`),
      name: readString(exercise.name, `Exercicio ${index + 1}`),
      category: readString(exercise.category, "-"),
      muscle: readString(exercise.muscle, "-"),
      equipment: readString(exercise.equipment, ""),
      instructions: readString(exercise.instructions, "Sem instrucoes disponiveis."),
      isCustom: Boolean(exercise.isCustom ?? exercise.is_custom),
    };
  });
}

function formatDate(value: string) {
  if (!value) return "Sem data";
  const normalized = value.includes("T") ? value.split("T")[0] : value;
  const [year, month, day] = normalized.split("-");
  if (!year || !month || !day) return value;
  return `${day}/${month}/${year}`;
}

function formatPrescription(exercise: WorkoutExerciseItem) {
  const sets = exercise.sets > 0 ? `${exercise.sets} séries` : null;
  const reps = exercise.reps > 0 ? `${exercise.reps} repetições` : null;
  const rest = exercise.restSeconds >= 0 ? `${exercise.restSeconds}s descanso` : null;
  return [sets, reps, rest].filter(Boolean).join(" | ");
}

function getExerciseDifficulty(name: string) {
  const hash = name.split("").reduce((acc, char) => acc + char.charCodeAt(0), 0);
  const diffs = ["Iniciante", "Intermediário", "Avançado"];
  return diffs[hash % 3];
}

function ExerciseCatalogCard({
  exercise,
  difficulty,
  onAdd,
  isDark,
  themeStyles,
  styles,
}: {
  exercise: ExerciseCatalogItem;
  difficulty: string;
  onAdd: () => void;
  isDark: boolean;
  themeStyles: any;
  styles: any;
}) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <article className="rounded-[24px] border border-slate-200 dark:border-slate-800 p-5 shadow-sm bg-white dark:bg-slate-900/60 flex flex-col justify-between gap-4 transition-all duration-300 hover:shadow-md hover:scale-[1.01]">
      <div className="flex flex-col gap-3">
        <div className="flex items-start justify-between gap-2">
          <h3 className="text-base font-extrabold tracking-tight text-slate-900 dark:text-white" style={{ margin: 0 }}>
            {exercise.name}
          </h3>
          {exercise.isCustom && (
            <span className="inline-flex px-2 py-0.5 rounded-full text-[9px] font-bold bg-amber-500/10 text-amber-700 dark:text-amber-400 border border-amber-500/20">
              Personalizado
            </span>
          )}
        </div>

        {/* Badges */}
        <div className="flex gap-2 flex-wrap">
          <span className="inline-flex px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-blue-500/10 text-blue-700 dark:text-blue-400 border border-blue-500/20">
            {exercise.muscle}
          </span>
          {exercise.equipment && (
            <span className="inline-flex px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-purple-500/10 text-purple-700 dark:text-purple-400 border border-purple-500/20">
              {exercise.equipment}
            </span>
          )}
          <span className={`inline-flex px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${
            difficulty === "Iniciante"
              ? "bg-green-500/10 text-green-700 dark:text-green-400 border-green-500/20"
              : difficulty === "Intermediário"
              ? "bg-yellow-500/10 text-yellow-700 dark:text-yellow-400 border-yellow-500/20"
              : "bg-red-500/10 text-red-700 dark:text-red-400 border-red-500/20"
          }`}>
            {difficulty}
          </span>
        </div>
      </div>

      <div className="flex flex-col gap-3 mt-2">
        {/* Accordion Instructions */}
        <div className="border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden">
          <button
            type="button"
            onClick={() => setIsOpen(!isOpen)}
            className="w-full flex items-center justify-between p-3 text-left text-xs font-semibold bg-slate-50 dark:bg-slate-900 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            <span>📖 Instruções</span>
            <svg
              className={`h-3 w-3 text-slate-400 transition-transform duration-300 ${isOpen ? "rotate-180" : ""}`}
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth="2.5"
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
            </svg>
          </button>
          
          <div className={`transition-all duration-300 ease-in-out ${
            isOpen ? "max-h-[200px] border-t border-slate-200 dark:border-slate-800" : "max-h-0 overflow-hidden"
          }`}>
            <div className="p-3 text-[11px] leading-relaxed text-slate-500 dark:text-slate-400 bg-white dark:bg-slate-950">
              {exercise.instructions || "Sem instruções cadastradas."}
            </div>
          </div>
        </div>

        {/* Add button */}
        <button
          type="button"
          onClick={onAdd}
          className="w-full h-10 rounded-xl bg-[#C0392B] hover:bg-[#A93226] text-white font-bold text-xs shadow-sm transition-all"
        >
          Adicionar ao treino
        </button>
      </div>
    </article>
  );
}

// ── Componente principal ───────────────────────────────────────────────────────

export default function PersonalPage() {
  const { isDark, themeStyles } = useThemeMode();
  const styles = useMemo(
    () => createDashboardThemeStyles(themeStyles) as unknown as PersonalPageStyles,
    [themeStyles]
  );
  const softSurfaceStyle = useMemo(
    () => ({
      border: `1px solid ${themeStyles.border}`,
      background: isDark ? "#111827" : "#f8fafc",
      color: themeStyles.text,
    }),
    [isDark, themeStyles]
  );

  // ── Estado do Layout em Abas e Modais de UX ──────────────────────────────────
  const [activeTab, setActiveTab] = useState<"students" | "sheets" | "workout">("students");
  const [showCreateSheetModal, setShowCreateSheetModal] = useState(false);
  const [sheetObjective, setSheetObjective] = useState("");

  // ── Estado: alunos ───────────────────────────────────────────────────────────
  const [members, setMembers] = useState<MemberRow[]>([]);
  const [selectedMemberId, setSelectedMemberId] = useState("");
  const [membersLoading, setMembersLoading] = useState(true);
  const [membersError, setMembersError] = useState("");

  const [studentSearch, setStudentSearch] = useState("");

  const filteredMembers = useMemo(() => {
    if (!studentSearch.trim()) return members;
    const term = studentSearch.toLowerCase().trim();
    return members.filter(
      (m) =>
        (m.nome && m.nome.toLowerCase().includes(term)) ||
        (m.cpf && m.cpf.toLowerCase().includes(term))
    );
  }, [members, studentSearch]);

  // ── Estado: fichas ───────────────────────────────────────────────────────────
  const [workoutSheets, setWorkoutSheets] = useState<WorkoutSheet[]>([]);
  const [selectedSheetId, setSelectedSheetId] = useState("");
  const [sheetTitle, setSheetTitle] = useState("Treino A");
  const [sheetWeekDay, setSheetWeekDay] = useState("MONDAY");
  const [sheetsLoading, setSheetsLoading] = useState(false);
  const [sheetsError, setSheetsError] = useState("");
  const [sheetSuccess, setSheetSuccess] = useState("");
  const [creatingSheet, setCreatingSheet] = useState(false);

  // ── Estado: exercícios da ficha ──────────────────────────────────────────────
  const [sheetExercises, setSheetExercises] = useState<WorkoutExerciseItem[]>([]);
  const [sheetExercisesLoading, setSheetExercisesLoading] = useState(false);
  const [sheetExercisesError, setSheetExercisesError] = useState("");

  // ── Estado: busca no catálogo ────────────────────────────────────────────────
  const [searchName, setSearchName] = useState("");
  const [searchCategory, setSearchCategory] = useState("");
  const [searchMuscle, setSearchMuscle] = useState("");
  const [filterEquipment, setFilterEquipment] = useState("");
  const [filterDifficulty, setFilterDifficulty] = useState("");
  const [catalogResults, setCatalogResults] = useState<ExerciseCatalogItem[]>([]);
  const [catalogLoading, setCatalogLoading] = useState(false);
  const [catalogError, setCatalogError] = useState("");

  // ── Estado: modal "adicionar ao treino" ──────────────────────────────────────
  const [selectedExercise, setSelectedExercise] = useState<ExerciseCatalogItem | null>(null);
  const [exerciseForm, setExerciseForm] = useState<ExerciseFormState>(EMPTY_FORM);
  const [saveLoading, setSaveLoading] = useState(false);
  const [saveError, setSaveError] = useState("");
  const [saveSuccess, setSaveSuccess] = useState("");

  // ── Estado: modal "criar exercício personalizado" ────────────────────────────
  const [showCustomModal, setShowCustomModal] = useState(false);
  const [customForm, setCustomForm] = useState<CustomExerciseFormState>(EMPTY_CUSTOM_FORM);
  const [customLoading, setCustomLoading] = useState(false);
  const [customError, setCustomError] = useState("");

  // ── Derivados ────────────────────────────────────────────────────────────────
  const selectedMember = useMemo(
    () => members.find((m) => m.id === selectedMemberId) || null,
    [members, selectedMemberId]
  );

  const selectedSheet = useMemo(
    () => workoutSheets.find((s) => s.id === selectedSheetId) || null,
    [workoutSheets, selectedSheetId]
  );

  const activeStudents = useMemo(() => members.filter((m) => m.situacao === "Ativo").length, [members]);
  const studentsWithWorkout = useMemo(() => members.filter((m) => !!m.activeWorkoutSheetId).length, [members]);
  const studentsWithoutWorkout = useMemo(() => members.filter((m) => !m.activeWorkoutSheetId).length, [members]);

  const finalCatalogResults = useMemo(() => {
    return catalogResults.filter((item) => {
      if (filterEquipment && !item.equipment?.toLowerCase().includes(filterEquipment.toLowerCase())) {
        return false;
      }
      const difficulty = getExerciseDifficulty(item.name);
      if (filterDifficulty && difficulty !== filterDifficulty) {
        return false;
      }
      return true;
    });
  }, [catalogResults, filterEquipment, filterDifficulty]);

  // ── Loaders ──────────────────────────────────────────────────────────────────
  const loadMembers = useCallback(async (preferredMemberId?: string) => {
    try {
      setMembersLoading(true);
      setMembersError("");
      const response = await getMyStudents();
      const normalized = Array.isArray(response) ? normalizeStudents(response) : [];
      setMembers(normalized);

      const preferredExists = preferredMemberId && normalized.some((m) => m.id === preferredMemberId);
      if (preferredExists) {
        setSelectedMemberId(preferredMemberId);
        return;
      }

      const currentExists = selectedMemberId && normalized.some((m) => m.id === selectedMemberId);
      if (!currentExists) setSelectedMemberId("");
    } catch {
      setMembersError("Nao foi possivel carregar a lista de alunos.");
    } finally {
      setMembersLoading(false);
    }
  }, [selectedMemberId]);

  const loadWorkoutSheets = useCallback(async (memberId: string, preferredSheetId?: string) => {
    try {
      setSheetsLoading(true);
      setSheetsError("");
      const response = await getWorkoutSheetsByMember(memberId);
      const normalized = Array.isArray(response) ? normalizeWorkoutSheets(response) : [];
      setWorkoutSheets(normalized);

      const preferredExists = preferredSheetId && normalized.some((s) => s.id === preferredSheetId);
      if (preferredExists) { setSelectedSheetId(preferredSheetId); return; }

      const active = normalized.find((s) => s.active);
      if (active) { setSelectedSheetId(active.id); return; }
      setSelectedSheetId(normalized[0]?.id || "");
    } catch {
      setWorkoutSheets([]);
      setSelectedSheetId("");
      setSheetsError("Nao foi possivel carregar as fichas de treino deste aluno.");
    } finally {
      setSheetsLoading(false);
    }
  }, []);

  const loadSheetExercises = useCallback(async (workoutSheetId: string) => {
    try {
      setSheetExercisesLoading(true);
      setSheetExercisesError("");
      const response = await getWorkoutExercisesBySheet(workoutSheetId);
      setSheetExercises(Array.isArray(response) ? normalizeWorkoutExercises(response) : []);
    } catch {
      setSheetExercises([]);
      setSheetExercisesError("Nao foi possivel carregar os exercicios da ficha selecionada.");
    } finally {
      setSheetExercisesLoading(false);
    }
  }, []);

  // ── Efeitos ──────────────────────────────────────────────────────────────────
  useEffect(() => { loadMembers(); }, [loadMembers]);

  useEffect(() => {
    if (!selectedMemberId) {
      setWorkoutSheets([]);
      setSelectedSheetId("");
      setSheetExercises([]);
      return;
    }
    loadWorkoutSheets(selectedMemberId);
  }, [loadWorkoutSheets, selectedMemberId]);

  useEffect(() => {
    if (!selectedSheetId) { setSheetExercises([]); return; }
    loadSheetExercises(selectedSheetId);
  }, [loadSheetExercises, selectedSheetId]);

  // ── Handlers: fichas ─────────────────────────────────────────────────────────
  const handleCreateWorkoutSheet = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!selectedMember) { setSheetsError("Selecione um aluno antes de criar a ficha."); return; }

    try {
      setCreatingSheet(true);
      setSheetsError("");
      setSheetSuccess("");
      setSaveSuccess("");

      const fullTitle = sheetTitle.trim() + (sheetObjective.trim() ? ` - ${sheetObjective.trim()}` : "");

      const response = await createWorkoutSheet({
        memberId: selectedMember.id,
        title: fullTitle,
        weekDay: sheetWeekDay,
      });

      const createdSheetId = response?.id ? String(response.id) : undefined;
      await Promise.all([loadMembers(selectedMember.id), loadWorkoutSheets(selectedMember.id, createdSheetId)]);

      setSheetTitle("Treino A");
      setSheetObjective("");
      setSheetWeekDay("MONDAY");
      setSheetSuccess(`Ficha criada para ${selectedMember.nome}.`);
      setShowCreateSheetModal(false);
    } catch (err) {
      setSheetsError(err instanceof Error ? err.message : "Nao foi possivel criar a ficha.");
    } finally {
      setCreatingSheet(false);
    }
  };

  // ── Handlers: catálogo ───────────────────────────────────────────────────────
  const handleSearchExercises = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    try {
      setCatalogLoading(true);
      setCatalogError("");
      const response = await searchExerciseCatalog({
        name: searchName,
        category: searchCategory,
        muscle: searchMuscle,
      });
      setCatalogResults(Array.isArray(response) ? normalizeCatalogResults(response) : []);
    } catch (err) {
      setCatalogResults([]);
      setCatalogError(err instanceof Error ? err.message : "Nao foi possivel buscar exercicios.");
    } finally {
      setCatalogLoading(false);
    }
  };

  // ── Handlers: adicionar ao treino ─────────────────────────────────────────────
  const openExerciseModal = (exercise: ExerciseCatalogItem) => {
    if (!selectedMember) { setSaveError("Selecione um aluno antes de adicionar exercicios."); return; }
    if (workoutSheets.length === 0) { setSaveError("Crie uma ficha de treino antes de adicionar exercicios."); return; }
    setSaveError("");
    setSaveSuccess("");
    setSelectedExercise(exercise);
    setExerciseForm({ ...EMPTY_FORM, workoutSheetId: selectedSheetId || workoutSheets[0]?.id || "" });
  };

  const closeExerciseModal = () => {
    if (saveLoading) return;
    setSelectedExercise(null);
    setExerciseForm(EMPTY_FORM);
    setSaveError("");
  };

  const handleSaveExercise = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!selectedExercise || !exerciseForm.workoutSheetId) {
      setSaveError("Selecione uma ficha de treino para salvar o exercicio.");
      return;
    }

    try {
      setSaveLoading(true);
      setSaveError("");
      setSaveSuccess("");

      await createWorkoutExercise({
        workoutSheetId: exerciseForm.workoutSheetId,
        externalName: selectedExercise.name,
        muscle: selectedExercise.muscle === "-" ? "" : selectedExercise.muscle,
        exerciseType: selectedExercise.category === "-" ? "" : selectedExercise.category,
        equipment: selectedExercise.equipment || "",
        difficulty: "",
        instructions: selectedExercise.instructions,
        sets: Number(exerciseForm.sets),
        reps: Number(exerciseForm.reps),
        restSeconds: Number(exerciseForm.restSeconds),
        notes: exerciseForm.notes,
      });

      await loadSheetExercises(exerciseForm.workoutSheetId);
      setSelectedSheetId(exerciseForm.workoutSheetId);
      setSelectedExercise(null);
      setExerciseForm(EMPTY_FORM);
      setSaveSuccess("Exercicio adicionado ao treino com sucesso.");
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : "Nao foi possivel salvar o exercicio.");
    } finally {
      setSaveLoading(false);
    }
  };

  // ── Handlers: criar exercício personalizado ───────────────────────────────────
  const openCustomModal = () => {
    setCustomForm(EMPTY_CUSTOM_FORM);
    setCustomError("");
    setShowCustomModal(true);
  };

  const closeCustomModal = () => {
    if (customLoading) return;
    setShowCustomModal(false);
    setCustomForm(EMPTY_CUSTOM_FORM);
    setCustomError("");
  };

  const handleCreateCustomExercise = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    try {
      setCustomLoading(true);
      setCustomError("");

      await createExerciseCatalog({
        name: customForm.name,
        category: customForm.category,
        muscle: customForm.muscle,
        equipment: customForm.equipment,
        instructions: customForm.instructions,
      });

      // Atualizar a lista do catálogo com o nome do novo exercício
      const response = await searchExerciseCatalog({
        name: customForm.name,
        category: customForm.category,
      });
      setCatalogResults(Array.isArray(response) ? normalizeCatalogResults(response) : []);

      setShowCustomModal(false);
      setCustomForm(EMPTY_CUSTOM_FORM);
      setSaveSuccess(`Exercício personalizado "${customForm.name}" criado e disponível no catálogo.`);
    } catch (err) {
      setCustomError(err instanceof Error ? err.message : "Nao foi possivel criar o exercicio personalizado.");
    } finally {
      setCustomLoading(false);
    }
  };

  // ── Render ────────────────────────────────────────────────────────────────────
  return (
    <ProtectedRoute allowedRoles={["PERSONAL_TRAINER"]}>
      <DashboardLayout>
        <div style={{ maxWidth: "1180px", margin: "0 auto", padding: "32px", display: "flex", flexDirection: "column", gap: "24px" }}>
          
          {/* Cabeçalho */}
          <div>
            <h1 style={{ fontSize: "32px", fontWeight: 900, letterSpacing: "-0.03em", color: isDark ? "#fff" : "#0f172a", margin: 0 }}>
              Painel do Personal Trainer
            </h1>
            <p style={{ fontSize: "16px", color: isDark ? "#94a3b8" : "#64748b", marginTop: "6px", margin: 0 }}>
              Gerencie seus alunos, prescreva fichas e monte treinos de alta performance a partir do catálogo.
            </p>
          </div>

          {/* Abas Principais (Passo a Passo SaaS) */}
          <div style={{ display: "flex", gap: "10px", borderBottom: `1px solid ${themeStyles.border}`, paddingBottom: "12px" }}>
            <button
              type="button"
              onClick={() => setActiveTab("students")}
              style={{
                padding: "10px 20px",
                borderRadius: "12px",
                fontWeight: 700,
                fontSize: "14px",
                transition: "all 0.2s",
                border: "none",
                cursor: "pointer",
                background: activeTab === "students" ? "#C0392B" : "transparent",
                color: activeTab === "students" ? "#ffffff" : themeStyles.muted,
              }}
            >
              👥 1. Meus Alunos
            </button>
            <button
              type="button"
              onClick={() => {
                if (!selectedMemberId) {
                  alert("Por favor, selecione um aluno na Aba 1 primeiro.");
                  return;
                }
                setActiveTab("sheets");
              }}
              style={{
                padding: "10px 20px",
                borderRadius: "12px",
                fontWeight: 700,
                fontSize: "14px",
                transition: "all 0.2s",
                border: "none",
                cursor: "pointer",
                background: activeTab === "sheets" ? "#C0392B" : "transparent",
                color: activeTab === "sheets" ? "#ffffff" : themeStyles.muted,
                opacity: selectedMemberId ? 1 : 0.5,
              }}
            >
              📋 2. Fichas {selectedMember ? `(${selectedMember.nome})` : ""}
            </button>
            <button
              type="button"
              onClick={() => {
                if (!selectedMemberId) {
                  alert("Por favor, selecione um aluno na Aba 1 primeiro.");
                  return;
                }
                if (!selectedSheetId) {
                  alert("Por favor, selecione ou crie uma ficha na Aba 2 primeiro.");
                  return;
                }
                setActiveTab("workout");
              }}
              style={{
                padding: "10px 20px",
                borderRadius: "12px",
                fontWeight: 700,
                fontSize: "14px",
                transition: "all 0.2s",
                border: "none",
                cursor: "pointer",
                background: activeTab === "workout" ? "#C0392B" : "transparent",
                color: activeTab === "workout" ? "#ffffff" : themeStyles.muted,
                opacity: selectedSheetId ? 1 : 0.5,
              }}
            >
              🏋️ 3. Montar Treino {selectedSheet ? `(${selectedSheet.title})` : ""}
            </button>
          </div>

          {/* ABA 1 — MEUS ALUNOS */}
          {activeTab === "students" && (
            <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
              {/* Cards de estatísticas */}
              <div style={styles.statsRow}>
                <div style={styles.statCard()}>
                  <div style={styles.statNum}>{members.length}</div>
                  <div style={styles.statLabel}>Total de alunos</div>
                </div>
                <div style={styles.statCard("#1A5C2A")}>
                  <div style={styles.statNum}>{activeStudents}</div>
                  <div style={styles.statLabel}>Ativos</div>
                </div>
                <div style={styles.statCard("#0F4C81")}>
                  <div style={styles.statNum}>{studentsWithWorkout}</div>
                  <div style={styles.statLabel}>Com ficha ativa</div>
                </div>
                <div style={styles.statCard("#C0392B")}>
                  <div style={styles.statNum}>{studentsWithoutWorkout}</div>
                  <div style={styles.statLabel}>Sem ficha ativa</div>
                </div>
              </div>

              {/* Tabela / Busca de Alunos */}
              <div style={styles.card}>
                <div style={{ display: "flex", justifyContent: "space-between", gap: 16, flexWrap: "wrap", marginBottom: 20, alignItems: "center" }}>
                  <div>
                    <h2 style={{ ...styles.pageTitle, fontSize: 18, marginBottom: 4 }}>Alunos Vinculados</h2>
                    <p style={styles.pageDesc}>Selecione um aluno abaixo para gerenciar ou criar suas fichas de treino.</p>
                  </div>

                  {/* Busca grande de alunos */}
                  <div style={{ display: "flex", alignItems: "center", position: "relative", minWidth: "280px" }}>
                    <input
                      value={studentSearch}
                      onChange={(e) => setStudentSearch(e.target.value)}
                      style={{ ...styles.input, paddingLeft: "36px", height: "38px" }}
                      placeholder="Buscar aluno por nome ou CPF..."
                    />
                    <span style={{ position: "absolute", left: "12px", top: "11px", color: themeStyles.muted }}>🔍</span>
                  </div>
                </div>

                {membersLoading ? <p style={styles.empty}>Carregando alunos...</p> : null}
                {!membersLoading && membersError ? <p style={{ ...styles.empty, color: "#C0392B" }}>{membersError}</p> : null}

                {!membersLoading && !membersError ? (
                  <div style={{ overflowX: "auto" }}>
                    <table style={{ ...styles.table, minWidth: 900 }}>
                      <thead>
                        <tr>
                          <th style={styles.th}>Nome</th>
                          <th style={styles.th}>CPF</th>
                          <th style={styles.th}>Status</th>
                          <th style={styles.th}>Ficha ativa</th>
                          <th style={styles.th}>Ação</th>
                        </tr>
                      </thead>
                      <tbody>
                        {filteredMembers.map((member) => {
                          const isSelected = selectedMemberId === member.id;
                          return (
                            <tr key={member.id} style={isSelected ? { background: isDark ? "#2b1f24" : "#fff8f5" } : undefined}>
                              <td style={{ ...styles.td, fontWeight: 700 }}>{member.nome}</td>
                              <td style={{ ...styles.td, fontFamily: "monospace", fontSize: 12 }}>{member.cpf}</td>
                              <td style={styles.td}>
                                <span style={styles.badge(
                                  member.situacao === "Ativo" ? "#1A5C2A" : "#922B21",
                                  member.situacao === "Ativo" ? "#D5F0DC" : "#FADBD8"
                                )}>
                                  {member.situacao}
                                </span>
                              </td>
                              <td style={styles.td}>
                                {member.activeWorkoutSheetId ? (
                                  <span style={styles.badge("#0F4C81", "#D6EAF8")}>Ativa</span>
                                ) : (
                                  <span style={styles.badge("#7F8C8D", "#ECF0F1")}>Não cadastrada</span>
                                )}
                              </td>
                              <td style={styles.td}>
                                <button
                                  type="button"
                                  onClick={() => {
                                    setSelectedMemberId(member.id);
                                    setSheetSuccess("");
                                    setSaveSuccess("");
                                    setActiveTab("sheets"); // Avança para a Aba 2 automaticamente!
                                  }}
                                  style={{
                                    ...styles.btn,
                                    padding: "8px 16px",
                                    borderRadius: "10px",
                                    fontSize: "13px",
                                    cursor: "pointer",
                                    background: "#C0392B",
                                  }}
                                >
                                  Gerenciar treino
                                </button>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                ) : null}
              </div>
            </div>
          )}

          {/* ABA 2 — FICHAS DO ALUNO */}
          {activeTab === "sheets" && (
            <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
              {selectedMember ? (
                <div style={styles.card}>
                  <div style={{ display: "flex", justifyContent: "space-between", gap: 16, flexWrap: "wrap", alignItems: "center", marginBottom: 20 }}>
                    <div>
                      <h2 style={{ ...styles.pageTitle, fontSize: 18, marginBottom: 4 }}>
                        Fichas de Treino de {selectedMember.nome}
                      </h2>
                      <p style={styles.pageDesc}>Selecione um treino existente para adicionar exercícios ou crie um novo plano.</p>
                    </div>

                    <button
                      type="button"
                      onClick={() => setShowCreateSheetModal(true)}
                      style={{
                        ...styles.btn,
                        padding: "10px 20px",
                        borderRadius: "12px",
                        fontSize: "14px",
                        fontWeight: 700,
                        background: "#C0392B",
                        cursor: "pointer",
                      }}
                    >
                      + Nova Ficha
                    </button>
                  </div>

                  {sheetsLoading ? <p style={styles.empty}>Carregando fichas...</p> : null}
                  {sheetsError ? <p style={{ color: "#C0392B", fontSize: 13, marginBottom: 12 }}>{sheetsError}</p> : null}
                  {sheetSuccess ? <p style={{ color: "#1A5C2A", fontSize: 13, marginBottom: 12, fontWeight: 500 }}>{sheetSuccess}</p> : null}

                  {!sheetsLoading && workoutSheets.length === 0 ? (
                    <div style={{ padding: "40px 20px", textAlign: "center", border: `2px dashed ${themeStyles.border}`, borderRadius: "16px" }}>
                      <p style={{ color: themeStyles.muted, margin: 0, fontSize: 14 }}>
                        Nenhuma ficha de treino cadastrada para este aluno ainda. Clique em **+ Nova Ficha** acima para começar!
                      </p>
                    </div>
                  ) : null}

                  {!sheetsLoading && workoutSheets.length > 0 ? (
                    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: 16 }}>
                      {workoutSheets.map((sheet) => {
                        const isCurrent = selectedSheetId === sheet.id;
                        const qtyText = isCurrent ? `${sheetExercises.length} exercícios` : "Ver exercícios";
                        return (
                          <div
                            key={sheet.id}
                            style={{
                              textAlign: "left",
                              borderRadius: 16,
                              border: isCurrent ? "2px solid #C0392B" : `1px solid ${themeStyles.border}`,
                              background: isCurrent ? (isDark ? "#2b1f24" : "#fff8f5") : themeStyles.card,
                              color: themeStyles.text,
                              padding: 20,
                              display: "flex",
                              flexDirection: "column",
                              justifyContent: "space-between",
                              gap: 16,
                              boxShadow: "0 4px 12px rgba(0,0,0,0.02)",
                            }}
                          >
                            <div>
                              <div style={{ display: "flex", justifyContent: "space-between", gap: 8, marginBottom: 12, alignItems: "center" }}>
                                <strong style={{ fontSize: 16, fontWeight: 800 }}>{sheet.title}</strong>
                                <span style={styles.badge(
                                  sheet.active ? "#1A5C2A" : themeStyles.muted,
                                  sheet.active ? "#D5F0DC" : (isDark ? "#1f2937" : "#EEEEEE")
                                )}>
                                  {sheet.active ? "Ativa" : "Histórico"}
                                </span>
                              </div>
                              <div style={{ fontSize: 13, color: themeStyles.muted, display: "flex", flexDirection: "column", gap: 6 }}>
                                <div>📅 <strong>Dia da semana:</strong> {sheet.weekDayLabel}</div>
                                <div>📅 <strong>Criada em:</strong> {formatDate(sheet.createdAt)}</div>
                                <div>💪 <strong>Quantidade:</strong> {qtyText}</div>
                              </div>
                            </div>

                            <button
                              type="button"
                              onClick={() => {
                                setSelectedSheetId(sheet.id);
                                setActiveTab("workout"); // Avança para a Aba 3 automaticamente!
                              }}
                              style={{
                                ...styles.btn,
                                width: "100%",
                                height: "38px",
                                borderRadius: "10px",
                                fontSize: "13px",
                                fontWeight: 700,
                                background: isCurrent ? "#C0392B" : "transparent",
                                border: isCurrent ? "none" : `1px solid ${themeStyles.border}`,
                                color: isCurrent ? "#ffffff" : themeStyles.text,
                                cursor: "pointer",
                              }}
                            >
                              {isCurrent ? "Selecionada — Montar Treino →" : "Selecionar e Prescrever →"}
                            </button>
                          </div>
                        );
                      })}
                    </div>
                  ) : null}
                </div>
              ) : (
                <div style={{ padding: "60px 20px", textAlign: "center", background: themeStyles.card, borderRadius: "16px", border: `1px solid ${themeStyles.border}` }}>
                  <p style={{ color: themeStyles.muted, margin: 0, fontSize: 15 }}>
                    Selecione um aluno na **Aba 1 — Meus Alunos** antes de gerenciar suas fichas de treino.
                  </p>
                </div>
              )}
            </div>
          )}

          {/* ABA 3 — MONTAR TREINO */}
          {activeTab === "workout" && (
            <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
              {selectedSheet ? (
                /* Layout em Duas Colunas Responsivas */
                <div className="grid grid-cols-1 xl:grid-cols-5 gap-6">
                  
                  {/* Coluna Esquerda: Catálogo (60% / col-span-3) */}
                  <div className="xl:col-span-3 flex flex-col gap-6">
                    <div style={styles.card}>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 16, flexWrap: "wrap", marginBottom: 20 }}>
                        <div>
                          <h2 style={{ ...styles.pageTitle, fontSize: 18, marginBottom: 4 }}>Catálogo de Exercícios</h2>
                          <p style={styles.pageDesc}>Busque treinos e clique para incluí-los na ficha selecionada.</p>
                        </div>
                        <button
                          type="button"
                          onClick={openCustomModal}
                          style={{ ...styles.btnOutline, fontSize: 13, padding: "8px 16px", borderRadius: 12 }}
                        >
                          + Criar exercício personalizado
                        </button>
                      </div>

                      {/* Barra de Busca Marketplace com Lupa Integrada */}
                      <form onSubmit={handleSearchExercises} style={{ marginBottom: 20 }}>
                        <div style={{
                          display: "flex",
                          alignItems: "center",
                          position: "relative",
                          background: isDark ? "#111827" : "#f1f5f9",
                          borderRadius: 16,
                          padding: "4px 8px",
                          border: `1px solid ${themeStyles.border}`,
                          boxShadow: "0 4px 12px rgba(0, 0, 0, 0.02)",
                        }}>
                          <span style={{ paddingLeft: 12, display: "flex", alignItems: "center" }}>
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" style={{ color: themeStyles.muted }}>
                              <circle cx="11" cy="11" r="8"></circle>
                              <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
                            </svg>
                          </span>
                          <input
                            value={searchName}
                            onChange={(e) => setSearchName(e.target.value)}
                            style={{
                              flex: 1,
                              background: "transparent",
                              border: "none",
                              outline: "none",
                              color: themeStyles.text,
                              fontSize: 15,
                              padding: "12px 14px",
                              fontFamily: "inherit",
                            }}
                            placeholder="Buscar exercício por nome..."
                          />
                          <button type="submit" style={{ ...styles.btn, padding: "0 20px", height: 40, borderRadius: 12 }} disabled={catalogLoading}>
                            {catalogLoading ? "..." : "Buscar"}
                          </button>
                        </div>

                        {/* Filtros em Chips Interativos (Sem Selects Nativos) */}
                        <div style={{ display: "flex", flexDirection: "column", gap: 14, marginTop: 16 }}>
                          
                          {/* Grupo Muscular Chips */}
                          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                            <span style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", color: themeStyles.muted }}>Grupo Muscular</span>
                            <div style={{ display: "flex", gap: 6, overflowX: "auto", paddingBottom: 6, scrollbarWidth: "none" }} className="scrollbar-none">
                              {MUSCLE_OPTIONS.map((o) => {
                                const isSelected = searchMuscle === o.value;
                                return (
                                  <button
                                    key={o.value || "all-mus"}
                                    type="button"
                                    onClick={() => {
                                      setSearchMuscle(o.value);
                                      setTimeout(() => {
                                        const btn = document.getElementById("trigger-search-btn");
                                        if (btn) btn.click();
                                      }, 50);
                                    }}
                                    style={{
                                      padding: "6px 12px",
                                      borderRadius: "20px",
                                      fontSize: "12px",
                                      fontWeight: 700,
                                      whiteSpace: "nowrap",
                                      cursor: "pointer",
                                      transition: "all 0.15s",
                                      border: isSelected ? "1px solid #C0392B" : `1px solid ${themeStyles.border}`,
                                      background: isSelected ? "#C0392B" : (isDark ? "#1f2937" : "#ffffff"),
                                      color: isSelected ? "#ffffff" : themeStyles.text,
                                    }}
                                  >
                                    {o.label}
                                  </button>
                                );
                              })}
                            </div>
                          </div>

                          {/* Equipamento Chips */}
                          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                            <span style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", color: themeStyles.muted }}>Equipamento</span>
                            <div style={{ display: "flex", gap: 6, overflowX: "auto", paddingBottom: 6, scrollbarWidth: "none" }} className="scrollbar-none">
                              {[
                                { value: "", label: "Qualquer equipamento" },
                                { value: "Halter", label: "Halteres" },
                                { value: "Barra", label: "Barra" },
                                { value: "Cabo", label: "Polia / Cabo" },
                                { value: "Maquina", label: "Máquina" },
                                { value: "Peso corporal", label: "Peso corporal" },
                                { value: "Elastico", label: "Elástico" },
                                { value: "Kettlebell", label: "Kettlebell" },
                              ].map((o) => {
                                const isSelected = filterEquipment === o.value;
                                return (
                                  <button
                                    key={o.value}
                                    type="button"
                                    onClick={() => setFilterEquipment(o.value)}
                                    style={{
                                      padding: "6px 12px",
                                      borderRadius: "20px",
                                      fontSize: "12px",
                                      fontWeight: 700,
                                      whiteSpace: "nowrap",
                                      cursor: "pointer",
                                      transition: "all 0.15s",
                                      border: isSelected ? "1px solid #0F4C81" : `1px solid ${themeStyles.border}`,
                                      background: isSelected ? "#0F4C81" : (isDark ? "#1f2937" : "#ffffff"),
                                      color: isSelected ? "#ffffff" : themeStyles.text,
                                    }}
                                  >
                                    {o.label}
                                  </button>
                                );
                              })}
                            </div>
                          </div>

                          {/* Dificuldade Chips */}
                          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                            <span style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", color: themeStyles.muted }}>Dificuldade</span>
                            <div style={{ display: "flex", gap: 6 }}>
                              {[
                                { value: "", label: "Qualquer dificuldade" },
                                { value: "Iniciante", label: "Iniciante" },
                                { value: "Intermediário", label: "Intermediário" },
                                { value: "Avançado", label: "Avançado" },
                              ].map((o) => {
                                const isSelected = filterDifficulty === o.value;
                                return (
                                  <button
                                    key={o.value}
                                    type="button"
                                    onClick={() => setFilterDifficulty(o.value)}
                                    style={{
                                      padding: "6px 12px",
                                      borderRadius: "20px",
                                      fontSize: "12px",
                                      fontWeight: 700,
                                      cursor: "pointer",
                                      transition: "all 0.15s",
                                      border: isSelected ? "1px solid #1A5C2A" : `1px solid ${themeStyles.border}`,
                                      background: isSelected ? "#1A5C2A" : (isDark ? "#1f2937" : "#ffffff"),
                                      color: isSelected ? "#ffffff" : themeStyles.text,
                                    }}
                                  >
                                    {o.label}
                                  </button>
                                );
                              })}
                            </div>
                          </div>

                        </div>

                        <button id="trigger-search-btn" type="submit" style={{ display: "none" }} />
                      </form>

                      {catalogError ? <p style={{ color: "#C0392B", marginTop: 12 }}>{catalogError}</p> : null}
                      {saveSuccess ? <p style={{ color: "#1A5C2A", marginTop: 12, fontWeight: 500 }}>{saveSuccess}</p> : null}

                      {!catalogLoading && finalCatalogResults.length === 0 ? (
                        <p style={{ ...styles.empty, marginTop: 18 }}>
                          {catalogResults.length > 0
                            ? "Nenhum exercício corresponde aos filtros aplicados."
                            : "Utilize a busca ou chips acima para exibir exercícios."}
                        </p>
                      ) : null}

                      {catalogLoading ? <p style={{ ...styles.empty, marginTop: 18 }}>Buscando catálogo...</p> : null}

                      {!catalogLoading && finalCatalogResults.length > 0 ? (
                        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: 16, marginTop: 18 }}>
                          {finalCatalogResults.map((exercise, index) => (
                            <ExerciseCatalogCard
                              key={exercise.id || `${exercise.name}-${index}`}
                              exercise={exercise}
                              difficulty={getExerciseDifficulty(exercise.name)}
                              onAdd={() => openExerciseModal(exercise)}
                              isDark={isDark}
                              themeStyles={themeStyles}
                              styles={styles}
                            />
                          ))}
                        </div>
                      ) : null}
                    </div>
                  </div>

                  {/* Coluna Direita: Exercícios da Ficha Atual (40% / col-span-2) */}
                  <div className="xl:col-span-2 flex flex-col gap-6">
                    <div style={styles.card}>
                      <div style={{ borderBottom: `1px solid ${themeStyles.border}`, paddingBottom: 12, marginBottom: 16 }}>
                        <div style={{ ...styles.label, color: "#C0392B", fontSize: 11, marginBottom: 4 }}>Prescrição Atual</div>
                        <h2 style={{ ...styles.pageTitle, fontSize: 18, margin: 0 }}>
                          {selectedSheet.title}
                        </h2>
                        <p style={{ ...styles.pageDesc, marginTop: 4 }}>
                          Ficha: <strong>{selectedSheet.weekDayLabel}</strong> • Aluno: <strong>{selectedMember?.nome}</strong>
                        </p>
                      </div>

                      {sheetExercisesLoading ? <p style={styles.empty}>Carregando exercícios...</p> : null}
                      {sheetExercisesError ? <p style={{ color: "#C0392B", marginBottom: 12 }}>{sheetExercisesError}</p> : null}

                      {!sheetExercisesLoading && sheetExercises.length === 0 ? (
                        <div style={{ padding: "40px 16px", textAlign: "center", border: `2px dashed ${themeStyles.border}`, borderRadius: "16px" }}>
                          <p style={{ color: themeStyles.muted, margin: 0, fontSize: 13 }}>
                            Esta ficha está vazia. Adicione treinos no catálogo à esquerda.
                          </p>
                        </div>
                      ) : null}

                      {!sheetExercisesLoading && sheetExercises.length > 0 ? (
                        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                          {sheetExercises.map((exercise) => (
                            <article
                              key={exercise.id}
                              style={{
                                border: `1px solid ${themeStyles.border}`,
                                borderRadius: 18,
                                padding: 16,
                                background: isDark ? "rgba(30, 41, 59, 0.25)" : "#ffffff",
                                color: themeStyles.text,
                                display: "flex",
                                flexDirection: "column",
                                gap: 12,
                                boxShadow: "0 2px 8px rgba(0,0,0,0.01)",
                              }}
                            >
                              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12 }}>
                                <div>
                                  <span style={{ fontSize: 9, fontWeight: 700, textTransform: "uppercase", color: "#C0392B", letterSpacing: "0.08em" }}>
                                    {exercise.exerciseType}
                                  </span>
                                  <h3 style={{ margin: "2px 0 0", fontSize: 14, fontWeight: 800 }}>{exercise.exerciseName}</h3>
                                </div>
                                <span style={styles.badge("#0F4C81", isDark ? "#1e293b" : "#D6EAF8")}>{exercise.muscle}</span>
                              </div>

                              {/* Specs Grid */}
                              <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 8, border: `1px solid ${themeStyles.border}`, borderRadius: 10, padding: 8, background: isDark ? "#111827" : "#f8fafc", textAlign: "center" }}>
                                <div>
                                  <span style={{ fontSize: 8, fontWeight: 700, textTransform: "uppercase", color: themeStyles.muted }}>Séries</span>
                                  <p style={{ margin: "2px 0 0", fontSize: 12, fontWeight: 950 }}>{exercise.sets || "—"}</p>
                                </div>
                                <div>
                                  <span style={{ fontSize: 8, fontWeight: 700, textTransform: "uppercase", color: themeStyles.muted }}>Reps</span>
                                  <p style={{ margin: "2px 0 0", fontSize: 12, fontWeight: 950 }}>{exercise.reps || "—"}</p>
                                </div>
                                <div>
                                  <span style={{ fontSize: 8, fontWeight: 700, textTransform: "uppercase", color: themeStyles.muted }}>Descanso</span>
                                  <p style={{ margin: "2px 0 0", fontSize: 12, fontWeight: 950 }}>{exercise.restSeconds}s</p>
                                </div>
                              </div>

                              {exercise.notes && (
                                <div style={{ fontSize: 12, color: themeStyles.muted, lineHeight: 1.4, borderTop: `1px solid ${themeStyles.border}`, paddingTop: 8 }}>
                                  <strong>Notas:</strong> {exercise.notes}
                                </div>
                              )}

                              {/* Ações: Editar e Remover (Conformidade UX, Avisos amigáveis) */}
                              <div style={{ display: "flex", gap: 8, borderTop: `1px solid ${themeStyles.border}`, paddingTop: 10, marginTop: 2 }}>
                                <button
                                  type="button"
                                  onClick={() => alert(`Ação "Editar" solicitada. A alteração direta de parâmetros prescritos no banco de dados está em desenvolvimento no plano Pro.`)}
                                  style={{
                                    flex: 1,
                                    padding: "6px 12px",
                                    borderRadius: "8px",
                                    fontSize: "11px",
                                    fontWeight: 700,
                                    cursor: "pointer",
                                    border: `1px solid ${themeStyles.border}`,
                                    background: isDark ? "#1f2937" : "#f1f5f9",
                                    color: themeStyles.text,
                                    transition: "all 0.15s",
                                  }}
                                >
                                  ✏️ Editar
                                </button>
                                <button
                                  type="button"
                                  onClick={() => alert(`Ação "Remover" solicitada. A exclusão de treinos prescritos do banco de dados está em fase de implantação. Em breve disponível no Painel do Personal.`)}
                                  style={{
                                    flex: 1,
                                    padding: "6px 12px",
                                    borderRadius: "8px",
                                    fontSize: "11px",
                                    fontWeight: 700,
                                    cursor: "pointer",
                                    border: isDark ? "1px solid #7f1d1d" : "1px solid #fee2e2",
                                    background: isDark ? "#450a0a" : "#fef2f2",
                                    color: "#ef4444",
                                    transition: "all 0.15s",
                                  }}
                                >
                                  🗑️ Remover
                                </button>
                              </div>
                            </article>
                          ))}
                        </div>
                      ) : null}
                    </div>
                  </div>

                </div>
              ) : (
                <div style={{ padding: "60px 20px", textAlign: "center", background: themeStyles.card, borderRadius: "16px", border: `1px solid ${themeStyles.border}` }}>
                  <p style={{ color: themeStyles.muted, margin: 0, fontSize: 15 }}>
                    Selecione uma ficha na **Aba 2 — Fichas do Aluno** para carregar o configurador de exercícios.
                  </p>
                </div>
              )}
            </div>
          )}

          {/* Modal / Drawer de Criação de Ficha com Chips de Semana */}
          {showCreateSheetModal ? (
            <div
              style={{
                position: "fixed",
                inset: 0,
                background: isDark ? "rgba(0, 0, 0, 0.65)" : "rgba(15, 23, 42, 0.3)",
                backdropFilter: "blur(8px)",
                WebkitBackdropFilter: "blur(8px)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                padding: 20,
                zIndex: 999,
              }}
              onClick={() => setShowCreateSheetModal(false)}
            >
              <div
                style={{
                  width: "100%",
                  maxWidth: 550,
                  borderRadius: 24,
                  border: `1px solid ${themeStyles.border}`,
                  padding: 28,
                  boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.25)",
                  background: themeStyles.card,
                  color: themeStyles.text,
                }}
                onClick={(e) => e.stopPropagation()}
              >
                <div style={{ display: "flex", justifyContent: "space-between", gap: 16, marginBottom: 20, alignItems: "flex-start" }}>
                  <div>
                    <span style={{ fontSize: 10, fontWeight: 700, textTransform: "uppercase", color: "#C0392B", letterSpacing: "0.1em" }}>
                      Novo Planejamento
                    </span>
                    <h2 style={{ margin: "4px 0 0", fontSize: 20, fontWeight: 900, letterSpacing: "-0.02em" }}>Criar Nova Ficha</h2>
                    <p style={{ margin: "4px 0 0", color: themeStyles.muted, fontSize: 13 }}>
                      Aluno: <strong style={{ color: themeStyles.text }}>{selectedMember?.nome}</strong>
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setShowCreateSheetModal(false)}
                    style={{ ...styles.btnOutline, padding: "8px 14px", borderRadius: 12, fontSize: 13 }}
                  >
                    Fechar
                  </button>
                </div>

                <form onSubmit={handleCreateWorkoutSheet} style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                  <div style={styles.fieldGroup}>
                    <label style={styles.label}>Título da Ficha *</label>
                    <input
                      value={sheetTitle}
                      onChange={(e) => setSheetTitle(e.target.value)}
                      style={styles.input}
                      placeholder="Ex: Treino A, Superior, Foco Hipertrofia..."
                      required
                    />
                  </div>

                  <div style={styles.fieldGroup}>
                    <label style={styles.label}>Objetivo / Foco (opcional)</label>
                    <input
                      value={sheetObjective}
                      onChange={(e) => setSheetObjective(e.target.value)}
                      style={styles.input}
                      placeholder="Ex: Perda de peso, Fortalecimento lombar..."
                    />
                  </div>

                  <div style={styles.fieldGroup}>
                    <label style={{ ...styles.label, marginBottom: 10 }}>Dia da semana *</label>
                    <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                      {[
                        { value: "MONDAY", label: "Segunda" },
                        { value: "TUESDAY", label: "Terça" },
                        { value: "WEDNESDAY", label: "Quarta" },
                        { value: "THURSDAY", label: "Quinta" },
                        { value: "FRIDAY", label: "Sexta" },
                        { value: "SATURDAY", label: "Sábado" },
                        { value: "SUNDAY", label: "Domingo" },
                      ].map((o) => {
                        const isSelected = sheetWeekDay === o.value;
                        return (
                          <button
                            key={o.value}
                            type="button"
                            onClick={() => setSheetWeekDay(o.value)}
                            style={{
                              padding: "8px 16px",
                              borderRadius: "10px",
                              fontSize: "13px",
                              fontWeight: 700,
                              cursor: "pointer",
                              transition: "all 0.15s",
                              border: isSelected ? "1px solid #C0392B" : `1px solid ${themeStyles.border}`,
                              background: isSelected ? "#C0392B" : (isDark ? "#1f2937" : "#f1f5f9"),
                              color: isSelected ? "#ffffff" : themeStyles.text,
                            }}
                          >
                            {o.label}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  <button
                    type="submit"
                    style={{ ...styles.btn, height: 44, borderRadius: 12, marginTop: 10, width: "100%" }}
                    disabled={creatingSheet}
                  >
                    {creatingSheet ? "Criando ficha..." : "Criar Ficha de Treino"}
                  </button>
                </form>
              </div>
            </div>
          ) : null}

          {/* Modal: adicionar exercício ao treino */}
          {selectedExercise ? (
            <div 
              style={{
                position: "fixed",
                inset: 0,
                background: isDark ? "rgba(0, 0, 0, 0.65)" : "rgba(15, 23, 42, 0.3)",
                backdropFilter: "blur(8px)",
                WebkitBackdropFilter: "blur(8px)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                padding: 20,
                zIndex: 999,
              }}
              onClick={closeExerciseModal}
            >
              <div
                style={{
                  width: "100%",
                  maxWidth: 600,
                  borderRadius: 24,
                  border: `1px solid ${themeStyles.border}`,
                  padding: 28,
                  boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.25)",
                  maxHeight: "90vh",
                  overflowY: "auto",
                  background: themeStyles.card,
                  color: themeStyles.text,
                }}
                onClick={(e) => e.stopPropagation()}
              >
                <div style={{ display: "flex", justifyContent: "space-between", gap: 16, marginBottom: 20, alignItems: "flex-start" }}>
                  <div>
                    <span style={{ fontSize: 10, fontWeight: 700, textTransform: "uppercase", color: "#C0392B", letterSpacing: "0.1em" }}>
                      Adicionar ao treino
                    </span>
                    <h2 style={{ margin: "4px 0 0", fontSize: 22, fontWeight: 900, letterSpacing: "-0.02em" }}>{selectedExercise.name}</h2>
                    <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 8 }}>
                      <span style={styles.badge("#1A5C2A", isDark ? "#10261a" : "#D5F0DC")}>{selectedExercise.category}</span>
                      <span style={styles.badge("#0F4C81", isDark ? "#1e293b" : "#D6EAF8")}>{selectedExercise.muscle}</span>
                      {selectedExercise.isCustom ? (
                        <span style={styles.badge("#7F3F00", isDark ? "#2d1f10" : "#FFF0E0")}>Personalizado</span>
                      ) : null}
                    </div>
                    <p style={{ margin: "10px 0 0", color: themeStyles.muted, fontSize: 13 }}>
                      Membro selecionado: <strong style={{ color: themeStyles.text }}>{selectedMember?.nome}</strong>
                    </p>
                  </div>
                  <button 
                    type="button" 
                    onClick={closeExerciseModal} 
                    style={{ ...styles.btnOutline, padding: "8px 14px", borderRadius: 12, fontSize: 13 }}
                  >
                    Fechar
                  </button>
                </div>

                <form onSubmit={handleSaveExercise}>
                  <div style={{ ...styles.fieldGroup, marginBottom: 16 }}>
                    <label style={styles.label}>Ficha de treino *</label>
                    <select
                      value={exerciseForm.workoutSheetId}
                      onChange={(e) => setExerciseForm((c) => ({ ...c, workoutSheetId: e.target.value }))}
                      style={styles.select}
                      required
                    >
                      <option value="">Selecione a ficha do aluno</option>
                      {workoutSheets.map((sheet) => (
                        <option key={sheet.id} value={sheet.id}>
                          {sheet.title} — {sheet.weekDayLabel} {sheet.active ? "(ativa)" : "(histórico)"}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 12, marginBottom: 16 }}>
                    <div style={styles.fieldGroup}>
                      <label style={styles.label}>Séries *</label>
                      <input type="number" min={1} value={exerciseForm.sets} onChange={(e) => setExerciseForm((c) => ({ ...c, sets: e.target.value }))} style={styles.input} required />
                    </div>
                    <div style={styles.fieldGroup}>
                      <label style={styles.label}>Repetições *</label>
                      <input type="number" min={1} value={exerciseForm.reps} onChange={(e) => setExerciseForm((c) => ({ ...c, reps: e.target.value }))} style={styles.input} required />
                    </div>
                    <div style={styles.fieldGroup}>
                      <label style={styles.label}>Descanso (s) *</label>
                      <input type="number" min={0} value={exerciseForm.restSeconds} onChange={(e) => setExerciseForm((c) => ({ ...c, restSeconds: e.target.value }))} style={styles.input} required />
                    </div>
                  </div>

                  <div style={{ ...styles.fieldGroup, marginBottom: 16 }}>
                    <label style={styles.label}>Observações específicas para o aluno</label>
                    <textarea
                      value={exerciseForm.notes}
                      onChange={(e) => setExerciseForm((c) => ({ ...c, notes: e.target.value }))}
                      style={{
                        minHeight: 80,
                        border: `1px solid ${themeStyles.border}`,
                        borderRadius: 12,
                        padding: 12,
                        fontSize: 13,
                        resize: "vertical",
                        background: isDark ? "#111827" : "#ffffff",
                        color: themeStyles.text,
                        width: "100%",
                        boxSizing: "border-box",
                        fontFamily: "inherit",
                        outline: "none",
                      }}
                      placeholder="Ex: Executar com cadência controlada, foco na fase excêntrica..."
                    />
                  </div>

                  <div style={{
                    marginTop: 12,
                    padding: 16,
                    borderRadius: 14,
                    background: isDark ? "#111827" : "#f8fafc",
                    border: `1px solid ${themeStyles.border}`,
                    color: themeStyles.muted,
                    lineHeight: 1.5,
                    fontSize: 13,
                  }}>
                    <strong style={{ display: "block", marginBottom: 6, color: themeStyles.text }}>Guia do exercício:</strong>
                    <p style={{ margin: 0 }}>{selectedExercise.instructions}</p>
                  </div>

                  {saveError ? <p style={{ color: "#C0392B", marginTop: 14, fontSize: 13, fontWeight: 500 }}>{saveError}</p> : null}

                  <div style={{ display: "flex", justifyContent: "flex-end", gap: 10, marginTop: 24 }}>
                    <button type="button" onClick={closeExerciseModal} style={{ ...styles.btnOutline, borderRadius: 12 }} disabled={saveLoading}>Cancelar</button>
                    <button type="submit" style={{ ...styles.btn, borderRadius: 12, minWidth: 150 }} disabled={saveLoading}>
                      {saveLoading ? "Salvando..." : "Salvar no treino"}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          ) : null}

          {/* Modal: criar exercício personalizado */}
          {showCustomModal ? (
            <div 
              style={{
                position: "fixed",
                inset: 0,
                background: isDark ? "rgba(0, 0, 0, 0.65)" : "rgba(15, 23, 42, 0.3)",
                backdropFilter: "blur(8px)",
                WebkitBackdropFilter: "blur(8px)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                padding: 20,
                zIndex: 999,
              }}
              onClick={closeCustomModal}
            >
              <div
                style={{
                  width: "100%",
                  maxWidth: 600,
                  borderRadius: 24,
                  border: `1px solid ${themeStyles.border}`,
                  padding: 28,
                  boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.25)",
                  maxHeight: "90vh",
                  overflowY: "auto",
                  background: themeStyles.card,
                  color: themeStyles.text,
                }}
                onClick={(e) => e.stopPropagation()}
              >
                <div style={{ display: "flex", justifyContent: "space-between", gap: 16, marginBottom: 20, alignItems: "flex-start" }}>
                  <div>
                    <span style={{ fontSize: 10, fontWeight: 700, textTransform: "uppercase", color: "#7F3F00", letterSpacing: "0.1em" }}>
                      Criar personalizado
                    </span>
                    <h2 style={{ margin: "4px 0 0", fontSize: 22, fontWeight: 900, letterSpacing: "-0.02em" }}>Criar exercício</h2>
                    <p style={{ margin: "8px 0 0", color: themeStyles.muted, fontSize: 13 }}>
                      Ficará disponível no catálogo para adicionar a qualquer aluno.
                    </p>
                  </div>
                  <button 
                    type="button" 
                    onClick={closeCustomModal} 
                    style={{ ...styles.btnOutline, padding: "8px 14px", borderRadius: 12, fontSize: 13 }}
                  >
                    Fechar
                  </button>
                </div>

                <form onSubmit={handleCreateCustomExercise}>
                  <div style={{ ...styles.fieldGroup, marginBottom: 14 }}>
                    <label style={styles.label}>Nome do exercício *</label>
                    <input
                      value={customForm.name}
                      onChange={(e) => setCustomForm((c) => ({ ...c, name: e.target.value }))}
                      style={styles.input}
                      placeholder="Ex.: Rosca direta com halteres no banco inclinado"
                      required
                    />
                  </div>

                  <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 14, marginBottom: 14 }}>
                    <div style={styles.fieldGroup}>
                      <label style={styles.label}>Categoria *</label>
                      <select
                        value={customForm.category}
                        onChange={(e) => setCustomForm((c) => ({ ...c, category: e.target.value }))}
                        style={styles.select}
                        required
                      >
                        <option value="">Selecione a categoria</option>
                        {CATEGORY_OPTIONS.filter((o) => o.value).map((o) => (
                          <option key={o.value} value={o.value}>{o.label}</option>
                        ))}
                      </select>
                    </div>
                    <div style={styles.fieldGroup}>
                      <label style={styles.label}>Músculo principal *</label>
                      <select
                        value={customForm.muscle}
                        onChange={(e) => setCustomForm((c) => ({ ...c, muscle: e.target.value }))}
                        style={styles.select}
                        required
                      >
                        <option value="">Selecione o músculo</option>
                        {MUSCLE_OPTIONS.filter((o) => o.value).map((o) => (
                          <option key={o.value} value={o.value}>{o.label}</option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div style={{ ...styles.fieldGroup, marginBottom: 14 }}>
                    <label style={styles.label}>Equipamento necessário (opcional)</label>
                    <input
                      value={customForm.equipment}
                      onChange={(e) => setCustomForm((c) => ({ ...c, equipment: e.target.value }))}
                      style={styles.input}
                      placeholder="Ex.: Halteres, Barra, Peso corporal, Fita de suspensão"
                    />
                  </div>

                  <div style={{ ...styles.fieldGroup, marginBottom: 14 }}>
                    <label style={styles.label}>Instruções passo a passo *</label>
                    <textarea
                      value={customForm.instructions}
                      onChange={(e) => setCustomForm((c) => ({ ...c, instructions: e.target.value }))}
                      style={{
                        minHeight: 100,
                        border: `1px solid ${themeStyles.border}`,
                        borderRadius: 12,
                        padding: 12,
                        fontSize: 13,
                        resize: "vertical",
                        background: isDark ? "#111827" : "#ffffff",
                        color: themeStyles.text,
                        width: "100%",
                        boxSizing: "border-box",
                        fontFamily: "inherit",
                        outline: "none",
                      }}
                      placeholder="Descreva a execução correta, postura inicial, movimento e respiração..."
                      required
                    />
                  </div>

                  {customError ? <p style={{ color: "#C0392B", marginTop: 8, fontSize: 13, fontWeight: 500 }}>{customError}</p> : null}

                  <div style={{ display: "flex", justifyContent: "flex-end", gap: 10, marginTop: 24 }}>
                    <button type="button" onClick={closeCustomModal} style={{ ...styles.btnOutline, borderRadius: 12 }} disabled={customLoading}>Cancelar</button>
                    <button type="submit" style={{ ...styles.btn, background: "#7F3F00", color: "#fff", borderRadius: 12 }} disabled={customLoading}>
                      {customLoading ? "Criando..." : "Criar exercício"}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          ) : null}
        </div>
      </DashboardLayout>
    </ProtectedRoute>
  );
}
