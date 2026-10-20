"use client";

import React, { useState, useEffect, useRef, useMemo, useCallback } from "react";
import {
  MessageSquare,
  X,
  Minimize2,
  Send,
  Loader2,
  AlertCircle,
  RotateCcw,
  User as UserIcon,
  Check,
  CheckCheck,
  Users,
} from "lucide-react";
import { ApiError, getConversation, sendChatMessage, markConversationRead } from "@/services/api";
import { Button } from "@/components/ui/button";

export interface ChatMessage {
  id: string;
  senderUserId?: string | null;
  senderName?: string | null;
  recipientUserId?: string | null;
  type: string;
  title?: string;
  message: string;
  read: boolean;
  createdAt: string;
  readAt?: string | null;
  fromMe: boolean;
}

export interface FloatingChatStudent {
  id: string;
  name: string;
  photoUrl?: string | null;
}

export interface FloatingChatProps {
  userRole: "ALUNO" | "PERSONAL";
  personalTrainerName?: string | null;
  hasPersonalTrainer?: boolean;
  students?: FloatingChatStudent[];
  currentStudentId?: string | null;
  onSelectStudent?: (studentId: string) => void;
}

const subjectTypes = [
  { value: "OTHER", label: "Geral" },
  { value: "EXERCISE_QUESTION", label: "Dúvida" },
  { value: "WORKOUT_CHANGE_REQUEST", label: "Troca de exercício" },
  { value: "EXERCISE_DIFFICULTY", label: "Dificuldade" },
];

function formatDaySeparator(dateStr: string) {
  try {
    const date = new Date(dateStr);
    if (isNaN(date.getTime())) return "Hoje";
    const today = new Date();
    const yesterday = new Date();
    yesterday.setDate(today.getDate() - 1);

    if (date.toDateString() === today.toDateString()) return "Hoje";
    if (date.toDateString() === yesterday.toDateString()) return "Ontem";
    return date.toLocaleDateString("pt-BR", { day: "numeric", month: "short" });
  } catch {
    return "Hoje";
  }
}

function formatMessageTime(dateStr: string) {
  try {
    const date = new Date(dateStr);
    if (isNaN(date.getTime())) return "";
    return date.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
  } catch {
    return "";
  }
}

