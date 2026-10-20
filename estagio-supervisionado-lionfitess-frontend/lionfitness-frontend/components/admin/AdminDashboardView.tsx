"use client";

import React, { useMemo, useState } from "react";
import {
  AlertTriangle,
  ArrowUpRight,
  CreditCard,
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

export type DashboardItem = {
  [key: string]: string | number | boolean | null | undefined | Date;
  id?: string | number;
  name?: string;
  email?: string;
  active?: boolean;
  situacao?: string;
  status?: string;
  amount?: number | string;
  price?: number | string;
  planId?: string | number;
  paidAt?: string | Date;
  createdAt?: string | Date;
  dueDate?: string | Date;
  specialty?: string | null;
  photoUrl?: string | null;
  phone?: string | null;
  subscriptionLabel?: string;
  method?: string;
  dataCadastro?: string | Date;
  dataCancelamento?: string | Date;
  motivoCancelamento?: string;
  nome?: string;
};

interface AdminDashboardViewProps {
  data: {
    members: DashboardItem[];
    allMembers: DashboardItem[];
    plans: DashboardItem[];
    users: DashboardItem[];
    personalTrainers: DashboardItem[];
    subscriptions: DashboardItem[];
    payments: DashboardItem[];
    overdueMembers: DashboardItem[];
  };
  fmtDate: (date: unknown) => string;
  fmtCurrency: (val: unknown) => string;
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
    <div className="gp-overview">
      <header className="gp-overview-heading">
        <h1>Visão geral</h1>
        <p>Acompanhe os alunos, os recebimentos e a operação da academia.</p>
      </header>

      <dl className="gp-overview-metrics" aria-label="Indicadores da academia">
        <div className="gp-metric">
          <dt><Users size={19} aria-hidden="true" />Alunos ativos</dt>
          <dd><CountUp value={activeStudents} duration={500} /><p>{totalStudents} alunos na base consultada</p></dd>
        </div>
        <div className="gp-metric">
          <dt><Layers size={19} aria-hidden="true" />Assinaturas ativas</dt>
          <dd><CountUp value={activeSubscriptions} duration={500} /><p>{data.subscriptions?.length || 0} assinaturas cadastradas</p></dd>
        </div>
        <div className="gp-metric gp-metric-revenue">
          <dt><Wallet size={19} aria-hidden="true" />Receita realizada</dt>
          <dd><CountUp value={totalRevenue} prefix="R$ " decimals={2} duration={500} /><p>Pagamentos liquidados · {data.payments?.length || 0} lançamentos na base</p></dd>
        </div>
        <div className="gp-metric gp-metric-overdue">
          <dt><AlertTriangle size={19} aria-hidden="true" />Alunos inadimplentes</dt>
          <dd><CountUp value={overdueCount} duration={500} /><span>{overdueRate}% da base</span><p>{overdueCount === 0 ? "Nenhuma pendência financeira" : "Requer atenção do financeiro"}</p></dd>
        </div>
      </dl>

      <div className="gp-overview-grid">
        <section className="gp-overview-panel gp-overview-chart" aria-labelledby="overview-revenue-title">
          <div className="gp-panel-heading">
            <div><h2 id="overview-revenue-title">Receita mensal</h2><p>Pagamentos agrupados nos últimos seis meses.</p></div>
            <span className="gp-overview-total">Liquidado na base<strong>{fmtCurrency(totalRevenue)}</strong></span>
          </div>
          <AdminRevenueChart data={monthlyRevenueSeries} />
        </section>

        <section className="gp-overview-panel" aria-labelledby="overview-plans-title">
          <div className="gp-panel-heading"><div><h2 id="overview-plans-title">Receita por plano</h2><p>Estimativa de participação por assinaturas vinculadas.</p></div><Layers size={19} aria-hidden="true" /></div>
          {planRevenueShare.length === 0 ? <p className="gp-overview-empty">Nenhum plano cadastrado.</p> : (
            <ul className="gp-plan-shares">{planRevenueShare.map((plan) => (
              <li key={plan.id}>
                <div><strong>{plan.nome}</strong><span>{fmtCurrency(plan.receita)}</span></div>
                <div className="gp-plan-meter" role="meter" aria-label={`Participação estimada de ${plan.nome}`} aria-valuemin={0} aria-valuemax={100} aria-valuenow={plan.share}><span style={{ transform: `scaleX(${Math.min(100, Math.max(0, plan.share)) / 100})` }} /></div>
                <p><span>{plan.subsCount} {plan.subsCount === 1 ? "aluno vinculado" : "alunos vinculados"} · {fmtCurrency(plan.price)}/plano</span><strong>{plan.share}%</strong></p>
              </li>
            ))}</ul>
          )}
        </section>

        <section className="gp-overview-panel gp-overview-records" aria-label="Pagamentos e personal trainers">
          <div className="gp-panel-heading gp-records-heading">
            <div className="gp-overview-tabs" role="tablist" aria-label="Registros recentes" onKeyDown={(event) => {
              if (event.altKey || event.ctrlKey || event.metaKey) return;
              if (!["ArrowLeft", "ArrowRight", "Home", "End"].includes(event.key)) return;
              event.preventDefault();
              const nextTab = event.key === "Home" ? "pagamentos" : event.key === "End" ? "trainers" : tab === "pagamentos" ? "trainers" : "pagamentos";
              setTab(nextTab);
              event.currentTarget.querySelector<HTMLButtonElement>(`#overview-tab-${nextTab}`)?.focus();
            }}>
              <button type="button" role="tab" id="overview-tab-pagamentos" aria-selected={tab === "pagamentos"} aria-controls="overview-records-panel" tabIndex={tab === "pagamentos" ? 0 : -1} onClick={() => setTab("pagamentos")} className={cn("gp-overview-tab", tab === "pagamentos" && "gp-overview-tab-active")}>Pagamentos recentes</button>
              <button type="button" role="tab" id="overview-tab-trainers" aria-selected={tab === "trainers"} aria-controls="overview-records-panel" tabIndex={tab === "trainers" ? 0 : -1} onClick={() => setTab("trainers")} className={cn("gp-overview-tab", tab === "trainers" && "gp-overview-tab-active")}>Personal trainers <span>{data.personalTrainers?.length || 0}</span></button>
            </div>
            {onNavigate && <button type="button" className="gp-overview-link" onClick={() => onNavigate(tab === "pagamentos" ? 35 : 33)} aria-label={tab === "pagamentos" ? "Ver todos os pagamentos" : "Ver todos os personal trainers"}>Ver todos<ArrowUpRight size={16} aria-hidden="true" /></button>}
          </div>
          <div role="tabpanel" id="overview-records-panel" aria-labelledby={`overview-tab-${tab}`} tabIndex={0} className="gp-overview-table-wrapper">
            {tab === "pagamentos" ? recentPayments.length === 0 ? <p className="gp-overview-empty">Nenhum pagamento registrado ainda.</p> : (
              <table className="gp-overview-table"><caption className="sr-only">Pagamentos recentes</caption>
                <thead><tr><th scope="col">Aluno / Assinatura</th><th scope="col">Método</th><th scope="col" className="gp-number">Valor</th><th scope="col">Data</th><th scope="col">Situação</th></tr></thead>
                <tbody>{recentPayments.map((payment) => <tr key={payment.id}>
                  <td data-label="Aluno / Assinatura"><strong>{payment.subscriptionLabel || "Assinatura"}</strong></td>
                  <td data-label="Método">{payment.method || "—"}</td>
                  <td data-label="Valor" className="gp-number"><strong>{fmtCurrency(payment.amount)}</strong></td>
                  <td data-label="Data">{fmtDate(payment.paidAt || payment.createdAt)}</td>
                  <td data-label="Situação"><StatusBadge status={payment.status || "Pago"} /></td>
                </tr>)}</tbody>
              </table>
            ) : recentTrainers.length === 0 ? <p className="gp-overview-empty">Nenhum personal trainer cadastrado.</p> : (
              <table className="gp-overview-table"><caption className="sr-only">Personal trainers</caption>
                <thead><tr><th scope="col">Profissional</th><th scope="col">Especialidade</th><th scope="col">Contato</th><th scope="col">Situação</th></tr></thead>
                <tbody>{recentTrainers.map((trainer) => <tr key={trainer.id}>
                  <td data-label="Profissional"><div className="gp-trainer-name"><Avatar name={trainer.name} photoUrl={trainer.photoUrl} size="sm" /><strong>{trainer.name}</strong></div></td>
                  <td data-label="Especialidade">{trainer.specialty || "—"}</td>
                  <td data-label="Contato">{trainer.phone || trainer.email || "—"}</td>
                  <td data-label="Situação"><StatusBadge status={trainer.active !== false ? "Ativo" : "Inativo"} /></td>
                </tr>)}</tbody>
              </table>
            )}
          </div>
        </section>

        <section className="gp-overview-panel" aria-labelledby="overview-activity-title">
          <div className="gp-panel-heading"><div><h2 id="overview-activity-title">Atividades recentes</h2><p>Cadastros e movimentações da academia.</p></div><UserPlus size={19} aria-hidden="true" /></div>
          {recentActivities.length === 0 ? <p className="gp-overview-empty">Nenhuma atividade registrada ainda.</p> : (
            <ol className="gp-overview-activity">{recentActivities.map((activity) => <li key={activity.id}>
              <span className={cn("gp-activity-icon", `gp-activity-${activity.type}`)} aria-hidden="true">{activity.type === "pagamento" ? <CreditCard size={15} /> : activity.type === "cancelamento" ? <AlertTriangle size={15} /> : <UserPlus size={15} />}</span>
              <div><h3>{activity.title}</h3><p>{activity.desc}</p><time>{activity.time}</time></div>
            </li>)}</ol>
          )}
        </section>
      </div>
    </div>
  );
}
