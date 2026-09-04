"use client";

import { useEffect, useState } from "react";
import { Check, Copy, LoaderCircle, QrCode, ShieldCheck, X } from "lucide-react";
import { generatePixTransaction, getPixTransactionStatus, simulateConfirmPix } from "../../services/api";

function formatCurrency(val) {
  if (val == null) return "R$ 0,00";
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(Number(val));
}

export default function PixPaymentModal({ open, onClose, subscriptionId, amount, onSuccess, isAdmin = false, memberName = null, planName = null }) {
  const [loading, setLoading] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [pixData, setPixData] = useState(null);
  const [error, setError] = useState("");
  const [copied, setCopied] = useState(false);
  const [successMessage, setSuccessMessage] = useState("");
  const [paymentStatus, setPaymentStatus] = useState("PENDING");

  // 1. Gera a cobrança Pix ao abrir o modal
  useEffect(() => {
    if (!open || !subscriptionId) {
      setPixData(null);
      setError("");
      setSuccessMessage("");
      setCopied(false);
      setPaymentStatus("PENDING");
      return;
    }

    let ignore = false;

    const loadPix = async () => {
      setLoading(true);
      setError("");
      setSuccessMessage("");
      setPaymentStatus("PENDING");
      try {
        const data = await generatePixTransaction(subscriptionId, amount);
        if (!ignore) {
          setPixData(data);
          setPaymentStatus(data?.status || "PENDING");
        }
      } catch (err) {
        console.error(err);
        if (!ignore) {
          setError(err?.message || "Não foi possível gerar o Pix. Tente novamente em instantes.");
        }
      } finally {
        if (!ignore) {
          setLoading(false);
        }
      }
    };

    loadPix();

    return () => {
      ignore = true;
    };
  }, [open, subscriptionId]);

  // 2. Polling automático: consulta o backend a cada 3 segundos enquanto PENDING
  useEffect(() => {
    const transactionId = pixData?.transactionId;
    if (!open || !transactionId || paymentStatus !== "PENDING") {
      return;
    }

    let cancelled = false;

    const checkStatus = async () => {
      try {
        const response = await getPixTransactionStatus(transactionId);
        if (cancelled) return;

        const currentStatus = (response?.status || "").toUpperCase();

        if (currentStatus === "APPROVED" || currentStatus === "CONFIRMED") {
          setPaymentStatus("APPROVED");
          setSuccessMessage("Pagamento aprovado com sucesso! Sua assinatura foi atualizada.");

          // Aguarda 1.8 segundos para exibição do feedback visual e fecha com callback
          setTimeout(() => {
            if (!cancelled) {
              if (onSuccess) onSuccess();
              if (onClose) onClose();
            }
          }, 1800);
        } else if (currentStatus === "REJECTED" || currentStatus === "FAILED" || currentStatus === "CANCELED") {
          setPaymentStatus(currentStatus);
          setError("O pagamento via Pix não foi aprovado ou foi cancelado.");
        }
      } catch (err) {
        // Falhas transitórias de rede mantêm o status PENDING para nova tentativa no próximo tick
        console.warn("[Pix Polling] Falha temporária na verificação de status:", err?.message || err);
      }
    };

    const intervalId = setInterval(checkStatus, 3000);

    return () => {
      cancelled = true;
      clearInterval(intervalId);
    };
  }, [open, pixData?.transactionId, paymentStatus, onSuccess, onClose]);

  // Suporte a fechamento via tecla Escape
  useEffect(() => {
    if (!open) return;
    const handleKeyDown = (e) => {
      if (e.key === "Escape") {
        if (onClose) onClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [open, onClose]);

  // Se a propriedade open for falsa, não renderiza nada no DOM
  if (!open) {
    return null;
  }

  // 3. Ação de cópia do Pix Copia e Cola (com fallback para ambientes HTTP e navegadores legados)
  const handleCopyCode = async () => {
    const codeToCopy = pixData?.qrCodePayload || pixData?.qrCode || pixData?.qr_code || "";
    if (!codeToCopy) return;

    // Prioridade: Clipboard API padrão (funciona em HTTPS e localhost)
    try {
      if (typeof navigator !== "undefined" && navigator?.clipboard?.writeText) {
        await navigator.clipboard.writeText(codeToCopy);
        setCopied(true);
        setTimeout(() => setCopied(false), 2500);
        return;
      }
    } catch (clipErr) {
      console.warn("[PixPaymentModal] Clipboard API falhou, tentando fallback:", clipErr);
    }

    // Fallback: document.execCommand via elemento textarea temporário
    try {
      const textArea = document.createElement("textarea");
      textArea.value = codeToCopy;
      textArea.style.position = "fixed";
      textArea.style.left = "-999999px";
      textArea.style.top = "-999999px";
      document.body.appendChild(textArea);
      textArea.focus();
      textArea.select();
      const successful = document.execCommand("copy");
      document.body.removeChild(textArea);

      if (successful) {
        setCopied(true);
        setTimeout(() => setCopied(false), 2500);
      } else {
        console.error("[PixPaymentModal] Fallback execCommand retornou false");
      }
    } catch (fallbackErr) {
      console.error("[PixPaymentModal] Erro ao executar fallback de cópia:", fallbackErr);
    }
  };

  // 4. Simulação de confirmação (Exclusivo ADMIN para testes em ambiente acadêmico)
  const handleSimulateConfirm = async () => {
    if (!pixData?.transactionId || confirming) return;
    setConfirming(true);
    setError("");
    try {
      await simulateConfirmPix(pixData.transactionId);
      setPaymentStatus("APPROVED");
      setSuccessMessage("Pagamento confirmado via simulação acadêmica! Assinatura renovada.");
      setTimeout(() => {
        if (onSuccess) onSuccess();
        if (onClose) onClose();
      }, 1800);
    } catch (simErr) {
      console.error("[PixPaymentModal] Falha na simulação de confirmação:", simErr);
      setError(simErr?.message || "Falha ao simular confirmação de Pix.");
    } finally {
      setConfirming(false);
    }
  };

  // 5. Normalização robusta da imagem do QR Code
  const rawQrBase64 = pixData?.qrCodeBase64 || pixData?.qr_code_base64 || "";
  const qrImageSrc = rawQrBase64
    ? rawQrBase64.startsWith("data:")
      ? rawQrBase64
      : rawQrBase64.startsWith("/9j/")
        ? `data:image/jpeg;base64,${rawQrBase64}`
        : `data:image/png;base64,${rawQrBase64}`
    : null;

  const pixCopyCode = pixData?.qrCodePayload || pixData?.qrCode || pixData?.qr_code || "";

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-md animate-fade-in"
      onClick={(e) => {
        if (e.target === e.currentTarget && onClose) {
          onClose();
        }
      }}
    >
      <div 
        className="w-full max-w-lg rounded-[28px] bg-slate-900 border border-slate-800 text-slate-100 shadow-2xl overflow-hidden flex flex-col relative"
        style={{ padding: "32px" }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-start justify-between gap-4 border-b border-slate-800 pb-5">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-emerald-500/20 to-teal-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
              <QrCode className="h-6 w-6" />
            </div>
          <div>
            <h2 className="text-xl font-black text-white tracking-tight margin-0">Pagamento via Pix</h2>
            {isAdmin && memberName ? (
              <p className="text-xs text-slate-400 mt-0.5 margin-0">
                Aluno: <span className="font-semibold text-slate-200">{memberName}</span>
                {planName ? <> &mdash; Plano <span className="font-semibold text-slate-200">{planName}</span></> : null}
              </p>
            ) : (
              <p className="text-xs text-slate-400 mt-0.5 margin-0">Digitalize ou copie a chave para pagar</p>
            )}
          </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white flex items-center justify-center transition-colors cursor-pointer border border-slate-700"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Content Body */}
        <div className="py-6 flex flex-col gap-6">
          {loading && (
            <div className="py-12 flex flex-col items-center justify-center gap-3 text-slate-400">
              <LoaderCircle className="h-8 w-8 animate-spin text-emerald-400" />
              <span className="text-sm font-semibold">Gerando cobrança Pix via Mercado Pago...</span>
            </div>
          )}

          {error && (
            <div className="rounded-2xl bg-red-500/10 border border-red-500/30 p-4 text-xs text-red-200">
              {error}
            </div>
          )}

          {successMessage && (
            <div className="rounded-2xl bg-emerald-500/15 border border-emerald-500/40 p-5 flex items-center gap-3 text-emerald-300 animate-slide-up">
              <ShieldCheck className="h-7 w-7 text-emerald-400 flex-shrink-0" />
              <div>
                <h4 className="font-extrabold text-sm text-emerald-200">Sucesso!</h4>
                <p className="text-xs text-emerald-300/90 mt-0.5">{successMessage}</p>
              </div>
            </div>
          )}

          {!loading && pixData && !successMessage && (
            <>
              {/* Valor e Identificador */}
              <div className="rounded-2xl bg-slate-950 border border-slate-800/80 p-5 flex items-center justify-between">
                <div>
                  <span className="text-[10px] uppercase font-extrabold tracking-wider text-slate-400 block">Valor a Pagar</span>
                  <span className="text-2xl font-black text-emerald-400 mt-0.5 block">{formatCurrency(pixData.amount)}</span>
                </div>
                <div className="text-right">
                  <span className="text-[10px] uppercase font-extrabold tracking-wider text-slate-400 block">Identificador</span>
                  <span className="text-xs font-mono font-bold text-slate-300 mt-1 block truncate max-w-[160px]" title={pixData.transactionIdentifier}>
                    {pixData.transactionIdentifier}
                  </span>
                </div>
              </div>

              {/* QR Code Real — Mercado Pago */}
              <div className="flex flex-col items-center justify-center p-6 rounded-2xl bg-white border border-slate-700 shadow-inner">
                {qrImageSrc ? (
                  <img
                    src={qrImageSrc}
                    alt="QR Code Pix — escaneie com o app do seu banco"
                    className="w-48 h-48 object-contain rounded-lg"
                  />
                ) : (
                  <div className="w-48 h-48 rounded-lg bg-slate-100 flex flex-col items-center justify-center p-3 text-center">
                    <QrCode className="h-12 w-12 text-slate-400 mb-2" />
                    <span className="text-[10px] text-slate-400 font-medium">QR Code indisponível</span>
                  </div>
                )}
                <span className="text-[11px] font-semibold text-slate-500 mt-3">
                  Escaneie com o app do seu banco
                </span>
              </div>

              {/* Pix Copia e Cola */}
              <div>
                <label className="text-[11px] font-bold text-slate-300 uppercase tracking-wider block mb-2">
                  Pix Copia e Cola
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    readOnly
                    value={pixCopyCode}
                    className="flex-1 bg-slate-950 border border-slate-800 rounded-xl px-3 py-2.5 text-xs font-mono text-slate-300 focus:outline-none select-all"
                  />
                  <button
                    type="button"
                    onClick={handleCopyCode}
                    className={`px-4 py-2.5 rounded-xl font-bold text-xs transition-all flex items-center gap-1.5 cursor-pointer flex-shrink-0 ${
                      copied
                        ? "bg-emerald-500 text-white shadow-lg shadow-emerald-500/20"
                        : "bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700"
                    }`}
                  >
                    {copied ? (
                      <>
                        <Check className="h-4 w-4 text-white" /> Copiado!
                      </>
                    ) : (
                      <>
                        <Copy className="h-4 w-4" /> Copiar código
                      </>
                    )}
                  </button>
                </div>
              </div>

              {/* Indicador de Acompanhamento Automático em Tempo Real (Polling) */}
              <div className="border-t border-slate-800 pt-4 mt-2">
                <div className="rounded-2xl bg-emerald-500/10 border border-emerald-500/20 p-4 flex items-center gap-3.5 text-emerald-300">
                  <LoaderCircle className="h-5 w-5 animate-spin text-emerald-400 flex-shrink-0" />
                  <div>
                    <h5 className="font-bold text-xs text-emerald-200 margin-0">Aguardando pagamento...</h5>
                    <p className="text-[11px] text-slate-400 mt-1 margin-0 leading-relaxed">
                      Após realizar o Pix no app do seu banco, a confirmação ocorre automaticamente. Esta tela será atualizada em instantes.
                    </p>
                  </div>
                </div>

                {isAdmin && (
                  <div className="mt-3 text-center">
                    <button
                      type="button"
                      onClick={handleSimulateConfirm}
                      disabled={confirming}
                      className="text-[10px] text-slate-500 hover:text-slate-300 transition-colors cursor-pointer bg-transparent border-0 underline"
                    >
                      {confirming ? "Simulando baixa..." : "🧪 Simular confirmação (Ambiente acadêmico/teste)"}
                    </button>
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