export function FloatingChat({
  userRole,
  personalTrainerName,
  hasPersonalTrainer = true,
  students = [],
  currentStudentId,
  onSelectStudent,
}: FloatingChatProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [selectedStudentId, setSelectedStudentId] = useState<string | null>(currentStudentId || null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [inputDraft, setInputDraft] = useState("");
  const [selectedType, setSelectedType] = useState("OTHER");
  const [error, setError] = useState<string | null>(null);
  const [unreadCount, setUnreadCount] = useState(0);
  const [serverInterlocutorName, setServerInterlocutorName] = useState<string | null>(null);
  const [unavailable, setUnavailable] = useState(false);
  const [errorAction, setErrorAction] = useState<"load" | "send">("load");
  const errorActionRef = useRef<"load" | "send">("load");
  const draftByConversationRef = useRef(new Map<string | null, string>());
  const unavailableRef = useRef(false);
  const loadRequestRef = useRef(0);
  const sendingRef = useRef(false);
  const conversationKey = userRole === "PERSONAL" ? selectedStudentId : "self";
  const activeConversationRef = useRef(conversationKey);

  useEffect(() => {
    activeConversationRef.current = conversationKey;
    loadRequestRef.current++;
    setServerInterlocutorName(null);
    setMessages([]);
    setUnreadCount(0);
    setInputDraft(draftByConversationRef.current.get(conversationKey) || "");
    return () => { activeConversationRef.current = null; };
  }, [conversationKey]);

  const reportChatError = useCallback((err: unknown, action: "load" | "send") => {
    errorActionRef.current = action;
    setErrorAction(action);
    if (err instanceof ApiError && [404, 405, 401, 403].includes(err.status)) {
      unavailableRef.current = true;
      setUnavailable(true);
      setError(err.status === 401 ? "Sua sessão expirou. Entre novamente para usar o chat." : err.status === 403 ? "Você não tem acesso a esta conversa." : "Chat indisponível nesta versão do servidor. As consultas foram pausadas.");
    } else {
      setError(err instanceof Error ? err.message : "Não foi possível atualizar a conversa. Tente novamente.");
    }
  }, []);

  const scrollRef = useRef<HTMLDivElement>(null);
  const isNearBottomRef = useRef(true);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Sincroniza studentId externo
  useEffect(() => {
    if (currentStudentId) {
      setSelectedStudentId(currentStudentId);
    } else if (students.length > 0 && !selectedStudentId) {
      setSelectedStudentId(students[0].id);
    }
  }, [currentStudentId, students, selectedStudentId]);

  // Listener para evento customizado que abre o chat
  useEffect(() => {
    const handleOpenChatEvent = (e: Event) => {
      const customEvent = e as CustomEvent<{ memberId?: string }>;
      if (customEvent.detail?.memberId) {
        setSelectedStudentId(customEvent.detail.memberId);
      }
      setIsOpen(true);
    };

    window.addEventListener("open-lion-chat", handleOpenChatEvent);
    return () => window.removeEventListener("open-lion-chat", handleOpenChatEvent);
  }, []);

  // Determina nome do interlocutor
  const interlocutorName = useMemo(() => {
    if (userRole === "ALUNO") {
      return serverInterlocutorName || personalTrainerName || "Seu Personal Trainer";
    }
    const student = students.find((s) => s.id === selectedStudentId);
    return student ? student.name : "Aluno Selecionado";
  }, [userRole, serverInterlocutorName, personalTrainerName, students, selectedStudentId]);

  // A failed chat endpoint must never become an unfiltered notifications feed.
  const loadMessages = useCallback(async (markAsRead = false) => {
    if (unavailableRef.current || (userRole === "PERSONAL" && !selectedStudentId) || (userRole === "ALUNO" && !hasPersonalTrainer)) return;
    const requestId = ++loadRequestRef.current;
    const key = userRole === "PERSONAL" ? selectedStudentId : "self";
    const memberId = userRole === "PERSONAL" ? selectedStudentId || undefined : undefined;
    const isCurrent = () => requestId === loadRequestRef.current && key === activeConversationRef.current;
    try {
      const response = await getConversation(memberId);
      if (!isCurrent() || !Array.isArray(response?.messages)) return;
      setServerInterlocutorName(response.interlocutorName || null);
      setMessages(response.messages);
      const unread = response.messages.filter((m: ChatMessage) => !m.fromMe && !m.read).length;
      setUnreadCount(unread);
      if (markAsRead && unread > 0) {
        await markConversationRead(memberId);
        if (!isCurrent()) return;
        setMessages(response.messages.map((message: ChatMessage) => !message.fromMe ? { ...message, read: true } : message));
        setUnreadCount(0);
      }
      if (isCurrent() && errorActionRef.current === "load") setError(null);
    } catch (err) {
      if (isCurrent()) reportChatError(err, "load");
    }
  }, [userRole, selectedStudentId, hasPersonalTrainer, reportChatError]);

  useEffect(() => {
    if (unavailableRef.current) return;
    let cancelled = false;
    setLoading(isOpen);
    void loadMessages(isOpen).finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [isOpen, loadMessages]);

  useEffect(() => {
    if (unavailable) return;
    const interval = setInterval(() => { void loadMessages(isOpen); }, 8000);
    return () => clearInterval(interval);
  }, [isOpen, loadMessages, unavailable]);

  const retryConversation = async () => {
    unavailableRef.current = false;
    setUnavailable(false);
    setError(null);
    setLoading(true);
    try { await loadMessages(isOpen); } finally { setLoading(false); }
  };

  // Monitora rolagem para saber se usuário está no final
  const handleScroll = () => {
    if (!scrollRef.current) return;
    const { scrollTop, scrollHeight, clientHeight } = scrollRef.current;
    isNearBottomRef.current = scrollHeight - scrollTop - clientHeight < 80;
  };

  // Rola até o fim quando há novas mensagens e usuário está no final
  useEffect(() => {
    if (isNearBottomRef.current && scrollRef.current) {
      scrollRef.current.scrollTo({
        top: scrollRef.current.scrollHeight,
        behavior: "smooth",
      });
    }
  }, [messages]);

  // Enviar mensagem
  const handleSend = async () => {
    const text = inputDraft.trim();
    if (!text || sendingRef.current || unavailableRef.current) return;

    if (userRole === "ALUNO" && !hasPersonalTrainer) {
      setError("Você ainda não possui um personal trainer vinculado.");
      return;
    }
    if (userRole === "PERSONAL" && !selectedStudentId) {
      setError("Selecione um aluno para enviar a mensagem.");
      return;
    }

    sendingRef.current = true;
    const sendingConversation = activeConversationRef.current;
    errorActionRef.current = "send";
    setErrorAction("send");
    setSending(true);
    setError(null);

    try {
      const payload: { memberId?: string; message: string; type?: string } = {
        message: text,
      };

      if (userRole === "PERSONAL") {
        payload.memberId = selectedStudentId!;
        payload.type = "PERSONAL_TRAINER_REPLY";
      } else {
        payload.type = selectedType;
      }

      await sendChatMessage(payload);
      if (sendingConversation !== activeConversationRef.current) return;

      // Limpa draft com sucesso
      draftByConversationRef.current.delete(sendingConversation);
      setInputDraft("");
      setSelectedType("OTHER");

      // Recarrega conversa imediatamente
      await loadMessages(true);

      // Garante scroll no fim
      if (scrollRef.current) {
        scrollRef.current.scrollTo({
          top: scrollRef.current.scrollHeight,
          behavior: "smooth",
        });
      }
    } catch (err: unknown) {
      if (sendingConversation === activeConversationRef.current) reportChatError(err, "send");
      // Rascunho é preservado no inputDraft intencionalmente!
    } finally {
      sendingRef.current = false;
      setSending(false);
    }
  };

  // Tecla Enter envia, Shift+Enter insere nova linha
  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      void handleSend();
    }
  };

  // Agrupamento por dia
  const messageGroups = useMemo(() => {
    const groups: { day: string; items: ChatMessage[] }[] = [];
    messages.forEach((msg) => {
      const day = formatDaySeparator(msg.createdAt);
      let group = groups.find((g) => g.day === day);
      if (!group) {
        group = { day, items: [] };
        groups.push(group);
      }
      group.items.push(msg);
    });
    return groups;
  }, [messages]);

  return (
    <>
      {/* Botão Flutuante (Trigger) */}
      {!isOpen && (
        <button
          type="button"
          onClick={() => setIsOpen(true)}
          className="fixed bottom-5 right-5 z-40 flex size-13 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-xl transition-all duration-200 hover:scale-105 hover:bg-primary/95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 sm:size-14"
          aria-label={`Abrir chat de mensagens${unreadCount > 0 ? ` (${unreadCount} não lidas)` : ""}`}
          title="Abrir chat de suporte e treino"
        >
          <MessageSquare className="size-6" />
          {unreadCount > 0 && (
            <span
              className="absolute -top-1 -right-1 flex min-w-5 h-5 items-center justify-center rounded-full bg-lion-red px-1.5 text-[11px] font-bold text-white shadow ring-2 ring-background"
              aria-label={`${unreadCount} mensagens não lidas`}
            >
              {unreadCount > 9 ? "9+" : unreadCount}
            </span>
          )}
        </button>
      )}

      {/* Painel Flutuante do Chat */}
      {isOpen && (
        <aside
          role="region"
          aria-label="Painel de mensagens"
          className="fixed bottom-0 right-0 z-50 flex h-[540px] max-h-[92vh] w-full flex-col border border-border bg-card shadow-2xl transition-all duration-200 sm:bottom-5 sm:right-5 sm:h-[560px] sm:w-[380px] sm:rounded-2xl overflow-hidden"
        >
          {/* Cabeçalho do Chat */}
          <header className="flex items-center justify-between border-b border-border bg-muted/40 px-4 py-3 shrink-0">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="flex size-9 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary border border-primary/20">
                <UserIcon className="size-4" />
              </div>
              <div className="min-w-0">
                <h3 className="truncate text-sm font-bold text-foreground leading-tight">
                  {interlocutorName}
                </h3>
                <p className="truncate text-[11px] text-muted-foreground">
                  {userRole === "ALUNO" ? "Personal Trainer vinculado" : "Supervisão do aluno"}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-1 shrink-0">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => setIsOpen(false)}
                className="size-8 p-0 rounded-lg text-muted-foreground hover:text-foreground"
                aria-label="Minimizar conversa"
                title="Minimizar"
              >
                <Minimize2 className="size-4" />
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => setIsOpen(false)}
                className="size-8 p-0 rounded-lg text-muted-foreground hover:text-foreground hover:bg-destructive/10 hover:text-destructive"
                aria-label="Fechar painel de chat"
                title="Fechar"
              >
                <X className="size-4" />
              </Button>
            </div>
          </header>

          {/* Seletor de Aluno (Apenas Personal Trainer) */}
          {userRole === "PERSONAL" && students.length > 0 && (
            <div className="flex items-center gap-2 border-b border-border bg-muted/20 px-3 py-2 text-xs">
              <Users className="size-3.5 text-muted-foreground shrink-0" />
              <label htmlFor="chat-student-select" className="sr-only">
                Selecionar aluno para conversar
              </label>
              <select
                id="chat-student-select"
                disabled={sending}
                value={selectedStudentId || ""}
                onChange={(e) => {
                  const newId = e.target.value;
                  setSelectedStudentId(newId);
                  onSelectStudent?.(newId);
                }}
                className="w-full bg-transparent font-medium text-foreground outline-none cursor-pointer text-xs"
              >
                {students.map((student) => (
                  <option key={student.id} value={student.id} className="bg-card text-foreground">
                    {student.name}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Histórico de Mensagens */}
          <div
            ref={scrollRef}
            onScroll={handleScroll}
            className="flex-1 overflow-y-auto p-4 space-y-4 bg-background/50"
          >
            {userRole === "ALUNO" && !hasPersonalTrainer ? (
              <div className="my-auto flex flex-col items-center justify-center p-6 text-center">
                <AlertCircle className="size-10 text-muted-foreground mb-3 opacity-60" />
                <h4 className="text-sm font-semibold text-foreground">Sem personal vinculado</h4>
                <p className="mt-1 text-xs text-muted-foreground leading-relaxed">
                  Você ainda não possui um personal trainer vinculado à sua conta. Solicite a vinculação na recepção da academia para conversar por aqui.
                </p>
              </div>
            ) : unavailable ? (
              <p className="p-6 text-center text-sm text-muted-foreground">Conversa temporariamente indisponível. Seu rascunho foi preservado.</p>
            ) : loading ? (
              <div className="flex h-full items-center justify-center">
                <Loader2 className="size-6 animate-spin text-muted-foreground" />
              </div>
            ) : messages.length === 0 ? (
              <div className="my-auto flex flex-col items-center justify-center p-6 text-center text-muted-foreground">
                <MessageSquare className="size-8 mb-2 opacity-40" />
                <p className="text-xs">Nenhuma mensagem nesta conversa.</p>
                <p className="mt-1 text-[11px] opacity-75">
                  {userRole === "ALUNO"
                    ? "Envie uma dúvida ou solicitação de alteração para o seu personal."
                    : "Inicie um diálogo ou tire dúvidas sobre a rotina de treinos do aluno."}
                </p>
              </div>
            ) : (
              messageGroups.map((group) => (
                <div key={group.day} className="space-y-3">
                  {/* Divisor de Dia */}
                  <div className="flex items-center justify-center my-2">
                    <span className="rounded-full bg-muted px-2.5 py-0.5 text-[10px] font-semibold tracking-wide text-muted-foreground uppercase">
                      {group.day}
                    </span>
                  </div>

                  {/* Bolhas de Mensagem */}
                  {group.items.map((msg) => (
                    <div
                      key={msg.id}
                      className={`flex flex-col ${msg.fromMe ? "items-end" : "items-start"}`}
                    >
                      <div
                        className={`max-w-[82%] rounded-2xl px-3.5 py-2.5 text-xs leading-relaxed shadow-sm ${
                          msg.fromMe
                            ? "bg-primary text-primary-foreground rounded-tr-xs"
                            : "bg-muted text-foreground border border-border/80 rounded-tl-xs"
                        }`}
                      >
                        {/* Assunto / Tag se existir */}
                        {msg.type && msg.type !== "OTHER" && msg.type !== "PERSONAL_TRAINER_REPLY" && (
                          <span
                            className={`inline-block mb-1 text-[10px] font-semibold uppercase tracking-wider px-1.5 py-0.2 rounded ${
                              msg.fromMe
                                ? "bg-white/20 text-white"
                                : "bg-card text-muted-foreground border border-border"
                            }`}
                          >
                            {subjectTypes.find((s) => s.value === msg.type)?.label || msg.type}
                          </span>
                        )}
                        <p className="whitespace-pre-wrap break-words">{msg.message}</p>
                      </div>

                      <div
                        className={`mt-1 flex items-center gap-1 text-[10px] text-muted-foreground ${
                          msg.fromMe ? "pr-1" : "pl-1"
                        }`}
                      >
                        <time dateTime={msg.createdAt}>{formatMessageTime(msg.createdAt)}</time>
                        {msg.fromMe && (
                          <span title={msg.read ? "Lida" : "Enviada"}>
                            {msg.read ? (
                              <CheckCheck className="size-3 text-primary inline" />
                            ) : (
                              <Check className="size-3 inline opacity-70" />
                            )}
                          </span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              ))
            )}
          </div>

          {/* Alerta de Erro com Reenvio */}
          {error && (
            <div
              role="alert"
              className="flex items-center justify-between gap-2 border-t border-destructive/20 bg-destructive/10 px-3 py-2 text-xs text-destructive"
            >
              <div className="flex items-center gap-1.5 min-w-0">
                <AlertCircle className="size-3.5 shrink-0" />
                <span className="break-words">{error}</span>
              </div>
              <button
                type="button"
                onClick={() => void (unavailable || errorAction === "load" ? retryConversation() : handleSend())}
                disabled={loading || sending}
                className="flex items-center gap-1 font-semibold underline text-[11px] shrink-0"
              >
                <RotateCcw className="size-3" /> {unavailable || errorAction === "load" ? "Tentar novamente" : "Reenviar"}
              </button>
            </div>
          )}

          {/* Área de Envio */}
          <footer className="border-t border-border bg-card p-3 space-y-2 shrink-0">
            {/* Chips de Assunto para Aluno */}
            {userRole === "ALUNO" && hasPersonalTrainer && (
              <div className="flex gap-1.5 overflow-x-auto pb-1 scrollbar-none">
                {subjectTypes.map((subj) => (
                  <button
                    key={subj.value}
                    type="button"
                    onClick={() => setSelectedType(subj.value)}
                    className={`rounded-md px-2 py-0.5 text-[10px] font-medium transition-colors shrink-0 ${
                      selectedType === subj.value
                        ? "bg-primary text-primary-foreground font-semibold"
                        : "bg-muted text-muted-foreground hover:bg-muted/80"
                    }`}
                  >
                    {subj.label}
                  </button>
                ))}
              </div>
            )}

            <div className="flex items-end gap-2">
              <label htmlFor="chat-message-input" className="sr-only">
                Mensagem
              </label>
              <textarea
                ref={textareaRef}
                id="chat-message-input"
                value={inputDraft}
                onChange={(e) => {
                  draftByConversationRef.current.set(conversationKey, e.target.value);
                  setInputDraft(e.target.value);
                }}
                onKeyDown={handleKeyDown}
                disabled={sending || (userRole === "ALUNO" && !hasPersonalTrainer)}
                placeholder="Escreva sua mensagem... (Enter envia)"
                rows={2}
                maxLength={2000}
                className="flex-1 resize-none rounded-xl border border-input bg-background p-2.5 text-xs text-foreground placeholder:text-muted-foreground outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:opacity-50"
              />

              <Button
                type="button"
                onClick={() => void handleSend()}
                disabled={unavailable || !inputDraft.trim() || sending || (userRole === "ALUNO" && !hasPersonalTrainer)}
                size="sm"
                className="size-9 rounded-xl p-0 shrink-0 bg-primary hover:bg-primary/90 text-primary-foreground shadow"
                aria-label="Enviar mensagem"
                title="Enviar mensagem (Enter)"
              >
                {sending ? <Loader2 className="size-4 animate-spin" /> : <Send className="size-4" />}
              </Button>
            </div>
            <p className="text-[10px] text-muted-foreground/75 px-1">
              Enter para enviar · Shift+Enter para nova linha
            </p>
          </footer>
        </aside>
      )}
    </>
  );
}
