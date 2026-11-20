"use client";

import React, { useCallback, useEffect, useState } from "react";
import Drawer from "@/components/ui/Drawer";
import { AssessmentForm } from "./AssessmentForm";
import { AssessmentSummary } from "./AssessmentSummary";
import { LoadHistory } from "./LoadHistory";
import { deletePhysicalAssessment, getLoadLogsByMember, getPhysicalAssessmentsByMember } from "@/services/api";
import { formatDateBr, toDate, type LoadLog, type PhysicalAssessment } from "@/lib/training-records";
import "./training.css";

type Tab = "assessments" | "loads";

/** Acompanhamento do aluno pelo personal: avaliações físicas (registro e evolução) e cargas por aparelho. */
export function StudentFollowUpDrawer({ student, onClose }: {
  student: { id: string; name: string } | null;
  onClose: () => void;
}) {
  const [tab, setTab] = useState<Tab>("assessments");
  const [creating, setCreating] = useState(false);
  const [assessments, setAssessments] = useState<PhysicalAssessment[]>([]);
  const [logs, setLogs] = useState<LoadLog[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [feedback, setFeedback] = useState("");
  const [pendingDelete, setPendingDelete] = useState<PhysicalAssessment | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const studentId = student?.id ?? null;

  const load = useCallback(async (memberId: string) => {
    setLoading(true);
    setError("");
    try {
      const [assessmentList, loadList] = await Promise.all([
        getPhysicalAssessmentsByMember(memberId),
        getLoadLogsByMember(memberId),
      ]);
      setAssessments(Array.isArray(assessmentList) ? assessmentList : []);
      setLogs(Array.isArray(loadList) ? loadList : []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Não foi possível carregar o acompanhamento do aluno.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!studentId) return;
    setTab("assessments");
    setCreating(false);
    setFeedback("");
    setPendingDelete(null);
    load(studentId);
  }, [studentId, load]);

  async function confirmDelete() {
    if (!pendingDelete || deletingId) return;
    setDeletingId(pendingDelete.id);
    setError("");
    try {
      await deletePhysicalAssessment(pendingDelete.id);
      setAssessments((current) => current.filter((item) => item.id !== pendingDelete.id));
      setFeedback(`Avaliação de ${formatDateBr(pendingDelete.assessmentDate)} excluída.`);
      setPendingDelete(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Não foi possível excluir a avaliação.");
    } finally {
      setDeletingId(null);
    }
  }

  return (
    <Drawer
      open={Boolean(student)}
      onClose={onClose}
      title={creating ? "Nova avaliação física" : "Acompanhamento do aluno"}
      subtitle={student?.name}
      footer={null}
    >
      {creating && student ? (
        <AssessmentForm
          memberId={student.id}
          memberName={student.name}
          onCancel={() => setCreating(false)}
          onSaved={(saved) => {
            setAssessments((current) => [saved, ...current].sort((a, b) =>
              (toDate(b.assessmentDate)?.getTime() ?? 0) - (toDate(a.assessmentDate)?.getTime() ?? 0)));
            setCreating(false);
            setFeedback("Avaliação física registrada.");
          }}
        />
      ) : (
        <>
          <div className="gp-tr-tabs" role="tablist" aria-label="Acompanhamento">
            <button type="button" role="tab" id="follow-tab-assessments" aria-controls="follow-panel"
              aria-selected={tab === "assessments"} onClick={() => setTab("assessments")}>Avaliação física</button>
            <button type="button" role="tab" id="follow-tab-loads" aria-controls="follow-panel"
              aria-selected={tab === "loads"} onClick={() => setTab("loads")}>Cargas por aparelho</button>
          </div>

          {feedback && <div className="alert alert-success" role="status" style={{ marginBottom: 14 }}>{feedback}</div>}
          {error && <div className="alert alert-error" role="alert" style={{ marginBottom: 14 }}>{error}</div>}

          <div id="follow-panel" role="tabpanel" aria-labelledby={tab === "assessments" ? "follow-tab-assessments" : "follow-tab-loads"}>
            {loading ? (
              <div role="status" aria-label="Carregando">
                <div className="gp-tr-skeleton" style={{ width: "60%" }} />
                <div className="gp-tr-skeleton" />
                <div className="gp-tr-skeleton" style={{ width: "80%" }} />
              </div>
            ) : tab === "assessments" ? (
              <>
                <div className="gp-tr-actions" style={{ marginBottom: 14 }}>
                  <button type="button" className="btn btn-primary btn-sm" onClick={() => { setFeedback(""); setCreating(true); }}>
                    Nova avaliação
                  </button>
                </div>
                {pendingDelete && (
                  <div className="alert alert-warning" role="alertdialog" aria-label="Confirmar exclusão" style={{ marginBottom: 14 }}>
                    <p style={{ margin: 0 }}>Excluir a avaliação de <strong>{formatDateBr(pendingDelete.assessmentDate)}</strong>? Ela deixa de aparecer para você e para o aluno.</p>
                    <div className="gp-tr-actions" style={{ marginTop: 10 }}>
                      <button type="button" className="btn btn-ghost btn-sm" onClick={() => setPendingDelete(null)} disabled={Boolean(deletingId)}>Manter</button>
                      <button type="button" className="btn btn-danger btn-sm" onClick={confirmDelete} disabled={Boolean(deletingId)}>
                        {deletingId ? "Excluindo…" : "Excluir avaliação"}
                      </button>
                    </div>
                  </div>
                )}
                <AssessmentSummary
                  assessments={assessments}
                  deletingId={deletingId}
                  onDelete={(item) => { setFeedback(""); setPendingDelete(item); }}
                  emptyText="A avaliação é opcional. Se o aluno fizer uma, registre aqui; a partir da segunda, o sistema mostra a evolução."
                />
              </>
            ) : (
              <LoadHistory logs={logs} />
            )}
          </div>
        </>
      )}
    </Drawer>
  );
}
