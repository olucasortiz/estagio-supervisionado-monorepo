"use client";

import { useEffect, useState } from "react";
import { Check, Copy, LoaderCircle, QrCode, ShieldCheck, Sparkles, X } from "lucide-react";
import { generatePixTransaction, simulateConfirmPix } from "../../services/api";

function formatCurrency(val) {
  if (val == null) return "R$ 0,00";
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(Number(val));
}

export default function PixPaymentModal({ open, onClose, subscriptionId, amount, onSuccess }) {
  const [loading, setLoading] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [pixData, setPixData] = useState(null);
  const [error, setError] = useState("");
  const [copied, setCopied] = useState(false);
  const [successMessage, setSuccessMessage] = useState("");

  useEffect(() => {
    if (!open || !subscriptionId) {
      setPixData(null);
      setError("");
      setSuccessMessage("");
      setCopied(false);
      return;
    }

    let ignore = false;

    const loadPix = async () => {
      setLoading(true);
      setError("");
      setSuccessMessage("");
      try {
        const data = await generatePixTransaction(subscriptionId, amount);
        if (!ignore) {
          setPixData(data);
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

  if (!open) return null;

  const handleCopyCode = async () => {
    if (!pixData?.qrCodePayload) return;
    try {
      await navigator.clipboard.writeText(pixData.qrCodePayload);
      setCopied(true);
      setTimeout(() => setCopied(false), 3000);
    } catch (err) {
      console.error("Erro ao copiar código:", err);
    }
  };

  const handleSimulateConfirm = async () => {
    if (!pixData?.transactionId) return;

    setConfirming(true);
    setError("");
    try {
      await simulateConfirmPix(pixData.transactionId);
      setSuccessMessage("Pagamento aprovado com sucesso! Sua mensalidade foi atualizada.");
      
      setTimeout(() => {
        if (onSuccess) onSuccess();
        if (onClose) onClose();
      }, 1800);
    } catch (err) {
      console.error(err);
      setError(err?.message || "Não foi possível simular a confirmação do pagamento.");
    } finally {
      setConfirming(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-md animate-fade-in">
      <div 
        className="w-full max-w-lg rounded-[28px] bg-slate-900 border border-slate-800 text-slate-100 shadow-2xl overflow-hidden flex flex-col relative"
        style={{ padding: "32px" }}
      >
        {/* Header */}
        <div className="flex items-start justify-between gap-4 border-b border-slate-800 pb-5">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-emerald-500/20 to-teal-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
              <QrCode className="h-6 w-6" />
            </div>
            <div>
              <h2 className="text-xl font-black text-white tracking-tight margin-0">Pagamento via Pix</h2>
              <p className="text-xs text-slate-400 mt-0.5 margin-0">Digitalize ou copie a chave para pagar</p>
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
              <span className="text-sm font-semibold">Gerando transação Pix simulada...</span>
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

              {/* QR Code Simulado Graphic */}
              <div className="flex flex-col items-center justify-center p-6 rounded-2xl bg-white text-slate-900 border border-slate-700 shadow-inner">
                <div className="w-44 h-44 rounded-xl bg-slate-100 border-2 border-slate-900 p-2 flex flex-col items-center justify-center relative">
                  <svg className="w-full h-full text-slate-900" viewBox="0 0 100 100" fill="currentColor">
                    {/* Abstract QR code shapes pattern */}
                    <rect x="5" y="5" width="25" height="25" rx="3" fill="#0f172a" />
                    <rect x="10" y="10" width="15" height="15" fill="#ffffff" />
                    <rect x="13" y="13" width="9" height="9" fill="#0f172a" />

                    <rect x="70" y="5" width="25" height="25" rx="3" fill="#0f172a" />
                    <rect x="75" y="10" width="15" height="15" fill="#ffffff" />
                    <rect x="78" y="13" width="9" height="9" fill="#0f172a" />

                    <rect x="5" y="70" width="25" height="25" rx="3" fill="#0f172a" />
                    <rect x="10" y="75" width="15" height="15" fill="#ffffff" />
                    <rect x="13" y="78" width="9" height="9" fill="#0f172a" />

                    {/* Data pixels simulation */}
                    <rect x="35" y="10" width="8" height="8" />
                    <rect x="48" y="10" width="8" height="8" />
                    <rect x="35" y="25" width="8" height="8" />
                    <rect x="10" y="38" width="8" height="8" />
                    <rect x="25" y="38" width="8" height="8" />
                    <rect x="40" y="38" width="8" height="8" />
                    <rect x="55" y="38" width="8" height="8" />
                    <rect x="70" y="38" width="8" height="8" />
                    <rect x="85" y="38" width="8" height="8" />
                    <rect x="38" y="52" width="12" height="12" rx="2" fill="#059669" />
                    <rect x="60" y="55" width="8" height="8" />
                    <rect x="75" y="55" width="8" height="8" />
                    <rect x="48" y="70" width="8" height="8" />
                    <rect x="65" y="70" width="12" height="12" />
                    <rect x="82" y="70" width="8" height="8" />
                    <rect x="48" y="85" width="8" height="8" />
                    <rect x="82" y="85" width="8" height="8" />
                  </svg>
                </div>
                <span className="text-[11px] font-bold text-slate-600 mt-2 flex items-center gap-1">
                  <Sparkles className="h-3 w-3 text-emerald-600" /> QR Code Simulado Lion Fitness
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
                    value={pixData.qrCodePayload || ""}
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

              {/* Botão de Simulação para Testes Acadêmicos */}
              <div className="border-t border-slate-800 pt-4 mt-2">
                <button
                  type="button"
                  onClick={handleSimulateConfirm}
                  disabled={confirming}
                  className="w-full py-3 px-4 rounded-xl font-black text-xs text-white bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 shadow-lg shadow-emerald-600/25 transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                >
                  {confirming ? (
                    <>
                      <LoaderCircle className="h-4 w-4 animate-spin" /> Processando aprovação...
                    </>
                  ) : (
                    <>
                      <ShieldCheck className="h-4 w-4" /> Confirmar Pagamento Pix (Simular Aprovação)
                    </>

                  )}
                </button>
                <p className="text-[10px] text-center text-slate-500 mt-2">
                  Ambiente acadêmico: clique no botão acima para simular a baixa automática do Pix.
                </p>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
