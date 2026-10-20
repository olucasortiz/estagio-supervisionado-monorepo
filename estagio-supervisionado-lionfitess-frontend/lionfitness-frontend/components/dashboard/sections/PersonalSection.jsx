"use client";

import { useState } from "react";
import RegistrySummary from "../../admin/RegistrySummary";
import PageHeader from "../../ui/PageHeader";
import DataTable from "../../ui/DataTable";
import Modal from "../../ui/Modal";
import Avatar from "../../ui/Avatar";
import StatusBadge from "../../ui/StatusBadge";

const maskCPF   = (v) => { if (!v) return "—"; const d = String(v).replace(/\D/g, ""); return d.length === 11 ? d.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, "$1.$2.$3-$4") : v; };
const maskPhone = (v) => { if (!v) return "—"; const d = String(v).replace(/\D/g, ""); return d.length === 11 ? d.replace(/(\d{2})(\d{5})(\d{4})/, "($1) $2-$3") : d.length === 10 ? d.replace(/(\d{2})(\d{4})(\d{4})/, "($1) $2-$3") : v; };

function PTFormModal({ open, onClose, form, onChange, onSubmit, saving, feedback, isEditing }) {
  return (
    <Modal
      open={open}
      onClose={onClose}
      preventClose={!!saving}
      title={isEditing ? "Editar Personal Trainer" : "Novo Personal Trainer"}
      subtitle={isEditing ? "Atualize as informações" : "Cadastre um novo personal trainer"}
      footer={
        <>
          <button className="btn btn-ghost" onClick={onClose} disabled={saving} type="button">Cancelar</button>
          <button className="btn btn-primary" disabled={saving} type="submit" form="trainer-form">
            {saving ? "Salvando..." : isEditing ? "Salvar" : "Cadastrar"}
          </button>
        </>
      }
    >
      <form id="trainer-form" className="gp-registry-form" onSubmit={(event) => { event.preventDefault(); onSubmit(); }} aria-busy={!!saving}>
        <fieldset disabled={saving} className="gp-registry-fields">
        <div className="form-field">
          <label className="label" htmlFor="trainer-name">Nome *</label>
          <input id="trainer-name" className="input" type="text" value={form.name} onChange={(e) => onChange("name", e.target.value)} placeholder="Nome completo" required />
        </div>
        <div className="form-grid">
          <div className="form-field">
            <label className="label" htmlFor="trainer-cpf">CPF *</label>
          <input id="trainer-cpf" className="input" type="text" value={form.cpf} onChange={(e) => onChange("cpf", e.target.value)} placeholder="000.000.000-00" maxLength={14} required />
          </div>
          <div className="form-field">
            <label className="label" htmlFor="trainer-phone">Telefone</label>
          <input id="trainer-phone" className="input" type="text" value={form.phone} onChange={(e) => onChange("phone", e.target.value)} placeholder="(00) 00000-0000" maxLength={15} />
          </div>
        </div>
        <div className="form-field">
          <label className="label" htmlFor="trainer-email">E-mail *</label>
          <input id="trainer-email" className="input" type="email" value={form.email} onChange={(e) => onChange("email", e.target.value)} placeholder="personal@lionfitness.com" required />
        </div>
        <div className="form-field">
          <label className="label" htmlFor="trainer-specialty">Especialidade *</label>
          <input id="trainer-specialty" className="input" type="text" value={form.specialty} onChange={(e) => onChange("specialty", e.target.value)} placeholder="Ex: Musculação, Funcional..." required />
        </div>
        {feedback && (
          <p role="status" className={feedback.includes("sucesso") ? "feedback-success" : "feedback-error"}>{feedback}</p>
        )}
        </fieldset>
      </form>
    </Modal>
  );
}

export default function PersonalSection({
  data, forms, editing, feedback, saving,
  onChangeFormValue, onSubmitForm, onStartEdit, onRemoveItem, onResetForm,
}) {
  const [modalOpen, setModalOpen] = useState(false);

  const handleOpen = (item = null) => {
    if (item) onStartEdit("personalTrainers", item);
    else onResetForm("personalTrainers");
    setModalOpen(true);
  };

  const handleClose = () => { setModalOpen(false); onResetForm("personalTrainers"); };

  const handleSubmit = async () => {
    if (saving?.personalTrainers) return;
    const saved = await onSubmitForm("personalTrainers", null, forms.personalTrainers);
    if (saved) setModalOpen(false);
  };

  return (
    <div className="gp-registry">
      <PageHeader
        title="Personal Trainers"
        subtitle="Gerencie os personal trainers da academia"
        breadcrumb={<><span>Cadastros</span><span style={{ opacity: 0.4 }}>›</span><span>Personal Trainers</span></>}
        action={
          <button className="btn btn-primary" id="btn-novo-pt" onClick={() => handleOpen()}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
            </svg>
            Novo Personal Trainer
          </button>
        }
      />

      <RegistrySummary items={data.personalTrainers} label="personal trainers" />
      {!modalOpen && feedback.personalTrainers && !feedback.personalTrainers.includes("sucesso") && <p role="status" className="gp-registry-notice">{feedback.personalTrainers}</p>}
      <div className="card gp-registry-panel">
        <div className="gp-registry-panel-heading"><h2>Equipe de personal trainers</h2><p>Consulte os cadastros e mantenha as informações atualizadas.</p></div>
        <DataTable
          data={data.personalTrainers}
          keyField="id"
          caption="Personal trainers cadastrados"
          searchPlaceholder="Buscar por nome, especialidade ou e-mail..."
          searchFields={["name", "specialty", "email", "cpf"]}
          emptyTitle="Nenhum personal trainer cadastrado"
          columns={[
            { key: "name", label: "Personal trainer", sortValue: (r) => r.name, render: (r) => <div className="gp-registry-person"><Avatar name={r.name} photoUrl={r.photoUrl} size="md" /><strong>{r.name}</strong></div> },
            { key: "cpf",       label: "CPF",      render: (r) => <span style={{ fontFamily: "monospace", fontSize: 12 }}>{maskCPF(r.cpf)}</span> },
            { key: "phone",     label: "Telefone", render: (r) => maskPhone(r.phone) },
            { key: "specialty", label: "Especialidade" },
            { key: "active",    label: "Status", render: (r) => <StatusBadge status={r.active !== false ? "Ativo" : "Inativo"} /> },
          ]}
          actions={(item) => (
            <>
              <button className="btn btn-ghost btn-sm" onClick={() => handleOpen(item)}>Editar</button>
              <button className="btn btn-ghost btn-sm" style={{ color: "var(--error)" }} onClick={() => onRemoveItem("personalTrainers", item)}>Excluir</button>
            </>
          )}
        />
      </div>

      <PTFormModal
        open={modalOpen}
        onClose={handleClose}
        form={forms.personalTrainers}
        onChange={(k, v) => onChangeFormValue("personalTrainers", k, v)}
        onSubmit={handleSubmit}
        saving={saving.personalTrainers}
        feedback={feedback.personalTrainers}
        isEditing={!!editing.personalTrainers}
      />
    </div>
  );
}
