"use client";

import React, { useState, useEffect, useMemo, useCallback } from "react";
import Image from "next/image";
import {
  ArrowLeft,
  ArrowRight,
  Check,
  Clock3,
  CreditCard,
  Dumbbell,
  Flame,
  LogOut,
  QrCode,
  ShieldCheck,
  Sparkles,
  AlertCircle,
  RotateCcw,
} from "lucide-react";

import { useAuth } from "@/hooks/useAuth";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { UserAvatar } from "@/components/ui/user-avatar";
import { ThemeToggle } from "@/components/ui/ThemeToggle";
import { NotificationBell } from "@/components/notification/NotificationBell";
import { ContactPersonalDialog } from "@/components/notification/ContactPersonalDialog";
import { FloatingChat } from "@/components/chat/FloatingChat";
import {
  getMySubscription,
  getMyWorkouts,
  getMemberProfile,
  getMyPersonalTrainer,
} from "@/services/api";

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
  renewalEligible?: boolean;
  renewalAvailableFrom?: string | number[] | null;
  daysUntilRenewal?: number;
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
  onSubscriptionLoaded?: (subscriptionId: string, amount: number, renewalEligible: boolean) => void;
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

  // Treino em andamento (interatividade da sessão)
  const [isTraining, setIsTraining] = useState(false);
  const [currentExerciseIdx, setCurrentExerciseIdx] = useState(0);
  const [currentSet, setCurrentSet] = useState(1);
  const [restSecondsLeft, setRestSecondsLeft] = useState(45);
  const [isResting, setIsResting] = useState(false);
  const [completedWorkoutsSession, setCompletedWorkoutsSession] = useState(0);

  // 1. Carregar perfil do membro
  useEffect(() => {
    let active = true;
    getMemberProfile()
      .then((data: MemberProfile | null) => {
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

    getMySubscription()
      .then((data: MySubscriptionResponse | null) => {
        if (!active) return;
        if (!data || data.hasSubscription === false) {
          setSubscription(null);
        } else {
          setSubscription(data);
          onSubscriptionLoaded?.(data.id, data.planPrice, data.renewalEligible === true);
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
  const [retryKey, setRetryKey] = useState(0);

  useEffect(() => {
    let active = true;

    getMyWorkouts()
      .then((data: WorkoutResponse[] | unknown) => {
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
  }, [todayKey, retryKey]);

  const handleRetryWorkouts = useCallback(() => {
    setLoadingWorkouts(true);
    setErrorWorkouts(null);
    setRetryKey((k) => k + 1);
  }, []);

  // 4. Carregar Personal Trainer do aluno (se houver associação real)
  useEffect(() => {
    let active = true;
    const ptId = memberProfile !== null
      ? memberProfile.personalTrainerId
      : workouts[0]?.personalTrainerId;

    if (!ptId) {
      queueMicrotask(() => {
        if (active) setPersonalTrainer(null);
      });
      return;
    }

    queueMicrotask(() => {
      if (active) setPersonalTrainer({ id: String(ptId), name: "Carregando nome…" });
    });
    getMyPersonalTrainer().then((trainer: PersonalTrainerItem | null) => {
      if (!active) return;
      setPersonalTrainer(trainer && String(trainer.id) === String(ptId)
        ? trainer : { id: String(ptId), name: "Nome do personal indisponível" });
    }).catch(() => {
      if (active) setPersonalTrainer({ id: String(ptId), name: "Nome do personal indisponível" });
    });

    return () => {
      active = false;
    };
  }, [memberProfile, workouts]);

  // Timer de descanso durante o treino
  useEffect(() => {
    if (!isTraining || !isResting) return;

    const timer = setInterval(() => {
      setRestSecondsLeft((prev) => {
        if (prev <= 1) {
          setIsResting(false);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [isTraining, isResting]);

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
    <div className="gp-aluno-shell">
      {/* Skip Link para Acessibilidade */}
      <a className="gp-aluno-skip" href="#aluno-content">
        Pular para o conteúdo principal
      </a>

      {/* ─── Top Navbar ─────────────────────────────────────────────────── */}
      <nav className="gp-aluno-nav" aria-label="Navegação da área do aluno">
        <div className="gp-aluno-container gp-aluno-nav-inner">
          <div className="gp-aluno-brand" aria-label="Lion Fitness">
            <span className="gp-aluno-brand-icon">
              <Image
                src="/03-LOGO-ORIGINAL-LION.png"
                alt="Lion Fitness"
                width={36}
                height={36}
                className="size-9 rounded-lg object-contain"
                priority
              />
            </span>
            <span className="gp-aluno-brand-text">
              Lion <span>Fitness</span>
            </span>
          </div>

          <div className="gp-aluno-nav-actions">
            <div className="gp-aluno-profile">
              <div className="gp-aluno-profile-info">
                <p className="gp-aluno-profile-name">{studentFullName}</p>
                <p className="gp-aluno-profile-role">Aluno</p>
              </div>

              <UserAvatar
                initials={studentInitials}
                photoUrl={memberProfile?.photoUrl}
                className="size-9 border-2 border-border"
                title={studentFullName}
              />
            </div>

            <ThemeToggle />
            <NotificationBell />

            <button
              type="button"
              onClick={logout}
              className="gp-aluno-logout-btn"
              title="Sair do sistema"
              aria-label="Sair da conta"
            >
              <LogOut className="size-4" aria-hidden="true" />
              <span className="hidden sm:inline">Sair</span>
            </button>
          </div>
        </div>
      </nav>

      {/* ─── Conteúdo Principal ─────────────────────────────────────────── */}
      <main id="aluno-content" tabIndex={-1} className="gp-aluno-container">
        {/* Header / Boas-vindas */}
        <header className="gp-aluno-hero">
          <div>
            <div className="gp-aluno-greeting-chip">
              <Sparkles className="size-3.5" aria-hidden="true" /> {greeting}
            </div>
            <h1>Olá, {studentFirstName}!</h1>
            <p>Acompanhe sua rotina semanal, execute seus treinos e consulte sua assinatura.</p>
          </div>

          <div className="gp-aluno-hero-badge" aria-hidden="true">
            <Dumbbell className="size-6" />
          </div>
        </header>

        {/* ─── Grid Superior (Plano & Progresso) ────────────────────────── */}
        <div className="gp-aluno-grid">
          {/* Card 1: Seu Plano */}
          <section className="gp-aluno-card" aria-labelledby="heading-seu-plano">
            <div className="gp-aluno-card-header">
              <div>
                <div className="gp-aluno-card-meta">
                  <span id="heading-seu-plano" className="gp-aluno-card-label">
                    Seu plano
                  </span>

                  {loadingSubscription ? (
                    <Badge variant="secondary" className="animate-pulse">
                      Carregando…
                    </Badge>
                  ) : subscription ? (
                    <span
                      className="gp-aluno-status-badge"
                      data-status={subscription.status?.toLowerCase() || "inactive"}
                    >
                      <span className="gp-aluno-status-dot" aria-hidden="true" />
                      {labelStatus(subscription.status)}
                    </span>
                  ) : (
                    <Badge variant="outline" className="border-border text-muted-foreground">
                      SEM PLANO
                    </Badge>
                  )}
                </div>

                {loadingSubscription ? (
                  <div className="h-7 w-40 rounded bg-muted animate-pulse my-1" />
                ) : subscription ? (
                  <h2 className="gp-aluno-plan-title">
                    {subscription.planName || "Plano Ativo"}
                  </h2>
                ) : (
                  <h2 className="gp-aluno-plan-title">Nenhum plano ativo</h2>
                )}

                <p className="gp-aluno-plan-expiry">
                  {loadingSubscription ? (
                    <span className="inline-block h-4 w-32 rounded bg-muted animate-pulse" />
                  ) : subscription ? (
                    <>
                      Válido até: <strong>{formatDate(subscription.endDate)}</strong>
                    </>
                  ) : (
                    "Regularize sua assinatura para continuar treinando."
                  )}
                </p>
              </div>

              <ShieldCheck
                className={`size-7 shrink-0 ${
                  subscription && subscription.status?.toUpperCase() === "ACTIVE"
                    ? "text-emerald-600 dark:text-emerald-400"
                    : "text-muted-foreground"
                }`}
                aria-hidden="true"
              />
            </div>

            <div className="gp-aluno-card-body">
              <div className="gp-aluno-renewal-head">
                <div>
                  <h3>Renovar mensalidade</h3>
                  <p>Escolha uma forma de pagamento</p>
                </div>

                {subscription && (
                  <span className="gp-aluno-price-tag">
                    Valor: <strong>{formatCurrency(subscription.planPrice)}</strong>
                  </span>
                )}
              </div>

              {subscription?.renewalEligible ? (
                <>
                  {subscription.daysRemaining != null && subscription.daysRemaining > 0 ? (
                    <div className="gp-aluno-banner-eligible">
                      Seu plano vence em {subscription.daysRemaining}{" "}
                      {subscription.daysRemaining === 1 ? "dia" : "dias"}. Você já pode renovar sem
                      perder os dias restantes.
                    </div>
                  ) : null}

                  <div className="gp-aluno-pay-grid">
                    {/* Botão Pix */}
                    <button
                      type="button"
                      id="btn-aluno-pagar-pix"
                      onClick={onOpenPixModal}
                      disabled={!subscription}
                      className="gp-aluno-pay-option"
                    >
                      <div className="gp-aluno-pay-top">
                        <span className="gp-aluno-pay-icon" data-pix="true">
                          <QrCode className="size-5" aria-hidden="true" />
                        </span>
                        <span className="gp-aluno-pay-badge">Rápido</span>
                      </div>
                      <span className="gp-aluno-pay-title">Pix</span>
                      <span className="gp-aluno-pay-desc">
                        Pagamento rápido e aprovação em poucos minutos
                      </span>
                    </button>

                    {/* Botão Cartão */}
                    <button
                      type="button"
                      id="btn-aluno-pagar-cartao"
                      onClick={onOpenCardModal}
                      disabled={!subscription}
                      className="gp-aluno-pay-option"
                    >
                      <div className="gp-aluno-pay-top">
                        <span className="gp-aluno-pay-icon">
                          <CreditCard className="size-5" aria-hidden="true" />
                        </span>
                        <span className="flex gap-1" aria-hidden="true">
                          <i className="size-2 rounded-full bg-lion-red" />
                          <i className="size-2 rounded-full bg-amber-500" />
                        </span>
                      </div>
                      <span className="gp-aluno-pay-title">Cartão</span>
                      <span className="gp-aluno-pay-desc">
                        Pague com cartão de crédito com segurança
                      </span>
                    </button>
                  </div>
                </>
              ) : subscription ? (
                <div className="gp-aluno-info-box">
                  <p>
                    <strong>Seu plano está ativo até {formatDate(subscription.endDate)}.</strong>
                  </p>
                  <p className="mt-1">
                    A renovação estará disponível a partir de{" "}
                    {formatDate(subscription.renewalAvailableFrom)}.
                    {subscription.daysUntilRenewal != null && subscription.daysUntilRenewal > 0
                      ? ` Faltam ${subscription.daysUntilRenewal} ${
                          subscription.daysUntilRenewal === 1 ? "dia" : "dias"
                        } para a abertura da renovação.`
                      : ""}
                  </p>
                </div>
              ) : (
                <div className="gp-aluno-info-box">
                  Não há assinatura disponível para renovação no momento.
                </div>
              )}
            </div>
          </section>

          {/* Card 2: Seu Progresso */}
          <section className="gp-aluno-card" aria-labelledby="heading-seu-progresso">
            <div className="gp-aluno-card-body" style={{ paddingBottom: 0 }}>
              <div className="gp-aluno-progress-head">
                <div>
                  <span id="heading-seu-progresso" className="gp-aluno-card-label">
                    Seu progresso
                  </span>
                  <h2 className="gp-aluno-progress-title">
                    {totalTreinos > 0 ? "Sua rotina semanal" : "Rotina em montagem"}
                  </h2>
                  <p className="gp-aluno-progress-sub">
                    {loadingWorkouts ? (
                      <span className="inline-block h-4 w-28 rounded bg-muted animate-pulse" />
                    ) : totalTreinos > 0 ? (
                      <>
                        <strong>
                          {treinosConcluidos}/{totalTreinos} treinos
                        </strong>{" "}
                        prescritos concluídos nesta sessão
                      </>
                    ) : (
                      "Aguardando prescrição do seu treinador."
                    )}
                  </p>
                </div>

                {/* Anel Circular SVG com Percentual Real */}
                <div className="gp-aluno-progress-ring" aria-hidden="true">
                  <svg viewBox="0 0 100 100">
                    <circle cx="50" cy="50" r="44" className="gp-aluno-progress-ring-bg" />
                    <circle
                      cx="50"
                      cy="50"
                      r="44"
                      className="gp-aluno-progress-ring-val"
                      strokeDasharray={circumference}
                      strokeDashoffset={strokeOffset}
                    />
                  </svg>
                  <span className="gp-aluno-progress-ring-text">{percentualMeta}%</span>
                </div>
              </div>

              {/* Seletor dos 7 dias da semana */}
              <div className="gp-aluno-weekdays" role="group" aria-label="Dias da semana">
                {weeklyDays.map((item, index) => {
                  const isSelected = item.key === selectedDayKey;
                  return (
                    <button
                      key={item.key}
                      type="button"
                      onClick={() => setSelectedDayKey(item.key)}
                      className="gp-aluno-day-btn"
                      data-today={item.isToday ? "true" : undefined}
                      data-has-workout={item.hasWorkout ? "true" : undefined}
                      aria-pressed={isSelected}
                      title={`${item.nome}: ${item.hasWorkout ? item.title : "Descanso"}${
                        item.isToday ? " (Hoje)" : ""
                      }`}
                    >
                      <span className="gp-aluno-day-label">{item.curto}</span>
                      <span className="gp-aluno-day-bubble">
                        {item.hasWorkout ? (
                          <Dumbbell className="size-3.5" aria-hidden="true" />
                        ) : (
                          index + 1
                        )}
                      </span>
                    </button>
                  );
                })}
              </div>

              {/* Barra de Progresso Real */}
              <div
                className="gp-aluno-progress-bar-wrap"
                role="progressbar"
                aria-valuenow={percentualMeta}
                aria-valuemin={0}
                aria-valuemax={100}
                aria-label="Progresso semanal da sessão"
              >
                <div
                  className="gp-aluno-progress-bar-fill"
                  style={{ width: `${percentualMeta}%` }}
                />
              </div>

              <div className="gp-aluno-session-footer">
                <Flame className="size-4" aria-hidden="true" />
                <span>
                  {totalTreinos === 0 ? (
                    "Nenhum treino programado para esta semana."
                  ) : treinosConcluidos >= totalTreinos && totalTreinos > 0 ? (
                    <strong className="text-emerald-600 dark:text-emerald-400">
                      Meta semanal da sessão concluída! Parabéns!
                    </strong>
                  ) : (
                    `Continue com foco — ${totalTreinos - treinosConcluidos} de ${totalTreinos} treinos disponíveis.`
                  )}
                </span>
              </div>
            </div>
            <div style={{ height: "20px" }} />
          </section>
        </div>

        {/* ─── Seção Treino do Dia / Treino Selecionado ─────────────────────── */}
        <section className="gp-aluno-workout-section" aria-labelledby="heading-treino-dia">
          <div className="gp-aluno-section-header">
            <div>
              <span className="gp-aluno-section-tag">
                {selectedDay.isToday ? "Hoje" : selectedDay.nome}
              </span>
              <h2 id="heading-treino-dia" className="gp-aluno-section-title">
                {isTraining
                  ? "Treino em andamento"
                  : selectedDay.isToday
                  ? "Treino de hoje"
                  : `Treino de ${selectedDay.curto}`}
              </h2>
            </div>

            <div className="gp-aluno-section-actions">
              {personalTrainer && (
                <div className="gp-aluno-pt-card">
                  <div className="gp-aluno-pt-avatar" aria-hidden="true">
                    {getInitials(personalTrainer.name)}
                  </div>
                  <div className="gp-aluno-pt-info">
                    <p className="gp-aluno-pt-role">Seu Personal</p>
                    <p className="gp-aluno-pt-name">{personalTrainer.name}</p>
                  </div>
                </div>
              )}

              {personalTrainer ? (
                <ContactPersonalDialog personalName={personalTrainer.name} />
              ) : null}

              {isTraining && (
                <span className="gp-aluno-badge-active-session">
                  <span className="gp-aluno-badge-pulse-dot" aria-hidden="true" />
                  EM CURSO
                </span>
              )}
            </div>
          </div>

          {/* Card Principal de Treino */}
          <div className="gp-aluno-workout-card">
            {loadingWorkouts ? (
              <div className="gp-aluno-state-box">
                <div className="gp-aluno-state-icon animate-pulse">
                  <Dumbbell className="size-6" />
                </div>
                <h3>Carregando treinos…</h3>
                <p>Buscando sua prescrição e seus exercícios atualizados.</p>
              </div>
            ) : errorWorkouts ? (
              <div className="gp-aluno-state-box">
                <div className="gp-aluno-state-icon" data-error="true">
                  <AlertCircle className="size-6" />
                </div>
                <h3>Não foi possível carregar os treinos</h3>
                <p>{errorWorkouts}</p>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleRetryWorkouts}
                  className="mt-4 gap-2 cursor-pointer"
                >
                  <RotateCcw className="size-4" /> Tentar novamente
                </Button>
              </div>
            ) : currentWorkoutExercises.length === 0 ? (
              /* Estado Vazio Amigável */
              <div className="gp-aluno-state-box">
                <div className="gp-aluno-state-icon">
                  <Dumbbell className="size-6" />
                </div>
                <h3>
                  {selectedDay.isToday
                    ? "Nenhum treino agendado para hoje"
                    : `Sem treino programado para ${selectedDay.nome}`}
                </h3>
                <p>
                  {workouts.length === 0
                    ? "Nenhum treino disponível no momento. Seu treinador ainda está montando sua ficha de exercícios."
                    : "Aproveite para descanso ativo e recuperação, ou selecione outro dia da semana acima para consultar seus treinos."}
                </p>
              </div>
            ) : !isTraining ? (
              /* Visualização do Treino (Pré-início) */
              <div className="gp-aluno-pre-workout">
                <div className="gp-aluno-pre-aside">
                  <div>
                    <span className="gp-aluno-pre-tag">
                      <Dumbbell className="size-4" aria-hidden="true" />{" "}
                      {selectedDay.title || "Treino Principal"}
                    </span>

                    <h3 className="gp-aluno-pre-title">
                      {selectedDay.exercises[0]?.muscle
                        ? `Foco em ${selectedDay.exercises
                            .map((e) => e.muscle)
                            .filter(Boolean)
                            .filter((v, i, a) => a.indexOf(v) === i)
                            .slice(0, 2)
                            .join(" e ")}`
                        : "Sessão de Treino"}
                    </h3>

                    <div className="gp-aluno-pre-meta">
                      <span>
                        <Dumbbell className="size-4" aria-hidden="true" />{" "}
                        {currentWorkoutExercises.length} exercícios
                      </span>
                      <span>
                        <Clock3 className="size-4" aria-hidden="true" /> ~
                        {currentWorkoutExercises.length * 10} minutos
                      </span>
                    </div>
                  </div>

                  <button
                    type="button"
                    className="gp-aluno-cta-btn"
                    onClick={handleStartWorkout}
                  >
                    Iniciar treino <ArrowRight className="size-4 ml-1" aria-hidden="true" />
                  </button>
                </div>

                <div className="gp-aluno-pre-list">
                  <p className="gp-aluno-list-head">Exercícios prescritos</p>
                  <ol className="gp-aluno-exercise-ol">
                    {currentWorkoutExercises.map((exercise, index) => (
                      <li
                        key={exercise.id || `${exercise.exerciseName}-${index}`}
                        className="gp-aluno-exercise-item"
                      >
                        <span className="gp-aluno-exercise-idx">{index + 1}</span>
                        <div className="gp-aluno-exercise-info">
                          <span className="gp-aluno-exercise-name">
                            {exercise.exerciseName}
                          </span>
                          <span className="gp-aluno-exercise-meta">
                            {exercise.sets} séries × {exercise.reps} reps ·{" "}
                            {formatRestSeconds(exercise.restSeconds)} descanso
                          </span>
                        </div>
                      </li>
                    ))}
                  </ol>
                </div>
              </div>
            ) : (
              /* Treino em Andamento (Interação da Sessão) */
              <div className="gp-aluno-session-grid">
                <div className="gp-aluno-session-main">
                  <button
                    type="button"
                    onClick={() => setIsTraining(false)}
                    className="gp-aluno-back-summary-btn"
                  >
                    <ArrowLeft className="size-4" aria-hidden="true" /> Voltar ao resumo
                  </button>

                  <span className="gp-aluno-step-tag">
                    Exercício atual · {currentExerciseIdx + 1} de {currentWorkoutExercises.length}
                  </span>

                  <h3 className="gp-aluno-current-title">
                    {currentExercise?.exerciseName || "Exercício"}
                  </h3>

                  {currentExercise?.muscle && (
                    <p className="gp-aluno-current-muscle">
                      Grupo muscular: <strong>{currentExercise.muscle}</strong>
                    </p>
                  )}

                  <div className="gp-aluno-metrics-row">
                    <div className="gp-aluno-metric-box">
                      <span>Série</span>
                      <strong>
                        {currentSet} de {currentExercise?.sets || 4}
                      </strong>
                    </div>

                    <div className="gp-aluno-metric-box">
                      <span>Repetições</span>
                      <strong>{currentExercise?.reps || 12} reps</strong>
                    </div>
                  </div>

                  <div className="gp-aluno-session-progress">
                    <div className="gp-aluno-session-progress-head">
                      <span>Progresso da sessão</span>
                      <strong>
                        {Math.round(
                          ((currentExerciseIdx + currentSet / (currentExercise?.sets || 4)) /
                            currentWorkoutExercises.length) *
                            100
                        )}
                        %
                      </strong>
                    </div>

                    <div className="gp-aluno-session-progress-bar">
                      <div
                        className="gp-aluno-session-progress-bar-fill"
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

                  <button
                    type="button"
                    className="gp-aluno-action-btn"
                    onClick={handleNextSet}
                  >
                    <Check className="size-4 mr-1" aria-hidden="true" />
                    {currentSet === currentExercise?.sets &&
                    currentExerciseIdx + 1 === currentWorkoutExercises.length
                      ? "Concluir treino"
                      : isResting
                      ? "Pular descanso e avançar"
                      : "Concluir série"}
                  </button>
                </div>

                {/* Painel de Descanso / Timer */}
                <div className="gp-aluno-timer-panel">
                  <div>
                    <p className="gp-aluno-timer-title">
                      {isResting ? "Descanso entre séries" : "Intervalo recomendado"}
                    </p>

                    <div className="gp-aluno-timer-ring-wrap" aria-hidden="true">
                      <svg viewBox="0 0 120 120">
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
                          className="text-primary transition-all duration-1000"
                        />
                      </svg>

                      <div className="gp-aluno-timer-center">
                        <span className="gp-aluno-timer-digits">
                          00:{String(restSecondsLeft).padStart(2, "0")}
                        </span>
                        <span className="gp-aluno-timer-label">
                          {isResting ? "restantes" : "preparar"}
                        </span>
                      </div>
                    </div>

                    <p className="gp-aluno-timer-msg">
                      {isResting
                        ? "Respire fundo, hidrate-se e recupere o fôlego para a próxima série."
                        : "Execute os movimentos com amplitude, boa postura e carga controlada."}
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>
        </section>
      </main>

      {/* Chat Flutuante Persistente */}
      <FloatingChat
        userRole="ALUNO"
        personalTrainerName={personalTrainer?.name}
        hasPersonalTrainer={memberProfile ? Boolean(memberProfile.personalTrainerId || workouts.some((workout) => workout.personalTrainerId)) : workouts.some((workout) => workout.personalTrainerId) ? true : undefined}
      />
    </div>
  );
}
