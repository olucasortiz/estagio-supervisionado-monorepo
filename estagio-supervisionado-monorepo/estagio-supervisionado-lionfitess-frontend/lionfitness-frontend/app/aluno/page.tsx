"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Award,
  CalendarClock,
  CheckCircle2,
  CircleAlert,
  ClipboardList,
  Dumbbell,
  Flame,
  LoaderCircle,
  NotebookText,
  QrCode,
  Repeat2,
  Target,
  Timer,
  TrendingUp,
} from "lucide-react";

import DashboardLayout from "../../components/layout/DashboardLayout";
import ProtectedRoute from "../../components/auth/ProtectedRoute";
import { useThemeMode } from "../../hooks/useThemeMode";
import { API_BASE_URL, getMySubscription } from "../../services/api";
import { useAuth } from "../../hooks/useAuth";
import PixPaymentModal from "../../components/ui/PixPaymentModal";



type WorkoutExercise = {
  id: string;
  name: string;
  muscle: string;
  restSeconds: number;
  prescription: string;
  notes: string;
  sets: number;
  reps: number;
};

type WorkoutDay = {
  id: string;
  title: string;
  weekDay: string;
  weekDayLabel: string;
  exercises: WorkoutExercise[];
};

type SubscriptionState = {
  id?: string | null;
  endDate: string | null;
  startDate?: string | null;
  planName: string;
  status: string;
  daysRemaining: number;
  hasSubscription: boolean;
};

const WEEK_DAY_ORDER = ["MONDAY", "TUESDAY", "WEDNESDAY", "THURSDAY", "FRIDAY", "SATURDAY", "SUNDAY"];

const WEEK_DAYS = [
  { key: "MONDAY", label: "Seg", fullLabel: "Segunda-feira" },
  { key: "TUESDAY", label: "Ter", fullLabel: "Terça-feira" },
  { key: "WEDNESDAY", label: "Qua", fullLabel: "Quarta-feira" },
  { key: "THURSDAY", label: "Qui", fullLabel: "Quinta-feira" },
  { key: "FRIDAY", label: "Sex", fullLabel: "Sexta-feira" },
  { key: "SATURDAY", label: "Sáb", fullLabel: "Sábado" },
  { key: "SUNDAY", label: "Dom", fullLabel: "Domingo" },
];

function parseJsonText(rawText: string) {
  if (!rawText) return null;

  try {
    return JSON.parse(rawText);
  } catch {
    return rawText;
  }
}

function parseResponsePayload(payload: unknown) {
  if (!payload || typeof payload !== "object") return payload;
  if ("data" in payload && payload.data) return payload.data;
  if ("items" in payload && payload.items) return payload.items;
  return payload;
}

function stringOrFallback(value: unknown, fallback: string) {
  return typeof value === "string" && value.trim() ? value : fallback;
}

function stringOrNull(value: unknown) {
  return typeof value === "string" && value.trim() ? value : null;
}

function normalizeDate(value: string | null | undefined) {
  if (!value) return null;
  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) return new Date(`${value}T00:00:00`);
  return new Date(value);
}

function formatDate(value: string | null) {
  const parsedDate = normalizeDate(value);
  if (!parsedDate || Number.isNaN(parsedDate.getTime())) return "Nao disponivel";

  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(parsedDate);
}


function getTodayWeekDay() {
  return ["SUNDAY", "MONDAY", "TUESDAY", "WEDNESDAY", "THURSDAY", "FRIDAY", "SATURDAY"][new Date().getDay()];
}

function getErrorMessage(payload: unknown, fallback: string) {
  if (typeof payload === "string" && payload.trim()) return payload;
  if (payload && typeof payload === "object") {
    const candidate = payload as { message?: string; error?: string; detail?: string; details?: string };
    return candidate.message || candidate.error || candidate.detail || candidate.details || fallback;
  }

  return fallback;
}

function formatPrescription(exercise: Record<string, unknown>) {
  const sets = exercise.sets ?? exercise.series ?? exercise.set_count ?? exercise.setCount;
  const reps = exercise.repetitions ?? exercise.reps ?? exercise.rep_count ?? exercise.repCount;

  if (sets && reps) return `${sets} series x ${reps} repeticoes`;
  if (sets) return `${sets} series`;
  if (reps) return `${reps} repeticoes`;
  return "Series e repeticoes nao informadas";
}

