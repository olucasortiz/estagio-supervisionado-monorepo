"use client";

/**
 * DashboardContent.jsx
 *
 * Componente principal do painel administrativo.
 * Mantém toda a lógica original de estado, chamadas de API e handlers.
 * Delega a renderização visual para seções individuais.
 */

import { useCallback, useEffect, useState } from "react";
import {
  API_BASE_URL,
  cancelMember,
  createPayment,
  createSubscription,
  createMember,
  createPersonalTrainer,
  createPlan,
  createUser,
  deleteMember,
  deletePayment,
  deletePersonalTrainer,
  deletePlan,
  deleteSubscription,
  deleteUser,
  getMembers,
  getOverdueMembers,
  getPayments,
  getPersonalTrainers,
  getPlans,
  getSubscriptions,
  getUsers,
  updateMember,
  updatePayment,
  updatePersonalTrainer,
  updatePlan,
  updateSubscription,
  updateUser,
} from "../../services/api";
import { useDashboardNavigation } from "../layout/DashboardLayout";
import NewMembersReport from "../reports/NewMembersReport";
import CancellationsReport from "../reports/CancellationsReport";
import ActiveMembersReport from "../reports/ActiveMembersReport";
import OverdueMembersReport from "../reports/OverdueMembersReport";

// ─── Seções de CRUD ────────────────────────────────────────────────────────
import MembersSection    from "./sections/MembersSection";
import PlansSection      from "./sections/PlansSection";
import UsersSection      from "./sections/UsersSection";
import PersonalSection   from "./sections/PersonalSection";
import SubscriptionsSection from "./sections/SubscriptionsSection";
import PaymentsSection   from "./sections/PaymentsSection";
import OverdueSection    from "./sections/OverdueSection";
import CancellationSection from "./sections/CancellationSection";

// ─── Utilitários (mantidos idênticos ao original) ─────────────────────────

