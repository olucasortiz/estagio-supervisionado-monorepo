"use client";

import { useState, useEffect, useCallback } from "react";
import { Menu, QrCode, Timer } from "lucide-react";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { SidebarContent } from "./Sidebar";
import { getMySubscription, getMyWorkouts } from "@/services/api";
import { getStoredAuthSession } from "@/services/auth";

// ─── Tipos alinhados com o backend ───────────────────────────────────────────

/** WorkoutExercise retornado dentro de cada WorkoutResponse */
type BackendExercise = {
  id: string;
  workoutSheetId: string;
  exerciseName: string;
  muscle: string | null;
  exerciseType: string | null;
  equipment: string | null;
  difficulty: string | null;
  instructions: string | null;
  sets: number;
  reps: number;
  restSeconds: number | null;
  notes: string | null;
  createdAt: string | null;
};

/** WorkoutResponse retornado por GET /workouts/me */
type WorkoutResponse = {
  id: string;
  memberId: string;
  personalTrainerId: string;
  title: string | null;
  weekDay: string | null;          // ex: "MONDAY", "TUESDAY" …
  weekDayLabel: string | null;     // ex: "Segunda-feira", "Terca-feira" …
  active: boolean;
  createdAt: string | null;
  exercises: BackendExercise[];
};

/** MySubscriptionResponse retornado por GET /subscriptions/me */
type MySubscriptionResponse = {
  id: string;
  memberId: string;
  planId: string;
  planName: string;
  planType: string;
  planPrice: number;
  startDate: string | number[];    // "YYYY-MM-DD" ou [year, month, day]
  endDate: string | number[];      // "YYYY-MM-DD" ou [year, month, day]
  status: string;                  // "ACTIVE" | "OVERDUE" | …
  createdAt: string | number[];
  daysRemaining: number;
  hasSubscription: boolean;
};

// ─── Mapa: weekDay (backend) → id/curto/nome utilizados na UI ─────────────────
const WEEK_DAY_MAP: Record<string, { id: string; curto: string; nome: string }> = {
  MONDAY:    { id: "seg", curto: "Seg", nome: "Segunda"  },
  TUESDAY:   { id: "ter", curto: "Ter", nome: "Terça"    },
  WEDNESDAY: { id: "qua", curto: "Qua", nome: "Quarta"   },
  THURSDAY:  { id: "qui", curto: "Qui", nome: "Quinta"   },
  FRIDAY:    { id: "sex", curto: "Sex", nome: "Sexta"    },
  SATURDAY:  { id: "sab", curto: "Sáb", nome: "Sábado"  },
  SUNDAY:    { id: "dom", curto: "Dom", nome: "Domingo"  },
};

/** Todos os sete dias na ordem correta para exibição */
const ALL_WEEK_DAYS = [
  "MONDAY", "TUESDAY", "WEDNESDAY", "THURSDAY", "FRIDAY", "SATURDAY", "SUNDAY",
] as const;

// ─── Helpers ─────────────────────────────────────────────────────────────────

/**
 * Converte data para o formato brasileiro DD/MM/AAAA.
 * Suporta dois formatos retornados pelo backend:
 *   - string ISO "YYYY-MM-DD"  (Jackson com write-dates-as-timestamps=false)
 *   - array [year, month, day] (Jackson padrão sem configuração)
 */
function formatDate(iso: string | number[] | null | undefined): string {
  if (!iso) return "—";

  // Formato array: [2026, 8, 31]
  if (Array.isArray(iso)) {
    const [year, month, day] = iso as number[];
    return `${String(day).padStart(2, "0")}/${String(month).padStart(2, "0")}/${year}`;
  }

  // Formato string ISO: "2026-08-31"
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
  if (seconds == null || seconds <= 0) return "—";
  return `${seconds}s`;
}

function labelStatus(status: string | null | undefined): string {
  if (!status) return "—";
  const map: Record<string, string> = {
    ACTIVE:   "Ativa",
    OVERDUE:  "Vencida",
    CANCELED: "Cancelada",
  };
  return map[status.toUpperCase()] ?? status;
}

// ─── Componente principal ─────────────────────────────────────────────────────