function normalizeWorkoutEntry(entry: unknown, index: number): WorkoutDay {
  const source = parseResponsePayload(entry) as Record<string, unknown> | null;
  const rawExercises = (source?.exercises as Record<string, unknown>[] | undefined) || [];
  const weekDay = stringOrFallback(source?.weekDay ?? source?.week_day, "");

  return {
    id: String(source?.id ?? `workout-${index}`),
    title: stringOrFallback(source?.title ?? source?.goal, `Treino ${index + 1}`),
    weekDay,
    weekDayLabel: stringOrFallback(source?.weekDayLabel ?? source?.week_day_label, weekDay || "Sem dia definido"),
    exercises: rawExercises.map((exercise, exerciseIndex) => {
      const sets = exercise.sets ?? exercise.series ?? exercise.set_count ?? exercise.setCount ?? 0;
      const reps = exercise.repetitions ?? exercise.reps ?? exercise.rep_count ?? exercise.repCount ?? 0;
      return {
        id: String(exercise.id ?? exercise.exerciseId ?? exercise.exercise_id ?? `exercise-${exerciseIndex}`),
        name: stringOrFallback(
          exercise.name ?? exercise.nome ?? exercise.exerciseName ?? exercise.exercise_name,
          `Exercicio ${exerciseIndex + 1}`
        ),
        muscle: stringOrFallback(exercise.muscle, "-"),
        restSeconds: Number(exercise.restSeconds ?? exercise.rest_seconds ?? 0),
        sets: Number(sets),
        reps: Number(reps),
        prescription: formatPrescription(exercise),
        notes: stringOrFallback(
          exercise.notes ?? exercise.instructions ?? exercise.observations ?? exercise.observacao,
          "Sem observacoes."
        ),
      };
    }),
  };
}

function ExerciseCard({
  exercise,
  index,
  isDark,
  ui,
}: {
  exercise: WorkoutExercise;
  index: number;
  isDark: boolean;
  ui: any;
}) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <article 
      className={`rounded-[18px] border shadow-sm transition-all duration-300 hover:shadow-md ${ui.exerciseCard}`}
      style={{ padding: "28px", minHeight: "220px", display: "flex", flexDirection: "column", justifyContent: "space-between" }}
    >
      <div>
        {/* Top Header */}
        <div className="flex items-start justify-between gap-4 mb-6">
          <div style={{ display: "flex", alignItems: "center", gap: 14, minWidth: 0, flex: 1 }}>
            <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-[#C0392B]/20 to-[#C0392B]/5 flex items-center justify-center text-[#C0392B] font-bold text-xl flex-shrink-0">
              🏋️
            </div>
            <div style={{ minWidth: 0, flex: 1 }}>
              <span className="text-[9px] font-bold uppercase tracking-[0.24em] text-[#C0392B] block">Exercício {index + 1}</span>
              <h3 className={`text-base font-black tracking-tight truncate ${ui.title}`} style={{ margin: 0, marginTop: 2 }} title={exercise.name}>{exercise.name}</h3>
            </div>
          </div>
          <span 
            className={`inline-flex px-3 py-1 rounded-full text-[9px] font-extrabold uppercase tracking-wider flex-shrink-0 ${
              isDark ? "bg-slate-800 text-slate-300 border border-slate-700" : "bg-slate-100 text-slate-700 border border-slate-200"
            }`}
          >
            {exercise.muscle}
          </span>
        </div>

        {/* Grid of prescription specs */}
        <div className="grid grid-cols-3 gap-4 mb-6">
          <div className={`rounded-xl p-3 border text-center ${ui.subtleBorder}`} style={{ padding: "12px 8px" }}>
            <span className={`text-[9px] uppercase font-bold tracking-wider ${ui.muted}`}>Séries</span>
            <p className={`text-sm font-black mt-1.5 ${ui.title}`} style={{ margin: 0, marginTop: 6 }}>{exercise.sets || "—"}</p>
          </div>
          <div className={`rounded-xl p-3 border text-center ${ui.subtleBorder}`} style={{ padding: "12px 8px" }}>
            <span className={`text-[9px] uppercase font-bold tracking-wider ${ui.muted}`}>Reps</span>
            <p className={`text-sm font-black mt-1.5 ${ui.title}`} style={{ margin: 0, marginTop: 6 }}>{exercise.reps || "—"}</p>
          </div>
          <div className={`rounded-xl p-3 border text-center ${ui.subtleBorder}`} style={{ padding: "12px 8px" }}>
            <span className={`text-[9px] uppercase font-bold tracking-wider ${ui.muted}`}>Descanso</span>
            <p className={`text-sm font-black mt-1.5 flex items-center justify-center gap-1 ${ui.title}`} style={{ margin: 0, marginTop: 6 }}>
              <Timer className="h-3.5 w-3.5 text-[#C0392B]" />
              {exercise.restSeconds}s
            </p>
          </div>

        </div>
      </div>

      {/* Accordion instructions */}
      <div className="border border-slate-100 dark:border-slate-800 rounded-xl overflow-hidden mt-6">
        <button
          type="button"
          onClick={() => setIsOpen(!isOpen)}
          className={`w-full flex items-center justify-between p-3.5 text-left text-xs font-bold transition-colors cursor-pointer ${
            isDark ? "bg-slate-900/60 hover:bg-slate-900 text-slate-300" : "bg-slate-50 hover:bg-slate-100/80 text-slate-700"
          }`}
        >
          <span style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 12 }}>
            <NotebookText className="h-4 w-4 text-[#C0392B]" />
            Instruções e Observações
          </span>
          <svg
            className={`h-3.5 w-3.5 text-slate-400 transition-transform duration-200 ${isOpen ? "rotate-180" : ""}`}
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth="2.5"
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
          </svg>
        </button>

        <div
          className={`transition-all duration-300 ease-in-out ${
            isOpen ? "max-h-[160px] border-t border-slate-100 dark:border-slate-800" : "max-h-0 overflow-hidden"
          }`}
        >
          <div className="p-4 text-[11px] leading-relaxed text-slate-500 dark:text-slate-400 bg-slate-50/20 dark:bg-slate-900/10 break-words">
            {exercise.notes}
          </div>
        </div>
      </div>
    </article>
  );
}