export function getMemberPhotoUrl(photoUrl) {
  if (!photoUrl) return "";
  if (/^https?:\/\//i.test(photoUrl)) return photoUrl;
  return `${API_BASE_URL}${photoUrl.startsWith("/") ? photoUrl : `/${photoUrl}`}`;
}

export const onlyDigits = (value) => {
  if (value === null || value === undefined) return "";
  return String(value).replace(/\D/g, "");
};

export const cleanDigits = onlyDigits;

export const formatCpf = (value) => {
  if (!value) return "—";
  const d = onlyDigits(value);
  if (d.length === 0) return "—";
  return d.replace(/(\d{3})(\d)/, "$1.$2")
          .replace(/(\d{3})(\d)/, "$1.$2")
          .replace(/(\d{3})(\d{1,2})/, "$1-$2")
          .replace(/(-\d{2})\d+?$/, "$1");
};

export const maskCPF = formatCpf;

export const maskPhone = (value) => {
  if (!value) return "";
  const d = onlyDigits(value);
  return d.replace(/(\d{2})(\d)/, "($1) $2")
          .replace(/(\d{5})(\d)/, "$1-$2")
          .replace(/(-\d{4})\d+?$/, "$1");
};

const toDateInputString = (value) => {
  if (!value) return "";
  if (value instanceof Date) return isNaN(value.getTime()) ? "" : toIsoDateOnly(value);
  if (typeof value !== "string") return "";
  return value.includes("T") ? value.split("T")[0] : value;
};

export const toDate = (value) => {
  const n = toDateInputString(value);
  return n ? new Date(`${n}T00:00:00`) : null;
};

export const formatDateBR = (value) => {
  if (!value) return "—";
  if (value instanceof Date) {
    if (isNaN(value.getTime())) return "—";
    return value.toLocaleDateString("pt-BR", { timeZone: "UTC" });
  }
  if (Array.isArray(value)) {
    const [y, m, d] = value;
    if (y && m && d) {
      return `${String(d).padStart(2, "0")}/${String(m).padStart(2, "0")}/${String(y).padStart(4, "0")}`;
    }
    return "—";
  }
  if (typeof value !== "string") return "—";
  const n = value.includes("T") ? value.split("T")[0] : value;
  const parts = n.split("-");
  if (parts.length === 3) {
    const [y, m, d] = parts;
    if (y.length <= 4 && m.length <= 2 && d.length <= 2) {
      return `${d.padStart(2, "0")}/${m.padStart(2, "0")}/${y.padStart(4, "0")}`;
    }
  }
  return "—";
};

export const fmtDate = formatDateBR;

export const fmtCurrency = (value) => {
  if (value === null || value === undefined || value === "") return "—";
  return Number(value).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
};

export const dateInputValue = (value) => toDateInputString(value);

export const toIsoDateOnly = (date) => {
  if (!(date instanceof Date) || isNaN(date.getTime())) return "";
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
};

export const normalizeDateForApi = (value) => {
  if (!value) return null;
  if (value instanceof Date) {
    if (isNaN(value.getTime())) return null;
    return toIsoDateOnly(value);
  }
  if (typeof value !== "string") return null;
  const clean = value.includes("T") ? value.split("T")[0] : value;
  const parts = clean.split("-");
  if (parts.length === 3) {
    const [y, m, d] = parts;
    const numericY = Number(y);
    if (!isNaN(numericY) && numericY > 0 && numericY <= 9999) {
      const cleanY = String(numericY).padStart(4, "0");
      return `${cleanY}-${m.padStart(2, "0")}-${d.padStart(2, "0")}`;
    }
  }
  return null;
};

export const normalizeUppercase = (value) =>
  typeof value === "string" ? value.trim().toUpperCase() : value;

export const normalizePaymentMethod = (value) => {
  const n = typeof value === "string" ? value.trim().toUpperCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "") : "";
  if (n === "PIX") return "PIX";
  if (n === "DINHEIRO" || n === "CASH") return "CASH";
  if (n === "CARTAO" || n === "CARD" || n === "CREDIT_CARD") return "CARD";
  return typeof value === "string" ? value.trim().toUpperCase() : "";
};

export const normalizePaymentStatus = (value) => {
  const n = typeof value === "string" ? value.trim().toUpperCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "") : "";
  if (n === "PAGO" || n === "PAID") return "PAID";
  if (n === "PENDENTE" || n === "PENDING") return "PENDING";
  if (n === "CANCELADO" || n === "CANCELED") return "CANCELED";
  if (n === "ATRASADO" || n === "OVERDUE") return "OVERDUE";
  return typeof value === "string" ? value.trim().toUpperCase() : "";
};

export const calculateSubscriptionEndDate = (startDate, plan) => {
  if (!startDate || !plan) return "";
  const t = normalizeUppercase(plan.type);
  if (t === "DAILY") return startDate;
  const days = Number(plan.durationDays ?? plan.duration_days ?? 0);
  if (!days) return "";
  const base = new Date(`${startDate}T00:00:00`);
  if (isNaN(base.getTime())) return "";
  base.setDate(base.getDate() + days);
  return toIsoDateOnly(base);
};

export const getActiveValue = (item) => item.active ?? item.isActive ?? item.is_active;

export const normalizeMember = (member) => {
  const active = getActiveValue(member);
  const situacao = active === false ? "Inativo" : member.situacao || "Ativo";
  return {
    ...member,
    nome: member.name || member.nome || "—",
    cpf: member.cpf || "—",
    birthDate: member.birthDate || member.birth_date || "",
    photoUrl: member.photoUrl || member.photo_url || "",
    active,
    dataCadastro: member.createdAt || member.created_at || member.dataCadastro || "",
    situacao,
    plano: member.plan?.name || member.planName || member.plano || "—",
    situacaoFin: member.situacaoFin || member.financialStatus || member.financial_status || "Em dia",
    dataCancelamento: member.canceledAt || member.canceled_at || member.dataCancelamento || "",
    motivoCancelamento: member.cancellationReason || member.cancellation_reason || member.motivoCancelamento || "",
  };
};

