"use client";

import { useEffect, useRef, useState } from "react";
import Drawer from "./Drawer";
import PersonalTrainerPickerModal from "./PersonalTrainerPickerModal";
import Avatar from "./Avatar";

const STEPS = [
  { id: 1, label: "Dados Pessoais" },
  { id: 2, label: "Conta" },
  { id: 3, label: "Foto" },
  { id: 4, label: "Personal" },
];

function Step({ number, label, active, done }) {
  return (
    <div className={`step-item ${active ? "active" : ""} ${done ? "done" : ""}`}>
      <div className="step-circle">
        {done ? (
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
            <path d="M20 6L9 17l-5-5" />
          </svg>
        ) : number}
      </div>
      <span className="step-label">{label}</span>
    </div>
  );
}

const maskCPF = (v) =>
  v.replace(/\D/g, "").replace(/(\d{3})(\d)/, "$1.$2").replace(/(\d{3})(\d)/, "$1.$2").replace(/(\d{3})(\d{1,2})/, "$1-$2").replace(/(-\d{2})\d+?$/, "$1");

const maskPhone = (v) =>
  v.replace(/\D/g, "").replace(/(\d{2})(\d)/, "($1) $2").replace(/(\d{5})(\d)/, "$1-$2").replace(/(-\d{4})\d+?$/, "$1");

