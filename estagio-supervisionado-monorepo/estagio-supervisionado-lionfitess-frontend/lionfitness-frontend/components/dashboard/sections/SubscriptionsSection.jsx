"use client";

import { useState } from "react";
import PageHeader from "../../ui/PageHeader";
import DataTable from "../../ui/DataTable";
import Modal from "../../ui/Modal";
import DashboardCard from "../../ui/DashboardCard";
import StatusBadge from "../../ui/StatusBadge";
import Combobox from "../../ui/Combobox";

function SubscriptionFormModal({ open, onClose, form, onChange, onSubmit, saving, feedback, isEditing, data, projectedEndDate, fmtDate, normalizeUppercase, findById }) {
  const selectedPlan = findById(data.plans, form.planId);

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={isEditing ? "Editar Assinatura" : "Nova Assinatura"}
      subtitle={isEditing ? "Atualize a assinatura" : "Vincule um aluno a um plano"}
      footer={
        <>
          <button className="btn btn-ghost" onClick={onClose} type="button">Cancelar</button>
          <button className="btn btn-primary" onClick={onSubmit} disabled={saving} type="button">
            {saving ? "Salvando..." : isEditing ? "Salvar" : "Criar assinatura"}
          </button>
        </>
      }
    >
      <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-4)" }}>
        <div className="form-field">
          <label className="label">Aluno *</label>
          <Combobox
            items={data.members}
            value={form.memberId}
            onChange={(id) => onChange("memberId", id)}
            getId={(m) => String(m.id ?? m.memberId ?? "")}
            getLabel={(m) => m.nome || m.name || ""}
            getSubLabel={(m) => m.email ? `✉ ${m.email}` : null}
            placeholder="Buscar aluno pelo nome ou e-mail..."
            required
            emptyMessage="Nenhum aluno encontrado."
          />
        </div>
        <div className="form-field">
          <label className="label">Plano *</label>
          <Combobox
            items={data.plans}
            value={form.planId}
            onChange={(id) => onChange("planId", id)}
            getId={(p) => String(p.id ?? "")}
            getLabel={(p) => p.name || ""}
            getSubLabel={(p) => {
              const days = p.durationDays ?? p.duration_days;
              const price = p.price != null ? `R$ ${Number(p.price).toFixed(2).replace(".", ",")}` : null;
              const parts = [days ? `${days} dias` : null, price].filter(Boolean);
              return parts.length > 0 ? parts.join(" • ") : null;
            }}
            placeholder="Buscar plano..."
            required
            emptyMessage="Nenhum plano encontrado."
          />
        </div>
        <div className="form-field">
          <label className="label">Data de início *</label>
          <input className="input" type="date" value={form.startDate} onChange={(e) => onChange("startDate", e.target.value)} required />
        </div>

        {/* Previsão de término */}
        {projectedEndDate && (
          <div className="alert alert-success">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ flexShrink: 0 }}>
              <rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/>
            </svg>
            <span>
              <strong>Término previsto:</strong> {fmtDate(projectedEndDate)}
              {normalizeUppercase(selectedPlan?.type) === "DAILY" && " • Plano diário"}
            </span>
          </div>
        )}

        {feedback && (
          <p className={feedback.includes("sucesso") ? "feedback-success" : "feedback-error"}>{feedback}</p>
        )}
      </div>
    </Modal>
  );
}


export default function SubscriptionsSection({
  data, forms, editing, feedback, saving,
  fmtDate, onChangeFormValue, onSubmitForm, onStartEdit, onRemoveItem, onResetForm,
  calculateSubscriptionEndDate, normalizeUppercase, findById, getEntityId,
}) {
  const [modalOpen, setModalOpen] = useState(false);

  const selectedPlan = findById(data.plans, forms.subscriptions.planId);
  const projectedEndDate = calculateSubscriptionEndDate(forms.subscriptions.startDate, selectedPlan);

  const handleOpen = (item = null) => {
    if (item) onStartEdit("subscriptions", item);
    else onResetForm("subscriptions");
    setModalOpen(true);
  };

  const handleClose = () => { setModalOpen(false); onResetForm("subscriptions"); };

  const handleSubmit = async () => {
    await onSubmitForm("subscriptions", null, forms.subscriptions);
    if (!feedback.subscriptions?.includes("Falha")) setModalOpen(false);
  };

  // KPI
  const total    = data.subscriptions.length;
  const ativas   = data.subscriptions.filter((s) => (s.status || "").toUpperCase() === "ACTIVE").length;
  const expiradas = data.subscriptions.filter((s) => (s.status || "").toUpperCase() === "EXPIRED").length;
  const canceladas = data.subscriptions.filter((s) => (s.status || "").toUpperCase() === "CANCELED").length;

  return (
    <div className="animate-fade-in">
      <PageHeader
        title="Assinaturas"
        subtitle="Gerencie os vínculos entre alunos e planos"
        breadcrumb={<><span>Financeiro</span><span style={{ opacity: 0.4 }}>›</span><span>Assinaturas</span></>}
        action={
          <button className="btn btn-primary" id="btn-nova-assinatura" onClick={() => handleOpen()}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
            </svg>
            Nova Assinatura
          </button>
        }
      />

      {/* KPI cards */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))", gap: 16, marginBottom: 20 }}>
        <DashboardCard value={total}     label="Total"     accentColor="#3B82F6" icon="📋" />
        <DashboardCard value={ativas}    label="Ativas"    accentColor="#22C55E" icon="✅" />
        <DashboardCard value={expiradas} label="Expiradas" accentColor="#F59E0B" icon="⏰" />
        <DashboardCard value={canceladas} label="Canceladas" accentColor="#EF4444" icon="❌" />
      </div>

      <div className="card card-md">
        <DataTable
          data={data.subscriptions}
          keyField="id"
          searchPlaceholder="Buscar por nome do aluno ou plano..."
          searchFields={["memberName", "planName", "status"]}
          emptyTitle="Nenhuma assinatura cadastrada"
          columns={[
            { key: "memberName", label: "Aluno" },
            { key: "planName",   label: "Plano" },
            { key: "startDate",  label: "Início",  render: (r) => fmtDate(r.startDate) },
            { key: "endDate",    label: "Término", render: (r) => fmtDate(r.endDate) },
            { key: "status",     label: "Status",  render: (r) => <StatusBadge status={r.status} /> },
          ]}
          actions={(item) => (
            <>
              <button className="btn btn-ghost btn-sm" onClick={() => handleOpen(item)}>Editar</button>
              <button className="btn btn-ghost btn-sm" style={{ color: "var(--error)" }} onClick={() => onRemoveItem("subscriptions", item)}>Excluir</button>
            </>
          )}
        />
      </div>

      <SubscriptionFormModal
        open={modalOpen}
        onClose={handleClose}
        form={forms.subscriptions}
        onChange={(k, v) => onChangeFormValue("subscriptions", k, v)}
        onSubmit={handleSubmit}
        saving={saving.subscriptions}
        feedback={feedback.subscriptions}
        isEditing={!!editing.subscriptions}
        data={data}
        projectedEndDate={projectedEndDate}
        fmtDate={fmtDate}
        normalizeUppercase={normalizeUppercase}
        findById={findById}
      />
    </div>
  );
}
