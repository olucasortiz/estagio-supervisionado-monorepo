"use client";

import { useState } from "react";
import PageHeader from "../../ui/PageHeader";
import DataTable from "../../ui/DataTable";
import Modal from "../../ui/Modal";
import DashboardCard from "../../ui/DashboardCard";
import StatusBadge from "../../ui/StatusBadge";
import PixPaymentModal from "../../ui/PixPaymentModal";


const METHOD_LABELS = { PIX: "Pix", CASH: "Dinheiro", CARD: "Cartão", Dinheiro: "Dinheiro", Cartão: "Cartão", Pix: "Pix", Boleto: "Boleto" };

function PaymentFormModal({ open, onClose, form, onChange, onSubmit, saving, feedback, isEditing, data }) {
  const isPixMethod = ["Pix", "PIX"].includes(form.method);

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={isEditing ? "Editar Pagamento" : "Registrar Pagamento"}
      subtitle={isEditing ? "Atualize os dados do pagamento" : "Registre um novo pagamento"}
      footer={
        <>
          <button className="btn btn-ghost" onClick={onClose} type="button">Cancelar</button>
          <button className="btn btn-primary" onClick={onSubmit} disabled={saving} type="button">
            {saving ? "Salvando..." : isEditing ? "Salvar" : isPixMethod ? "Registrar com Pix ✨" : "Registrar"}
          </button>
        </>
      }
    >
      <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-4)" }}>
        <div className="form-field">
          <label className="label">Assinatura *</label>
          <select className="select" value={form.subscriptionId} onChange={(e) => onChange("subscriptionId", e.target.value)} required>
            <option value="">Selecione</option>
            {data.subscriptions.map((s) => (
              <option key={s.id} value={s.id}>{s.memberName || "Assinatura"} — {s.planName || "—"}</option>
            ))}
          </select>
        </div>
        <div className="form-grid">
          <div className="form-field">
            <label className="label">Valor (R$) *</label>
            <input className="input" type="number" step="0.01" min="0" value={form.amount} onChange={(e) => onChange("amount", e.target.value)} placeholder="0,00" required />
          </div>
          <div className="form-field">
            <label className="label">Data do pagamento *</label>
            <input className="input" type="date" value={form.paidAt} onChange={(e) => onChange("paidAt", e.target.value)} required />
          </div>
        </div>
        <div className="form-grid">
          <div className="form-field">
            <label className="label">Método *</label>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
              {["Dinheiro", "Cartão", "Pix", "Boleto"].map((m) => (
                <button key={m} type="button" className={`btn btn-sm ${form.method === m ? "btn-primary" : "btn-ghost"}`} onClick={() => onChange("method", m)}>
                  {m}
                </button>
              ))}
            </div>
          </div>
          <div className="form-field">
            <label className="label">Status *</label>
            <select className="select" value={form.status} onChange={(e) => onChange("status", e.target.value)} required>
              <option value="Pago">Pago</option>
              <option value="Pendente">Pendente</option>
              <option value="Atrasado">Atrasado</option>
              <option value="Cancelado">Cancelado</option>
            </select>
          </div>
        </div>
        {feedback && (
          <p className={feedback.includes("sucesso") ? "feedback-success" : "feedback-error"}>{feedback}</p>
        )}
      </div>
    </Modal>
  );
}
export default function PaymentsSection({
  data, forms, editing, feedback, saving,
  fmtDate, fmtCurrency, onChangeFormValue, onSubmitForm, onStartEdit, onRemoveItem, onResetForm, onRefreshData
}) {
  const [modalOpen, setModalOpen] = useState(false);
  const [pixModalSubId, setPixModalSubId] = useState(null);
  const [pixModalAmount, setPixModalAmount] = useState(null);

  const handleOpen = (item = null) => {
    if (item) onStartEdit("payments", item);
    else onResetForm("payments");
    setModalOpen(true);
  };

  const handleClose = () => { setModalOpen(false); onResetForm("payments"); };

  const handleSubmit = async () => {
    const isPixMethod = ["Pix", "PIX"].includes(forms.payments.method);

    if (!editing.payments && isPixMethod) {
      if (!forms.payments.subscriptionId) {
        alert("Por favor, selecione uma assinatura para gerar a cobrança Pix.");
        return;
      }
      setModalOpen(false);
      setPixModalAmount(forms.payments.amount ? Number(forms.payments.amount) : null);
      setPixModalSubId(forms.payments.subscriptionId);
      return;
    }

    await onSubmitForm("payments", null, forms.payments);
    if (!feedback.payments?.includes("Falha")) setModalOpen(false);
  };

  // KPI financeiro
  const totalRecebido = data.payments
    .filter((p) => ["PAID", "Pago"].includes(p.status))
    .reduce((sum, p) => sum + Number(p.amount || 0), 0);

  const totalPendente = data.payments
    .filter((p) => ["PENDING", "Pendente"].includes(p.status))
    .reduce((sum, p) => sum + Number(p.amount || 0), 0);

  const totalAtrasado = data.payments
    .filter((p) => ["OVERDUE", "Atrasado", "LATE"].includes(p.status))
    .reduce((sum, p) => sum + Number(p.amount || 0), 0);

  return (
    <div className="animate-fade-in">
      <PageHeader
        title="Pagamentos"
        subtitle="Controle financeiro dos pagamentos"
        breadcrumb={<><span>Financeiro</span><span style={{ opacity: 0.4 }}>›</span><span>Pagamentos</span></>}
        action={
          <button className="btn btn-primary" id="btn-novo-pagamento" onClick={() => handleOpen()}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
            </svg>
            Registrar Pagamento
          </button>
        }
      />

      {/* KPI cards */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: 16, marginBottom: 20 }}>
        <DashboardCard value={fmtCurrency(totalRecebido)} label="Total recebido" accentColor="#22C55E" icon="💰" />
        <DashboardCard value={fmtCurrency(totalPendente)} label="Pendente" accentColor="#F59E0B" icon="⏳" />
        <DashboardCard value={fmtCurrency(totalAtrasado)} label="Em atraso" accentColor="#EF4444" icon="⚠️" />
        <DashboardCard value={data.payments.length} label="Total de lançamentos" accentColor="#3B82F6" icon="📊" />
      </div>

      <div className="card card-md">
        <DataTable
          data={data.payments}
          keyField="id"
          searchPlaceholder="Buscar por aluno, status ou método..."
          searchFields={["subscriptionLabel", "method", "status"]}
          emptyTitle="Nenhum pagamento registrado"
          columns={[
            { key: "subscriptionLabel", label: "Aluno" },
            { key: "amount", label: "Valor", render: (r) => <strong>{fmtCurrency(r.amount)}</strong> },
            { key: "method", label: "Método", render: (r) => METHOD_LABELS[r.method] || r.method },
            { key: "status", label: "Status", render: (r) => <StatusBadge status={r.status} /> },
            { key: "paidAt", label: "Data", render: (r) => fmtDate(r.paidAt) },
          ]}
          actions={(item) => (
            <>
              {item.subscriptionId && ["PENDING", "Pendente", "OVERDUE", "Atrasado"].includes(item.status) && (
                <button
                  className="btn btn-ghost btn-sm"
                  style={{ color: "#10B981", fontWeight: 700 }}
                  onClick={() => {
                    setPixModalAmount(item.amount ? Number(item.amount) : null);
                    setPixModalSubId(item.subscriptionId);
                  }}
                >
                  ✨ Pix
                </button>
              )}
              <button className="btn btn-ghost btn-sm" onClick={() => handleOpen(item)}>Editar</button>
              <button className="btn btn-ghost btn-sm" style={{ color: "var(--error)" }} onClick={() => onRemoveItem("payments", item)}>Excluir</button>
            </>
          )}
        />
      </div>

      <PaymentFormModal
        open={modalOpen}
        onClose={handleClose}
        form={forms.payments}
        onChange={(k, v) => onChangeFormValue("payments", k, v)}
        onSubmit={handleSubmit}
        saving={saving.payments}
        feedback={feedback.payments}
        isEditing={!!editing.payments}
        data={data}
      />

      <PixPaymentModal
        open={!!pixModalSubId}
        onClose={() => {
          setPixModalSubId(null);
          setPixModalAmount(null);
        }}
        subscriptionId={pixModalSubId}
        amount={pixModalAmount}
        onSuccess={() => {
          if (onRefreshData) onRefreshData();
        }}
      />
    </div>
  );
}


