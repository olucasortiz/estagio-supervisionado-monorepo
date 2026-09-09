"use client";

import React, { useState, useEffect, useMemo, useCallback } from "react";
import {
  ArrowLeft,
  ArrowRight,
  Check,
  ChevronRight,
  Clock3,
  CreditCard,
  Dumbbell,
  Flame,
  LogOut,
  QrCode,
  ShieldCheck,
  Sparkles,
  Timer,
  User as UserIcon,
} from "lucide-react";

import { useAuth } from "@/hooks/useAuth";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { UserAvatar } from "@/components/ui/user-avatar";
import { ThemeToggle } from "@/components/ui/ThemeToggle";
import {
  getMySubscription,
  getMyWorkouts,
  getMemberProfile,
  getPersonalTrainers,
} from "@/services/api";
import { cn } from "@/lib/utils";

// ─── Tipos alinhados com o backend ───────────────────────────────────────────

export type BackendExercise = {
  id: string;
  workoutSheetId?: string;
  exerciseName: string;
  muscle: string | null;
  exerciseType?: string | null;
  equipment?: string | null;
  difficulty?: string | null;
  instructions?: string | null;
  sets: number;
  reps: number;
  restSeconds: number | null;
  notes?: string | null;
  createdAt?: string | null;
};

export type WorkoutResponse = {
  id: string;
  memberId: string;
  personalTrainerId: string | null;
  title: string | null;
  weekDay: string | null;
  weekDayLabel: string | null;
  active: boolean;
  createdAt: string | null;
  exercises: BackendExercise[];
};

export type MySubscriptionResponse = {
  id: string;
  memberId: string;
  planId: string;
  planName: string;
  planType: string;
  planPrice: number;
  startDate: string | number[];
  endDate: string | number[];
  status: string;
  createdAt?: string | number[];
  daysRemaining?: number;
  hasSubscription: boolean;
};

export type PersonalTrainerItem = {
  id: string;
  name: string;
  email?: string;
  phone?: string | null;
  specialty?: string | null;
  photoUrl?: string | null;
};

export type MemberProfile = {
  id: string;
  userId?: string;
  personalTrainerId?: string | null;
  name: string;
  cpf?: string;
  email?: string;
  photoUrl?: string | null;
  active?: boolean;
};

// ─── Constantes e Mapeamentos ────────────────────────────────────────────────

const ALL_WEEK_DAYS = [
  { key: "MONDAY", curto: "Seg", nome: "Segunda-feira" },
  { key: "TUESDAY", curto: "Ter", nome: "Terça-feira" },
  { key: "WEDNESDAY", curto: "Qua", nome: "Quarta-feira" },
  { key: "THURSDAY", curto: "Qui", nome: "Quinta-feira" },
  { key: "FRIDAY", curto: "Sex", nome: "Sexta-feira" },
  { key: "SATURDAY", curto: "Sáb", nome: "Sábado" },
  { key: "SUNDAY", curto: "Dom", nome: "Domingo" },
] as const;

const DAY_INDEX_TO_KEY = [
  "SUNDAY",
  "MONDAY",
  "TUESDAY",
  "WEDNESDAY",
  "THURSDAY",
  "FRIDAY",
  "SATURDAY",
] as const;

// ─── Helpers ─────────────────────────────────────────────────────────────────

function getGreeting(): string {
  const hour = new Date().getHours();
  if (hour >= 5 && hour < 12) return "Bom dia";
  if (hour >= 12 && hour < 18) return "Boa tarde";
  return "Boa noite";
}

function getFirstName(fullName?: string | null): string {
  if (!fullName) return "Aluno";
  const parts = fullName.trim().split(" ").filter(Boolean);
  return parts[0] || "Aluno";
}

function getInitials(name?: string | null): string {
  if (!name) return "AL";
  const parts = name.trim().split(" ").filter(Boolean);
  if (parts.length === 0) return "AL";
  if (parts.length === 1) return parts[0].substring(0, 2).toUpperCase();
  return (parts[0].charAt(0) + parts[parts.length - 1].charAt(0)).toUpperCase();
}

function formatDate(iso: string | number[] | null | undefined): string {
  if (!iso) return "—";
  if (Array.isArray(iso)) {
    const [year, month, day] = iso as number[];
    return `${String(day).padStart(2, "0")}/${String(month).padStart(2, "0")}/${year}`;
  }
  const parts = String(iso).split("-");
  if (parts.length === 3) {
    const [year, month, day] = parts;
    return `${day}/${month}/${year}`;
  }
  return String(iso);
}

