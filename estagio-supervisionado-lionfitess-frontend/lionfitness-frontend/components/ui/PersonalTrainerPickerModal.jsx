"use client";

import { useMemo, useState } from "react";
import Modal from "./Modal";
import Avatar from "./Avatar";

export default function PersonalTrainerPickerModal({ open, onClose, onSelect, trainers = [], selectedId }) {
  const [search, setSearch] = useState("");

  const filtered = useMemo(() => {
    const q = search.toLowerCase().trim();
    if (!q) return trainers;
    return trainers.filter((pt) =>
      (pt.name || "").toLowerCase().includes(q) ||
      (pt.specialty || "").toLowerCase().includes(q) ||
      (pt.email || "").toLowerCase().includes(q)
    );
  }, [trainers, search]);

  const handleSelect = (pt) => {
    onSelect(pt);
    onClose();
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Selecionar Personal Trainer"
      subtitle="Escolha o personal trainer para vincular ao aluno"
      size="md"
    >
      {/* Search */}
      <div style={{ marginBottom: "var(--space-4)" }}>
        <div style={{ position: "relative" }}>
          <span style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", color: "var(--text-muted)" }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <circle cx="11" cy="11" r="8" /><path d="M21 21l-4.35-4.35" />
            </svg>
          </span>
          <input
            type="text"
            className="input"
            placeholder="Buscar por nome, especialidade..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{ paddingLeft: 38 }}
            autoFocus
          />
        </div>
      </div>

      {/* Opção: sem vinculação */}
      <button
        type="button"
        onClick={() => { onSelect(null); onClose(); }}
        style={{
          width: "100%", padding: "var(--space-3) var(--space-4)",
          background: "var(--bg-subtle)", border: "1.5px dashed var(--border-default)",
          borderRadius: "var(--radius-lg)", cursor: "pointer",
          display: "flex", alignItems: "center", gap: "var(--space-3)",
          fontSize: "var(--font-sm)", color: "var(--text-muted)",
          marginBottom: "var(--space-3)", fontWeight: 500,
          transition: "all var(--transition-fast)",
        }}
        onMouseEnter={(e) => { e.currentTarget.style.borderColor = "var(--brand-primary)"; e.currentTarget.style.color = "var(--brand-primary)"; }}
        onMouseLeave={(e) => { e.currentTarget.style.borderColor = "var(--border-default)"; e.currentTarget.style.color = "var(--text-muted)"; }}
      >
        <span style={{ fontSize: 18 }}>➖</span>
        Sem personal trainer vinculado
      </button>

      {/* Lista */}
      <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-2)", maxHeight: 380, overflowY: "auto" }}>
        {filtered.length === 0 ? (
          <p style={{ textAlign: "center", color: "var(--text-muted)", padding: "var(--space-8) 0", fontSize: "var(--font-sm)" }}>
            {search ? `Nenhum personal trainer encontrado para "${search}"` : "Nenhum personal trainer cadastrado"}
          </p>
        ) : (
          filtered.map((pt) => {
            const isSelected = String(pt.id) === String(selectedId);
            return (
              <button
                key={pt.id}
                type="button"
                onClick={() => handleSelect(pt)}
                style={{
                  width: "100%", display: "flex", alignItems: "center", gap: "var(--space-4)",
                  padding: "var(--space-3) var(--space-4)",
                  background: isSelected ? "var(--brand-primary-bg)" : "var(--bg-card)",
                  border: `1.5px solid ${isSelected ? "var(--brand-primary)" : "var(--border-default)"}`,
                  borderRadius: "var(--radius-lg)", cursor: "pointer",
                  transition: "all var(--transition-fast)", textAlign: "left",
                }}
                onMouseEnter={(e) => { if (!isSelected) { e.currentTarget.style.borderColor = "var(--border-strong)"; e.currentTarget.style.background = "var(--bg-hover)"; } }}
                onMouseLeave={(e) => { if (!isSelected) { e.currentTarget.style.borderColor = "var(--border-default)"; e.currentTarget.style.background = "var(--bg-card)"; } }}
              >
                <Avatar name={pt.name} photoUrl={pt.photoUrl} size="md" />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={{ fontWeight: 600, fontSize: "var(--font-base)", color: "var(--text-primary)", margin: 0, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                    {pt.name}
                  </p>
                  {pt.specialty && pt.specialty !== "-" && (
                    <p style={{ fontSize: "var(--font-xs)", color: "var(--text-muted)", margin: 0, marginTop: 2 }}>
                      {pt.specialty}
                    </p>
                  )}
                  {pt.phone && pt.phone !== "-" && (
                    <p style={{ fontSize: "var(--font-xs)", color: "var(--text-muted)", margin: 0 }}>
                      {pt.phone}
                    </p>
                  )}
                </div>
                {isSelected && (
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--brand-primary)" strokeWidth="2.5">
                    <path d="M20 6L9 17l-5-5" />
                  </svg>
                )}
              </button>
            );
          })
        )}
      </div>
    </Modal>
  );
}
