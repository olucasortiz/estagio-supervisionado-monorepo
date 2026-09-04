"use client";

import { useState } from "react";
import PageHeader from "../../ui/PageHeader";
import DataTable from "../../ui/DataTable";
import StatusBadge from "../../ui/StatusBadge";
import Avatar from "../../ui/Avatar";
import MemberWizardDrawer from "../../ui/MemberWizardDrawer";

const maskCPF = (v) => {
  if (!v) return "—";
  const d = String(v).replace(/\D/g, "");
  return d.length === 11 ? d.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, "$1.$2.$3-$4") : v;
};

export default function MembersSection({
  data, forms, editing, feedback, saving,
  fmtDate, onChangeFormValue, onSubmitForm, onStartEdit, onRemoveItem, onResetForm,
  resolveFields, moduleConfig,
}) {
  const [drawerOpen, setDrawerOpen] = useState(false);

  const handleOpenNew = () => {
    onResetForm("members");
    setDrawerOpen(true);
  };

  const handleOpenEdit = (item) => {
    onStartEdit("members", item);
    setDrawerOpen(true);
  };

  const handleDrawerClose = () => {
    setDrawerOpen(false);
    onResetForm("members");
  };

  const handleSubmit = async (formData) => {
    await onSubmitForm("members", null, formData);
    if (!feedback.members?.includes("Falha")) setDrawerOpen(false);
  };

  return (
    <div className="animate-fade-in">
      <PageHeader
        title="Alunos"
        subtitle="Gerencie os alunos cadastrados no sistema"
        breadcrumb={<><span>Cadastros</span><span style={{ opacity: 0.4 }}>›</span><span>Alunos</span></>}
        action={
          <button className="btn btn-primary" id="btn-novo-aluno" onClick={handleOpenNew}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
            </svg>
            Novo Aluno
          </button>
        }
      />

      <div className="card card-md">
        <DataTable
          data={data.members}
          keyField="id"
          searchPlaceholder="Buscar por nome, CPF ou situação..."
          searchFields={["nome", "name", "cpf", "situacao"]}
          emptyTitle="Nenhum aluno cadastrado"
          emptyDescription='Clique em "Novo Aluno" para começar.'
          columns={[
            { key: "photoUrl", label: "Foto", sortable: false, render: (r) => <Avatar name={r.nome || r.name} photoUrl={r.photoUrl} size="sm" /> },
            { key: "nome",     label: "Nome" },
            { key: "cpf",      label: "CPF", render: (r) => <span style={{ fontFamily: "monospace", fontSize: 12 }}>{maskCPF(r.cpf)}</span> },
            { key: "birthDate", label: "Nascimento", render: (r) => fmtDate(r.birthDate) },
            { key: "dataCadastro", label: "Cadastro", render: (r) => fmtDate(r.dataCadastro) },
            { key: "situacao", label: "Status", render: (r) => <StatusBadge status={r.situacao} /> },
          ]}
          actions={(item) => (
            <>
              <button className="btn btn-ghost btn-sm" onClick={() => handleOpenEdit(item)}>Editar</button>
              <button className="btn btn-ghost btn-sm" style={{ color: "var(--error)" }} onClick={() => onRemoveItem("members", item)}>Excluir</button>
            </>
          )}
        />
      </div>

      <MemberWizardDrawer
        open={drawerOpen}
        onClose={handleDrawerClose}
        onSubmit={handleSubmit}
        saving={saving.members}
        feedback={feedback.members}
        trainers={data.personalTrainers}
        initialForm={editing.members ? moduleConfig.members.toForm(editing.members) : undefined}
        isEditing={!!editing.members}
      />
    </div>
  );
}