export const normalizePlan = (plan) => ({
  ...plan,
  name: plan.name || "—",
  type: plan.type || "—",
  price: plan.price ?? "—",
  durationDays: plan.durationDays ?? plan.duration_days ?? "—",
  active: getActiveValue(plan),
});

export const normalizeUser = (user) => ({
  ...user,
  name: user.name || "—",
  email: user.email || "—",
  role: user.role || "—",
  active: getActiveValue(user),
});

export const normalizePersonalTrainer = (trainer) => ({
  ...trainer,
  name: trainer.name || "—",
  cpf: trainer.cpf || "—",
  email: trainer.email || "—",
  phone: trainer.phone || "—",
  specialty: trainer.specialty || "—",
  active: getActiveValue(trainer),
});

export const getEntityId = (item) => item?.id ?? item?.memberId ?? item?.member_id ?? "";

export const findById = (items, id) =>
  items.find((item) => String(getEntityId(item)) === String(id));

export const toPayloadId = (value) => {
  if (value === "") return null;
  const n = Number(value);
  return isNaN(n) ? value : n;
};

const getMemberNameById = (members, id) => {
  const m = findById(members, id);
  return m?.nome || m?.name || id || "—";
};

const getPlanNameById = (plans, id) => {
  const p = findById(plans, id);
  return p?.name || p?.nome || id || "—";
};

export const normalizeSubscription = (subscription, members, plans) => {
  const memberId = subscription.memberId ?? subscription.member_id ?? subscription.member?.id ?? "";
  const planId   = subscription.planId   ?? subscription.plan_id   ?? subscription.plan?.id   ?? "";
  return {
    ...subscription,
    memberId, planId,
    memberName: subscription.member?.name || subscription.member?.nome || subscription.memberName || subscription.member_name || getMemberNameById(members, memberId),
    planName:   subscription.plan?.name  || subscription.plan?.nome  || subscription.planName  || subscription.plan_name  || getPlanNameById(plans, planId),
    startDate: subscription.startDate || subscription.start_date || "",
    endDate:   subscription.endDate   || subscription.end_date   || "",
    status:    subscription.status || "—",
    createdAt: subscription.createdAt || subscription.created_at || "",
  };
};

export const normalizePayment = (payment, subscriptions) => {
  const subscriptionId = payment.subscriptionId ?? payment.subscription_id ?? payment.subscription?.id ?? "";
  const subscription   = findById(subscriptions, subscriptionId);
  return {
    ...payment,
    subscriptionId,
    subscriptionLabel:
      payment.subscription?.member?.name || payment.subscription?.member?.nome ||
      payment.subscriptionName || payment.subscription_name ||
      subscription?.memberName || subscriptionId || "—",
    amount:  payment.amount ?? payment.value ?? payment.valor ?? "",
    method:  payment.method || payment.paymentMethod || payment.payment_method || "—",
    status:  payment.status || "—",
    paidAt:  payment.paidAt || payment.paymentDate || payment.paid_at || payment.date || payment.dataPagamento || "",
    createdAt: payment.createdAt || payment.created_at || "",
  };
};

export const normalizeOverdueMember = (member) => {
  const n = normalizeMember(member);
  return {
    ...n,
    plano: member.plan?.name || member.plan?.nome || member.planName || member.plan_name || n.plano,
    situacaoFin: member.financialStatus || member.financial_status || member.statusFinanceiro || member.situacaoFin || n.situacaoFin || "Inadimplente",
  };
};