function normalizeWorkouts(payload: unknown): WorkoutDay[] {
  const source = parseResponsePayload(payload);

  if (Array.isArray(source)) {
    return source.map(normalizeWorkoutEntry);
  }

  if (source && typeof source === "object") {
    const record = source as Record<string, unknown>;
    if (Array.isArray(record.workouts)) return record.workouts.map(normalizeWorkoutEntry);
    if (Array.isArray(record.exercises)) return [normalizeWorkoutEntry(record, 0)];
  }

  return [];
}

function normalizeSubscription(subscription: unknown): SubscriptionState | null {
  const source = parseResponsePayload(subscription) as Record<string, unknown> | null;
  if (!source || typeof source !== "object") return null;

  if (source.hasSubscription === false) {
    return {
      endDate: null,
      planName: "",
      status: "",
      daysRemaining: 0,
      hasSubscription: false,
    };
  }

  return {
    id: stringOrNull(source.id),
    endDate: stringOrNull(source.endDate ?? source.end_date ?? null),
    startDate: stringOrNull(source.startDate ?? source.start_date ?? null),
    planName: stringOrFallback(source.planName ?? source.plan_name ?? (source.plan as Record<string, unknown> | undefined)?.name, "Plano ativo"),
    status: stringOrFallback(source.status, "ACTIVE"),
    daysRemaining: typeof source.daysRemaining === "number" ? source.daysRemaining : 0,
    hasSubscription: source.hasSubscription !== false,
  };
}

