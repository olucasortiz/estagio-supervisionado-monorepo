"use client";

import React, { useMemo, useState } from "react";
import {
  AlertTriangle,
  ArrowUpRight,
  Calendar,
  CreditCard,
  Dumbbell,
  Filter,
  Layers,
  UserPlus,
  Users,
  Wallet,
} from "lucide-react";
import { CountUp } from "./CountUp";
import { AdminRevenueChart, type RevenueDataPoint } from "./AdminRevenueChart";
import Avatar from "../ui/Avatar";
import StatusBadge from "../ui/StatusBadge";
import { cn } from "@/lib/utils";

interface AdminDashboardViewProps {
  data: {
    members: any[];
    allMembers: any[];
    plans: any[];
    users: any[];
    personalTrainers: any[];
    subscriptions: any[];
    payments: any[];
    overdueMembers: any[];
  };
  fmtDate: (date: any) => string;
  fmtCurrency: (val: any) => string;
  onNavigate?: (id: number | string) => void;
}

export default function AdminDashboardView({
  data,
  fmtDate,
  fmtCurrency,
  onNavigate,
}: AdminDashboardViewProps) {
  const [tab, setTab] = useState<"pagamentos" | "trainers">("pagamentos");

  // ── 1. Métricas Reais ──────────────────────────────────────────────────────────
  const activeStudents = useMemo(() => {
    return (data.members || []).filter(
      (m) => m.active !== false && (m.situacao === "Ativo" || !m.situacao)
    ).length;
  }, [data.members]);

  const activeSubscriptions = useMemo(() => {
    return (data.subscriptions || []).filter(
      (s) =>
        String(s.status).toUpperCase() === "ACTIVE" ||
        String(s.status).toLowerCase() === "ativa"
    ).length;
  }, [data.subscriptions]);

  const totalRevenue = useMemo(() => {
    return (data.payments || [])
      .filter((p) => ["PAID", "PAGO"].includes(String(p.status).toUpperCase()))
      .reduce((acc, p) => acc + (Number(p.amount) || 0), 0);
  }, [data.payments]);

  const overdueCount = useMemo(() => {
    return (data.overdueMembers || []).length;
  }, [data.overdueMembers]);

  const totalStudents = data.members?.length || 0;
  const overdueRate = totalStudents > 0 ? Math.round((overdueCount / totalStudents) * 100) : 0;

  // ── 2. Série Histórica Real de Pagamentos ─────────────────────────────────────
  const monthlyRevenueSeries = useMemo<RevenueDataPoint[]>(() => {
    const monthNames = [
      "Jan", "Fev", "Mar", "Abr", "Mai", "Jun",
      "Jul", "Ago", "Set", "Out", "Nov", "Dez"
    ];

    // Se houver pagamentos reais, agrupa por mês
    const paidPayments = (data.payments || []).filter((p) =>
      ["PAID", "PAGO"].includes(String(p.status).toUpperCase())
    );

    const monthTotals: Record<number, number> = {};
    const now = new Date();
    const currentMonth = now.getMonth();

    // Inicializa últimos 6 meses com 0
    const seriesMonths: number[] = [];
    for (let i = 5; i >= 0; i--) {
      const m = (currentMonth - i + 12) % 12;
      seriesMonths.push(m);
      monthTotals[m] = 0;
    }

    paidPayments.forEach((p) => {
      const rawDate = p.paidAt || p.createdAt;
      if (rawDate) {
        const d = new Date(rawDate);
        if (!isNaN(d.getTime())) {
          const m = d.getMonth();
          if (monthTotals[m] !== undefined) {
            monthTotals[m] += Number(p.amount) || 0;
          }
        }
      }
    });

    return seriesMonths.map((m) => ({
      mes: monthNames[m],
      receita: Math.round(monthTotals[m] || 0),
    }));
  }, [data.payments]);

  // ── 3. Receita por Plano Real ────────────────────────────────────────────────
  const planRevenueShare = useMemo(() => {
    const plans = data.plans || [];
    const subs = data.subscriptions || [];

    if (plans.length === 0) return [];

    const planData = plans.map((p) => {
      const planId = String(p.id);
      const linkedSubs = subs.filter((s) => String(s.planId) === planId);
      const activeSubs = linkedSubs.filter(
        (s) => String(s.status).toUpperCase() === "ACTIVE"
      );
      const estRev = (Number(p.price) || 0) * (activeSubs.length || linkedSubs.length);
      return {
        id: p.id,
        nome: p.name || `Plano ${p.id}`,
        subsCount: activeSubs.length || linkedSubs.length,
        price: Number(p.price) || 0,
        receita: estRev,
      };
    });

    const totalEst = planData.reduce((acc, p) => acc + p.receita, 0) || 1;

    return planData.map((p) => ({
      ...p,
      share: Math.round((p.receita / totalEst) * 100),
    }));
  }, [data.plans, data.subscriptions]);

  // ── 4. Atividades Recentes Reais ─────────────────────────────────────────────
  const recentActivities = useMemo(() => {
    const events: {
      id: string;
      title: string;
      desc: string;
      time: string;
      rawDate: number;
      type: "pagamento" | "aluno" | "assinatura" | "cancelamento";
    }[] = [];

    // Pagamentos recentes
    (data.payments || []).forEach((p, idx) => {
      const dateStr = p.paidAt || p.createdAt;
      const d = dateStr ? new Date(dateStr).getTime() : 0;
      events.push({
        id: `pay-${p.id || idx}`,
        title: "Pagamento registrado",
        desc: `${p.subscriptionLabel || "Assinatura"} · ${fmtCurrency(p.amount)} (${p.method || "Pix"})`,
        time: fmtDate(dateStr) || "Hoje",
        rawDate: d,
        type: "pagamento",
      });
    });

    // Alunos cadastrados recentemente
    (data.members || []).forEach((m, idx) => {
      const dateStr = m.dataCadastro || m.createdAt;
      const d = dateStr ? new Date(dateStr).getTime() : 0;
      events.push({
        id: `mem-${m.id || idx}`,
        title: "Novo aluno cadastrado",
        desc: `${m.nome} cadastrado(a) no sistema`,
        time: fmtDate(dateStr) || "Recentemente",
        rawDate: d,
        type: "aluno",
      });
    });

    // Cancelamentos
    (data.members || [])
      .filter((m) => m.dataCancelamento || m.motivoCancelamento)
      .forEach((m, idx) => {
        const dateStr = m.dataCancelamento;
        const d = dateStr ? new Date(dateStr).getTime() : 0;
        events.push({
          id: `canc-${m.id || idx}`,
          title: "Matrícula cancelada",
          desc: `${m.nome} · Motivo: ${m.motivoCancelamento || "Cancelado"}`,
          time: fmtDate(dateStr) || "Recentemente",
          rawDate: d,
          type: "cancelamento",
        });
      });

    // Ordena do mais recente para o mais antigo
    events.sort((a, b) => b.rawDate - a.rawDate);
    return events.slice(0, 5);
  }, [data.payments, data.members, fmtCurrency, fmtDate]);

  const recentPayments = useMemo(() => {
    return (data.payments || []).slice(0, 6);
  }, [data.payments]);

  const recentTrainers = useMemo(() => {
    return (data.personalTrainers || []).slice(0, 6);
  }, [data.personalTrainers]);

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Cabeçalho do Dashboard */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold tracking-tight text-foreground sm:text-2xl">
            Dashboard
          </h2>
          <p className="text-sm text-muted-foreground">
            Visão geral gerencial da academia com métricas reais
          </p>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex h-9 items-center gap-2 rounded-lg border border-border bg-card px-3 text-xs font-medium text-foreground shadow-xs">
            <Calendar className="size-3.5 text-muted-foreground" />
            <span>Dados em tempo real</span>
          </div>
        </div>
      </div>

      {/* Grid de KPIs Reais */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {/* Card 1: Alunos Ativos */}
        <div className="rounded-2xl border border-border bg-card p-5 shadow-xs transition-shadow duration-200 hover:shadow-md">
          <div className="flex items-start justify-between">
            <span className="flex size-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
              <Users className="size-5" />
            </span>
            <span className="inline-flex items-center gap-1 rounded-md bg-emerald-500/10 px-2 py-0.5 text-[11px] font-semibold text-emerald-600 dark:text-emerald-400">
              <ArrowUpRight className="size-3" />
              Ativos
            </span>
          </div>
          <p className="mt-4 text-2xl font-bold tracking-tight text-foreground sm:text-[28px]">
            <CountUp value={activeStudents} />
          </p>
          <p className="text-xs font-medium text-muted-foreground">Alunos ativos</p>
          <p className="mt-2 text-[11px] text-muted-foreground">
            {totalStudents} alunos cadastrados no total
          </p>
        </div>

        {/* Card 2: Assinaturas Ativas */}
        <div className="rounded-2xl border border-border bg-card p-5 shadow-xs transition-shadow duration-200 hover:shadow-md">
          <div className="flex items-start justify-between">
            <span className="flex size-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
              <Wallet className="size-5" />
            </span>
            <span className="inline-flex items-center rounded-md bg-primary/10 px-2 py-0.5 text-[11px] font-semibold text-primary">
              Vigentes
            </span>
          </div>
          <p className="mt-4 text-2xl font-bold tracking-tight text-foreground sm:text-[28px]">
            <CountUp value={activeSubscriptions} />
          </p>
          <p className="text-xs font-medium text-muted-foreground">Assinaturas ativas</p>
          <p className="mt-2 text-[11px] text-muted-foreground">
            {data.subscriptions?.length || 0} planos associados
          </p>
        </div>

        {/* Card 3: Receita Realizada */}
        <div className="rounded-2xl border border-border bg-card p-5 shadow-xs transition-shadow duration-200 hover:shadow-md">
          <div className="flex items-start justify-between">
            <span className="flex size-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
              <CreditCard className="size-5" />
            </span>
            <span className="inline-flex items-center gap-1 rounded-md bg-emerald-500/10 px-2 py-0.5 text-[11px] font-semibold text-emerald-600 dark:text-emerald-400">
              Liquidado
            </span>
          </div>
          <p className="mt-4 text-2xl font-bold tracking-tight text-foreground sm:text-[28px]">
            <CountUp value={totalRevenue} prefix="R$ " decimals={2} />
          </p>
          <p className="text-xs font-medium text-muted-foreground">Receita realizada</p>
          <p className="mt-2 text-[11px] text-muted-foreground">
            {data.payments?.length || 0} lançamentos registrados
          </p>
        </div>

        {/* Card 4: Inadimplentes */}
        <div className="rounded-2xl border border-border bg-card p-5 shadow-xs transition-shadow duration-200 hover:shadow-md">
          <div className="flex items-start justify-between">
            <span className="flex size-10 items-center justify-center rounded-xl bg-destructive/10 text-destructive">
              <AlertTriangle className="size-5" />
            </span>
            <span className="inline-flex items-center rounded-md bg-destructive/10 px-2 py-0.5 text-[11px] font-semibold text-destructive">
              {overdueRate}% taxa
            </span>
          </div>
          <p className="mt-4 text-2xl font-bold tracking-tight text-foreground sm:text-[28px]">
            <CountUp value={overdueCount} />
          </p>
          <p className="text-xs font-medium text-muted-foreground">Alunos inadimplentes</p>
          <p className="mt-2 text-[11px] text-muted-foreground">
            {overdueCount === 0
              ? "Nenhuma pendência financeira"
              : "Requer atenção do financeiro"}
          </p>
        </div>
      </div>

      {/* Gráficos Reais: Receita Mensal + Distribuição por Plano */}
      <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
        {/* Gráfico de Receita */}
        <div className="rounded-2xl border border-border bg-card p-5 shadow-xs xl:col-span-2">
          <div className="flex flex-wrap items-center justify-between gap-2 mb-4">
            <div>
              <h3 className="text-base font-semibold text-foreground">Receita mensal</h3>
              <p className="text-xs text-muted-foreground">
                Faturamento acumulado por mês baseado em pagamentos reais
              </p>
            </div>
            <div className="flex items-center gap-2 text-xs">
              <span className="size-2.5 rounded-full bg-primary" />
              <span className="font-semibold text-foreground">
                Total: {fmtCurrency(totalRevenue)}
              </span>
            </div>
          </div>
          <AdminRevenueChart data={monthlyRevenueSeries} />
        </div>

        {/* Distribuição por Plano */}
        <div className="rounded-2xl border border-border bg-card p-5 shadow-xs">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-base font-semibold text-foreground">Receita por plano</h3>
            <Layers className="size-4 text-muted-foreground" />
          </div>
          <p className="text-xs text-muted-foreground mb-4">
            Estimativa de participação com base em assinaturas ativas
          </p>

          {planRevenueShare.length === 0 ? (
            <p className="py-12 text-center text-xs text-muted-foreground">
              Nenhum plano cadastrado.
            </p>
          ) : (
            <ul className="space-y-4">
              {planRevenueShare.map((p) => (
                <li key={p.id}>
                  <div className="flex items-baseline justify-between text-xs sm:text-sm">
                    <span className="font-medium text-foreground">{p.nome}</span>
                    <span className="text-muted-foreground font-mono">
                      {fmtCurrency(p.receita)} · {p.share}%
                    </span>
                  </div>
                  <div className="mt-1.5 h-2 w-full overflow-hidden rounded-full bg-muted">
                    <div
                      className="h-full rounded-full bg-primary transition-all duration-500 ease-out"
                      style={{ width: `${Math.max(p.share, 4)}%` }}
                    />
                  </div>
                  <p className="mt-0.5 text-[10px] text-muted-foreground">
                    {p.subsCount} aluno(s) vinculados · {fmtCurrency(p.price)}/plano
                  </p>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      {/* Grid Inferior: Pagamentos/Personal Trainers + Atividades Recentes */}
      <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
        {/* Tabela Tabbed: Pagamentos Recentes x Personal Trainers */}
        <div className="rounded-2xl border border-border bg-card p-5 shadow-xs overflow-hidden xl:col-span-2">
          <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
            <div className="flex gap-1 rounded-lg bg-muted p-1">
              <button
                onClick={() => setTab("pagamentos")}
                className={cn(
                  "rounded-md px-3 py-1 text-xs font-medium transition-all duration-200",
                  tab === "pagamentos"
                    ? "bg-card text-foreground shadow-xs"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                Pagamentos recentes
              </button>
              <button
                onClick={() => setTab("trainers")}
                className={cn(
                  "rounded-md px-3 py-1 text-xs font-medium transition-all duration-200",
                  tab === "trainers"
                    ? "bg-card text-foreground shadow-xs"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                Personal trainers ({data.personalTrainers?.length || 0})
              </button>
            </div>
            {onNavigate && (
              <button
                onClick={() => onNavigate(tab === "pagamentos" ? 35 : 33)}
                className="text-xs font-medium text-primary hover:underline"
              >
                Ver todos
              </button>
            )}
          </div>

          <div className="overflow-x-auto">
            {tab === "pagamentos" ? (
              recentPayments.length === 0 ? (
                <div className="py-12 text-center text-xs text-muted-foreground">
                  Nenhum pagamento registrado ainda.
                </div>
              ) : (
                <table className="w-full min-w-[520px] text-xs">
                  <thead>
                    <tr className="border-b border-border text-left uppercase tracking-wider text-muted-foreground">
                      <th className="pb-2 font-semibold">Aluno / Assinatura</th>
                      <th className="pb-2 font-semibold">Método</th>
                      <th className="pb-2 font-semibold">Valor</th>
                      <th className="pb-2 font-semibold">Data</th>
                      <th className="pb-2 font-semibold">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {recentPayments.map((p) => (
                      <tr key={p.id} className="transition-colors hover:bg-muted/50">
                        <td className="py-2.5 font-medium text-foreground">
                          {p.subscriptionLabel || "Assinatura"}
                        </td>
                        <td className="py-2.5 text-muted-foreground">{p.method || "—"}</td>
                        <td className="py-2.5 font-semibold text-foreground">
                          {fmtCurrency(p.amount)}
                        </td>
                        <td className="py-2.5 text-muted-foreground">
                          {fmtDate(p.paidAt || p.createdAt)}
                        </td>
                        <td className="py-2.5">
                          <StatusBadge status={p.status || "Pago"} />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )
            ) : recentTrainers.length === 0 ? (
              <div className="py-12 text-center text-xs text-muted-foreground">
                Nenhum personal trainer cadastrado.
              </div>
            ) : (
              <table className="w-full min-w-[500px] text-xs">
                <thead>
                  <tr className="border-b border-border text-left uppercase tracking-wider text-muted-foreground">
                    <th className="pb-2 font-semibold">Profissional</th>
                    <th className="pb-2 font-semibold">Especialidade</th>
                    <th className="pb-2 font-semibold">Contato</th>
                    <th className="pb-2 font-semibold">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {recentTrainers.map((t) => (
                    <tr key={t.id} className="transition-colors hover:bg-muted/50">
                      <td className="py-2.5 flex items-center gap-2">
                        <Avatar name={t.name} photoUrl={t.photoUrl} size="sm" />
                        <span className="font-medium text-foreground">{t.name}</span>
                      </td>
                      <td className="py-2.5 text-muted-foreground">{t.specialty || "—"}</td>
                      <td className="py-2.5 text-muted-foreground">{t.phone || t.email || "—"}</td>
                      <td className="py-2.5">
                        <StatusBadge status={t.active !== false ? "Ativo" : "Inativo"} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>

        {/* Atividades Recentes Reais */}
        <div className="rounded-2xl border border-border bg-card p-5 shadow-xs">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-base font-semibold text-foreground">Atividades recentes</h3>
            <UserPlus className="size-4 text-muted-foreground" />
          </div>
          <p className="text-xs text-muted-foreground mb-4">
            Histórico recente de alunos e movimentações financeiras
          </p>

          {recentActivities.length === 0 ? (
            <div className="py-12 text-center text-xs text-muted-foreground">
              Nenhuma atividade registrada ainda.
            </div>
          ) : (
            <ul className="space-y-3">
              {recentActivities.map((act, i) => {
                const dotColor =
                  act.type === "pagamento"
                    ? "bg-emerald-500"
                    : act.type === "aluno"
                    ? "bg-primary"
                    : act.type === "assinatura"
                    ? "bg-blue-500"
                    : "bg-destructive";

                return (
                  <li key={act.id} className="flex gap-3 rounded-lg p-2 transition-colors hover:bg-muted/60">
                    <span className="mt-1 flex flex-col items-center">
                      <span className={cn("size-2 rounded-full", dotColor)} />
                      {i < recentActivities.length - 1 && (
                        <span className="mt-1 h-6 w-px bg-border" />
                      )}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-semibold text-foreground">{act.title}</p>
                      <p className="truncate text-xs text-muted-foreground">{act.desc}</p>
                      <p className="mt-0.5 text-[10px] text-muted-foreground">{act.time}</p>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}
