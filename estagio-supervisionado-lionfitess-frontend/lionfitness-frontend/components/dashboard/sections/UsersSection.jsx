"use client";

import { useState } from "react";
import PageHeader from "../../ui/PageHeader";
import DataTable from "../../ui/DataTable";
import Modal from "../../ui/Modal";
import Avatar from "../../ui/Avatar";
import StatusBadge from "../../ui/StatusBadge";
import { ShieldCheck } from "lucide-react";

function UserFormModal({ open, onClose, form, onChange, onSubmit, saving, feedback, isEditing }) {
  return (
    <Modal
      open={open}
      onClose={onClose}
      title={isEditing ? "Editar Administrador" : "Novo Administrador"}
      subtitle={isEditing ? "Atualize as informações do administrador" : "Cadastre um novo usuário administrador no sistema"}
      footer={
        <>
          <button className="btn btn-ghost" onClick={onClose} type="button">Cancelar</button>
          <button className="btn btn-primary" onClick={onSubmit} disabled={saving} type="button">
            {saving ? "Salvando..." : isEditing ? "Salvar" : "Cadastrar Administrador"}
          </button>
        </>
      }
    >
      <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-4)" }}>
        <div className="form-field">
          <label className="label">Nome *</label>
          <input
            className="input"
            type="text"
            value={form.name}
            onChange={(e) => onChange("name", e.target.value)}
            placeholder="Nome completo"
            required
          />
        </div>
        <div className="form-field">
          <label className="label">E-mail *</label>
          <input
            className="input"
            type="email"
            value={form.email}
            onChange={(e) => onChange("email", e.target.value)}
            placeholder="admin@lionfitness.com"
            required
          />
        </div>
        <div className="form-field">
          <label className="label">{isEditing ? "Nova senha (opcional)" : "Senha *"}</label>
          <input
            className="input"
            type="password"
            value={form.password}
            onChange={(e) => onChange("password", e.target.value)}
            placeholder="••••••••"
            required={!isEditing}
          />
        </div>

        {/* Perfil fixo: ADMINISTRADOR (conforme regra de segurança e UX) */}
        <div className="form-field">
          <label className="label">Perfil de acesso</label>
          <div className="flex items-center gap-2.5 rounded-lg border border-border bg-muted/60 p-3">
            <span className="flex size-7 items-center justify-center rounded-md bg-primary/10 text-primary">
              <ShieldCheck className="size-4" />
            </span>
            <div>
              <p className="text-xs font-semibold text-foreground">Administrador</p>
              <p className="text-[11px] text-muted-foreground">
                Acesso irrestrito a configurações, cadastros, financeiro e relatórios
              </p>
            </div>
          </div>
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
    if (item) {
      onStartEdit("users", item);
    } else {
      onResetForm("users");
      // Garante papel de ADMIN na criação
      onChangeFormValue("users", "role", "ADMIN");
    }
    setModalOpen(true);
  };

  const handleClose = () => {
    setModalOpen(false);
    onResetForm("users");
  };

  const handleSubmit = async () => {
    // Garante role: ADMIN no envio
    const formWithAdmin = { ...forms.users, role: "ADMIN" };
    await onSubmitForm("users", null, formWithAdmin);
    if (!feedback.users?.includes("Falha")) setModalOpen(false);
  };

  // Exibe usuários cadastrados (filtrando preferencialmente administradores se houver distinção)
  const adminUsers = (data.users || []).filter(
    (u) => !u.role || u.role === "ADMIN" || u.role === "Administrador"
  );
  const displayUsers = adminUsers.length > 0 ? adminUsers : data.users;

  return (
    <div className="animate-fade-in space-y-4">
      <PageHeader
        title="Usuários"
        subtitle="Gerencie os usuários administradores do sistema"
        breadcrumb={<><span>Cadastros</span><span style={{ opacity: 0.4 }}>›</span><span>Usuários</span></>}
        action={
          <button className="btn btn-primary" id="btn-novo-usuario" onClick={() => handleOpen()}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
            </svg>
            Novo Administrador
          </button>
        }
      />

      <div className="alert alert-info flex items-center gap-2 text-xs">
        <span>ℹ️</span>
        <span>
          Esta seção é dedicada exclusivamente à gestão de <strong>Administradores</strong>.
          Para cadastrar <strong>Personal Trainers</strong>, acesse o menu <strong>Cadastros → Personal Trainers</strong>.
        </span>
      </div>

      <div className="card card-md">
        <DataTable
          data={displayUsers}
          keyField="id"
          searchPlaceholder="Buscar por nome ou e-mail..."
          searchFields={["name", "email"]}
          emptyTitle="Nenhum administrador cadastrado"
          columns={[
            {
              key: "photoUrl",
              label: "Foto",
              sortable: false,
              render: (r) => <Avatar name={r.name} photoUrl={r.photoUrl} size="sm" />,
            },
            { key: "name",  label: "Nome" },
            { key: "email", label: "E-mail" },
            {
              key: "role",
              label: "Perfil",
              render: () => (
                <span className="inline-flex items-center gap-1 rounded-md bg-primary/10 px-2 py-0.5 text-[11px] font-semibold text-primary">
                  <ShieldCheck className="size-3" />
                  Administrador
                </span>
              ),
            },
            {
              key: "active",
              label: "Status",
              render: (r) => <StatusBadge status={r.active !== false ? "Ativo" : "Inativo"} />,
            },
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
