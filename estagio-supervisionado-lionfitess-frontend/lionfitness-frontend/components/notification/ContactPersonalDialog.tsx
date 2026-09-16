"use client";

import { FormEvent, useState } from "react";
import { MessageCircle, Loader2 } from "lucide-react";
import { sendMessageToPersonal } from "@/services/api";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";

const subjects = [
  { value: "EXERCISE_QUESTION", label: "Dúvida sobre exercício" },
  { value: "WORKOUT_CHANGE_REQUEST", label: "Solicitação de alteração de treino" },
  { value: "EXERCISE_DIFFICULTY", label: "Dificuldade com exercício" },
  { value: "OTHER", label: "Outro assunto" },
];

export function ContactPersonalDialog({ personalName }: { personalName: string }) {
  const [open, setOpen] = useState(false);
  const [type, setType] = useState(subjects[0].value);
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [feedback, setFeedback] = useState("");
  const [error, setError] = useState("");

  const reset = () => {
    setType(subjects[0].value);
    setMessage("");
    setFeedback("");
    setError("");
  };

  const handleOpenChange = (nextOpen: boolean) => {
    setOpen(nextOpen);
    if (!nextOpen) reset();
  };

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setLoading(true);
    setFeedback("");
    setError("");
    try {
      await sendMessageToPersonal({ type, message: message.trim() });
      setFeedback("Mensagem enviada ao seu personal com sucesso.");
      setMessage("");
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Não foi possível enviar a mensagem.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <Button type="button" variant="outline" size="sm" onClick={() => setOpen(true)}>
        <MessageCircle className="size-4" /> Falar com meu personal
      </Button>
      <DialogContent>
        <form onSubmit={submit} className="grid gap-4">
          <DialogHeader>
            <DialogTitle>Falar com {personalName}</DialogTitle>
            <DialogDescription>Envie uma dúvida ou solicitação sobre o seu treino.</DialogDescription>
          </DialogHeader>
          <label className="grid gap-1.5 text-sm font-medium text-foreground">
            Assunto
            <select value={type} onChange={(event) => setType(event.target.value)} disabled={loading}
              className="h-10 rounded-lg border border-input bg-card px-3 text-sm outline-none focus:ring-2 focus:ring-ring">
              {subjects.map((subject) => <option key={subject.value} value={subject.value}>{subject.label}</option>)}
            </select>
          </label>
          <label className="grid gap-1.5 text-sm font-medium text-foreground">
            Mensagem
            <textarea value={message} onChange={(event) => setMessage(event.target.value)} disabled={loading} required maxLength={2000} rows={5}
              className="rounded-lg border border-input bg-card p-3 text-sm outline-none focus:ring-2 focus:ring-ring" placeholder="Descreva sua dúvida ou solicitação..." />
          </label>
          {feedback ? <p role="status" className="rounded-lg bg-emerald-500/10 p-3 text-sm text-emerald-700 dark:text-emerald-300">{feedback}</p> : null}
          {error ? <p role="alert" className="rounded-lg bg-destructive/10 p-3 text-sm text-destructive">{error}</p> : null}
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => handleOpenChange(false)} disabled={loading}>Cancelar</Button>
            <Button type="submit" disabled={!message.trim() || loading}>{loading ? <Loader2 className="size-4 animate-spin" /> : null} Enviar mensagem</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
