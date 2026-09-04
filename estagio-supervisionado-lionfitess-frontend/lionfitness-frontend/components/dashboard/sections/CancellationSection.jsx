"use client";

import { useState } from "react";
import PageHeader from "../../ui/PageHeader";
import Avatar from "../../ui/Avatar";
import SearchInput from "../../ui/SearchInput";

export default function CancellationSection({
  data, forms, feedback, saving,
  onChangeFormValue, onSubmitCancellation,
}) {
  const [memberSearch, setMemberSearch] = useState("");

  const activeMembersOnly = data.members.filter((m) => m.active !== false && m.situacao === "Ativo");

  const filteredMembers = memberSearch.trim()
    ? activeMembersOnly.filter((m) => {
        const q = memberSearch.toLowerCase();
        return (
          (m.nome || m.name || "").toLowerCase().includes(q) ||
          (m.cpf || "").replace(/\D/g, "").includes(q.replace(/\D/g, ""))
        );
      })
    : activeMembersOnly;

  const selectedMember = data.members.find(
    (m) => String(m.id ?? m.memberId) === String(forms.cancellation.memberId)
  );

  const handleSelectMember = (m) => {
    if (m.active === false || m.situacao !== "Ativo") {
      onChangeFormValue("cancellation", "memberId", "");
      alert("Este aluno já está cancelado/inativo.");
      return;
    }
    onChangeFormValue("cancellation", "memberId", String(m.id ?? m.memberId));
    setMemberSearch(`${m.nome || m.name}`);
  };

  return (
    <div className="animate-fade-in">
      <PageHeader
        title="Cancelamento"
        subtitle="Registre o cancelamento de matrícula de um aluno"
        breadcrumb={<><span>Financeiro</span><span style={{ opacity: 0.4 }}>›</span><span>Cancelamentos</span></>}
      />

      <div className="alert alert-warning" style={{ marginBottom: 20 }}>
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ flexShrink: 0 }}>
          <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/>
          <line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/>
        </svg>
        <div>
          <strong>Atenção:</strong> Esta ação cancela a matrícula do aluno.
          O sistema pode impedir o cancelamento se existirem dívidas pendentes.
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20, alignItems: "start" }}>

        {/* Seleção de aluno */}
        <div className="card card-md">
          <h3 style={{ fontSize: "var(--font-md)", fontWeight: 700, color: "var(--text-primary)", margin: "0 0 12px" }}>
            Selecionar aluno
          </h3>
          <SearchInput
            value={memberSearch}
            onChange={setMemberSearch}
            placeholder="Buscar por nome ou CPF..."
          />
          {memberSearch.trim() && !selectedMember && (
            <div style={{ marginTop: 8, maxHeight: 300, overflowY: "auto", border: "1px solid var(--border-default)", borderRadius: "var(--radius-lg)", background: "var(--bg-card)" }}>
              {filteredMembers.length === 0 ? (
                <p style={{ padding: "12px 16px", color: "var(--text-muted)", fontSize: "var(--font-sm)" }}>
                  Nenhum aluno encontrado
                </p>
              ) : (
                filteredMembers.slice(0, 8).map((m) => (
                  <button
                    key={m.id ?? m.memberId}
                    type="button"
                    onClick={() => handleSelectMember(m)}
                    style={{
                      width: "100%", display: "flex", alignItems: "center", gap: 12,
                      padding: "10px 16px", background: "transparent", border: "none",
                      cursor: "pointer", textAlign: "left", borderBottom: "1px solid var(--border-default)",
                      transition: "background 0.15s",
                    }}
                    onMouseEnter={(e) => { e.currentTarget.style.background = "var(--bg-hover)"; }}
                    onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; }}
                  >
                    <Avatar name={m.nome || m.name} photoUrl={m.photoUrl} size="sm" />
                    <div>
                      <p style={{ margin: 0, fontWeight: 600, fontSize: "var(--font-sm)", color: "var(--text-primary)" }}>{m.nome || m.name}</p>
                      <p style={{ margin: 0, fontSize: "var(--font-xs)", color: "var(--text-muted)" }}>{m.cpf}</p>
                    </div>
                  </button>
                ))
              )}
            </div>
          )}
        </div>

        {/* Formulário de cancelamento */}
        <div className="card card-md">
          <h3 style={{ fontSize: "var(--font-md)", fontWeight: 700, color: "var(--text-primary)", margin: "0 0 16px" }}>
            Dados do cancelamento
          </h3>

          {selectedMember ? (
            <div style={{ display: "flex", alignItems: "center", gap: 12, padding: "12px 16px", background: "var(--brand-primary-bg)", borderRadius: "var(--radius-lg)", marginBottom: 16, border: "1.5px solid var(--brand-primary)" }}>
              <Avatar name={selectedMember.nome || selectedMember.name} photoUrl={selectedMember.photoUrl} size="md" />
              <div>
                <p style={{ fontWeight: 700, color: "var(--text-primary)", margin: 0 }}>{selectedMember.nome || selectedMember.name}</p>
                <p style={{ fontSize: "var(--font-xs)", color: "var(--text-muted)", margin: 0 }}>{selectedMember.cpf} • {selectedMember.plano || "—"}</p>
              </div>
              <button
                type="button"
                className="btn-icon"
                style={{ marginLeft: "auto" }}
                onClick={() => { onChangeFormValue("cancellation", "memberId", ""); setMemberSearch(""); }}
                title="Remover seleção"
              >
                ✕
              </button>
            </div>
          ) : (
            <div style={{ padding: "16px", background: "var(--bg-subtle)", borderRadius: "var(--radius-lg)", textAlign: "center", color: "var(--text-muted)", fontSize: "var(--font-sm)", marginBottom: 16 }}>
              Nenhum aluno selecionado
            </div>
          )}

          <form onSubmit={onSubmitCancellation} style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            <input type="hidden" value={forms.cancellation.memberId} />

            <div className="form-field">
              <label className="label">Motivo do cancelamento</label>
              <textarea
                className="input"
                style={{ height: 100, resize: "vertical", padding: "10px 12px", lineHeight: 1.5 }}
                placeholder="Descreva o motivo do cancelamento (opcional)..."
                value={forms.cancellation.reason}
                onChange={(e) => onChangeFormValue("cancellation", "reason", e.target.value)}
              />
            </div>

            {feedback.cancellation && (
              <p className={feedback.cancellation.includes("sucesso") ? "feedback-success" : "feedback-error"}>
                {feedback.cancellation}
              </p>
            )}

            <button
              type="submit"
              className="btn btn-danger"
              disabled={saving.cancellation || !forms.cancellation.memberId}
              style={{ height: 42 }}
            >
              {saving.cancellation ? "Cancelando..." : "Confirmar cancelamento"}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