// ─── Estado inicial dos formulários (mantido idêntico) ────────────────────
const initialForms = {
  members: { name: "", email: "", password: "", cpf: "", birthDate: "", photoUrl: "", photo: null, active: "true" },
  plans: { name: "", type: "", price: "", durationDays: "", active: "true" },
  users: { name: "", email: "", password: "", role: "", active: "true" },
  personalTrainers: { name: "", cpf: "", email: "", phone: "", specialty: "", active: "true" },
  subscriptions: { memberId: "", planId: "", startDate: "", endDate: "", status: "ACTIVE" },
  payments: { subscriptionId: "", amount: "", method: "", status: "Pago", paidAt: "" },
  cancellation: { memberId: "", cancellationDate: "", reason: "" },
};

// ─── Config dos módulos (mantida idêntica) ────────────────────────────────
export const moduleConfig = {
  members: {
    create: createMember, update: updateMember, remove: deleteMember,
    successName: "membro",
    fields: (data) => [
      { key: "name", label: "Nome", required: true },
      { key: "email", label: "E-mail", type: "email", required: true },
      { key: "password", label: "Senha inicial", type: "password" },
      { key: "cpf", label: "CPF", required: true },
      { key: "birthDate", label: "Data de nascimento", type: "date", required: true },
      { key: "personalTrainerId", label: "Personal Trainer", type: "select", options: [{ value: "", label: "Selecione" }, ...(data.personalTrainers || []).map((pt) => ({ value: pt.id, label: pt.name }))] },
      { key: "photo", label: "Foto", type: "file", accept: "image/png,image/jpeg,image/webp" },
      { key: "active", label: "Ativo", type: "select", options: [{ value: "true", label: "Sim" }, { value: "false", label: "Não" }] },
    ],
    toPayload: (form) => {
      const fd = new FormData();
      fd.append("name", form.name || "");
      fd.append("email", form.email || "");
      fd.append("cpf", onlyDigits(form.cpf));
      const normalizedDate = normalizeDateForApi(form.birthDate);
      if (normalizedDate) fd.append("birthDate", normalizedDate);
      if (form.password) fd.append("password", form.password);
      if (form.personalTrainerId) fd.append("personalTrainerId", form.personalTrainerId);
      if (form.photo instanceof File) fd.append("photo", form.photo);
      return fd;
    },
    toForm: (item) => ({
      name: item.name || item.nome || "",
      email: item.email || "",
      cpf: item.cpf || "",
      birthDate: dateInputValue(item.birthDate || item.birth_date),
      photoUrl: item.photoUrl || item.photo_url || "",
      photo: null, password: "",
      personalTrainerId: item.personalTrainerId || item.personal_trainer_id || "",
      active: getActiveValue(item) === false ? "false" : "true",
    }),
  },
  plans: {
    create: createPlan, update: updatePlan, remove: deletePlan,
    successName: "plano",
    fields: [
      { key: "name", label: "Nome", required: true },
      { key: "type", label: "Tipo", type: "select", required: true, options: [{ value: "", label: "Selecione" }, { value: "MONTHLY", label: "Mensal" }, { value: "DAILY", label: "Diário" }] },
      { key: "price", label: "Valor", type: "number", step: "0.01", required: true },
      { key: "durationDays", label: "Duração (dias)", type: "number", required: true },
      { key: "active", label: "Ativo", type: "select", options: [{ value: "true", label: "Sim" }, { value: "false", label: "Não" }] },
    ],
    toPayload: (form) => ({ name: form.name, type: normalizeUppercase(form.type), price: form.price === "" ? null : Number(form.price), durationDays: form.durationDays === "" ? null : Number(form.durationDays) }),
    toForm: (item) => ({ name: item.name || "", type: item.type || "", price: item.price ?? "", durationDays: item.durationDays ?? item.duration_days ?? "", active: getActiveValue(item) === false ? "false" : "true" }),
  },
  users: {
    create: createUser, update: updateUser, remove: deleteUser,
    successName: "usuário",
    fields: [
      { key: "name", label: "Nome", required: true },
      { key: "email", label: "E-mail", type: "email", required: true },
      { key: "password", label: "Senha", type: "password", required: true },
      { key: "role", label: "Perfil", type: "select", required: true, options: [{ value: "", label: "Selecione" }, { value: "PERSONAL_TRAINER", label: "Personal Trainer" }, { value: "ADMIN", label: "Administrador" }] },
      { key: "active", label: "Ativo", type: "select", options: [{ value: "true", label: "Sim" }, { value: "false", label: "Não" }] },
    ],
    toPayload: (form) => ({ name: form.name, email: form.email, password: form.password, role: normalizeUppercase(form.role) }),
    toForm: (item) => ({ name: item.name || "", email: item.email || "", password: "", role: item.role || "", active: getActiveValue(item) === false ? "false" : "true" }),
  },
  personalTrainers: {
    create: createPersonalTrainer, update: updatePersonalTrainer, remove: deletePersonalTrainer,
    successName: "personal trainer",
    fields: [
      { key: "name", label: "Nome", required: true },
      { key: "cpf", label: "CPF", required: true },
      { key: "email", label: "Email", required: true },
      { key: "phone", label: "Telefone" },
      { key: "specialty", label: "Especialidade", required: true },
      { key: "active", label: "Ativo", type: "select", options: [{ value: "true", label: "Sim" }, { value: "false", label: "Não" }] },
    ],
    toPayload: (form) => ({ name: form.name, cpf: (form.cpf || "").replace(/\D/g, ""), email: form.email, phone: form.phone, specialty: form.specialty }),
    toForm: (item) => ({ name: item.name || "", cpf: item.cpf || "", email: item.email || "", phone: item.phone || "", specialty: item.specialty || "", active: getActiveValue(item) === false ? "false" : "true" }),
  },
  subscriptions: {
    create: createSubscription, update: updateSubscription, remove: deleteSubscription,
    successName: "assinatura",
    fields: (data) => [
      { key: "memberId", label: "Membro", type: "select", required: true, options: [{ value: "", label: "Selecione" }, ...data.members.map((m) => ({ value: getEntityId(m), label: m.nome || m.name || `Membro ${getEntityId(m)}` }))] },
      { key: "planId", label: "Plano", type: "select", required: true, options: [{ value: "", label: "Selecione" }, ...data.plans.map((p) => ({ value: getEntityId(p), label: `${p.name || `Plano ${getEntityId(p)}`} • ${p.durationDays ?? p.duration_days ?? "—"} dias` }))] },
      { key: "startDate", label: "Data inicial", type: "date", required: true },
    ],
    toPayload: (form) => ({ memberId: toPayloadId(form.memberId), planId: toPayloadId(form.planId), startDate: form.startDate || null }),
    toForm: (item) => ({ memberId: item.memberId ?? item.member_id ?? "", planId: item.planId ?? item.plan_id ?? "", startDate: dateInputValue(item.startDate || item.start_date), endDate: dateInputValue(item.endDate || item.end_date), status: normalizeUppercase(item.status) || "ACTIVE" }),
  },
  payments: {
    create: createPayment, update: updatePayment, remove: deletePayment,
    successName: "pagamento",
    fields: (data) => [
      { key: "subscriptionId", label: "Assinatura", type: "select", required: true, options: [{ value: "", label: "Selecione" }, ...data.subscriptions.map((s) => ({ value: getEntityId(s), label: `${s.memberName || "Assinatura"} - ${s.planName || "—"}` }))] },
      { key: "amount", label: "Valor", type: "number", step: "0.01", required: true },
      { key: "method", label: "Método", type: "select", required: true, options: [{ value: "", label: "Selecione" }, { value: "Dinheiro", label: "Dinheiro" }, { value: "Cartão", label: "Cartão" }, { value: "Pix", label: "Pix" }, { value: "Boleto", label: "Boleto" }] },
      { key: "status", label: "Status", type: "select", required: true, options: [{ value: "Pago", label: "Pago" }, { value: "Pendente", label: "Pendente" }, { value: "Atrasado", label: "Atrasado" }, { value: "Cancelado", label: "Cancelado" }] },
      { key: "paidAt", label: "Data do pagamento", type: "date", required: true },
    ],
    toPayload: (form) => ({ subscriptionId: toPayloadId(form.subscriptionId), amount: form.amount === "" ? null : Number(form.amount), method: normalizePaymentMethod(form.method), status: normalizePaymentStatus(form.status), paidAt: form.paidAt || null }),
    toForm: (item) => ({ subscriptionId: item.subscriptionId ?? item.subscription_id ?? "", amount: item.amount ?? item.value ?? item.valor ?? "", method: item.method || item.paymentMethod || item.payment_method || "", status: item.status || "Pago", paidAt: dateInputValue(item.paidAt || item.paymentDate || item.paid_at || item.date) }),
  },
};

