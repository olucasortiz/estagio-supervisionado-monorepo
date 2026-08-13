"use client";

import { useState } from "react";
import PageHeader from "../../ui/PageHeader";
import DataTable from "../../ui/DataTable";
import Modal from "../../ui/Modal";
import Avatar from "../../ui/Avatar";
import StatusBadge from "../../ui/StatusBadge";

const ROLES = [
  { value: "ADMIN", label: "Administrador", desc: "Acesso total ao sistema", icon: "🔑" },
  { value: "PERSONAL_TRAINER", label: "Personal Trainer", desc: "Gestão de treinos e alunos", icon: "🏋️" },
];

const ROLE_LABELS = { ADMIN: "Administrador", PERSONAL_TRAINER: "Personal Trainer", OPERATIONAL: "Aluno" };

function RoleSelector({ value, onChange }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
      {ROLES.map((role) => (
        <div
          key={role.value}
          className={`role-card ${value === role.value ? "selected" : ""}`}
          onClick={() => onChange("role", role.value)}
          role="button"
          tabIndex={0}
        >
          <div className="role-card-icon">{role.icon}</div>
          <div>
            <p style={{ fontWeight: 600, fontSize: "var(--font-base)", color: "var(--text-primary)", margin: 0 }}>{role.label}</p>
            <p style={{ fontSize: "var(--font-xs)", color: "var(--text-muted)", margin: 0 }}>{role.desc}</p>
          </div>
          {value === role.value && (
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--brand-primary)" strokeWidth="2.5" style={{ marginLeft: "auto", flexShrink: 0 }}>
              <path d="M20 6L9 17l-5-5" />
            </svg>
          )}
        </div>
      ))}
    </div>
  );
}

function UserFormModal({ open, onClose, form, onChange, onSubmit, saving, feedback, isEditing }) {
  return (
    <Modal
      open={open}
      onClose={onClose}
      title={isEditing ? "Editar Usuário" : "Novo Usuário"}
      subtitle={isEditing ? "Atualize as informações do usuário" : "Cadastre um novo usuário no sistema"}
      footer={
        <>
          <button className="btn btn-ghost" onClick={onClose} type="button">Cancelar</button>
          <button className="btn btn-primary" onClick={onSubmit} disabled={saving} type="button">
            {saving ? "Salvando..." : isEditing ? "Salvar" : "Cadastrar"}
          </button>
        </>
      }
    >
      <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-4)" }}>
        <div className="form-field">
          <label className="label">Nome *</label>
          <input className="input" type="text" value={form.name} onChange={(e) => onChange("name", e.target.value)} placeholder="Nome completo" required />
        </div>
        <div className="form-field">
          <label className="label">E-mail *</label>
          <input className="input" type="email" value={form.email} onChange={(e) => onChange("email", e.target.value)} placeholder="usuario@lionfitness.com" required />
        </div>
        <div className="form-field">
          <label className="label">{isEditing ? "Nova senha (opcional)" : "Senha *"}</label>
          <input className="input" type="password" value={form.password} onChange={(e) => onChange("password", e.target.value)} placeholder="••••••••" required={!isEditing} />
        </div>
        <div className="form-field">
          <label className="label">Perfil de acesso *</label>
          <RoleSelector value={form.role} onChange={onChange} />
        </div>
        {feedback && (
          <p className={feedback.includes("sucesso") ? "feedback-success" : "feedback-error"}>{feedback}</p>
        )}
      </div>
    </Modal>
  );
}

export default function UsersSection({
  data, forms, editing, feedback, saving,
  onChangeFormValue, onSubmitForm, onStartEdit, onRemoveItem, onResetForm,
}) {
  const [modalOpen, setModalOpen] = useState(false);

  const handleOpen = (item = null) => {
    if (item) onStartEdit("users", item);
    else onResetForm("users");
    setModalOpen(true);
  };

  const handleClose = () => { setModalOpen(false); onResetForm("users"); };

  const handleSubmit = async () => {
    await onSubmitForm("users", null, forms.users);
    if (!feedback.users?.includes("Falha")) setModalOpen(false);
  };

  return (
    <div className="animate-fade-in">
      <PageHeader
        title="Usuários"
        subtitle="Gerencie os usuários do sistema e seus perfis de acesso"
        breadcrumb={<><span>Cadastros</span><span style={{ opacity: 0.4 }}>›</span><span>Usuários</span></>}
        action={
          <button className="btn btn-primary" id="btn-novo-usuario" onClick={() => handleOpen()}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
            </svg>
            Novo Usuário
          </button>
        }
      />

      <div className="alert alert-warning" style={{ marginBottom: 16 }}>
        <span>⚠️</span>
        <span>Para cadastrar <strong>alunos</strong>, utilize a seção <strong>Alunos</strong> no menu Cadastros.</span>
      </div>

      <div className="card card-md">
        <DataTable
          data={data.users}
          keyField="id"
          searchPlaceholder="Buscar por nome, e-mail ou perfil..."
          searchFields={["name", "email", "role"]}
          emptyTitle="Nenhum usuário cadastrado"
          columns={[
            { key: "photoUrl", label: "Foto", sortable: false, render: (r) => <Avatar name={r.name} photoUrl={r.photoUrl} size="sm" /> },
            { key: "name",  label: "Nome" },
            { key: "email", label: "E-mail" },
            { key: "role",  label: "Perfil", render: (r) => (
              <span className="badge badge-info">{ROLE_LABELS[r.role] || r.role}</span>
            )},
            { key: "active", label: "Status", render: (r) => <StatusBadge status={r.active !== false ? "Ativo" : "Inativo"} /> },
          ]}
          actions={(item) => (
            <>
              <button className="btn btn-ghost btn-sm" onClick={() => handleOpen(item)}>Editar</button>
              <button className="btn btn-ghost btn-sm" style={{ color: "var(--error)" }} onClick={() => onRemoveItem("users", item)}>Excluir</button>
            </>
          )}
        />
      </div>

      <UserFormModal
        open={modalOpen}
        onClose={handleClose}
        form={forms.users}
        onChange={(k, v) => onChangeFormValue("users", k, v)}
        onSubmit={handleSubmit}
        saving={saving.users}
        feedback={feedback.users}
        isEditing={!!editing.users}
      />
    </div>
  );
}
