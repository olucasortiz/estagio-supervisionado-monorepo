"use client";

import { useCallback, useEffect, useState } from "react";
import { Bell, Check, CheckCheck, Loader2, MessageSquareReply } from "lucide-react";
import {
  getNotifications,
  getUnreadNotificationCount,
  markAllNotificationsAsRead,
  markNotificationAsRead,
  replyToNotification,
} from "@/services/api";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

type NotificationItem = {
  id: string;
  senderName?: string | null;
  type: string;
  title: string;
  message: string;
  read: boolean;
  createdAt: string;
  readAt?: string | null;
};

const typeLabels: Record<string, string> = {
  EXERCISE_QUESTION: "Dúvida sobre exercício",
  WORKOUT_CHANGE_REQUEST: "Alteração de treino",
  EXERCISE_DIFFICULTY: "Dificuldade com exercício",
  OTHER: "Mensagem",
  PERSONAL_TRAINER_REPLY: "Resposta do personal",
};

function formatDateTime(value: string) {
  return new Date(value).toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" });
}

export function NotificationBell({ canReply = false }: { canReply?: boolean }) {
  const [open, setOpen] = useState(false);
  const [count, setCount] = useState(0);
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [replyTarget, setReplyTarget] = useState<NotificationItem | null>(null);
  const [replyMessage, setReplyMessage] = useState("");
  const [replying, setReplying] = useState(false);

  const loadCount = useCallback(async () => {
    try {
      const result = await getUnreadNotificationCount();
      setCount(Number(result?.count || 0));
    } catch {
      // A central continua disponível mesmo se o contador não puder ser atualizado.
    }
  }, []);

  const loadNotifications = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const result = await getNotifications();
      setNotifications(Array.isArray(result) ? result : []);
      await loadCount();
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Não foi possível carregar as notificações.");
    } finally {
      setLoading(false);
    }
  }, [loadCount]);

  useEffect(() => {
    void loadCount();
  }, [loadCount]);

  const handleOpenChange = (nextOpen: boolean) => {
    setOpen(nextOpen);
    if (nextOpen) void loadNotifications();
  };

  const markRead = async (notificationId: string) => {
    try {
      const updated = await markNotificationAsRead(notificationId);
      setNotifications((current) => current.map((item) => item.id === notificationId ? updated : item));
      await loadCount();
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Não foi possível atualizar a notificação.");
    }
  };

  const markAllRead = async () => {
    try {
      await markAllNotificationsAsRead();
      setNotifications((current) => current.map((item) => ({ ...item, read: true })));
      setCount(0);
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Não foi possível atualizar as notificações.");
    }
  };

  const submitReply = async () => {
    if (!replyTarget || !replyMessage.trim()) return;
    setReplying(true);
    setError("");
    try {
      await replyToNotification(replyTarget.id, { message: replyMessage.trim() });
      setNotifications((current) => current.map((item) => item.id === replyTarget.id ? { ...item, read: true } : item));
      setReplyTarget(null);
      setReplyMessage("");
      await loadCount();
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Não foi possível enviar a resposta.");
    } finally {
      setReplying(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <button
        type="button"
        onClick={() => handleOpenChange(true)}
        className="relative flex size-9 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
        aria-label="Abrir notificações"
      >
        <Bell className="size-4" />
        {count > 0 ? (
          <span className="absolute -right-1 -top-1 grid min-w-4 place-items-center rounded-full bg-lion-red px-1 text-[10px] font-bold leading-4 text-white">
            {count > 99 ? "99+" : count}
          </span>
        ) : null}
      </button>
      <DialogContent className="max-w-xl">
        <DialogHeader>
          <DialogTitle>Notificações</DialogTitle>
          <DialogDescription>Acompanhe mensagens e respostas recebidas no Lion Fitness.</DialogDescription>
        </DialogHeader>

        <div className="flex justify-end">
          <Button type="button" variant="ghost" size="sm" onClick={markAllRead} disabled={count === 0 || loading}>
            <CheckCheck className="size-4" /> Marcar todas como lidas
          </Button>
        </div>

        {loading ? (
          <p className="flex items-center gap-2 py-8 text-sm text-muted-foreground"><Loader2 className="size-4 animate-spin" /> Carregando notificações...</p>
        ) : error ? (
          <p role="alert" className="rounded-lg bg-destructive/10 p-3 text-sm text-destructive">{error}</p>
        ) : notifications.length === 0 ? (
          <p className="rounded-lg border border-dashed border-border p-6 text-center text-sm text-muted-foreground">Você não tem notificações no momento.</p>
        ) : (
          <div className="max-h-[52vh] space-y-3 overflow-y-auto pr-1">
            {notifications.map((notification) => (
              <article key={notification.id} className={`rounded-xl border p-3.5 ${notification.read ? "border-border bg-card" : "border-primary/30 bg-primary/5"}`}>
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-sm font-semibold text-foreground">{notification.title}</p>
                    <p className="mt-0.5 text-xs text-muted-foreground">{typeLabels[notification.type] || notification.type}{notification.senderName ? ` · ${notification.senderName}` : ""}</p>
                  </div>
                  {!notification.read ? <span className="mt-1 size-2 rounded-full bg-primary" aria-label="Não lida" /> : null}
                </div>
                <p className="mt-2 whitespace-pre-wrap text-sm text-foreground">{notification.message}</p>
                <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
                  <time className="text-xs text-muted-foreground" dateTime={notification.createdAt}>{formatDateTime(notification.createdAt)}</time>
                  <div className="flex items-center gap-1">
                    {!notification.read ? <Button type="button" variant="ghost" size="sm" onClick={() => void markRead(notification.id)}><Check className="size-4" /> Lida</Button> : null}
                    {canReply && notification.type !== "PERSONAL_TRAINER_REPLY" ? (
                      <Button type="button" variant="ghost" size="sm" onClick={() => { setReplyTarget(notification); setReplyMessage(""); }}><MessageSquareReply className="size-4" /> Responder</Button>
                    ) : null}
                  </div>
                </div>
              </article>
            ))}
          </div>
        )}

        {replyTarget ? (
          <div className="rounded-xl border border-border bg-muted/30 p-3.5">
            <p className="text-sm font-semibold text-foreground">Responder para {replyTarget.senderName || "o aluno"}</p>
            <textarea value={replyMessage} onChange={(event) => setReplyMessage(event.target.value)} maxLength={2000} rows={4}
              className="mt-2 w-full rounded-lg border border-input bg-card p-3 text-sm outline-none focus:ring-2 focus:ring-ring" placeholder="Escreva sua resposta..." />
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setReplyTarget(null)} disabled={replying}>Cancelar</Button>
              <Button type="button" onClick={() => void submitReply()} disabled={!replyMessage.trim() || replying}>{replying ? <Loader2 className="size-4 animate-spin" /> : null} Enviar resposta</Button>
            </DialogFooter>
          </div>
        ) : null}
      </DialogContent>
    </Dialog>
  );
}