export default function MemberWizardDrawer({
  open,
  onClose,
  onSubmit,
  saving,
  feedback,
  trainers = [],
  initialForm = {},
  isEditing = false,
}) {
  const [step, setStep] = useState(1);
  const [ptPickerOpen, setPtPickerOpen] = useState(false);
  const [form, setForm] = useState(() => ({
    name: "", email: "", password: "", cpf: "", birthDate: "",
    photoUrl: "", photo: null, personalTrainerId: "", ...initialForm,
  }));
  const [photoPreview, setPhotoPreview] = useState(initialForm.photoUrl || "");
  const [dateError, setDateError] = useState("");
  const fileInputRef = useRef(null);

  useEffect(() => {
    if (open) {
      setStep(1);
      setDateError("");
      const resolvedForm = {
        name: "",
        email: "",
        password: "",
        cpf: "",
        birthDate: "",
        photoUrl: "",
        photo: null,
        personalTrainerId: "",
        ...initialForm,
      };
      setForm(resolvedForm);
      setPhotoPreview(resolvedForm.photoUrl || "");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const set = (key, value) => setForm((f) => ({ ...f, [key]: value }));

  const validateBirthDate = (dateStr) => {
    if (!dateStr) return "Data de nascimento é obrigatória.";
    const parts = dateStr.split("-");
    if (parts.length !== 3) return "Informe uma data de nascimento válida.";
    const [y, m, d] = parts;
    const year = Number(y);
    const month = Number(m);
    const day = Number(d);
    
    if (y.length > 4 || year > 9999) return "Informe uma data de nascimento válida.";
    if (year < 1900) return "Informe uma data de nascimento válida.";
    
    const parsedDate = new Date(year, month - 1, day);
    if (isNaN(parsedDate.getTime()) || parsedDate.getFullYear() !== year || parsedDate.getMonth() !== month - 1 || parsedDate.getDate() !== day) {
      return "Informe uma data de nascimento válida.";
    }
    
    if (parsedDate > new Date()) {
      return "Informe uma data de nascimento válida.";
    }
    
    return "";
  };

  const handlePhoto = (file) => {
    if (!file) return;
    set("photo", file);
    setPhotoPreview(URL.createObjectURL(file));
  };

  const selectedTrainer = trainers.find((pt) => String(pt.id) === String(form.personalTrainerId)) || null;

  const canNext = () => {
    if (step === 1) {
      const err = validateBirthDate(form.birthDate);
      return form.name.trim() && form.cpf.trim() && form.birthDate && !err;
    }
    if (step === 2) return form.email.trim() && (isEditing || form.password.trim());
    return true;
  };

  const handleClose = () => { setStep(1); setDateError(""); onClose(); };

  const handleSubmit = () => {
    const err = validateBirthDate(form.birthDate);
    if (err) {
      setDateError(err);
      setStep(1);
      return;
    }
    onSubmit(form);
  };

  return (
    <>
      <Drawer
        open={open}
        onClose={handleClose}
        title={isEditing ? "Editar Aluno" : "Novo Aluno"}
        subtitle={isEditing ? "Atualize as informações do aluno" : "Cadastre um novo aluno no sistema"}
        footer={
          <div style={{ display: "flex", gap: "var(--space-3)", width: "100%", justifyContent: "space-between" }}>
            <div style={{ display: "flex", gap: "var(--space-2)" }}>
              {step > 1 && (
                <button className="btn btn-ghost" type="button" onClick={() => setStep((s) => s - 1)}>
                  ← Voltar
                </button>
              )}
            </div>
            <div style={{ display: "flex", gap: "var(--space-2)" }}>
              <button className="btn btn-ghost" type="button" onClick={handleClose}>Cancelar</button>
              {step < 4 ? (
                <button
                  className="btn btn-primary"
                  type="button"
                  onClick={() => setStep((s) => s + 1)}
                  disabled={!canNext()}
                >
                  Próximo →
                </button>
              ) : (
                <button className="btn btn-primary" type="button" onClick={handleSubmit} disabled={saving}>
                  {saving ? "Salvando..." : isEditing ? "Salvar alterações" : "Cadastrar aluno"}
                </button>
              )}
            </div>
          </div>
        }
      >
        {/* Stepper */}
        <div className="stepper" style={{ marginBottom: "var(--space-6)" }}>
          {STEPS.map((s) => (
            <Step key={s.id} number={s.id} label={s.label} active={step === s.id} done={step > s.id} />
          ))}
        </div>

        {/* Feedback */}
        {feedback && (
          <div className={`${feedback.includes("sucesso") ? "feedback-success" : "feedback-error"}`}
            style={{ marginBottom: "var(--space-4)" }}>
            {feedback}
          </div>
        )}

        {/* STEP 1 — Dados pessoais */}
        {step === 1 && (
          <div className="animate-slide-up" style={{ display: "flex", flexDirection: "column", gap: "var(--space-4)" }}>
            <div className="form-field">
              <label className="label">Nome completo *</label>
              <input className="input" type="text" placeholder="Nome do aluno"
                value={form.name} onChange={(e) => set("name", e.target.value)} maxLength={100} required />
            </div>
            <div className="form-grid">
              <div className="form-field">
                <label className="label">CPF *</label>
                <input className="input" type="text" placeholder="000.000.000-00"
                  value={form.cpf} onChange={(e) => set("cpf", maskCPF(e.target.value))} maxLength={14} required />
              </div>
              <div className="form-field">
                <label className="label">Data de Nascimento *</label>
                <input className="input" type="date" value={form.birthDate}
                  onChange={(e) => {
                    const val = e.target.value;
                    set("birthDate", val);
                    const err = validateBirthDate(val);
                    setDateError(err);
                  }} required />
                {dateError && <span style={{ color: "var(--error)", fontSize: 12, marginTop: 4, display: "block" }}>{dateError}</span>}
              </div>
            </div>
          </div>
        )}

        {/* STEP 2 — Conta de acesso */}
        {step === 2 && (
          <div className="animate-slide-up" style={{ display: "flex", flexDirection: "column", gap: "var(--space-4)" }}>
            <div className="form-field">
              <label className="label">E-mail *</label>
              <input className="input" type="email" placeholder="email@exemplo.com"
                value={form.email} onChange={(e) => set("email", e.target.value)} required />
            </div>
            <div className="form-field">
              <label className="label">{isEditing ? "Nova senha (deixe em branco para manter)" : "Senha inicial *"}</label>
              <input className="input" type="password" placeholder="••••••••"
                value={form.password} onChange={(e) => set("password", e.target.value)}
                required={!isEditing} />
            </div>
            <div className="alert alert-info">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ flexShrink: 0, marginTop: 1 }}>
                <circle cx="12" cy="12" r="10" /><path d="M12 8v4M12 16h.01" />
              </svg>
              <span>O aluno usará este e-mail e senha para acessar o portal do aluno.</span>
            </div>
          </div>
        )}

        {/* STEP 3 — Foto */}
        {step === 3 && (
          <div className="animate-slide-up" style={{ display: "flex", flexDirection: "column", gap: "var(--space-4)" }}>
            {photoPreview ? (
              <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "var(--space-4)" }}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={photoPreview} alt="Preview"
                  style={{ width: 120, height: 120, borderRadius: "50%", objectFit: "cover",
                    border: "3px solid var(--border-default)", boxShadow: "var(--shadow-md)" }} />
                <button className="btn btn-ghost btn-sm" type="button" onClick={() => { setPhotoPreview(""); set("photo", null); }}>
                  Remover foto
                </button>
              </div>
            ) : (
              <div
                className="photo-upload-area"
                onClick={() => fileInputRef.current?.click()}
                onDragOver={(e) => e.preventDefault()}
                onDrop={(e) => { e.preventDefault(); const f = e.dataTransfer.files?.[0]; if (f) handlePhoto(f); }}
              >
                <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="var(--text-muted)" strokeWidth="1.5" style={{ margin: "0 auto var(--space-3)" }}>
                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                  <polyline points="17 8 12 3 7 8" /><line x1="12" y1="3" x2="12" y2="15" />
                </svg>
                <p style={{ fontWeight: 600, color: "var(--text-secondary)", marginBottom: 4 }}>Clique ou arraste a foto aqui</p>
                <p style={{ fontSize: "var(--font-xs)", color: "var(--text-muted)" }}>PNG, JPG ou WEBP — recomendado 400×400px</p>
              </div>
            )}
            <input ref={fileInputRef} type="file" accept="image/png,image/jpeg,image/webp"
              style={{ display: "none" }} onChange={(e) => handlePhoto(e.target.files?.[0])} />
            <p style={{ fontSize: "var(--font-xs)", color: "var(--text-muted)", textAlign: "center" }}>
              Esta etapa é opcional. Você pode pular e adicionar a foto depois.
            </p>
          </div>
        )}

        {/* STEP 4 — Personal Trainer */}
        {step === 4 && (
          <div className="animate-slide-up" style={{ display: "flex", flexDirection: "column", gap: "var(--space-4)" }}>
            <p style={{ fontSize: "var(--font-sm)", color: "var(--text-muted)" }}>
              Vincule o aluno a um personal trainer. Esta etapa é opcional.
            </p>
            <button
              type="button"
              onClick={() => setPtPickerOpen(true)}
              style={{
                width: "100%", display: "flex", alignItems: "center", gap: "var(--space-4)",
                padding: "var(--space-4) var(--space-5)",
                background: selectedTrainer ? "var(--brand-primary-bg)" : "var(--bg-subtle)",
                border: `1.5px solid ${selectedTrainer ? "var(--brand-primary)" : "var(--border-default)"}`,
                borderRadius: "var(--radius-xl)", cursor: "pointer",
                transition: "all var(--transition-fast)", textAlign: "left",
              }}
            >
              {selectedTrainer ? (
                <>
                  <Avatar name={selectedTrainer.name} photoUrl={selectedTrainer.photoUrl} size="md" />
                  <div style={{ flex: 1 }}>
                    <p style={{ fontWeight: 600, color: "var(--text-primary)", margin: 0 }}>{selectedTrainer.name}</p>
                    {selectedTrainer.specialty && selectedTrainer.specialty !== "-" && (
                      <p style={{ fontSize: "var(--font-xs)", color: "var(--text-muted)", margin: 0 }}>{selectedTrainer.specialty}</p>
                    )}
                  </div>
                  <span style={{ fontSize: "var(--font-xs)", color: "var(--brand-primary)", fontWeight: 600 }}>Alterar</span>
                </>
              ) : (
                <>
                  <div style={{
                    width: 40, height: 40, borderRadius: "50%", background: "var(--border-default)",
                    display: "flex", alignItems: "center", justifyContent: "center",
                  }}>
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--text-muted)" strokeWidth="2">
                      <circle cx="12" cy="8" r="4" /><path d="M20 21a8 8 0 1 0-16 0" />
                    </svg>
                  </div>
                  <div style={{ flex: 1 }}>
                    <p style={{ fontWeight: 600, color: "var(--text-secondary)", margin: 0 }}>Selecionar Personal Trainer</p>
                    <p style={{ fontSize: "var(--font-xs)", color: "var(--text-muted)", margin: 0 }}>Clique para escolher</p>
                  </div>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--text-muted)" strokeWidth="2">
                    <path d="M9 18l6-6-6-6" />
                  </svg>
                </>
              )}
            </button>
          </div>
        )}
      </Drawer>

      <PersonalTrainerPickerModal
        open={ptPickerOpen}
        onClose={() => setPtPickerOpen(false)}
        trainers={trainers}
        selectedId={form.personalTrainerId}
        onSelect={(pt) => set("personalTrainerId", pt?.id ? String(pt.id) : "")}
      />
    </>
  );
}
