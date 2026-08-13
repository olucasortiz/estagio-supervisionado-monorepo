"use client";

import { useState } from "react";
import PageHeader from "../../ui/PageHeader";
import Modal from "../../ui/Modal";
import StatusBadge from "../../ui/StatusBadge";

const PLAN_TYPE_LABELS = { MONTHLY: "Mensal", DAILY: "Diário" };

function PlanCard({ plan, onEdit, onDelete, fmtCurrency }) {
  const typeLabel = PLAN_TYPE_LABELS[plan.type] || plan.type;
  const isActive  = plan.active !== false;
  const price     = fmtCurrency ? fmtCurrency(plan.price) : plan.price;

  return (
    <div className="plan-card animate-fade-in">
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
        <div>
          <p style={{ fontWeight: 700, fontSize: "var(--font-md)", color: "var(--text-primary)", margin: 0 }}>{plan.name}</p>
          {typeLabel !== "—" && <p style={{ fontSize: "var(--font-xs)", color: "var(--text-muted)", marginTop: 2 }}>{typeLabel}</p>}
        </div>
        <StatusBadge status={isActive ? "Ativo" : "Inativo"} />
      </div>

      <div style={{ display: "flex", gap: 16, marginTop: 4 }}>
        <div>
          <p style={{ fontSize: "var(--font-xs)", color: "var(--text-muted)", margin: 0 }}>Valor</p>
          <p style={{ fontWeight: 700, fontSize: "var(--font-xl)", color: "var(--brand-primary)", margin: 0 }}>{price}</p>
        </div>
        <div>
          <p style={{ fontSize: "var(--font-xs)", color: "var(--text-muted)", margin: 0 }}>Duração</p>
          <p style={{ fontWeight: 600, fontSize: "var(--font-base)", color: "var(--text-primary)", margin: 0 }}>
            {plan.durationDays !== "—" ? `${plan.durationDays} dias` : "—"}
          </p>
        </div>
      </div>

      <div style={{ display: "flex", gap: 8, marginTop: 4 }}>
        <button className="btn btn-outline btn-sm" style={{ flex: 1 }} onClick={() => onEdit(plan)}>Editar</button>
        <button className="btn btn-ghost btn-sm" style={{ flex: 1, color: "var(--error)" }} onClick={() => onDelete(plan)}>Excluir</button>
      </div>
    </div>
  );
}

function PlanFormModal({ open, onClose, form, onChange, onSubmit, saving, feedback, isEditing }) {
  return (
    <Modal
      open={open}
      onClose={onClose}
      title={isEditing ? "Editar Plano" : "Novo Plano"}
      subtitle={isEditing ? "Atualize as informações do plano" : "Cadastre um novo plano de assinatura"}
      footer={
        <>
          <button className="btn btn-ghost" onClick={onClose} type="button">Cancelar</button>
          <button className="btn btn-primary" onClick={onSubmit} disabled={saving} type="button">
            {saving ? "Salvando..." : isEditing ? "Salvar alterações" : "Cadastrar plano"}
          </button>
        </>
      }
    >
      <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-4)" }}>
        <div className="form-field">
          <label className="label">Nome *</label>
          <input className="input" type="text" placeholder="Ex: Plano Mensal Premium" value={form.name} onChange={(e) => onChange("name", e.target.value)} required />
        </div>
        <div className="form-grid">
          <div className="form-field">
            <label className="label">Tipo *</label>
            <div style={{ display: "flex", gap: 8 }}>
              {[{ value: "MONTHLY", label: "Mensal" }, { value: "DAILY", label: "Diário" }].map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  className={`btn ${form.type === opt.value ? "btn-primary" : "btn-ghost"}`}
                  style={{ flex: 1 }}
                  onClick={() => onChange("type", opt.value)}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>
          <div className="form-field">
            <label className="label">Ativo</label>
            <div style={{ display: "flex", gap: 8 }}>
              {[{ value: "true", label: "Sim" }, { value: "false", label: "Não" }].map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  className={`btn ${form.active === opt.value ? "btn-primary" : "btn-ghost"}`}
                  style={{ flex: 1 }}
                  onClick={() => onChange("active", opt.value)}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>
        </div>
        <div className="form-grid">
          <div className="form-field">
            <label className="label">Valor (R$) *</label>
            <input className="input" type="number" step="0.01" min="0" placeholder="0,00" value={form.price} onChange={(e) => onChange("price", e.target.value)} required />
          </div>
          <div className="form-field">
            <label className="label">Duração (dias) *</label>
            <input className="input" type="number" min="1" placeholder="30" value={form.durationDays} onChange={(e) => onChange("durationDays", e.target.value)} required />
          </div>
        </div>
        {feedback && (
          <p className={feedback.includes("sucesso") ? "feedback-success" : "feedback-error"}>{feedback}</p>
        )}
      </div>
    </Modal>
  );
}

export default function PlansSection({
  data, forms, editing, feedback, saving,
  fmtCurrency, onChangeFormValue, onSubmitForm, onStartEdit, onRemoveItem, onResetForm,
}) {
  const [modalOpen, setModalOpen] = useState(false);

  const handleOpen = (item = null) => {
    if (item) onStartEdit("plans", item);
    else onResetForm("plans");
    setModalOpen(true);
  };

  const handleClose = () => { setModalOpen(false); onResetForm("plans"); };

  const handleSubmit = async () => {
    await onSubmitForm("plans", null, forms.plans);
    if (!feedback.plans?.includes("Falha")) setModalOpen(false);
  };

  return (
    <div className="animate-fade-in">
      <PageHeader
        title="Planos"
        subtitle="Gerencie os planos de assinatura disponíveis"
        breadcrumb={<><span>Cadastros</span><span style={{ opacity: 0.4 }}>›</span><span>Planos</span></>}
        action={
          <button className="btn btn-primary" id="btn-novo-plano" onClick={() => handleOpen()}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
            </svg>
            Novo Plano
          </button>
        }
      />

      {data.plans.length === 0 ? (
        <div className="card card-md" style={{ textAlign: "center", padding: "48px 0" }}>
          <p style={{ color: "var(--text-muted)" }}>Nenhum plano cadastrado</p>
          <button className="btn btn-primary" style={{ marginTop: 12 }} onClick={() => handleOpen()}>Cadastrar primeiro plano</button>
        </div>
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))", gap: 16 }}>
          {data.plans.map((plan) => (
            <PlanCard
              key={plan.id}
              plan={plan}
              fmtCurrency={fmtCurrency}
              onEdit={handleOpen}
              onDelete={(p) => onRemoveItem("plans", p)}
            />
          ))}
        </div>
      )}

      <PlanFormModal
        open={modalOpen}
        onClose={handleClose}
        form={forms.plans}
        onChange={(k, v) => onChangeFormValue("plans", k, v)}
        onSubmit={handleSubmit}
        saving={saving.plans}
        feedback={feedback.plans}
        isEditing={!!editing.plans}
      />
    </div>
  );
}
