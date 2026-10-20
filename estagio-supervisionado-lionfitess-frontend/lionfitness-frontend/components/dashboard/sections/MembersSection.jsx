"use client";

import { useRef, useState } from "react";
import { AlertCircle, CheckCircle2, Pencil, Plus, UserMinus, Users } from "lucide-react";
import PageHeader from "../../ui/PageHeader";
import DataTable from "../../ui/DataTable";
import StatusBadge from "../../ui/StatusBadge";
import Avatar from "../../ui/Avatar";
import MemberWizardDrawer from "../../ui/MemberWizardDrawer";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "../../ui/dialog";

const maskCPF = (v) => {
  if (!v) return "—";
  const d = String(v).replace(/\D/g, "");
  return d.length === 11 ? d.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, "$1.$2.$3-$4") : v;
};

export default function MembersSection({
  data, editing, feedback, saving,
  fmtDate, onSubmitForm, onStartEdit, onRemoveItem, onResetForm,
  moduleConfig,
}) {
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [statusFilter, setStatusFilter] = useState("all");
  const [pendingRemoval, setPendingRemoval] = useState(null);
  const [removing, setRemoving] = useState(false);
  const [removalError, setRemovalError] = useState("");
  const removingRef = useRef(false);
  const members = Array.isArray(data.allMembers) && data.allMembers.length ? data.allMembers : Array.isArray(data.members) ? data.members : [];
  const isActive = (member) => member.situacao === "Ativo" || member.situacao === "ACTIVE";
  const isInactive = (member) => member.situacao === "Inativo" || member.situacao === "INACTIVE";
  const visibleMembers = members.filter((member) => statusFilter === "all" || (statusFilter === "active" ? isActive(member) : isInactive(member)));

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
    if (saving?.members) return;
    const saved = await onSubmitForm("members", null, formData);
    if (saved) setDrawerOpen(false);
  };

  const confirmRemoval = async () => {
    if (!pendingRemoval || removingRef.current) return;
    removingRef.current = true;
    setRemoving(true);
    setRemovalError("");
    try {
      const removed = await onRemoveItem("members", pendingRemoval, true);
      if (removed) setPendingRemoval(null);
      else setRemovalError("Não foi possível inativar o aluno. Tente novamente.");
    } finally {
      removingRef.current = false;
      setRemoving(false);
    }
  };

  return (
    <div>
      <PageHeader
        title="Alunos"
        subtitle="Cadastros, informações pessoais e acompanhamento dos alunos."
        breadcrumb={<><span>Cadastros</span><span style={{ opacity: 0.4 }}>›</span><span>Alunos</span></>}
        action={
          <button className="btn btn-primary" id="btn-novo-aluno" onClick={handleOpenNew}>
            <Plus size={18} aria-hidden="true" />
            Novo aluno
          </button>
        }
      />

      <dl className="gp-members-summary" aria-label="Resumo dos alunos carregados">
        <div><dt><Users size={16} aria-hidden="true" />Na listagem</dt><dd>{members.length}</dd></div>
        <div><dt><CheckCircle2 size={16} aria-hidden="true" />Ativos</dt><dd>{members.filter(isActive).length}</dd></div>
        <div><dt><UserMinus size={16} aria-hidden="true" />Inativos</dt><dd>{members.filter(isInactive).length}</dd></div>
      </dl>
      {!drawerOpen && feedback.members && !feedback.members.includes("sucesso") && <div role="status" className={`gp-member-notice ${feedback.members.includes("sucesso") ? "feedback-success" : "feedback-warning"}`}><AlertCircle size={18} aria-hidden="true" /><span>{feedback.members}</span></div>}
      <section className="card gp-members-panel" aria-labelledby="members-list-heading">
        <div className="gp-members-panel-heading"><h2 id="members-list-heading">Lista de alunos</h2><p>Busque um cadastro ou filtre pela situação.</p></div>
        <DataTable
          data={visibleMembers}
          caption="Alunos cadastrados na academia"
          keyField="id"
          searchPlaceholder="Buscar nome ou CPF…"
          searchFields={["nome", "name", "cpf", "situacao"]}
          emptyTitle={members.length ? "Nenhum aluno nesta situação" : "Nenhum aluno cadastrado"}
          emptyDescription={members.length ? "Selecione outra situação para consultar os cadastros." : 'Clique em “Novo aluno” para começar.'}
          headerRight={<label className="gp-status-filter"><span>Situação</span><select className="select" aria-label="Filtrar alunos por situação" value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)}><option value="all">Todos</option><option value="active">Ativos</option><option value="inactive">Inativos</option></select></label>}
          columns={[
            { key: "nome", label: "Aluno", sortValue: (r) => r.nome || r.name, render: (r) => <div className="gp-member-name"><Avatar name={r.nome || r.name} photoUrl={r.photoUrl} size="sm" /><strong>{r.nome || r.name || "Sem nome"}</strong></div> },
            { key: "cpf", label: "CPF", render: (r) => maskCPF(r.cpf) },
            { key: "birthDate", label: "Nascimento", render: (r) => fmtDate(r.birthDate) },
            { key: "dataCadastro", label: "Cadastro", render: (r) => fmtDate(r.dataCadastro) },
            { key: "situacao", label: "Status", render: (r) => <StatusBadge status={r.situacao} /> },
          ]}
          actions={(item) => (
            <>
              <button className="btn btn-ghost btn-sm gp-member-action" aria-label={`Editar ${item.nome || item.name}`} onClick={() => handleOpenEdit(item)}><Pencil size={14} aria-hidden="true" />Editar</button>
              <button className="btn btn-ghost btn-sm gp-member-action gp-member-inactivate" disabled={isInactive(item)} aria-label={`Inativar ${item.nome || item.name}`} onClick={() => { setRemovalError(""); setPendingRemoval(item); }}><UserMinus size={14} aria-hidden="true" />Inativar</button>
            </>
          )}
        />
      </section>

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
      <Dialog open={!!pendingRemoval} onOpenChange={(open) => { if (!open && !removingRef.current) setPendingRemoval(null); }}>
        <DialogContent className="graphite-admin" preventClose={removing}>
          <DialogHeader><DialogTitle>Inativar aluno?</DialogTitle><DialogDescription>Confirme a inativação de {pendingRemoval?.nome || pendingRemoval?.name}. Essa ação altera a situação do cadastro.</DialogDescription></DialogHeader>
          {removalError && <p role="alert" className="feedback-error">{removalError}</p>}
          <DialogFooter><button type="button" className="btn btn-ghost" disabled={removing} onClick={() => setPendingRemoval(null)}>Manter aluno ativo</button><button type="button" className="btn btn-danger" disabled={removing} onClick={confirmRemoval}>{removing ? "Inativando…" : "Confirmar inativação"}</button></DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