export default function AlunoPage() {
  const { token, user } = useAuth();
  const { isDark, themeStyles } = useThemeMode();
  const [workouts, setWorkouts] = useState<WorkoutDay[]>([]);
  const [selectedWeekDay, setSelectedWeekDay] = useState("");
  const [subscription, setSubscription] = useState<SubscriptionState | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [isWorkoutModalOpen, setIsWorkoutModalOpen] = useState(false);
  const [isPixModalOpen, setIsPixModalOpen] = useState(false);

  const loadStudentData = async () => {
    if (!token) return;
    setLoading(true);
    setError("");

    try {
      const [workoutResult, subscriptionResult] = await Promise.allSettled([
        fetch(`${API_BASE_URL}/workouts/me`, {
          method: "GET",
          headers: { Authorization: `Bearer ${token}` },
          cache: "no-store",
        }),
        getMySubscription(),
      ]);

      if (workoutResult.status === "fulfilled") {
        const response = workoutResult.value;
        const parsedPayload = parseJsonText(await response.text());

        if (!response.ok && response.status !== 404) {
          throw new Error(getErrorMessage(parsedPayload, "Nao foi possivel carregar seu treino."));
        }

        const normalizedWorkouts = response.status === 404 ? [] : normalizeWorkouts(parsedPayload);
        setWorkouts(normalizedWorkouts);

        const today = getTodayWeekDay();
        const todayWorkout = normalizedWorkouts.find((workout) => workout.weekDay === today);
        setSelectedWeekDay(todayWorkout?.weekDay || normalizedWorkouts[0]?.weekDay || normalizedWorkouts[0]?.id || "");
      } else {
        throw workoutResult.reason;
      }

      setSubscription(subscriptionResult.status === "fulfilled" ? normalizeSubscription(subscriptionResult.value) : null);
    } catch (err) {
      console.error(err);
      setError("Nao foi possivel carregar seus dados agora. Tente novamente em instantes.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!token) return;
    loadStudentData();
  }, [token]);


  const todayWeekDay = useMemo(() => getTodayWeekDay(), []);
  const selectedWorkout = useMemo(
    () => workouts.find((workout) => workout.weekDay === selectedWeekDay || workout.id === selectedWeekDay) || null,
    [selectedWeekDay, workouts]
  );
  const todayWorkout = useMemo(
    () => workouts.find((workout) => workout.weekDay === todayWeekDay) || null,
    [todayWeekDay, workouts]
  );
  const orderedWorkouts = useMemo(
    () =>
      [...workouts].sort((left, right) => {
        const leftIndex = WEEK_DAY_ORDER.indexOf(left.weekDay);
        const rightIndex = WEEK_DAY_ORDER.indexOf(right.weekDay);
        return (leftIndex === -1 ? 99 : leftIndex) - (rightIndex === -1 ? 99 : rightIndex);
      }),
    [workouts]
  );
  const subscriptionDetails = useMemo(() => {
    if (!subscription || subscription.hasSubscription === false) {
      return {
        hasPlan: false,
        cardClass: isDark ? "border-slate-800 bg-slate-900/60" : "border-slate-200 bg-slate-50",
        message: "Sem plano vinculado no momento.",
        statusText: "Inativo",
        isVencida: true,
        isVenceEmBreve: false,
        planName: "—",
        endDateFormatted: "—",
        daysText: "Matrícula inativa",
      };
    }

    const isVencida = subscription.daysRemaining <= 0 || subscription.status !== "ACTIVE";
    const isVenceEmBreve = subscription.daysRemaining < 5;

    let cardClass = "";
    let badgeClass = "";
    let statusText = "Ativa";
    let statusBadgeClass = "";
    let daysText = `${subscription.daysRemaining} dias restantes`;

    if (isVencida) {
      cardClass = isDark ? "border-red-500/40 bg-red-950/30" : "border-red-200 bg-red-50/70";
      badgeClass = isDark ? "border-red-400/30 bg-red-500/15 text-red-200" : "border-red-200 bg-red-100 text-red-700";
      statusBadgeClass = isDark ? "border-red-500/30 bg-red-500/10 text-red-400" : "border-red-200 bg-red-100 text-red-700";
      statusText = "Vencida";
      daysText = "Mensalidade vencida";
    } else if (isVenceEmBreve) {
      cardClass = isDark ? "border-amber-500/40 bg-amber-950/30" : "border-amber-200 bg-amber-50/70";
      badgeClass = isDark ? "border-amber-400/30 bg-amber-500/15 text-amber-200" : "border-amber-200 bg-amber-100 text-amber-700";
      statusBadgeClass = isDark ? "border-amber-500/30 bg-amber-500/10 text-amber-400" : "border-amber-200 bg-amber-100 text-amber-700";
      statusText = "Vence em breve";
    } else {
      cardClass = isDark ? "border-emerald-500/40 bg-emerald-950/20" : "border-emerald-200 bg-emerald-50/70";
      badgeClass = isDark ? "border-emerald-400/30 bg-emerald-500/15 text-emerald-200" : "border-emerald-200 bg-emerald-100 text-emerald-800";
      statusBadgeClass = isDark ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-400" : "border-emerald-200 bg-emerald-100 text-emerald-800";
    }

    const rawPrice = subscription.price || subscription.amount || 129.90;
    const formattedPrice = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(Number(rawPrice));

    return {
      hasPlan: true,
      cardClass,
      badgeClass,
      statusBadgeClass,
      statusText,
      daysText,
      planName: subscription.planName || "Mensal",
      endDateFormatted: formatDate(subscription.endDate),
      isVencida,
      isVenceEmBreve,
      formattedPrice,
    };
  }, [subscription, isDark]);

  const progressPercent = useMemo(() => {
    if (!subscription || !subscription.daysRemaining) return 0;
    return Math.max(0, Math.min(100, (subscription.daysRemaining / 30) * 100));
  }, [subscription]);

  const weeklyMetrics = useMemo(() => {
    const activeWorkoutDays = workouts.filter((w) => w.exercises && w.exercises.length > 0);
    const totalDaysWithWorkout = activeWorkoutDays.length;
    const targetDays = 5;
    const percent = Math.min(100, Math.round((totalDaysWithWorkout / targetDays) * 100));

    return {
      totalDaysWithWorkout,
      targetDays,
      percent,
      activeWorkoutDays,
    };
  }, [workouts]);

  const handleExportWorkout = async () => {
    try {
      const studentName = user?.name || "Aluno";
      const planName = subscription?.planName || "Sem plano vinculado";
      const statusLabel = subscriptionDetails?.statusText || "Inativo";
      
      const { default: exportWorkoutPdf } = await import("../../components/reports/exportWorkoutPdf");
      await exportWorkoutPdf({
        studentName,
        planName,
        status: statusLabel,
        workouts: orderedWorkouts,
      });
    } catch (err) {
      console.error("Erro ao exportar treino:", err);
      alert("Não foi possível exportar o treino agora.");
    }
  };

  const ui = useMemo(
    () => ({
      page: isDark ? "min-h-screen bg-slate-950 text-slate-100" : "min-h-screen bg-[#f8fafc] text-slate-900",
      panel: isDark ? "border-white/10 bg-slate-950/75 shadow-black/30 animate-fade-in" : "border-slate-200 bg-white shadow-slate-200/80 animate-fade-in",
      exerciseCard: isDark ? "border-white/10 bg-slate-900/80 shadow-black/20" : "border-slate-200 bg-white shadow-slate-200/70",
      title: isDark ? "text-white" : "text-slate-900",
      muted: isDark ? "text-slate-400" : "text-slate-600",
      softText: isDark ? "text-slate-300" : "text-slate-700",
      subtleBorder: isDark ? "border-white/8 bg-white/5" : "border-slate-200 bg-slate-50",
      iconBg: isDark ? "bg-white/5" : "bg-slate-100",
    }),
    [isDark]
  );

  return (
    <ProtectedRoute allowedRoles={["OPERATIONAL"]}>
      <DashboardLayout>
        <div className={ui.page} style={{ minHeight: "100vh" }}>
          <div style={{ maxWidth: "1280px", width: "100%", margin: "0 auto", padding: "32px", display: "flex", flexDirection: "column", gap: "28px" }}>
            
            {/* Topo da Página */}
            <div>
              <h1 style={{ fontSize: "32px", fontWeight: 900, letterSpacing: "-0.03em", color: isDark ? "#fff" : "#0f172a", margin: 0 }}>Meu Plano</h1>
              <p style={{ fontSize: "16px", color: isDark ? "#94a3b8" : "#64748b", marginTop: "6px", margin: 0 }}>
                Olá, {user?.name ? user.name.split(" ")[0] : "Aluno"}. Sua rotina e sua mensalidade em um só lugar.
              </p>
            </div>

            {/* Grid Superior Responsivo (3 Cards no Topo) */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
              
              {/* Card 1: Treino de Hoje */}
              <div 
                className={`rounded-[20px] border shadow-sm flex flex-col justify-between p-6 ${ui.panel}`}
                style={{ minHeight: "220px" }}
              >
                <div className="flex flex-col justify-between h-full gap-4">
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <span className="p-2 rounded-xl bg-gradient-to-br from-[#C0392B]/20 to-[#C0392B]/5 text-[#C0392B] flex items-center justify-center">
                        <Dumbbell className="h-5 w-5" />
                      </span>
                      <span className={`text-xs uppercase tracking-[0.2em] font-extrabold ${ui.muted}`}>Treino de hoje</span>
                    </div>
                    {todayWorkout && (
                      <span className={`inline-flex px-2 py-0.5 rounded-full text-[8px] font-extrabold uppercase tracking-wider ${
                        isDark ? "bg-emerald-500/15 text-emerald-400 border border-emerald-500/30" : "bg-emerald-100 text-emerald-700 border border-emerald-200"
                      }`}>
                        ● Hoje
                      </span>
                    )}
                  </div>
                  
                  {todayWorkout ? (
                    <div className="flex flex-col gap-2 flex-1 justify-between">
                      <div>
                        <h2 className={`text-lg font-black ${ui.title}`} style={{ margin: 0, lineHeight: 1.2 }}>{todayWorkout.title}</h2>
                        <p className={`text-xs leading-relaxed ${ui.softText}`} style={{ margin: "4px 0 0" }}>
                          Hoje é {WEEK_DAYS.find(d => d.key === todayWeekDay)?.fullLabel || todayWeekDay}. Foco total na sua execução!
                        </p>
                      </div>
                      <div className="flex items-center justify-between gap-2 pt-3 border-t border-slate-100 dark:border-slate-800/80">
                        <span className={`inline-flex px-2.5 py-1 rounded-lg text-[11px] font-bold ${isDark ? "bg-slate-800 text-slate-300 border border-slate-700" : "bg-slate-100 text-slate-700 border border-slate-200"}`}>
                          🏋️ {todayWorkout.exercises.length} exercícios
                        </span>
                        <button
                          type="button"
                          onClick={() => setIsWorkoutModalOpen(true)}
                          className="text-xs font-extrabold text-[#C0392B] hover:underline flex items-center gap-1 cursor-pointer"
                        >
                          Ver tudo →
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="flex flex-col gap-2 flex-1 justify-between">
                      <div>
                        <h2 className={`text-lg font-black ${ui.title}`} style={{ margin: 0, lineHeight: 1.2 }}>Descanso Ativo</h2>
                        <p className={`text-xs leading-relaxed ${ui.softText}`} style={{ margin: "4px 0 0" }}>
                          Hoje é {WEEK_DAYS.find(d => d.key === todayWeekDay)?.fullLabel || todayWeekDay}. Aproveite para recuperar musculatura ou fazer um cardio leve!
                        </p>
                      </div>
                      <div className="pt-3 border-t border-slate-100 dark:border-slate-800/80 flex justify-end">
                        <button
                          type="button"
                          onClick={() => setIsWorkoutModalOpen(true)}
                          className="text-xs font-extrabold text-[#C0392B] hover:underline flex items-center gap-1 cursor-pointer"
                        >
                          Ver rotina semanal →
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Card 2: Mensalidade / Plano */}
              <div 
                className={`rounded-[20px] border shadow-sm flex flex-col justify-between p-6 ${subscriptionDetails.hasPlan ? "" : ui.panel}`}
                style={{ 
                  minHeight: "220px",
                  border: `1px solid ${themeStyles.border}`,
                  background: isDark ? "rgba(30, 41, 59, 0.45)" : "#ffffff",
                  boxShadow: "0 4px 12px rgba(0, 0, 0, 0.02)",
                  color: themeStyles.text,
                }}
              >
                {!subscriptionDetails.hasPlan ? (
                  <div className="flex flex-col justify-between h-full gap-2">
                    <div className="flex items-center gap-2">
                      <span className="p-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-500 flex items-center justify-center">
                        <CircleAlert className="h-5 w-5" />
                      </span>
                      <span className={`text-xs uppercase tracking-[0.2em] font-extrabold ${ui.muted}`}>Mensalidade</span>
                    </div>
                    <div style={{ margin: "4px 0" }}>
                      <p className={`font-bold text-xs ${ui.title}`} style={{ margin: 0 }}>{subscriptionDetails.message}</p>
                    </div>
                    <span className="text-[10px] text-slate-400">Regularize sua situação na recepção.</span>
                  </div>
                ) : (
                  <div className="flex flex-col justify-between h-full gap-3">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <span className={`text-xs uppercase tracking-[0.2em] font-extrabold ${ui.muted} block mb-1`}>Mensalidade</span>
                        <p className={`text-2xl font-black ${ui.title}`} style={{ margin: 0 }}>{subscriptionDetails.formattedPrice}</p>
                        <p className={`text-xs ${ui.muted}`} style={{ margin: "4px 0 0" }}>
                          Plano {subscriptionDetails.planName} · vence em {subscriptionDetails.endDateFormatted}
                        </p>
                      </div>
                      <span className={`inline-flex rounded-full border px-2.5 py-0.5 text-[9px] font-extrabold shadow-inner uppercase tracking-wider ${
                        subscriptionDetails.isVencida 
                          ? "bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/20" 
                          : subscriptionDetails.isVenceEmBreve 
                          ? "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20" 
                          : "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20"
                      }`}>
                        {subscriptionDetails.statusText}
                      </span>
                    </div>

                    <div className="flex items-center gap-2 mt-auto">
                      {subscription?.id && (
                        <button
                          type="button"
                          onClick={() => setIsPixModalOpen(true)}
                          className="w-full py-2.5 px-3 rounded-xl font-extrabold text-xs text-white bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 shadow-md shadow-emerald-600/20 transition-all flex items-center justify-center gap-2 cursor-pointer border border-emerald-500/30"
                        >
                          <QrCode className="h-4 w-4 text-emerald-200" /> Pagar com Pix
                        </button>
                      )}
                    </div>
                  </div>
                )}
              </div>

              {/* Card 3: Progresso da Semana */}
              <div 
                className={`rounded-[20px] border shadow-sm flex flex-col justify-between p-6 ${ui.panel}`}
                style={{ minHeight: "220px" }}
              >
                <div className="flex flex-col justify-between h-full gap-3">
                  <div>
                    <span className={`text-xs uppercase tracking-[0.2em] font-extrabold ${ui.muted} block mb-1`}>
                      Progresso da semana
                    </span>
                    <p className={`text-2xl font-black ${ui.title}`} style={{ margin: 0 }}>
                      {weeklyMetrics.totalDaysWithWorkout} <span className={`text-sm font-medium ${ui.muted}`}>de 7 dias</span>
                    </p>
                  </div>

                  {/* Barras de progresso da semana Seg a Dom */}
                  <div className="mt-4 flex gap-1.5 items-end">
                    {WEEK_DAYS.map((day) => {
                      const hasWorkout = workouts.some((w) => w.weekDay === day.key && w.exercises && w.exercises.length > 0);
                      return (
                        <div key={day.key} className="flex-1 space-y-1.5 text-center">
                          <div
                            className={`h-2 rounded-full transition-all ${
                              hasWorkout 
                                ? "bg-emerald-500 shadow-sm shadow-emerald-500/30" 
                                : "bg-slate-200 dark:bg-slate-800"
                            }`}
                          />
                          <span className={`block text-[11px] font-semibold ${hasWorkout ? "text-emerald-500 font-bold" : ui.muted}`}>
                            {day.label}
                          </span>
                        </div>
                      );
                    })}
                  </div>

                  <div className={`mt-auto pt-3 border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-between text-xs font-semibold ${ui.muted}`}>
                    <span>Frequência semanal</span>
                    <span className="text-emerald-500 font-bold">{weeklyMetrics.percent}% Concluído</span>
                  </div>
                </div>
              </div>

            </div>




            {/* Seção Inferior: Fichas de Treino & Grade de Exercícios */}
            <section 
              className={`border shadow-sm ${ui.panel}`}
              style={{ padding: "28px", borderRadius: "20px" }}
            >
              
              {/* Header de Seção */}
              <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-4" style={{ marginBottom: "20px" }}>
                <div>
                  <div className={`inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.24em] ${ui.muted}`}>
                    <ClipboardList className="h-4 w-4 text-[#C0392B]" />
                    Programação Semanal
                  </div>
                  <h2 className={`mt-2 text-2xl font-black ${ui.title}`} style={{ margin: 0 }}>
                    {selectedWorkout ? selectedWorkout.title : "Ficha de treino"}
                  </h2>
                </div>
              </div>

              {/* Tabs de Dia da Semana */}
              <div 
                className="scrollbar-none" 
                style={{ display: "flex", flexWrap: "wrap", gap: "10px", marginBottom: "24px" }}
              >
                {WEEK_DAYS.map((day) => {
                  const workout = workouts.find((w) => w.weekDay === day.key);
                  const isSelected = selectedWeekDay === day.key;
                  return (
                    <button
                      key={day.key}
                      type="button"
                      onClick={() => setSelectedWeekDay(day.key)}
                      className={`rounded-xl font-bold transition-all duration-200 text-sm flex flex-col items-center cursor-pointer hover:scale-[1.02] ${
                        isSelected
                          ? "bg-[#C0392B] text-white shadow-lg shadow-[#C0392B]/20 scale-[1.03]"
                          : isDark
                          ? "bg-slate-900 text-slate-300 hover:bg-slate-800 hover:text-white border border-slate-800"
                          : "bg-white text-slate-600 hover:bg-slate-50 hover:text-slate-900 border border-slate-200 shadow-sm"
                      }`}
                      style={{ minWidth: "74px", padding: "10px 14px" }}
                    >
                      <span className="text-[11px] font-bold uppercase tracking-wider">{day.label}</span>
                      {workout ? (
                        <span style={{ fontSize: 8, marginTop: 2, fontWeight: 700 }} className={isSelected ? "text-red-100" : "text-emerald-500"}>● Treino</span>
                      ) : (
                        <span style={{ fontSize: 8, marginTop: 2, fontWeight: 500 }} className={isSelected ? "text-red-200" : "text-slate-400"}>Descanso</span>
                      )}
                    </button>
                  );
                })}
              </div>

              {/* Status do Carregamento / Treino */}
              {loading ? (
                <div className="p-12 text-center flex items-center justify-center gap-3">
                  <LoaderCircle className="h-6 w-6 animate-spin text-[#C0392B]" />
                  <span className={ui.softText}>Carregando plano de treino...</span>
                </div>
              ) : null}

              {!loading && error ? (
                <div className="rounded-3xl border border-red-500/20 bg-red-500/10 p-6 text-red-50">
                  <div className="flex items-start gap-3">
                    <CircleAlert className="mt-0.5 h-5 w-5 flex-none text-red-300" />
                    <p style={{ margin: 0 }}>{error}</p>
                  </div>
                </div>
              ) : null}

              {!loading && !error && selectedWorkout && selectedWorkout.exercises.length === 0 ? (
                <div className={`rounded-[24px] border border-dashed p-12 text-center ${ui.subtleBorder}`}>
                  <Target className="mx-auto h-8 w-8 text-[#C0392B]" />
                  <h3 className={`mt-4 text-xl font-bold ${ui.title}`} style={{ margin: 0 }}>Nenhum exercício cadastrado nesta ficha.</h3>
                  <p className={`mt-2 text-sm leading-6 ${ui.muted}`} style={{ margin: "4px 0 0" }}>O treino para esta aba está em branco.</p>
                </div>
              ) : null}

              {!loading && !error && !selectedWorkout ? (
                <div className={`rounded-[24px] border border-dashed p-12 text-center ${ui.subtleBorder}`}>
                  <Target className="mx-auto h-8 w-8 text-slate-400" />
                  <h3 className={`mt-4 text-lg font-bold ${ui.title}`} style={{ margin: 0 }}>Descanso Ativo</h3>
                  <p className={`mt-2 text-sm leading-6 ${ui.muted}`} style={{ margin: "4px 0 0" }}>Aproveite hoje para descansar a musculatura ou realizar um treino cardiovascular leve.</p>
                </div>
              ) : null}

              {!loading && !error && selectedWorkout && selectedWorkout.exercises.length > 0 ? (
                <div 
                  className="animate-slide-up grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6"
                >
                  {selectedWorkout.exercises.map((exercise, index) => (

                    <ExerciseCard
                      key={exercise.id}
                      exercise={exercise}
                      index={index}
                      isDark={isDark}
                      ui={ui}
                    />
                  ))}
                </div>
              ) : null}
            </section>
          </div>
        </div>

        {/* Modal de Treino Completo */}
        {isWorkoutModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
            <div 
              className={`w-full rounded-[24px] border shadow-2xl flex flex-col ${
                isDark ? "bg-slate-950 border-slate-800 text-white" : "bg-white border-slate-200 text-slate-900"
              }`}
              style={{ width: "min(96vw, 1280px)", maxHeight: "90vh", padding: "32px" }}
            >
              {/* Header */}
              <div className="pb-6 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between gap-4">
                <div>
                  <h2 className="text-2xl font-black tracking-tight" style={{ margin: 0 }}>Treino Completo</h2>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-1" style={{ margin: 0 }}>Programação semanal de treinos e rotina</p>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={handleExportWorkout}
                    className="btn btn-outline btn-sm"
                    style={{ display: "flex", alignItems: "center", gap: 6 }}
                  >
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/>
                    </svg>
                    Exportar treino em PDF
                  </button>
                  <button
                    onClick={() => setIsWorkoutModalOpen(false)}
                    className="btn-icon btn-sm"
                    style={{ display: "flex", alignItems: "center", justifyContent: "center", width: 32, height: 32, cursor: "pointer", background: "transparent" }}
                  >
                    ✕
                  </button>
                </div>
              </div>

              {/* Content */}
              <div className="overflow-y-auto flex flex-col scrollbar-thin" style={{ padding: "24px 0 0 0", gap: "24px", flex: 1 }}>
                {WEEK_DAYS.map((day) => {
                  const workout = workouts.find((w) => w.weekDay === day.key);
                  return (
                    <div 
                      key={day.key} 
                      className={`border ${
                        isDark ? "bg-slate-900/40 border-slate-800" : "bg-slate-50/50 border-slate-100"
                      }`}
                      style={{ padding: "24px", marginBottom: "24px", borderRadius: "18px" }}
                    >
                      <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800/80 pb-3 mb-4">
                        <h3 className="text-sm font-black uppercase tracking-wider text-[#C0392B]" style={{ margin: 0 }}>
                          {day.fullLabel}
                        </h3>
                        {workout?.title && (
                          <span className="text-xs font-bold text-slate-500 dark:text-slate-400">
                            Foco: {workout.title}
                          </span>
                        )}
                      </div>

                      {!workout || !workout.exercises || workout.exercises.length === 0 ? (
                        <p className="text-xs text-slate-400 dark:text-slate-500 italic" style={{ margin: 0 }}>
                          Nenhum exercício cadastrado para este dia.
                        </p>
                      ) : (
                        <div 
                          style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(min(320px, 100%), 1fr))", gap: "20px" }}
                        >
                          {workout.exercises.map((ex, exIdx) => (
                            <div 
                              key={ex.id} 
                              className={`border ${
                                isDark ? "bg-slate-950 border-slate-800/60" : "bg-white border-slate-200"
                              }`}
                              style={{ padding: "20px", borderRadius: "16px" }}
                            >
                              <div className="flex justify-between items-center gap-2 mb-3">
                                <h4 className="text-xs font-extrabold text-slate-800 dark:text-slate-200" style={{ margin: 0 }}>
                                  {ex.name}
                                </h4>
                                <span className="px-2 py-0.5 rounded-full text-[9px] font-bold bg-[#C0392B]/10 text-[#C0392B] border border-[#C0392B]/20">
                                  {ex.muscle}
                                </span>
                              </div>
                              <div className="grid grid-cols-3 gap-2 text-center mb-2.5">
                                <div className={`p-1.5 rounded-lg border text-[10px] ${isDark ? "bg-slate-900 border-slate-800" : "bg-slate-50 border-slate-100"}`}>
                                  <span className="text-[8px] text-slate-400 block font-semibold uppercase">Séries</span>
                                  <span className="font-extrabold text-xs">{ex.sets || "—"}</span>
                                </div>
                                <div className={`p-1.5 rounded-lg border text-[10px] ${isDark ? "bg-slate-900 border-slate-800" : "bg-slate-50 border-slate-100"}`}>
                                  <span className="text-[8px] text-slate-400 block font-semibold uppercase">Reps</span>
                                  <span className="font-extrabold text-xs">{ex.reps || "—"}</span>
                                </div>
                                <div className={`p-1.5 rounded-lg border text-[10px] ${isDark ? "bg-slate-900 border-slate-800" : "bg-slate-50 border-slate-100"}`}>
                                  <span className="text-[8px] text-slate-400 block font-semibold uppercase">Descanso</span>
                                  <span className="font-extrabold text-xs">{ex.restSeconds}s</span>
                                </div>
                              </div>
                              {ex.notes && ex.notes !== "Sem observacoes." && (
                                <div className="border-t border-slate-100 dark:border-slate-800/60 pt-2">
                                  <span className="text-[8px] text-[#C0392B] block font-bold uppercase tracking-wider">Obs</span>
                                  <p className="text-[10px] text-slate-500 dark:text-slate-400 leading-relaxed mt-0.5" style={{ margin: 0 }}>
                                    {ex.notes}
                                  </p>
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* Modal de Pagamento Pix */}
        <PixPaymentModal
          open={isPixModalOpen}
          onClose={() => setIsPixModalOpen(false)}
          subscriptionId={subscription?.id || null}
          onSuccess={loadStudentData}
        />
      </DashboardLayout>
    </ProtectedRoute>
  );
}