export default function PlanoAlunoPage({
  onOpenPixModal,
  onSubscriptionLoaded,
}: {
  onOpenPixModal?: () => void;
  onSubscriptionLoaded?: (subscriptionId: string, amount: number) => void;
}) {
  // ── Estado de carregamento ──
  const [loadingSubscription, setLoadingSubscription] = useState(true);
  const [loadingWorkouts, setLoadingWorkouts]         = useState(true);
  const [errorSubscription, setErrorSubscription]     = useState<string | null>(null);
  const [errorWorkouts, setErrorWorkouts]             = useState<string | null>(null);

  // ── Dados vindos do backend ──
  const [subscription, setSubscription] = useState<MySubscriptionResponse | null>(null);
  const [workouts, setWorkouts]         = useState<WorkoutResponse[]>([]);

  // ── Nome do aluno (do AuthContext / localStorage) ──
  const [nomeAluno, setNomeAluno] = useState<string>("");

  // ── Dia ativo selecionado (por weekDay do backend, ex: "MONDAY") ──
  const [diaAtivo, setDiaAtivo] = useState<string>("");

  // ─── Carregar nome do usuário autenticado ───────────────────────────────────
  useEffect(() => {
    const session = getStoredAuthSession();
    if (session?.user?.name) {
      setNomeAluno(session.user.name);
    }
  }, []);

  // ─── Buscar assinatura real ─────────────────────────────────────────────────
  useEffect(() => {
    let cancelled = false;
    setLoadingSubscription(true);
    setErrorSubscription(null);

    getMySubscription()
      .then((data: MySubscriptionResponse | { hasSubscription: false } | null) => {
        if (cancelled) return;
        if (!data || (data as { hasSubscription?: boolean }).hasSubscription === false) {
          setSubscription(null);
        } else {
          const sub = data as MySubscriptionResponse;
          setSubscription(sub);
          // Notifica o page.tsx com os dados reais para o modal Pix
          onSubscriptionLoaded?.(sub.id, sub.planPrice);
        }
      })
      .catch((err: Error) => {
        if (cancelled) return;
        setErrorSubscription(err.message || "Erro ao carregar assinatura.");
      })
      .finally(() => {
        if (!cancelled) setLoadingSubscription(false);
      });

    return () => { cancelled = true; };
  }, [onSubscriptionLoaded]);

  // ─── Buscar treinos reais ────────────────────────────────────────────────────
  useEffect(() => {
    let cancelled = false;
    setLoadingWorkouts(true);
    setErrorWorkouts(null);

    // Usa o helper getMyWorkouts() do api.js (GET /workouts/me com Bearer token)
    (getMyWorkouts() as Promise<WorkoutResponse[]>)
      .then((data) => {
        if (cancelled) return;
        const list = Array.isArray(data) ? data : [];
        setWorkouts(list);

        // Define o primeiro dia com treino como ativo, em ordem da semana
        const primeiroDia = ALL_WEEK_DAYS.find((wd) =>
          list.some((w) => w.weekDay?.toUpperCase() === wd)
        );
        setDiaAtivo(primeiroDia ?? "MONDAY");
      })
      .catch((err: Error) => {
        if (cancelled) return;
        setErrorWorkouts(err.message || "Erro ao carregar treinos.");
      })
      .finally(() => {
        if (!cancelled) setLoadingWorkouts(false);
      });

    return () => { cancelled = true; };
  }, []);

  // ─── Logout ─────────────────────────────────────────────────────────────────
  const handleLogout = useCallback(() => {
    localStorage.clear();
    sessionStorage.clear();
    window.location.href = "/login";
  }, []);

  // ─── Cálculos derivados ──────────────────────────────────────────────────────

  /**
   * Monta a lista de "slots" de sete dias.
   * Dias que possuem workout_sheet no banco aparecem com exercícios.
   * Dias sem ficha aparecem como "descanso ativo".
   */
  const diasDaSemana = ALL_WEEK_DAYS.map((wd) => {
    const meta = WEEK_DAY_MAP[wd];
    // Pode haver mais de uma ficha para o mesmo dia (ex: dois treinos Seg)
    const fichas = workouts.filter((w) => w.weekDay?.toUpperCase() === wd);
    const exercicios = fichas.flatMap((f) => f.exercises);
    const titulo = fichas.length > 0 ? (fichas[0].title ?? "Treino") : null;
    return {
      weekDay: wd,
      ...meta,
      treino: titulo,
      exercicios,
    };
  });

  const diaSelecionado = diasDaSemana.find((d) => d.weekDay === diaAtivo) ?? diasDaSemana[0];
  const diasComTreino  = diasDaSemana.filter((d) => d.treino !== null && d.exercicios.length > 0);
  // "concluidos" não possui mecanismo de tracking no backend ainda — fixo 0
  const concluidos = 0;

  // ─── Renderização ─────────────────────────────────────────────────────────────

  const primeiroNome = nomeAluno ? nomeAluno.split(" ")[0] : "";

  return (
    <div className="flex min-h-screen bg-background text-foreground">
      {/* Sidebar Fixa para Desktop — 192px (w-48) */}
      <aside className="hidden w-48 shrink-0 lg:block border-r border-border bg-sidebar">
        <div className="fixed inset-y-0 w-48">
          <SidebarContent onLogout={handleLogout} userName={nomeAluno} />
        </div>
      </aside>

      {/* Conteúdo Principal */}
      <div className="flex min-w-0 flex-1 flex-col">
        {/* Header Mobile */}
        <header className="sticky top-0 z-10 flex items-center gap-3 border-b border-border bg-background/90 px-4 py-3 backdrop-blur lg:hidden">
          <Sheet>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon" aria-label="Abrir menu">
                <Menu className="size-5" />
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="w-48 border-none p-0">
              <SidebarContent onLogout={handleLogout} userName={nomeAluno} />
            </SheetContent>
          </Sheet>
          <span className="font-bold">Lion Fitness</span>
        </header>

        {/* main ocupa toda a área restante — o div interno centraliza o conteúdo */}
        <main className="flex-1 py-8">
          <div
            className="w-full max-w-[720px]"
            style={{
              marginLeft: "auto",
              marginRight: "auto",
              paddingLeft: "24px",
              paddingRight: "24px",
            }}
          >
          {/* Cabeçalho da página */}
          <div className="mb-6" style={{ marginBottom: "24px" }}>
            <p className="text-xs font-medium uppercase tracking-widest text-muted-foreground">
              Área do aluno
            </p>
            <h1 className="mt-1.5 font-display text-2xl font-extrabold tracking-tight" style={{letterSpacing:"-0.02em"}}>
              Meu plano
            </h1>
            <p className="mt-1 text-sm text-muted-foreground">
              {primeiroNome ? `Olá, ${primeiroNome}. ` : ""}Sua rotina e sua mensalidade em um só lugar.
            </p>
          </div>

          {/* Cards superiores — grid 50/50 */}
          <section className="mb-6 grid grid-cols-2 gap-4" style={{ marginBottom: "24px" }}>
            {/* Card Mensalidade */}
            <article
              className="flex flex-col justify-between rounded-2xl border border-border bg-card p-6 shadow-sm"
              style={{ padding: "24px" }}
            >
              {loadingSubscription ? (
                <div style={{ paddingBottom: "24px" }}>
                  <p className="text-xs font-medium uppercase tracking-widest text-muted-foreground">Mensalidade</p>
                  <p className="mt-4 text-sm text-muted-foreground animate-pulse">Carregando dados…</p>
                </div>
              ) : errorSubscription ? (
                <div style={{ paddingBottom: "24px" }}>
                  <p className="text-xs font-medium uppercase tracking-widest text-muted-foreground">Mensalidade</p>
                  <p className="mt-4 text-sm text-destructive">{errorSubscription}</p>
                </div>
              ) : subscription === null ? (
                <div style={{ paddingBottom: "24px" }}>
                  <p className="text-xs font-medium uppercase tracking-widest text-muted-foreground">Mensalidade</p>
                  <p className="mt-4 text-sm text-muted-foreground">Nenhuma assinatura ativa encontrada.</p>
                </div>
              ) : (
                <div>
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <p className="text-xs font-medium uppercase tracking-widest text-muted-foreground">
                        Mensalidade
                      </p>
                      <p className="mt-2 font-display text-3xl font-extrabold" style={{letterSpacing:"-0.02em"}}>
                        {formatCurrency(subscription.planPrice)}
                      </p>
                      <p className="mt-1 text-sm text-muted-foreground">
                        Plano {subscription.planName} · vence em {formatDate(subscription.endDate)}
                      </p>
                    </div>
                    <span
                      className={`rounded-full px-3 py-1 text-xs font-semibold shrink-0 ${
                        subscription.status?.toUpperCase() === "ACTIVE"
                          ? "bg-emerald-500/10 text-emerald-600"
                          : "bg-destructive/10 text-destructive"
                      }`}
                    >
                      {labelStatus(subscription.status)}
                    </span>
                  </div>
                </div>
              )}
              <Button
                id="btn-pagar-pix"
                className="mt-6 w-full gap-2"
                style={{
                  marginTop: "24px",
                  paddingTop: "10px",
                  paddingBottom: "10px",
                }}
                onClick={onOpenPixModal}
                disabled={!subscription}
              >
                <QrCode className="size-4" />
                Pagar com Pix
              </Button>
            </article>

            {/* Card Progresso da Semana */}
            <article
              className="flex flex-col rounded-2xl border border-border bg-card p-6 shadow-sm"
              style={{ padding: "24px" }}
            >
              <p className="text-xs font-medium uppercase tracking-widest text-muted-foreground">
                Progresso da semana
              </p>
              {loadingWorkouts ? (
                <p className="mt-4 text-sm text-muted-foreground animate-pulse">Carregando…</p>
              ) : (
                <>
                  <p className="mt-2 font-display text-3xl font-extrabold" style={{letterSpacing:"-0.02em"}}>
                    {concluidos}
                    <span className="text-base font-medium text-muted-foreground">
                      {" "}de {diasComTreino.length} dias de treino
                    </span>
                  </p>
                  <div className="mt-6 flex gap-2">
                    {diasDaSemana.map((d) => {
                      const temTreino = d.treino !== null && d.exercicios.length > 0;
                      return (
                        <div
                          key={d.weekDay}
                          className="flex-1 space-y-2 text-center"
                        >
                          <div
                            className={`h-2 rounded-full transition-all ${
                              !temTreino
                                ? "bg-muted/20 border border-dashed border-muted-foreground/30"
                                : "bg-muted"
                            }`}
                          />
                          <span className="block text-[11px] font-medium text-muted-foreground">
                            {d.curto}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </>
              )}
            </article>
          </section>

          {/* Rotina Semanal — mesma largura dos cards */}
          <section>
            <div className="mb-4" style={{ marginBottom: "16px" }}>
              <h2 className="font-display text-2xl font-bold tracking-tight" style={{letterSpacing:"-0.02em"}}>
                Rotina semanal
              </h2>
              {!loadingWorkouts && diaSelecionado && (
                <p className="mt-1 text-sm text-muted-foreground">
                  {diaSelecionado.nome} · {diaSelecionado.treino ?? "Descanso ativo"}
                </p>
              )}
            </div>

            {/* Seletor de dias — linha única */}
            {loadingWorkouts ? (
              <p className="text-sm text-muted-foreground animate-pulse" style={{ marginBottom: "16px" }}>
                Carregando rotina semanal…
              </p>
            ) : errorWorkouts ? (
              <p className="text-sm text-destructive" style={{ marginBottom: "16px" }}>
                {errorWorkouts}
              </p>
            ) : (
              <>
                <div
                  className="mb-4 flex gap-1.5 overflow-x-auto pb-1"
                  style={{
                    marginBottom: "16px",
                    paddingBottom: "4px",
                  }}
                >
                  {diasDaSemana.map((d) => (
                    <button
                      key={d.weekDay}
                      id={`tab-dia-${d.id}`}
                      onClick={() => setDiaAtivo(d.weekDay)}
                      className={`shrink-0 rounded-xl border px-4 py-2.5 text-sm font-semibold transition-all cursor-pointer ${
                        d.weekDay === diaAtivo
                          ? "border-primary bg-primary text-primary-foreground shadow-sm"
                          : "border-border bg-card text-muted-foreground hover:border-primary/40 hover:text-foreground"
                      }`}
                      style={{
                        paddingLeft: "16px",
                        paddingRight: "16px",
                        paddingTop: "10px",
                        paddingBottom: "10px",
                      }}
                    >
                      {d.curto}
                    </button>
                  ))}
                </div>

                {/* Lista de Exercícios */}
                {diaSelecionado && diaSelecionado.exercicios.length === 0 ? (
                  <div className="rounded-2xl border border-dashed border-border bg-card px-6 py-12 text-center">
                    <p className="text-lg font-semibold">Descanso ativo</p>
                    <p className="mx-auto mt-1 max-w-sm text-sm text-muted-foreground">
                      Aproveite para recuperar a musculatura ou fazer um cardio leve.
                    </p>
                  </div>
                ) : (
                  <ul className="divide-y divide-border overflow-hidden rounded-2xl border border-border bg-card shadow-sm">
                    {diaSelecionado?.exercicios.map((ex, i) => (
                      <li
                        key={ex.id ?? `${ex.exerciseName}-${i}`}
                        className="flex flex-col gap-3 px-6 py-4 sm:flex-row sm:items-center sm:justify-between"
                        style={{
                          paddingLeft: "24px",
                          paddingRight: "24px",
                          paddingTop: "16px",
                          paddingBottom: "16px",
                        }}
                      >
                        <div className="flex items-center gap-4">
                          <span className="grid size-9 shrink-0 place-items-center rounded-lg bg-secondary font-bold text-muted-foreground">
                            {i + 1}
                          </span>
                          <div>
                            <p className="font-semibold">{ex.exerciseName}</p>
                            <p className="text-sm text-muted-foreground">
                              {ex.muscle ?? "—"}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-6 text-sm text-muted-foreground sm:justify-end">
                          <span>
                            <strong className="text-foreground">{ex.sets}</strong>{" "}
                            séries
                          </span>
                          <span>
                            <strong className="text-foreground">{ex.reps}</strong>{" "}
                            reps
                          </span>
                          <span className="flex items-center gap-1">
                            <Timer className="size-4" />
                            {formatRestSeconds(ex.restSeconds)}
                          </span>
                        </div>
                      </li>
                    ))}
                  </ul>
                )}

                {/* Tracking de conclusão — ainda não implementado no backend */}
                {/* Será habilitado quando o mecanismo de conclusão de treino for criado */}
              </>
            )}
          </section>
          </div>{/* /mx-auto inner container */}
        </main>
      </div>
    </div>
  );
}
