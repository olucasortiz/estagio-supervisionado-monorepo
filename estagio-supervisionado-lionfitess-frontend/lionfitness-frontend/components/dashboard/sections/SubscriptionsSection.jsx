"use client";

import { useState } from "react";
import PageHeader from "../../ui/PageHeader";
import DataTable from "../../ui/DataTable";
import Modal from "../../ui/Modal";
import FinanceMetrics from "../../admin/FinanceMetrics";
import StatusBadge from "../../ui/StatusBadge";
import Combobox from "../../ui/Combobox";

function SubscriptionFormModal({ open, onClose, form, onChange, onSubmit, saving, feedback, isEditing, data, projectedEndDate, fmtDate, normalizeUppercase, findById }) {
  const selectedPlan = findById(data.plans, form.planId);

  return (
    <Modal
      open={open}
      onClose={onClose}
      preventClose={!!saving}
      title={isEditing ? "Editar Assinatura" : "Nova Assinatura"}
      subtitle={isEditing ? "Atualize a assinatura" : "Vincule um aluno a um plano"}
      footer={
        <>
          <button className="btn btn-ghost" onClick={onClose} disabled={saving} type="button">Cancelar</button>
          <button className="btn btn-primary" onClick={onSubmit} disabled={saving} type="button">
            {saving ? "Salvando..." : isEditing ? "Salvar" : "Criar assinatura"}
          </button>
        </>
      }
    >
      <fieldset disabled={saving} className="gp-registry-fields" aria-busy={!!saving}>
        <div className="form-field">
          <span className="label">Aluno *</span>
          <Combobox ariaLabel="Aluno" disabled={saving}
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
          <span className="label">Plano *</span>
          <Combobox ariaLabel="Plano" disabled={saving}
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
          <label className="label" htmlFor="subscriptions-startDate">Data de início *</label>
            <input id="subscriptions-startDate" className="input" type="date" value={form.startDate} onChange={(e) => onChange("startDate", e.target.value)} required />
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
          <p role="status" className={feedback.includes("sucesso") ? "feedback-success" : "feedback-error"}>{feedback}</p>
        )}
      </fieldset>
    </Modal>
  );
}


export default function SubscriptionsSection({
  data, forms, editing, feedback, saving,
  fmtDate, onChangeFormValue, onSubmitForm, onStartEdit, onRemoveItem, onResetForm,
  calculateSubscriptionEndDate, normalizeUppercase, findById,
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
    if (saving?.subscriptions) return;
    const saved = await onSubmitForm("subscriptions", null, forms.subscriptions);
    if (saved) setModalOpen(false);
  };

  // KPI
  const total    = data.subscriptions.length;
  const ativas   = data.subscriptions.filter((s) => (s.status || "").toUpperCase() === "ACTIVE").length;
  const expiradas = data.subscriptions.filter((s) => (s.status || "").toUpperCase() === "EXPIRED").length;
  const canceladas = data.subscriptions.filter((s) => (s.status || "").toUpperCase() === "CANCELED").length;

  return (
    <div className="gp-registry gp-finance">
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

      {!modalOpen && feedback.subscriptions && !feedback.subscriptions.includes("sucesso") && <p className="gp-registry-notice" role="status">{feedback.subscriptions}</p>}
      {/* KPI cards */}
      <FinanceMetrics items={[
        {label:"Total de assinaturas",value:total}, {label:"Ativas",value:ativas},
        {label:"Expiradas",value:expiradas}, {label:"Canceladas",value:canceladas},
      ]} />

      <div className="card gp-registry-panel">
        <div className="gp-registry-panel-heading"><h2>Assinaturas cadastradas</h2><p>Consulte vínculos, vigências e situação de cada assinatura.</p></div>
        <DataTable
          data={data.subscriptions}
          keyField="id"
          caption="Assinaturas cadastradas"
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