function resolveFields(fieldsConfig, editingItem) {
  return typeof fieldsConfig === "function" ? fieldsConfig(editingItem) : fieldsConfig;
}

function getSettledValue(result) {
  if (result.status !== "fulfilled") return [];
  const v = result.value;
  if (Array.isArray(v)) return v;
  if (Array.isArray(v?.content)) return v.content;
  if (Array.isArray(v?.data)) return v.data;
  if (Array.isArray(v?.items)) return v.items;
  if (Array.isArray(v?.personalTrainers)) return v.personalTrainers;
  console.warn("Resposta inesperada da API:", v);
  return [];
}

// ─── Componente principal ─────────────────────────────────────────────────
export default function DashboardContent({ activeReport, styles } = {}) {
  const navigation = useDashboardNavigation();
  const currentStyles = styles || navigation?.styles;
  const currentActiveReport = activeReport ?? navigation?.activeReport ?? 19;

  const [data, setData] = useState({
    members: [], plans: [], users: [], personalTrainers: [],
    subscriptions: [], payments: [], overdueMembers: [],
  });
  const [forms, setForms] = useState(initialForms);
  const [editing, setEditing] = useState({ members: null, plans: null, users: null, personalTrainers: null, subscriptions: null, payments: null });
  const [feedback, setFeedback] = useState({ members: "", plans: "", users: "", personalTrainers: "", subscriptions: "", payments: "", cancellation: "" });
  const [saving, setSaving] = useState({ members: false, plans: false, users: false, personalTrainers: false, subscriptions: false, payments: false, cancellation: false });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const loadDashboardData = useCallback(async () => {
    try {
      setLoading(true);
      setError("");
      const results = await Promise.allSettled([
        getMembers(), getPlans(), getUsers(), getPersonalTrainers(),
        getSubscriptions(), getPayments(), getOverdueMembers(),
      ]);
      const rawMembers  = getSettledValue(results[0]);
      const rawPlans    = getSettledValue(results[1]);
      const rawUsers    = getSettledValue(results[2]);
      const rawTrainers = getSettledValue(results[3]);
      const rawSubs     = getSettledValue(results[4]);
      const rawPayments = getSettledValue(results[5]);
      const rawOverdue  = getSettledValue(results[6]);

      const members = rawMembers.map(normalizeMember);
      const plans   = rawPlans.map(normalizePlan);
      const users   = rawUsers.map(normalizeUser);
      const personalTrainers = Array.isArray(rawTrainers) ? rawTrainers.map(normalizePersonalTrainer) : [];
      const subscriptions = rawSubs.map((s) => normalizeSubscription(s, members, plans));
      const payments = rawPayments.map((p) => normalizePayment(p, subscriptions));
      const overdueMembers = rawOverdue.map(normalizeOverdueMember);

      setData({ members, plans, users, personalTrainers, subscriptions, payments, overdueMembers });
    } catch (err) {
      console.error("Erro crítico no Dashboard:", err);
      setError("Alguns módulos podem estar indisponíveis para o seu nível de acesso.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadDashboardData(); }, [loadDashboardData]);

  const changeFormValue = (moduleKey, fieldKey, value) => {
    let processed = value;
    if (fieldKey !== "photo") {
      if (fieldKey === "cpf")                     processed = maskCPF(value);
      else if (fieldKey === "phone" || fieldKey === "telefone") processed = maskPhone(value);
      else if (fieldKey === "name" || fieldKey === "nome")     processed = value.substring(0, 100);
    }
    setForms((cur) => {
      const next = { ...cur[moduleKey], [fieldKey]: processed };
      if (moduleKey === "subscriptions") {
        const plan = findById(data.plans, next.planId);
        next.endDate = calculateSubscriptionEndDate(next.startDate, plan);
        next.status = "ACTIVE";
      }
      return { ...cur, [moduleKey]: next };
    });
  };

  const resetForm = (moduleKey) => {
    setForms((cur) => ({ ...cur, [moduleKey]: initialForms[moduleKey] }));
    setEditing((cur) => ({ ...cur, [moduleKey]: null }));
  };

  const setModuleFeedback = (moduleKey, msg) => setFeedback((cur) => ({ ...cur, [moduleKey]: msg }));
  const setModuleSaving   = (moduleKey, val) => setSaving((cur) => ({ ...cur, [moduleKey]: val }));

  const startEdit = (moduleKey, item) => {
    setForms((cur) => ({ ...cur, [moduleKey]: moduleConfig[moduleKey].toForm(item) }));
    setEditing((cur) => ({ ...cur, [moduleKey]: item }));
    setModuleFeedback(moduleKey, "");
  };

  const submitForm = async (moduleKey, event, overrideForm) => {
    if (event?.preventDefault) event.preventDefault();
    const config = moduleConfig[moduleKey];
    const item = editing[moduleKey];
    const formToSubmit = { ...(overrideForm || forms[moduleKey]) };
    if (formToSubmit.cpf)   formToSubmit.cpf   = cleanDigits(formToSubmit.cpf);
    if (formToSubmit.phone) formToSubmit.phone = cleanDigits(formToSubmit.phone);
    const payload = config.toPayload(formToSubmit);
    try {
      setModuleSaving(moduleKey, true);
      setModuleFeedback(moduleKey, "Salvando...");
      if (item?.id) { await config.update(item.id, payload); setModuleFeedback(moduleKey, `${config.successName} atualizado com sucesso.`); }
      else           { await config.create(payload);          setModuleFeedback(moduleKey, `${config.successName} cadastrado com sucesso.`); }
      resetForm(moduleKey);
      await loadDashboardData();
    } catch (err) {
      console.error(err);
      setModuleFeedback(moduleKey, `Falha ao salvar ${config.successName}: ${err?.message || "Não foi possível salvar o registro."}`);
    } finally {
      setModuleSaving(moduleKey, false);
    }
  };

  const removeItem = async (moduleKey, item) => {
    const config = moduleConfig[moduleKey];
    if (!item?.id) { setModuleFeedback(moduleKey, "Registro sem identificador para excluir."); return; }
    if (!window.confirm("Deseja inativar / excluir este registro?")) return;
    try {
      setModuleFeedback(moduleKey, "Processando...");
      await config.remove(item.id);
      resetForm(moduleKey);
      setModuleFeedback(moduleKey, `${config.successName} inativado / excluído com sucesso.`);
      await loadDashboardData();
    } catch (err) {
      console.error(err);
      setModuleFeedback(moduleKey, "Não foi possível inativar / excluir o registro.");
    }
  };

  const submitCancellation = async (event) => {
    event.preventDefault();
    const payload = { memberId: toPayloadId(forms.cancellation.memberId), reason: forms.cancellation.reason || null };
    if (!payload.memberId) { setModuleFeedback("cancellation", "Selecione um membro para cancelar."); return; }
    
    // Validar no frontend se o aluno ainda está ativo
    const member = findById(data.members, payload.memberId);
    if (!member || member.active === false || member.situacao !== "Ativo") {
      setModuleFeedback("cancellation", "Este aluno já está cancelado/inativo.");
      return;
    }

    try {
      setModuleSaving("cancellation", true);
      setModuleFeedback("cancellation", "Validando cancelamento...");
      await cancelMember(payload.memberId, { reason: payload.reason });
      setForms((cur) => ({ ...cur, cancellation: initialForms.cancellation }));
      setModuleFeedback("cancellation", "Membro cancelado com sucesso.");
      await loadDashboardData();
    } catch (err) {
      console.error(err);
      const errMsg = err?.message || "";
      if (errMsg.includes("inativo") || errMsg.includes("cancelado")) {
        setModuleFeedback("cancellation", "Este aluno já está cancelado/inativo.");
      } else {
        setModuleFeedback("cancellation", `Impedimento de cancelamento por dívida: ${errMsg || "Cancelamento impedido pelo backend."}`);
      }
    } finally {
      setModuleSaving("cancellation", false);
    }
  };

  // ─── Loading state ────────────────────────────────────────────────────
  if (loading) {
    return (
      <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 16 }}>
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="card card-md">
              <div className="skeleton skeleton-text" style={{ width: "40%", marginBottom: 8 }} />
              <div className="skeleton" style={{ width: "60%", height: 32 }} />
            </div>
          ))}
        </div>
        <div className="card card-md" style={{ height: 300 }}>
          <div className="skeleton skeleton-text" style={{ width: "30%", marginBottom: 16 }} />
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} style={{ display: "flex", gap: 12, marginBottom: 12 }}>
              <div className="skeleton skeleton-circle" style={{ width: 36, height: 36, flexShrink: 0 }} />
              <div style={{ flex: 1 }}>
                <div className="skeleton skeleton-text" style={{ width: "60%", marginBottom: 6 }} />
                <div className="skeleton skeleton-text" style={{ width: "40%" }} />
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (error && data.members.length === 0) {
    return (
      <div className="card card-md" style={{ textAlign: "center", padding: "48px 0" }}>
        <p style={{ color: "var(--text-muted)" }}>{error}</p>
      </div>
    );
  }

  // ─── Props comuns passadas para cada seção ────────────────────────────
  const sectionProps = {
    data,
    forms,
    editing,
    feedback,
    saving,
    fmtDate, fmtCurrency,
    onChangeFormValue: changeFormValue,
    onSubmitForm: submitForm,
    onStartEdit: startEdit,
    onRemoveItem: removeItem,
    onResetForm: resetForm,
    findById, getEntityId,
    calculateSubscriptionEndDate,
    normalizeUppercase,
    resolveFields,
    moduleConfig,
  };

  const reportId = Number(currentActiveReport);

  const sections = {
    19: <NewMembersReport     styles={currentStyles} members={data.members} toDate={toDate} fmtDate={fmtDate} />,
    20: <CancellationsReport  styles={currentStyles} cancellations={data.cancellations} toDate={toDate} fmtDate={fmtDate} />,
    21: <ActiveMembersReport  styles={currentStyles} members={data.members} Badge={null} />,
    22: <OverdueMembersReport styles={currentStyles} members={data.members} Badge={null} />,
    30: <MembersSection       {...sectionProps} />,
    31: <PlansSection         {...sectionProps} />,
    32: <UsersSection         {...sectionProps} />,
    33: <PersonalSection      {...sectionProps} />,
    34: <SubscriptionsSection {...sectionProps} />,
    35: <PaymentsSection      {...sectionProps} />,
    36: <OverdueSection       {...sectionProps} />,
    37: <CancellationSection  {...sectionProps} onSubmitCancellation={submitCancellation} />,
  };

  return sections[reportId] || (
    <div className="card card-md" style={{ textAlign: "center", padding: "48px 0" }}>
      <p style={{ color: "var(--text-muted)" }}>Painel</p>
    </div>
  );
}
