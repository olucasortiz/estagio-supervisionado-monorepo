"use client";

import { useState } from "react";
import PageHeader from "../../ui/PageHeader";
import DataTable from "../../ui/DataTable";
import Modal from "../../ui/Modal";
import DashboardCard from "../../ui/DashboardCard";
import StatusBadge from "../../ui/StatusBadge";
import PixPaymentModal from "../../ui/PixPaymentModal";
import CardPaymentModal from "../../ui/CardPaymentModal";
import Combobox from "../../ui/Combobox";


const METHOD_LABELS = { PIX: "Pix", CASH: "Dinheiro", CARD: "Cartão", Dinheiro: "Dinheiro", Cartão: "Cartão", Pix: "Pix", Boleto: "Boleto" };

function PaymentFormModal({ open, onClose, form, onChange, onSubmit, saving, feedback, error, isEditing, data }) {
  const isPixMethod = ["Pix", "PIX"].includes(form.method);
  const isCardMethod = ["Cartão", "CARD"].includes(form.method);

  const selectedSub = (data.subscriptions || []).find((s) => String(s.id) === String(form.subscriptionId));
  let renewalNotice = null;
  if (selectedSub?.endDate) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const end = new Date(selectedSub.endDate);
    end.setHours(0, 0, 0, 0);
    const diffDays = Math.ceil((end.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
    if (diffDays > 5) {
      const avail = new Date(end);
      avail.setDate(avail.getDate() - 5);
      renewalNotice = {
        blocked: true,
        message: `Plano ativo até ${end.toLocaleDateString("pt-BR")} (${diffDays} dias restantes). Renovação permitida somente a partir de ${avail.toLocaleDateString("pt-BR")}.`,
      };
    } else if (diffDays >= 0) {
      renewalNotice = {
        blocked: false,
        message: `Plano vence em ${diffDays} ${diffDays === 1 ? "dia" : "dias"}. Renovação liberada sem perda dos dias restantes.`,
      };
    } else {
      renewalNotice = {
        blocked: false,
        message: "Assinatura vencida. Renovação liberada.",
      };
    }
  }

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
            {saving ? "Salvando..." : isEditing ? "Salvar" : isPixMethod ? "Registrar com Pix ✨" : isCardMethod ? "Pagar com Cartão 💳" : "Registrar"}
          </button>
        </>
      }
    >
      <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-4)" }}>
        <div className="form-field">
          <label className="label">Assinatura *</label>
          <Combobox
            items={data.subscriptions}
            value={form.subscriptionId}
            onChange={(id) => onChange("subscriptionId", id)}
            getId={(s) => String(s.id ?? "")}
            getLabel={(s) => s.memberName || "Assinatura"}
            getSubLabel={(s) => {
              const parts = [
                s.planName ? `📋 ${s.planName}` : null,
                s.status ? `· ${s.status}` : null,
              ].filter(Boolean);
              return parts.length > 0 ? parts.join("  ") : null;
            }}
            placeholder="Buscar por aluno ou plano..."
            required
            emptyMessage="Nenhuma assinatura encontrada."
          />
        </div>
        {renewalNotice && (
          <div
            style={{
              padding: "8px 12px",
              borderRadius: "6px",
              fontSize: "12px",
              lineHeight: 1.4,
              backgroundColor: renewalNotice.blocked ? "rgba(239, 68, 68, 0.1)" : "rgba(16, 185, 129, 0.1)",
              border: `1px solid ${renewalNotice.blocked ? "rgba(239, 68, 68, 0.3)" : "rgba(16, 185, 129, 0.3)"}`,
              color: renewalNotice.blocked ? "#ef4444" : "#10b981",
            }}
          >
            {renewalNotice.blocked ? "⚠️ " : "✅ "}
            {renewalNotice.message}
          </div>
        )}
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
        {error && (
          <p className="feedback-error" role="alert">{error}</p>
        )}
        {feedback && (
          <p className={feedback.includes("sucesso") ? "feedback-success" : "feedback-error"}>{feedback}</p>
        )}
      </div>
    </Modal>
  );
}

