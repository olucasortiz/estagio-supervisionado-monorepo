"use client";

import { useEffect, useRef, useState } from "react";
import { QrCode, TestTube2 } from "lucide-react";
import { generatePixTransaction, getPixTransactionStatus, simulateConfirmPix } from "../../services/api";
import { CopyPixCodeButton } from "../payment/CopyPixCodeButton";
import { PaymentStatus } from "../payment/PaymentStatus";
import { PaymentSummary } from "../payment/PaymentSummary";
import Modal from "./Modal";

export default function PixPaymentModal({
  open,
  onClose,
  subscriptionId,
  amount,
  onSuccess,
  isAdmin = false,
  memberName = null,
  planName = null,
}) {
  const [loading, setLoading] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [pixData, setPixData] = useState(null);
  const [error, setError] = useState("");
  const [copied, setCopied] = useState(false);
  const [successMessage, setSuccessMessage] = useState("");
  const [paymentStatus, setPaymentStatus] = useState("PENDING");
  const copyTimerRef = useRef(null);
  const successTimerRef = useRef(null);

  // Gera a cobrança real ao abrir. A API e o contrato existentes permanecem inalterados.
  useEffect(() => {
    if (!open || !subscriptionId) {
      if (copyTimerRef.current) clearTimeout(copyTimerRef.current);
      if (successTimerRef.current) clearTimeout(successTimerRef.current);
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
          setPaymentStatus((data?.status || "PENDING").toUpperCase());
        }
      } catch (err) {
        console.error("[PixPaymentModal] Falha ao gerar a cobrança Pix.");
        if (!ignore) {
          setError(err?.message || "Não foi possível gerar o Pix. Tente novamente em instantes.");
        }
      } finally {
        if (!ignore) setLoading(false);
      }
    };

    loadPix();
    return () => {
      ignore = true;
    };
  }, [open, subscriptionId, amount]);

  // Polling real: consulta o backend a cada 3 segundos enquanto a transação está pendente.
  useEffect(() => {
    const transactionId = pixData?.transactionId;
    if (!open || !transactionId || paymentStatus !== "PENDING") return;

    let cancelled = false;

    const checkStatus = async () => {
      try {
        const response = await getPixTransactionStatus(transactionId);
        if (cancelled) return;

        const currentStatus = (response?.status || "").toUpperCase();

        if (currentStatus === "APPROVED" || currentStatus === "CONFIRMED") {
          setPaymentStatus("APPROVED");
          setSuccessMessage("Pagamento aprovado com sucesso! Sua assinatura foi atualizada.");
          successTimerRef.current = setTimeout(() => {
            onSuccess?.();
            onClose?.();
          }, 1800);
        } else if (["REJECTED", "FAILED", "CANCELED"].includes(currentStatus)) {
          setPaymentStatus(currentStatus);
          setError(response?.message || "O pagamento via Pix não foi aprovado ou foi cancelado.");
        } else if (currentStatus === "EXPIRED") {
          setPaymentStatus("EXPIRED");
          setError(response?.message || "Esta cobrança Pix expirou.");
        }
      } catch (err) {
        // Falhas transitórias mantêm PENDING para que o próximo tick tente novamente.
        console.warn("[Pix Polling] Falha temporária na verificação de status:", err?.message || err);
      }
    };

    const intervalId = setInterval(checkStatus, 3000);
    return () => {
      cancelled = true;
      clearInterval(intervalId);
    };
  }, [open, pixData?.transactionId, paymentStatus, onSuccess, onClose]);

  useEffect(
    () => () => {
      if (copyTimerRef.current) clearTimeout(copyTimerRef.current);
      if (successTimerRef.current) clearTimeout(successTimerRef.current);
    },
    [],
  );

  const handleCopyCode = async () => {
    const codeToCopy = pixData?.qrCodePayload || pixData?.qrCode || pixData?.qr_code || "";
    if (!codeToCopy) return;

    try {
      if (typeof navigator !== "undefined" && navigator?.clipboard?.writeText) {
        await navigator.clipboard.writeText(codeToCopy);
      } else {
        throw new Error("Clipboard API indisponível");
      }
    } catch {
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
        textArea.remove();
        if (!successful) throw new Error("Fallback de cópia indisponível");
      } catch {
        setError("Não foi possível copiar automaticamente. Selecione o código e copie manualmente.");
        return;
      }
    }

    setCopied(true);
    if (copyTimerRef.current) clearTimeout(copyTimerRef.current);
    copyTimerRef.current = setTimeout(() => setCopied(false), 2500);
  };

  // Simulação acadêmica já existente, restrita ao fluxo administrativo.
  const handleSimulateConfirm = async () => {
    if (!pixData?.transactionId || confirming) return;
    setConfirming(true);
    setError("");
    try {
      await simulateConfirmPix(pixData.transactionId);
      setPaymentStatus("APPROVED");
      setSuccessMessage("Pagamento confirmado via simulação acadêmica! Assinatura renovada.");
      successTimerRef.current = setTimeout(() => {
        onSuccess?.();
        onClose?.();
      }, 1800);
    } catch (simErr) {
      console.error("[PixPaymentModal] Falha na simulação acadêmica.");
      setError(simErr?.message || "Falha ao simular confirmação de Pix.");
    } finally {
      setConfirming(false);
    }
  };

  const rawQrBase64 = pixData?.qrCodeBase64 || pixData?.qr_code_base64 || "";
  const qrImageSrc = rawQrBase64
    ? rawQrBase64.startsWith("data:")
      ? rawQrBase64
      : rawQrBase64.startsWith("/9j/")
        ? `data:image/jpeg;base64,${rawQrBase64}`
        : `data:image/png;base64,${rawQrBase64}`
    : null;
  const pixCopyCode = pixData?.qrCodePayload || pixData?.qrCode || pixData?.qr_code || "";
  const normalizedStatus = (paymentStatus || "").toUpperCase();
  const expired = normalizedStatus === "EXPIRED";
  const terminalError = ["REJECTED", "FAILED", "CANCELED"].includes(normalizedStatus);
  const displayAmount = pixData?.amount ?? amount;
  const handleComplete = () => {
    if (successTimerRef.current) clearTimeout(successTimerRef.current);
    onSuccess?.();
    onClose?.();
  };

  const viewState = loading
    ? "loading"
    : successMessage
      ? "success"
      : expired
        ? "expired"
        : error
          ? "error"
          : pixData
            ? "waiting"
            : "idle";

  const subtitle = isAdmin && memberName
    ? <><span className="font-medium text-foreground">{memberName}</span>{planName ? ` · ${planName}` : ""}</>
    : "Escaneie o QR Code ou use o Pix Copia e Cola";

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Pagamento via Pix"
      subtitle={subtitle}
      icon={<QrCode className="size-5" />}
      variant="payment"
      size="md"
      preventClose={Boolean(successMessage)}
    >
      <div className="grid gap-5 p-5 sm:p-6">
        <PaymentSummary
          amount={displayAmount}
          method="Pix"
          planName={planName}
          memberName={isAdmin ? memberName : null}
          transactionIdentifier={pixData?.transactionIdentifier}
          compact
        />

        <PaymentStatus
          state={viewState}
          title={successMessage ? "Pagamento aprovado!" : undefined}
          message={successMessage || error || undefined}
        />

        {!loading && pixData && !successMessage && !expired && !terminalError ? (
          <>
            <div className="mx-auto w-full max-w-[17rem] rounded-2xl border border-border bg-white p-4 shadow-sm animate-rise">
              {qrImageSrc ? (
                // O QR Code é uma data URL dinâmica retornada pelo backend; next/image
                // não oferece otimização útil para esse tipo de fonte.
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={qrImageSrc}
                  alt="QR Code Pix retornado pelo Mercado Pago"
                  className="mx-auto aspect-square w-full object-contain"
                />
              ) : (
                <div className="grid aspect-square w-full place-items-center rounded-xl bg-slate-50 text-center text-slate-500">
                  <div>
                    <QrCode className="mx-auto size-12" />
                    <p className="mt-2 text-xs font-medium">QR Code indisponível</p>
                  </div>
                </div>
              )}
              <p className="mt-3 text-center text-xs font-medium text-slate-600">Escaneie com o app do seu banco</p>
            </div>

            <div>
              <label htmlFor="pix-copy-code" className="mb-1.5 block text-sm font-medium text-foreground">
                Pix Copia e Cola
              </label>
              <textarea
                id="pix-copy-code"
                readOnly
                rows={3}
                value={pixCopyCode}
                onFocus={(event) => event.currentTarget.select()}
                className="w-full resize-none rounded-xl border border-input bg-muted/50 p-3 font-mono text-xs leading-relaxed text-muted-foreground outline-none focus:border-primary focus:ring-2 focus:ring-primary/15"
              />
              <div className="mt-3">
                <CopyPixCodeButton copied={copied} disabled={!pixCopyCode} onClick={handleCopyCode} />
              </div>
            </div>

            {isAdmin ? (
              <button
                type="button"
                onClick={handleSimulateConfirm}
                disabled={confirming}
                className="mx-auto inline-flex items-center gap-1.5 text-xs font-medium text-muted-foreground underline-offset-4 hover:text-foreground hover:underline disabled:cursor-not-allowed disabled:opacity-50"
              >
                <TestTube2 className="size-3.5" />
                {confirming ? "Simulando baixa..." : "Simular confirmação (ambiente acadêmico)"}
              </button>
            ) : null}
          </>
        ) : null}

        {successMessage || expired || terminalError ? (
          <button
            type="button"
            onClick={successMessage ? handleComplete : onClose}
            className="h-11 rounded-xl bg-primary px-4 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary-strong focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
          >
            {successMessage ? "Concluir" : "Fechar"}
          </button>
        ) : null}
      </div>
    </Modal>
  );
}