function formatCurrency(value: number | null | undefined): string {
  if (value == null) return "—";
  return value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function formatRestSeconds(seconds: number | null | undefined): string {
  if (seconds == null || seconds <= 0) return "45s";
  return `${seconds}s`;
}

function labelStatus(status: string | null | undefined): string {
  if (!status) return "INATIVO";
  const map: Record<string, string> = {
    ACTIVE: "ATIVO",
    OVERDUE: "VENCIDO",
    CANCELED: "CANCELADO",
    INACTIVE: "INATIVO",
  };
  return map[status.toUpperCase()] ?? status.toUpperCase();
}

// ─── Componente Principal ─────────────────────────────────────────────────────

export default function PlanoAlunoPage({
  onOpenPixModal,
  onOpenCardModal,
  onSubscriptionLoaded,
}: {
  onOpenPixModal?: () => void;
  onOpenCardModal?: () => void;
  onSubscriptionLoaded?: (subscriptionId: string, amount: number) => void;
}) {
  const { user, logout } = useAuth();

  // Estados de dados reais
  const [memberProfile, setMemberProfile] = useState<MemberProfile | null>(null);
  const [subscription, setSubscription] = useState<MySubscriptionResponse | null>(null);
  const [workouts, setWorkouts] = useState<WorkoutResponse[]>([]);
  const [personalTrainer, setPersonalTrainer] = useState<PersonalTrainerItem | null>(null);

  // Estados de carregamento e erro
  const [loadingSubscription, setLoadingSubscription] = useState(true);
  const [loadingWorkouts, setLoadingWorkouts] = useState(true);
  const [errorWorkouts, setErrorWorkouts] = useState<string | null>(null);

  // Dia ativo selecionado (inicializa com o dia atual do calendário)
  const todayKey = useMemo(() => {
    const dayIndex = new Date().getDay();
    return DAY_INDEX_TO_KEY[dayIndex];
  }, []);

  const [selectedDayKey, setSelectedDayKey] = useState<string>(todayKey);

  // Treino em andamento (interatividade do protótipo)
  const [isTraining, setIsTraining] = useState(false);
  const [currentExerciseIdx, setCurrentExerciseIdx] = useState(0);
  const [currentSet, setCurrentSet] = useState(1);
  const [restSecondsLeft, setRestSecondsLeft] = useState(42);
  const [isResting, setIsResting] = useState(false);
  const [completedWorkoutsSession, setCompletedWorkoutsSession] = useState(0);

  // 1. Carregar perfil do membro
  useEffect(() => {
    let active = true;
    getMemberProfile()
      .then((data: any) => {
        if (active && data) {
          setMemberProfile(data);
        }
      })
      .catch(() => {
        // Fallback suave com os dados da sessão de autenticação
      });
    return () => {
      active = false;
    };
  }, []);

  // 2. Carregar assinatura real
  useEffect(() => {
    let active = true;
    setLoadingSubscription(true);

    getMySubscription()
      .then((data: any) => {
        if (!active) return;
        if (!data || data.hasSubscription === false) {
          setSubscription(null);
        } else {
          setSubscription(data);
          onSubscriptionLoaded?.(data.id, data.planPrice);
        }
      })
      .catch(() => {
        if (active) setSubscription(null);
      })
      .finally(() => {
        if (active) setLoadingSubscription(false);
      });

    return () => {
      active = false;
    };
  }, [onSubscriptionLoaded]);

  // 3. Carregar treinos reais
  useEffect(() => {
    let active = true;
    setLoadingWorkouts(true);
    setErrorWorkouts(null);

    getMyWorkouts()
      .then((data: any) => {
        if (!active) return;
        const list: WorkoutResponse[] = Array.isArray(data) ? data : [];
        setWorkouts(list);

        // Se hoje não tem treino, mas existe outro dia com treino, mantemos hoje ou o primeiro com treino
        const hasTodayWorkout = list.some((w) => w.weekDay?.toUpperCase() === todayKey);
        if (!hasTodayWorkout) {
          const firstWithWorkout = ALL_WEEK_DAYS.find((wd) =>
            list.some((w) => w.weekDay?.toUpperCase() === wd.key)
          );
          if (firstWithWorkout) {
            setSelectedDayKey(firstWithWorkout.key);
          }
        }
      })
      .catch((err: Error) => {
        if (active) setErrorWorkouts(err.message || "Não foi possível carregar os treinos.");
      })
      .finally(() => {
        if (active) setLoadingWorkouts(false);
      });

    return () => {
      active = false;
    };
  }, [todayKey]);

  // 4. Carregar Personal Trainer do aluno (se houver associação real)
  useEffect(() => {
    // Se o perfil do membro foi carregado, seu personalTrainerId é a fonte de verdade.
    // Caso ainda não tenha perfil, podemos usar o do primeiro treino como fallback.
    const ptId = memberProfile !== null
      ? memberProfile.personalTrainerId
      : workouts[0]?.personalTrainerId;

    if (!ptId) {
      setPersonalTrainer(null);
      return;
    }

    let active = true;
    getPersonalTrainers()
      .then((trainers: any) => {
        if (!active || !Array.isArray(trainers)) return;
        const found = trainers.find((t: PersonalTrainerItem) => String(t.id) === String(ptId));
        if (found) {
          setPersonalTrainer(found);
        } else {
          setPersonalTrainer(null);
        }
      })
      .catch(() => {
        if (active) setPersonalTrainer(null);
      });

    return () => {
      active = false;
    };
  }, [memberProfile, workouts]);

  // Timer de descanso durante o treino
  useEffect(() => {
    if (!isTraining || !isResting) return;
    if (restSecondsLeft <= 0) {
      setIsResting(false);
      return;
    }

    const timer = setInterval(() => {
      setRestSecondsLeft((prev) => Math.max(0, prev - 1));
    }, 1000);

    return () => clearInterval(timer);
  }, [isTraining, isResting, restSecondsLeft]);

  // ─── Dados Derivados ───────────────────────────────────────────────────────

  const studentFullName = memberProfile?.name || user?.name || "Aluno";
  const studentFirstName = getFirstName(studentFullName);
  const studentInitials = getInitials(studentFullName);
  const greeting = useMemo(() => getGreeting(), []);

  // Fichas mapeadas para os 7 dias da semana
  const weeklyDays = useMemo(() => {
    return ALL_WEEK_DAYS.map((wd) => {
      const fichas = workouts.filter((w) => w.weekDay?.toUpperCase() === wd.key);
      const exercises = fichas.flatMap((f) => f.exercises || []);
      const title = fichas.length > 0 ? (fichas[0].title ?? "Treino") : null;
      return {
        ...wd,
        hasWorkout: fichas.length > 0 && exercises.length > 0,
        fichas,
        exercises,
        title,
        isToday: wd.key === todayKey,
      };
    });
  }, [workouts, todayKey]);

  // Contagem de treinos cadastrados para a meta semanal
  const daysWithWorkouts = useMemo(() => {
    return weeklyDays.filter((d) => d.hasWorkout);
  }, [weeklyDays]);

  const totalTreinos = daysWithWorkouts.length;
  const treinosConcluidos = Math.min(totalTreinos, completedWorkoutsSession);

  const percentualMeta = useMemo(() => {
    if (totalTreinos === 0) return 0;
    return Math.min(100, Math.round((treinosConcluidos / totalTreinos) * 100));
  }, [treinosConcluidos, totalTreinos]);

  // Treino do dia selecionado
  const selectedDay = useMemo(() => {
    return weeklyDays.find((d) => d.key === selectedDayKey) || weeklyDays[0];
  }, [weeklyDays, selectedDayKey]);

  const currentWorkoutExercises = selectedDay?.exercises || [];
  const currentExercise = currentWorkoutExercises[currentExerciseIdx] || null;

  // Handlers do treino em andamento
  const handleStartWorkout = () => {
    if (currentWorkoutExercises.length === 0) return;
    setIsTraining(true);
    setCurrentExerciseIdx(0);
    setCurrentSet(1);
    setIsResting(false);
    setRestSecondsLeft(currentWorkoutExercises[0]?.restSeconds || 45);
  };

  const handleNextSet = () => {
    if (!currentExercise) return;
    if (currentSet < currentExercise.sets) {
      setCurrentSet((s) => s + 1);
      setIsResting(true);
      setRestSecondsLeft(currentExercise.restSeconds || 45);
    } else {
      // Próximo exercício
      if (currentExerciseIdx + 1 < currentWorkoutExercises.length) {
        const nextIdx = currentExerciseIdx + 1;
        setCurrentExerciseIdx(nextIdx);
        setCurrentSet(1);
        setIsResting(true);
        setRestSecondsLeft(currentWorkoutExercises[nextIdx]?.restSeconds || 45);
      } else {
        // Concluiu todos os exercícios do dia
        setIsTraining(false);
        setCompletedWorkoutsSession((prev) => prev + 1);
      }
    }
  };

  const circumference = 276;
  const strokeOffset = circumference - (percentualMeta / 100) * circumference;

  return (
    <main className="min-h-screen bg-background pb-12 text-foreground">
      <div className="mx-auto w-full max-w-6xl px-4 sm:px-6 lg:px-8">
        {/* ─── Top Navbar ─────────────────────────────────────────────────── */}
        <nav
          className="flex h-20 items-center justify-between border-b border-border/70"
          aria-label="Principal"
        >
          <div className="flex items-center gap-2.5" aria-label="Lion Fitness">
            <span className="grid size-9 place-items-center rounded-lg bg-lion-red text-white shadow-brand">
              <Flame className="size-5" strokeWidth={2.5} />
            </span>
            <span className="text-sm font-extrabold uppercase tracking-[0.16em] text-foreground">
              Lion <span className="text-lion-red">Fitness</span>
            </span>
          </div>

          <div className="flex items-center gap-3">
            <div className="hidden text-right sm:block">
              <p className="text-sm font-semibold text-foreground">{studentFullName}</p>
              <p className="text-xs text-muted-foreground">Aluno</p>
            </div>

            <UserAvatar
              initials={studentInitials}
              photoUrl={memberProfile?.photoUrl}
              className="size-10 border-2 border-card shadow-sm"
              title={studentFullName}
            />

            <ThemeToggle />

            {/* Botão de Logout — Visualmente idêntico ao de /personal */}
            <Button
              variant="ghost"
              size="sm"
              onClick={logout}
              className="text-muted-foreground hover:text-destructive hover:bg-destructive/10 ml-1 h-8 px-2.5 cursor-pointer"
              title="Sair do sistema"
            >
              <LogOut className="size-4" />
              <span className="hidden md:inline text-xs font-medium">Sair</span>
            </Button>
          </div>
        </nav>

        {/* ─── Header da Área do Aluno ────────────────────────────────────── */}
        <header className="lift-in grid grid-cols-[minmax(0,1fr)_auto] items-center gap-4 py-8 sm:py-10">
          <div className="min-w-0">
            <div className="mb-2 flex items-center gap-2 text-sm font-semibold text-lion-red">
              <Sparkles className="size-4" /> {greeting}
            </div>
            <h1 className="truncate text-3xl font-extrabold tracking-normal sm:text-4xl">
              Olá, {studentFirstName}!
            </h1>
            <p className="mt-2 text-base text-muted-foreground sm:text-lg">
              Vamos treinar hoje?
            </p>
          </div>

          <div className="hidden size-16 shrink-0 place-items-center rounded-2xl bg-lion-red/10 text-lion-red sm:grid">
            <Dumbbell className="size-7" />
          </div>
        </header>

        {/* ─── Cards Superiores (Grid 2 Colunas) ──────────────────────────── */}
        <div className="grid gap-5 lg:grid-cols-[1.12fr_0.88fr]">
          {/* Card 1: Seu Plano */}
          <section className="lift-in overflow-hidden rounded-xl border border-border bg-card shadow-card [animation-delay:80ms] flex flex-col justify-between">
            <div className="flex items-start justify-between gap-4 border-b border-border p-5 sm:p-6">
              <div className="min-w-0">
                <div className="mb-3 flex flex-wrap items-center gap-2">
                  <span className="text-xs font-bold uppercase tracking-[0.12em] text-muted-foreground">
                    Seu plano
                  </span>

                  {loadingSubscription ? (
                    <Badge variant="secondary" className="animate-pulse">
                      Carregando…
                    </Badge>
                  ) : subscription ? (
                    <Badge
                      className={cn(
                        subscription.status?.toUpperCase() === "ACTIVE"
                          ? "border-emerald-500/25 bg-emerald-500/12 text-emerald-600 dark:bg-white dark:text-neutral-950 dark:border-white dark:hover:bg-white"
                          : "border-destructive/25 bg-destructive/12 text-destructive"
                      )}
                    >
                      <span
                        className={cn(
                          "mr-1.5 size-1.5 rounded-full",
                          subscription.status?.toUpperCase() === "ACTIVE"
                            ? "bg-emerald-500 dark:bg-emerald-600"
                            : "bg-destructive"
                        )}
                      />
                      {labelStatus(subscription.status)}
                    </Badge>
                  ) : (
                    <Badge variant="outline" className="border-border text-muted-foreground">
                      SEM PLANO
                    </Badge>
                  )}
                </div>

                {loadingSubscription ? (
                  <div className="h-8 w-44 rounded bg-muted animate-pulse my-1" />
                ) : subscription ? (
                  <h2 className="text-2xl font-extrabold tracking-normal text-foreground">
                    {subscription.planName || "Plano Ativo"}
                  </h2>
                ) : (
                  <h2 className="text-2xl font-extrabold tracking-normal text-foreground">
                    Nenhum plano ativo
                  </h2>
                )}

                <p className="mt-2 text-sm text-muted-foreground">
                  {loadingSubscription ? (
                    <span className="inline-block h-4 w-32 rounded bg-muted animate-pulse" />
                  ) : subscription ? (
                    <>
                      Válido até:{" "}
                      <strong className="font-semibold text-foreground">
                        {formatDate(subscription.endDate)}
                      </strong>
                    </>
                  ) : (
                    "Regularize sua assinatura para continuar treinando."
                  )}
                </p>
              </div>

              <ShieldCheck
                className={cn(
                  "size-7 shrink-0",
                  subscription && subscription.status?.toUpperCase() === "ACTIVE"
                    ? "text-emerald-500"
                    : "text-muted-foreground"
                )}
              />
            </div>

            <div className="p-5 sm:p-6">
              <div className="mb-4 flex items-end justify-between gap-3">
                <div>
                  <h3 className="font-bold text-foreground">Renovar mensalidade</h3>
                  <p className="mt-1 text-xs text-muted-foreground">
                    Escolha uma forma de pagamento
                  </p>
                </div>

                {subscription && (
                  <span className="text-xs font-semibold text-muted-foreground">
                    Valor:{" "}
                    <strong className="text-foreground">
                      {formatCurrency(subscription.planPrice)}
                    </strong>
                  </span>
                )}
              </div>

              <div className="grid gap-3 min-[390px]:grid-cols-2">
                {/* Botão Pix */}
                <button
                  type="button"
                  id="btn-aluno-pagar-pix"
                  onClick={onOpenPixModal}
                  disabled={!subscription}
                  className="group min-w-0 rounded-lg border border-border bg-background dark:bg-[#161618] p-4 text-left transition duration-200 hover:-translate-y-0.5 hover:border-lion-red/40 hover:shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring cursor-pointer disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <div className="mb-4 flex items-start justify-between gap-2">
                    <span className="grid size-10 place-items-center rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                      <QrCode className="size-5" />
                    </span>
                    <Badge variant="secondary" className="border-0 text-[10px]">
                      Rápido
                    </Badge>
                  </div>
                  <span className="block font-bold text-foreground">Pix</span>
                  <span className="mt-1 block text-xs leading-5 text-muted-foreground">
                    Pagamento rápido e aprovação em poucos minutos
                  </span>
                </button>

                {/* Botão Cartão */}
                <button
                  type="button"
                  id="btn-aluno-pagar-cartao"
                  onClick={onOpenCardModal}
                  disabled={!subscription}
                  className="group min-w-0 rounded-lg border border-border bg-background dark:bg-[#161618] p-4 text-left transition duration-200 hover:-translate-y-0.5 hover:border-lion-red/40 hover:shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring cursor-pointer disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <div className="mb-4 flex items-start justify-between gap-2">
                    <span className="grid size-10 place-items-center rounded-lg bg-muted text-foreground">
                      <CreditCard className="size-5" />
                    </span>
                    <span className="mt-1 flex gap-1">
                      <i className="size-2 rounded-full bg-lion-red" />
                      <i className="size-2 rounded-full bg-amber-500" />
                    </span>
                  </div>
                  <span className="block font-bold text-foreground">Cartão</span>
                  <span className="mt-1 block text-xs leading-5 text-muted-foreground">
                    Pague com cartão de crédito
                  </span>
                </button>
              </div>
            </div>
          </section>

          {/* Card 2: Seu Progresso */}
          <section className="lift-in rounded-xl border border-border bg-card p-5 shadow-card [animation-delay:160ms] sm:p-6 flex flex-col justify-between">
            <div className="flex items-start justify-between gap-4">
              <div>
                <span className="text-xs font-bold uppercase tracking-[0.12em] text-muted-foreground">
                  Seu progresso
                </span>
                <h2 className="mt-2 text-xl font-extrabold text-foreground">
                  {totalTreinos > 0 ? "Sua rotina semanal" : "Rotina em montagem"}
                </h2>
                <p className="mt-1 text-sm text-muted-foreground">
                  {loadingWorkouts ? (
                    <span className="inline-block h-4 w-28 rounded bg-muted animate-pulse" />
                  ) : totalTreinos > 0 ? (
                    <>
                      <strong className="text-foreground">
                        {treinosConcluidos}/{totalTreinos} treinos
                      </strong>{" "}
                      prescritos na semana
                    </>
                  ) : (
                    "Aguardando prescrição do seu treinador."
                  )}
                </p>
              </div>

              {/* Anel Circular SVG com Percentual Real */}
              <div className="relative size-24 shrink-0">
                <svg className="size-full -rotate-90" viewBox="0 0 100 100" aria-hidden="true">
                  <circle
                    cx="50"
                    cy="50"
                    r="44"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="8"
                    className="text-muted"
                  />
                  <circle
                    cx="50"
                    cy="50"
                    r="44"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="8"
                    strokeLinecap="round"
                    strokeDasharray={circumference}
                    strokeDashoffset={strokeOffset}
                    className="text-lion-red transition-all duration-700 ease-out"
                  />
                </svg>
                <span className="absolute inset-0 grid place-items-center text-lg font-extrabold text-foreground">
                  {percentualMeta}%
                </span>
              </div>
            </div>

            {/* Linha dos 7 dias com indicação real de treinos cadastrados */}
            <div className="mt-7 grid grid-cols-7 gap-1.5 sm:gap-2">
              {weeklyDays.map((item, index) => {
                const isSelected = item.key === selectedDayKey;
                return (
                  <button
                    key={item.key}
                    type="button"
                    onClick={() => setSelectedDayKey(item.key)}
                    className="flex min-w-0 flex-col items-center gap-2 cursor-pointer focus:outline-none group"
                    title={`${item.nome}: ${item.hasWorkout ? item.title : "Descanso"}`}
                  >
                    <span
                      className={cn(
                        "text-[10px] font-semibold transition-colors sm:text-xs",
                        item.isToday
                          ? "text-lion-red font-bold"
                          : isSelected
                          ? "text-foreground font-semibold"
                          : "text-muted-foreground group-hover:text-foreground"
                      )}
                    >
                      {item.curto}
                    </span>

                    <span
                      className={cn(
                        "grid aspect-square w-full max-w-10 place-items-center rounded-full border text-xs font-bold transition duration-200 group-hover:scale-105",
                        item.hasWorkout
                          ? isSelected
                            ? "border-lion-red bg-lion-red text-white shadow-sm"
                            : "border-lion-red/30 bg-lion-red/10 text-lion-red"
                          : "border-border bg-muted/40 text-muted-foreground"
                      )}
                    >
                      {item.hasWorkout ? (
                        <Dumbbell className="size-3.5" />
                      ) : (
                        index + 1
                      )}
                    </span>
                  </button>
                );
              })}
            </div>

            {/* Barra de Progresso Real */}
            <div className="mt-6 h-1.5 overflow-hidden rounded-full bg-muted">
              <div
                className="h-full rounded-full bg-lion-red transition-all duration-700"
                style={{ width: `${percentualMeta}%` }}
              />
            </div>

            <p className="mt-3 flex items-center gap-2 text-xs font-medium text-muted-foreground">
              <Flame className="size-4 text-amber-500 shrink-0" />
              {totalTreinos === 0 ? (
                "Nenhum treino programado para esta semana."
              ) : treinosConcluidos >= totalTreinos && totalTreinos > 0 ? (
                <strong className="text-emerald-600 dark:text-emerald-400">
                  Meta semanal concluída! Parabéns!
                </strong>
              ) : (
                `Continue com foco — ${totalTreinos - treinosConcluidos} de ${totalTreinos} treinos disponíveis nesta semana.`
              )}
            </p>
          </section>
        </div>

        {/* ─── Seção Treino de Hoje / Treino Selecionado ─────────────────────── */}
        <section className="lift-in mt-5 [animation-delay:240ms]">
          <div className="mb-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div>
              <span className="text-xs font-bold uppercase tracking-[0.12em] text-lion-red">
                {selectedDay.isToday ? "Hoje" : selectedDay.nome}
              </span>
              <h2 className="mt-1 text-xl font-extrabold text-foreground">
                {isTraining
                  ? "Treino em andamento"
                  : selectedDay.isToday
                  ? "Treino de hoje"
                  : `Treino de ${selectedDay.curto}`}
              </h2>
            </div>

            <div className="flex items-center gap-3">
              {/* Informação do Personal Trainer associado (se houver) */}
              {personalTrainer && (
                <div className="flex items-center gap-2.5 rounded-xl border border-border bg-card px-3 py-1.5 shadow-sm">
                  <div className="relative flex size-8 shrink-0 items-center justify-center rounded-full bg-lion-red/10 text-lion-red text-xs font-bold">
                    {getInitials(personalTrainer.name)}
                  </div>
                  <div className="min-w-0 text-left">
                    <p className="text-[10px] uppercase font-bold tracking-wider text-muted-foreground">
                      Seu Personal
                    </p>
                    <p className="truncate text-xs font-semibold text-foreground">
                      {personalTrainer.name}
                    </p>
                  </div>
                </div>
              )}

              {isTraining && (
                <Badge className="border-lion-red/20 bg-lion-red/10 text-lion-red hover:bg-lion-red/15">
                  <span className="mr-1.5 size-1.5 animate-pulse rounded-full bg-lion-red" />{" "}
                  EM CURSO
                </Badge>
              )}
            </div>
          </div>

          {/* Card Principal de Treino */}
          <div className="overflow-hidden rounded-xl border border-border bg-card shadow-card">
            {loadingWorkouts ? (
              <div className="p-8 text-center text-muted-foreground">
                <p className="animate-pulse">Carregando treinos…</p>
              </div>
            ) : errorWorkouts ? (
              <div className="p-8 sm:p-12 text-center flex flex-col items-center justify-center">
                <span className="flex size-14 items-center justify-center rounded-2xl bg-destructive/10 text-destructive mb-4">
                  <Dumbbell className="size-7" />
                </span>
                <h3 className="text-lg font-bold text-foreground">
                  Não foi possível carregar os treinos
                </h3>
                <p className="mt-1 max-w-md text-sm text-muted-foreground">
                  {errorWorkouts}
                </p>
              </div>
            ) : currentWorkoutExercises.length === 0 ? (
              /* Estado Vazio Amigável */
              <div className="p-8 sm:p-12 text-center flex flex-col items-center justify-center">
                <span className="flex size-14 items-center justify-center rounded-2xl bg-muted text-muted-foreground mb-4">
                  <Dumbbell className="size-7" />
                </span>
                <h3 className="text-lg font-bold text-foreground">
                  {selectedDay.isToday
                    ? "Nenhum treino agendado para hoje"
                    : `Sem treino programado para ${selectedDay.nome}`}
                </h3>
                <p className="mt-1 max-w-md text-sm text-muted-foreground">
                  {workouts.length === 0
                    ? "Nenhum treino disponível no momento. Seu treinador ainda está montando sua ficha de exercícios."
                    : "Aproveite para descanso ativo ou selecione outro dia da semana acima para consultar seus treinos."}
                </p>
              </div>
            ) : !isTraining ? (
              /* Visualização do Treino (Pré-início) */
              <div className="animate-in fade-in duration-200 lg:grid lg:grid-cols-[0.9fr_1.1fr]">
                <div className="bg-foreground dark:bg-[#151518] p-5 text-background dark:text-foreground sm:p-7 flex flex-col justify-between">
                  <div>
                    <span className="inline-flex items-center gap-2 text-xs font-bold uppercase tracking-[0.12em] text-lion-red">
                      <Dumbbell className="size-4" /> {selectedDay.title || "Treino Principal"}
                    </span>

                    <h3 className="mt-4 text-2xl font-extrabold tracking-normal">
                      {selectedDay.exercises[0]?.muscle
                        ? `Foco em ${selectedDay.exercises.map((e) => e.muscle).filter(Boolean).filter((v, i, a) => a.indexOf(v) === i).slice(0, 2).join(" e ")}`
                        : "Sessão de Treino"}
                    </h3>

                    <div className="mt-5 flex flex-wrap gap-4 text-xs text-background/70 dark:text-muted-foreground">
                      <span className="flex items-center gap-1.5">
                        <Dumbbell className="size-4" /> {currentWorkoutExercises.length} exercícios
                      </span>
                      <span className="flex items-center gap-1.5">
                        <Clock3 className="size-4" /> ~{currentWorkoutExercises.length * 10} minutos
                      </span>
                    </div>
                  </div>

                  <Button
                    size="lg"
                    className="mt-7 h-12 w-full font-bold bg-lion-red hover:bg-lion-red-dark text-white shadow-brand transition-transform active:scale-[0.99] cursor-pointer sm:w-auto"
                    onClick={handleStartWorkout}
                  >
                    Iniciar treino <ArrowRight className="size-4 ml-1" />
                  </Button>
                </div>

                <div className="p-5 sm:p-7">
                  <p className="mb-3 text-xs font-bold uppercase tracking-[0.12em] text-muted-foreground">
                    Exercícios prescritos
                  </p>
                  <ol className="grid gap-1 sm:grid-cols-2 sm:gap-x-8">
                    {currentWorkoutExercises.map((exercise, index) => (
                      <li
                        key={exercise.id || `${exercise.exerciseName}-${index}`}
                        className="flex items-center gap-3 border-b border-border py-3 last:border-0 sm:[&:nth-last-child(-n+2)]:border-0"
                      >
                        <span className="grid size-7 shrink-0 place-items-center rounded-full bg-muted text-xs font-bold text-muted-foreground">
                          {index + 1}
                        </span>
                        <div className="min-w-0">
                          <span className="block truncate text-sm font-semibold text-foreground">
                            {exercise.exerciseName}
                          </span>
                          <span className="block text-xs text-muted-foreground">
                            {exercise.sets} séries × {exercise.reps} reps · {formatRestSeconds(exercise.restSeconds)} descanso
                          </span>
                        </div>
                      </li>
                    ))}
                  </ol>
                </div>
              </div>
            ) : (
              /* Treino em Andamento (Interação da Sessão) */
              <div className="animate-in slide-in-from-right-4 fade-in grid duration-300 lg:grid-cols-[1fr_0.8fr]">
                <div className="p-5 sm:p-7">
                  <button
                    type="button"
                    onClick={() => setIsTraining(false)}
                    className="mb-6 inline-flex items-center gap-2 text-xs font-bold text-muted-foreground transition hover:text-foreground cursor-pointer"
                  >
                    <ArrowLeft className="size-4" /> Voltar ao resumo
                  </button>

                  <p className="text-xs font-bold uppercase tracking-[0.12em] text-lion-red">
                    Exercício atual · {currentExerciseIdx + 1} de {currentWorkoutExercises.length}
                  </p>

                  <h3 className="mt-3 text-2xl font-extrabold sm:text-3xl text-foreground">
                    {currentExercise?.exerciseName || "Exercício"}
                  </h3>

                  {currentExercise?.muscle && (
                    <p className="mt-1 text-sm text-muted-foreground">
                      Grupo muscular: <strong className="text-foreground">{currentExercise.muscle}</strong>
                    </p>
                  )}

                  <div className="mt-6 grid grid-cols-2 gap-3">
                    <div className="rounded-lg bg-muted p-4">
                      <span className="block text-xs text-muted-foreground">Série</span>
                      <strong className="mt-1 block text-xl text-foreground">
                        {currentSet} de {currentExercise?.sets || 4}
                      </strong>
                    </div>

                    <div className="rounded-lg bg-muted p-4">
                      <span className="block text-xs text-muted-foreground">Repetições</span>
                      <strong className="mt-1 block text-xl text-foreground">
                        {currentExercise?.reps || 12}
                      </strong>
                    </div>
                  </div>

                  <div className="mt-6">
                    <div className="mb-2 flex justify-between text-xs font-semibold">
                      <span>Progresso do treino</span>
                      <span className="text-muted-foreground">
                        {Math.round(
                          ((currentExerciseIdx + currentSet / (currentExercise?.sets || 4)) /
                            currentWorkoutExercises.length) *
                            100
                        )}
                        %
                      </span>
                    </div>

                    <div className="h-2 overflow-hidden rounded-full bg-muted">
                      <div
                        className="h-full rounded-full bg-lion-red transition-all duration-300"
                        style={{
                          width: `${Math.round(
                            ((currentExerciseIdx + currentSet / (currentExercise?.sets || 4)) /
                              currentWorkoutExercises.length) *
                              100
                          )}%`,
                        }}
                      />
                    </div>
                  </div>

                  <Button
                    size="lg"
                    className="mt-7 h-12 w-full font-bold bg-lion-red hover:bg-lion-red-dark text-white cursor-pointer"
                    onClick={handleNextSet}
                  >
                    <Check className="size-4 mr-1" />
                    {currentSet === currentExercise?.sets &&
                    currentExerciseIdx + 1 === currentWorkoutExercises.length
                      ? "Concluir treino"
                      : isResting
                      ? "Pular descanso e avançar"
                      : "Concluir série"}
                  </Button>
                </div>

                {/* Painel de Descanso / Timer */}
                <div className="grid place-items-center border-t border-border bg-muted/40 p-7 lg:border-l lg:border-t-0">
                  <div className="text-center">
                    <p className="mb-5 text-xs font-bold uppercase tracking-[0.12em] text-muted-foreground">
                      {isResting ? "Descanso entre séries" : "Intervalo recomendado"}
                    </p>

                    <div className="relative mx-auto size-40">
                      <svg className="size-full -rotate-90" viewBox="0 0 120 120" aria-hidden="true">
                        <circle
                          cx="60"
                          cy="60"
                          r="54"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="7"
                          className="text-border"
                        />
                        <circle
                          cx="60"
                          cy="60"
                          r="54"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="7"
                          strokeLinecap="round"
                          strokeDasharray="339"
                          strokeDashoffset={
                            isResting && currentExercise?.restSeconds
                              ? 339 - (restSecondsLeft / currentExercise.restSeconds) * 339
                              : 0
                          }
                          className="text-lion-red transition-all duration-1000"
                        />
                      </svg>

                      <div className="absolute inset-0 grid place-content-center">
                        <span className="text-3xl font-extrabold tabular-nums text-foreground">
                          00:{String(restSecondsLeft).padStart(2, "0")}
                        </span>
                        <span className="mt-1 text-xs text-muted-foreground">
                          {isResting ? "restantes" : "preparar"}
                        </span>
                      </div>
                    </div>

                    <p className="mt-5 text-sm text-muted-foreground">
                      {isResting
                        ? "Respire fundo e hidrate-se. A próxima série já vem."
                        : "Execute os movimentos com amplitude e boa postura."}
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>
        </section>
      </div>
    </main>
  );
}