export default function PaymentsSection({
  data,
  forms,
  onChangeFormValue,
  onResetForm,
  onSubmitForm,
  onRemoveItem,
  onStartEdit,
  editing,
  saving,
  feedback,
  onRefreshData,
  fmtDate,
  fmtCurrency,
}) {
  const [modalOpen, setModalOpen] = useState(false);
  const [formError, setFormError] = useState("");
  const [pixModalSubId, setPixModalSubId] = useState(null);
  const [pixModalAmount, setPixModalAmount] = useState(null);
  const [pixModalMemberName, setPixModalMemberName] = useState(null);
  const [pixModalPlanName, setPixModalPlanName] = useState(null);

  const [cardModalSubId, setCardModalSubId] = useState(null);
  const [cardModalAmount, setCardModalAmount] = useState(null);
  const [cardModalMemberName, setCardModalMemberName] = useState(null);
  const [cardModalPlanName, setCardModalPlanName] = useState(null);

  const resolvePixContext = (subscriptionId) => {
    const sub = data.subscriptions.find((s) => s.id === subscriptionId);
    const plan = data.plans.find((p) => p.id === sub?.planId);
    setPixModalMemberName(sub?.memberName || null);
    setPixModalPlanName(sub?.planName || null);
    setPixModalAmount(plan?.price != null ? Number(plan.price) : null);
  };

  const resolveCardContext = (subscriptionId) => {
    const sub = data.subscriptions.find((s) => s.id === subscriptionId);
    const plan = data.plans.find((p) => p.id === sub?.planId);
    setCardModalMemberName(sub?.memberName || null);
    setCardModalPlanName(sub?.planName || null);
    setCardModalAmount(plan?.price != null ? Number(plan.price) : null);
  };

  const handleOpen = (item = null) => {
    setFormError("");
    if (item) onStartEdit("payments", item);
    else onResetForm("payments");
    setModalOpen(true);
  };

  const handleClose = () => {
    setFormError("");
    setModalOpen(false);
    onResetForm("payments");
  };

  const handleSubmit = async () => {
    setFormError("");
    const isPixMethod = ["Pix", "PIX"].includes(forms.payments.method);
    const isCardMethod = ["Cartão", "CARD"].includes(forms.payments.method);

    if (!forms.payments.subscriptionId) {
      setFormError("Por favor, selecione uma assinatura para continuar.");
      return;
    }

    const selectedSub = (data.subscriptions || []).find((s) => String(s.id) === String(forms.payments.subscriptionId));
    if (selectedSub?.endDate) {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const end = new Date(selectedSub.endDate);
      end.setHours(0, 0, 0, 0);
      const diffDays = Math.ceil((end.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
      const isPaidRenewal = ["PAID", "Pago"].includes(forms.payments.status) || isPixMethod || isCardMethod;
      if (diffDays > 5 && isPaidRenewal) {
        const avail = new Date(end);
        avail.setDate(avail.getDate() - 5);
        setFormError(`Renovação antecipada bloqueada: faltam ${diffDays} dias para o vencimento. Disponível a partir de ${avail.toLocaleDateString("pt-BR")}.`);
        return;
      }
    }

    if (!editing.payments && isPixMethod) {
      setModalOpen(false);
      setPixModalAmount(forms.payments.amount ? Number(forms.payments.amount) : null);
      setPixModalSubId(forms.payments.subscriptionId);
      resolvePixContext(forms.payments.subscriptionId);
      return;
    }

    if (!editing.payments && isCardMethod) {
      setModalOpen(false);
      setCardModalSubId(forms.payments.subscriptionId);
      resolveCardContext(forms.payments.subscriptionId);
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
                <>
                  <button
                    className="btn btn-ghost btn-sm"
                    style={{ color: "#10B981", fontWeight: 700 }}
                    onClick={() => {
                      setPixModalAmount(item.amount ? Number(item.amount) : null);
                      setPixModalSubId(item.subscriptionId);
                      resolvePixContext(item.subscriptionId);
                    }}
                  >
                    ✨ Pix
                  </button>
                  <button
                    className="btn btn-ghost btn-sm"
                    style={{ color: "#3B82F6", fontWeight: 700 }}
                    onClick={() => {
                      setCardModalSubId(item.subscriptionId);
                      resolveCardContext(item.subscriptionId);
                    }}
                  >
                    💳 Cartão
                  </button>
                </>
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
        error={formError}
        isEditing={!!editing.payments}
        data={data}
      />

      <PixPaymentModal
        open={!!pixModalSubId}
        onClose={() => {
          setPixModalSubId(null);
          setPixModalAmount(null);
          setPixModalMemberName(null);
          setPixModalPlanName(null);
        }}
        subscriptionId={pixModalSubId}
        amount={pixModalAmount}
        isAdmin={true}
        memberName={pixModalMemberName}
        planName={pixModalPlanName}
        onSuccess={() => {
          if (onRefreshData) onRefreshData();
        }}
      />

      <CardPaymentModal
        open={!!cardModalSubId}
        onClose={() => {
          setCardModalSubId(null);
          setCardModalAmount(null);
          setCardModalMemberName(null);
          setCardModalPlanName(null);
        }}
        subscriptionId={cardModalSubId}
        amount={cardModalAmount}
        isAdmin={true}
        memberName={cardModalMemberName}
        planName={cardModalPlanName}
        onSuccess={() => {
          if (onRefreshData) onRefreshData();
        }}
      />
    </div>
  );
}

