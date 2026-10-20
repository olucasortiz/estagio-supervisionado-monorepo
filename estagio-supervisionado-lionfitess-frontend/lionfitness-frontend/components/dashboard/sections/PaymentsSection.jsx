"use client";

import { useState } from "react";
import PageHeader from "../../ui/PageHeader";
import DataTable from "../../ui/DataTable";
import Modal from "../../ui/Modal";
import FinanceMetrics from "../../admin/FinanceMetrics";
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
      preventClose={!!saving}
      title={isEditing ? "Editar Pagamento" : "Registrar Pagamento"}
      subtitle={isEditing ? "Atualize os dados do pagamento" : "Registre um novo pagamento"}
      footer={
        <>
          <button className="btn btn-ghost" onClick={onClose} disabled={saving} type="button">Cancelar</button>
          <button className="btn btn-primary" onClick={onSubmit} disabled={saving} type="button">
            {saving ? "Salvando..." : isEditing ? "Salvar" : isPixMethod ? "Registrar com Pix" : isCardMethod ? "Pagar com Cartão" : "Registrar"}
          </button>
        </>
      }
    >
      <fieldset disabled={saving} className="gp-registry-fields" aria-busy={!!saving}>
        <div className="form-field">
          <span className="label">Assinatura *</span>
          <Combobox ariaLabel="Assinatura" disabled={saving}
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
              backgroundColor: renewalNotice.blocked ? "var(--error-bg)" : "var(--success-bg)",
              border: "1px solid var(--border)",
              color: renewalNotice.blocked ? "var(--error-text)" : "var(--success-text)",
            }}
          >
            {renewalNotice.blocked ? "⚠️ " : "✅ "}
            {renewalNotice.message}
          </div>
        )}
        <div className="form-grid">
          <div className="form-field">
            <label className="label" htmlFor="payments-amount">Valor (R$) *</label>
            <input id="payments-amount" className="input" type="number" step="0.01" min="0" value={form.amount} onChange={(e) => onChange("amount", e.target.value)} placeholder="0,00" required />
          </div>
          <div className="form-field">
            <label className="label" htmlFor="payments-paidAt">Data do pagamento *</label>
            <input id="payments-paidAt" className="input" type="date" value={form.paidAt} onChange={(e) => onChange("paidAt", e.target.value)} required />
          </div>
        </div>
        <div className="form-grid">
          <div className="form-field">
            <span id="payment-method-label" className="label">Método *</span>
            <div role="group" aria-labelledby="payment-method-label" style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
              {["Dinheiro", "Cartão", "Pix", "Boleto"].map((m) => (
                <button key={m} aria-pressed={form.method === m} type="button" className={`btn btn-sm ${form.method === m ? "btn-primary" : "btn-ghost"}`} onClick={() => onChange("method", m)}>
                  {m}
                </button>
              ))}
            </div>
          </div>
          <div className="form-field">
            <label className="label" htmlFor="payments-status">Status *</label>
            <select id="payments-status" className="select" value={form.status} onChange={(e) => onChange("status", e.target.value)} required>
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
          <p role="status" className={feedback.includes("sucesso") ? "feedback-success" : "feedback-error"}>{feedback}</p>
        )}
      </fieldset>
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
    if (saving?.payments) return;
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

    const saved = await onSubmitForm("payments", null, forms.payments);
    if (saved) setModalOpen(false);
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
    <div className="gp-registry gp-finance">
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

      {!modalOpen && feedback.payments && !feedback.payments.includes("sucesso") && <p className="gp-registry-notice" role="status">{feedback.payments}</p>}
      {/* Indicadores da base consultada */}
      <FinanceMetrics items={[
        {label:"Total recebido",value:fmtCurrency(totalRecebido)}, {label:"Pendente",value:fmtCurrency(totalPendente)},
        {label:"Em atraso",value:fmtCurrency(totalAtrasado)}, {label:"Total de lançamentos",value:data.payments.length},
      ]} />

      <div className="card gp-registry-panel">
        <div className="gp-registry-panel-heading"><h2>Histórico de pagamentos</h2><p>Consulte valores, métodos e situação dos lançamentos.</p></div>
        <DataTable
          data={data.payments}
          keyField="id"
          caption="Histórico de pagamentos"
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
                    style={{ color: "var(--success-text)", fontWeight: 600 }}
                    onClick={() => {
                      setPixModalAmount(item.amount ? Number(item.amount) : null);
                      setPixModalSubId(item.subscriptionId);
                      resolvePixContext(item.subscriptionId);
                    }}
                  >
                    Pix
                  </button>
                  <button
                    className="btn btn-ghost btn-sm"
                    style={{ color: "var(--info-text)", fontWeight: 600 }}
                    onClick={() => {
                      setCardModalSubId(item.subscriptionId);
                      resolveCardContext(item.subscriptionId);
                    }}
                  >
                    Cartão
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

