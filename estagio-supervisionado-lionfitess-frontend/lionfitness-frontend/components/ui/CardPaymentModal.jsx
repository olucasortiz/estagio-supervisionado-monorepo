"use client";

import { useEffect, useRef, useState } from "react";
import { CreditCard, LoaderCircle, Lock } from "lucide-react";
import { getCardPaymentStatus, getMercadoPagoPublicKey, processCardPayment } from "../../services/api";
import { CreditCardForm } from "../payment/CreditCardForm";
import { CreditCardPreview } from "../payment/CreditCardPreview";
import { PaymentStatus } from "../payment/PaymentStatus";
import { formatBRL, PaymentSummary } from "../payment/PaymentSummary";
import Modal from "./Modal";

// Detecção visual da bandeira a partir dos primeiros dígitos. A identificação
// enviada ao backend continua sendo feita apenas depois da tokenização.
function detectBrand(number) {
  const clean = (number || "").replace(/\D/g, "");
  if (!clean) return "generic";
  if (/^4/.test(clean)) return "visa";
  if (/^(5[1-5]|2[2-7])/.test(clean)) return "master";
  if (/^(636368|438935|504175|451416|636297|5067|4576|4011)/.test(clean)) return "elo";
  if (/^(606282|3841)/.test(clean)) return "hipercard";
  if (/^3[47]/.test(clean)) return "amex";
  return "generic";
}

function createIdempotencyKey() {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }

  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (character) => {
    const random = Math.floor(Math.random() * 16);
    const value = character === "x" ? random : (random & 0x3) | 0x8;
    return value.toString(16);
  });
}

export default function CardPaymentModal({
  open,
  onClose,
  subscriptionId,
  amount,
  onSuccess,
  isAdmin = false,
  memberName = null,
  planName = null,
}) {
  const [cardNumber, setCardNumber] = useState("");
  const [cardholderName, setCardholderName] = useState("");
  const [expiration, setExpiration] = useState("");
  const [cvv, setCvv] = useState("");
  const [cpf, setCpf] = useState("");
  const [isFlipped, setIsFlipped] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [pendingMessage, setPendingMessage] = useState("");
  const [pendingTransactionId, setPendingTransactionId] = useState(null);
  const successTimerRef = useRef(null);
  const idempotencyKeyRef = useRef(createIdempotencyKey());
  const paymentAttemptRef = useRef(null);

  // Limpa a interface e os dados sensíveis sempre que o modal muda de ciclo.
  useEffect(() => {
    if (successTimerRef.current) clearTimeout(successTimerRef.current);
    successTimerRef.current = null;
    setCardNumber("");
    setCardholderName("");
    setExpiration("");
    setCvv("");
    setCpf("");
    setError("");
    setSuccessMessage("");
    setPendingMessage("");
    setPendingTransactionId(null);
    setLoading(false);
    setIsFlipped(false);
    idempotencyKeyRef.current = createIdempotencyKey();
    paymentAttemptRef.current = null;

    return () => {
      if (successTimerRef.current) clearTimeout(successTimerRef.current);
      successTimerRef.current = null;
    };
  }, [open]);

  useEffect(() => {
    if (!open || !pendingTransactionId || successMessage) return undefined;

    let active = true;

    const checkStatus = async () => {
      try {
        const response = await getCardPaymentStatus(pendingTransactionId);
        if (!active) return;

        const responseStatus = (response?.status || "").toUpperCase();
        if (responseStatus === "APPROVED") {
          setPendingMessage("");
          setPendingTransactionId(null);
          setSuccessMessage(response?.message || "Pagamento aprovado com sucesso! Sua assinatura foi renovada.");
          if (!successTimerRef.current) {
            successTimerRef.current = setTimeout(() => {
              successTimerRef.current = null;
              onSuccess?.();
              onClose?.();
            }, 2200);
          }
        } else if (responseStatus === "REJECTED") {
          setPendingMessage("");
          setPendingTransactionId(null);
          setError(response?.message || "Pagamento não autorizado pela emissora do cartão.");
          idempotencyKeyRef.current = createIdempotencyKey();
          paymentAttemptRef.current = null;
        }
      } catch {
        // Falhas transitórias de polling não alteram o estado do pagamento exibido.
      }
    };

    checkStatus();
    const intervalId = setInterval(checkStatus, 3000);

    return () => {
      active = false;
      clearInterval(intervalId);
    };
  }, [open, pendingTransactionId, successMessage, onSuccess, onClose]);

  const resetPaymentAttemptAfterEdit = () => {
    if (!paymentAttemptRef.current) return;
    paymentAttemptRef.current = null;
    idempotencyKeyRef.current = createIdempotencyKey();
  };

  const handleCardNumberChange = (event) => {
    resetPaymentAttemptAfterEdit();
    const raw = event.target.value.replace(/\D/g, "").slice(0, 16);
    setCardNumber(raw.replace(/(\d{4})(?=\d)/g, "$1 "));
  };

  const handleExpirationChange = (event) => {
    resetPaymentAttemptAfterEdit();
    let raw = event.target.value.replace(/\D/g, "").slice(0, 4);
    if (raw.length > 2) raw = `${raw.slice(0, 2)}/${raw.slice(2)}`;
    setExpiration(raw);
  };

  const handleCpfChange = (event) => {
    resetPaymentAttemptAfterEdit();
    let raw = event.target.value.replace(/\D/g, "").slice(0, 11);
    raw = raw
      .replace(/(\d{3})(\d)/, "$1.$2")
      .replace(/(\d{3})(\d)/, "$1.$2")
      .replace(/(\d{3})(\d{1,2})$/, "$1-$2");
    setCpf(raw);
  };

  // Carregamento dinâmico do SDK Mercado Pago JavaScript v2 já usado pelo fluxo real.
  const loadMercadoPagoSdk = () => {
    return new Promise((resolve, reject) => {
      if (typeof window !== "undefined" && window.MercadoPago) {
        resolve(window.MercadoPago);
        return;
      }

      const existingScript = document.getElementById("mp-sdk-v2");
      if (existingScript) {
        existingScript.addEventListener("load", () => resolve(window.MercadoPago), { once: true });
        existingScript.addEventListener("error", () => reject(new Error("Falha ao carregar SDK seguro do Mercado Pago.")), { once: true });
        return;
      }

      const script = document.createElement("script");
      script.id = "mp-sdk-v2";
      script.src = "https://sdk.mercadopago.com/js/v2";
      script.async = true;
      script.onload = () => resolve(window.MercadoPago);
      script.onerror = () => reject(new Error("Falha ao carregar SDK seguro do Mercado Pago."));
      document.body.appendChild(script);
    });
  };

  const handlePayment = async (event) => {
    event.preventDefault();
    if (loading || successMessage || pendingMessage) return;

    setError("");
    const cleanCardNumber = cardNumber.replace(/\D/g, "");
    if (cleanCardNumber.length < 13) {
      setError("Por favor, informe um número de cartão válido.");
      return;
    }
    if (!cardholderName.trim()) {
      setError("Por favor, informe o nome impresso no cartão.");
      return;
    }

    const cleanExp = expiration.replace(/\D/g, "");
    if (cleanExp.length !== 4) {
      setError("Por favor, informe a validade no formato MM/AA.");
      return;
    }
    const month = parseInt(cleanExp.slice(0, 2), 10);
    const year = parseInt(`20${cleanExp.slice(2)}`, 10);
    if (month < 1 || month > 12) {
      setError("Mês de validade inválido.");
      return;
    }

    const cleanCvv = cvv.replace(/\D/g, "");
    if (cleanCvv.length < 3 || cleanCvv.length > 4) {
      setError("Código de segurança (CVV) inválido.");
      return;
    }
    const cleanCpf = cpf.replace(/\D/g, "");
    if (cleanCpf.length !== 11) {
      setError("Por favor, informe um CPF válido com 11 dígitos.");
      return;
    }

    setLoading(true);

    try {
      let paymentAttempt = paymentAttemptRef.current;
      if (!paymentAttempt) {
        let publicKey = process.env.NEXT_PUBLIC_MP_PUBLIC_KEY;
        if (!publicKey) {
          try {
            const config = await getMercadoPagoPublicKey();
            publicKey = config?.publicKey;
          } catch {
            // A mensagem específica de configuração é exibida abaixo se ambos falharem.
          }
        }

        if (!publicKey) throw new Error("Chave de integração do Mercado Pago não configurada no ambiente.");

        const MpConstructor = await loadMercadoPagoSdk();
        if (!MpConstructor) throw new Error("Não foi possível inicializar o módulo de pagamento seguro.");

        const mp = new MpConstructor(publicKey, { locale: "pt-BR" });
        const bin = cleanCardNumber.slice(0, 8);
        const paymentMethodsResult = await mp.getPaymentMethods({ bin });
        const paymentMethods = Array.isArray(paymentMethodsResult)
          ? paymentMethodsResult
          : paymentMethodsResult?.results;
        const paymentMethod = paymentMethods?.find(
          (method) => method?.payment_type_id === "credit_card"
        );

        if (!paymentMethod?.id) {
          throw new Error("Este cartão não possui uma modalidade de crédito disponível para pagamento.");
        }

        // Os dados brutos seguem diretamente do navegador ao Mercado Pago. Somente
        // o token retornado é enviado à API Spring Boot.
        const cardTokenResult = await mp.createCardToken({
          cardNumber: cleanCardNumber,
          cardholderName: cardholderName.trim(),
          cardExpirationMonth: String(month).padStart(2, "0"),
          cardExpirationYear: String(year),
          securityCode: cleanCvv,
          identificationType: "CPF",
          identificationNumber: cleanCpf,
        });

        if (!cardTokenResult || !cardTokenResult.id) {
          throw new Error("Não foi possível validar os dados do cartão junto ao emissor.");
        }

        paymentAttempt = {
          token: cardTokenResult.id,
          paymentMethodId: paymentMethod.id,
        };
        paymentAttemptRef.current = paymentAttempt;
      }

      const payload = {
        subscriptionId,
        token: paymentAttempt.token,
        paymentMethodId: paymentAttempt.paymentMethodId,
        paymentTypeId: "credit_card",
        installments: 1,
        identificationType: "CPF",
        identificationNumber: cleanCpf,
      };

      const response = await processCardPayment(payload, idempotencyKeyRef.current);
      const responseStatus = (response?.status || "").toUpperCase();

      if (responseStatus === "APPROVED") {
        setSuccessMessage(response?.message || "Pagamento aprovado com sucesso! Sua assinatura foi renovada.");
        successTimerRef.current = setTimeout(() => {
          successTimerRef.current = null;
          onSuccess?.();
          onClose?.();
        }, 2200);
      } else if (responseStatus === "REJECTED") {
        setError(response?.message || "Pagamento não autorizado pela emissora do cartão.");
        idempotencyKeyRef.current = createIdempotencyKey();
        paymentAttemptRef.current = null;
      } else {
        // Tokenização concluída não equivale a pagamento aprovado. O status real
        // do backend é apresentado sem disparar o callback de sucesso.
        setPendingMessage(response?.message || "Pagamento em análise pelo Mercado Pago.");
        setPendingTransactionId(response?.transactionId || null);
      }
    } catch (err) {
      // Não registra o objeto de erro para evitar que respostas do SDK exponham
      // token ou dados sensíveis no console.
      console.error("[CardPaymentModal] Falha ao processar o pagamento.");
      setError(err?.message || "Não foi possível processar o pagamento com cartão. Tente novamente.");
    } finally {
      setLoading(false);
    }
  };

  const brand = detectBrand(cardNumber);
  const methodLabel = "Cartão de crédito";
  const viewState = successMessage ? "success" : pendingMessage ? "waiting" : error ? "error" : loading ? "processing" : "idle";
  const handleComplete = () => {
    if (successTimerRef.current) clearTimeout(successTimerRef.current);
    successTimerRef.current = null;
    onSuccess?.();
    onClose?.();
  };
  const subtitle = isAdmin && memberName
    ? <><span className="font-medium text-foreground">{memberName}</span>{planName ? ` · ${planName}` : ""}</>
    : "Crédito com tokenização segura";

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Pagamento com cartão"
      subtitle={subtitle}
      icon={<CreditCard className="size-5" />}
      variant="payment"
      size="xl"
      preventClose={loading || Boolean(successMessage)}
    >
      <form
        onSubmit={handlePayment}
        className="grid gap-6 p-5 sm:p-6 lg:grid-cols-[minmax(0,22rem)_minmax(0,1fr)] lg:gap-8"
      >
        <div className="grid content-start gap-4">
          <CreditCardPreview
            number={cardNumber}
            holder={cardholderName}
            expiry={expiration}
            cvv={cvv}
            brand={brand}
            flipped={isFlipped}
            onToggle={() => setIsFlipped((current) => !current)}
          />
          <PaymentSummary
            amount={amount}
            method={methodLabel}
            planName={planName}
            memberName={isAdmin ? memberName : null}
            installments={1}
          />
        </div>

        <div className="grid content-start gap-5">
          <PaymentStatus
            state={viewState}
            title={successMessage ? "Pagamento aprovado!" : pendingMessage ? "Pagamento em análise" : undefined}
            message={successMessage || pendingMessage || error || undefined}
          />

          {!successMessage && !pendingMessage ? (
            <CreditCardForm
              cardNumber={cardNumber}
              cardholderName={cardholderName}
              expiration={expiration}
              cvv={cvv}
              cpf={cpf}
              brand={brand}
              disabled={loading}
              onCardNumberChange={handleCardNumberChange}
              onCardholderNameChange={(value) => {
                resetPaymentAttemptAfterEdit();
                setCardholderName(value);
              }}
              onExpirationChange={handleExpirationChange}
              onCvvChange={(value) => {
                resetPaymentAttemptAfterEdit();
                setCvv(value);
              }}
              onCpfChange={handleCpfChange}
              onCvvFocus={() => setIsFlipped(true)}
              onCvvBlur={() => setIsFlipped(false)}
              onFrontFocus={() => setIsFlipped(false)}
            />
          ) : null}

          {successMessage || pendingMessage ? (
            <button
              type="button"
              onClick={successMessage ? handleComplete : onClose}
              className="h-12 rounded-xl bg-primary px-4 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary-strong focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
            >
              {successMessage ? "Concluir" : "Entendi"}
            </button>
          ) : (
            <button
              type="submit"
              disabled={loading}
              className="inline-flex h-12 items-center justify-center gap-2 rounded-xl bg-primary px-4 text-sm font-semibold text-primary-foreground shadow-lg transition-all hover:bg-primary-strong active:scale-[0.995] disabled:cursor-not-allowed disabled:opacity-65 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
            >
              {loading ? (
                <>
                  <LoaderCircle className="size-4 animate-spin" /> Processando com Mercado Pago...
                </>
              ) : (
                <>
                  <Lock className="size-4" /> Pagar {formatBRL(amount)}
                </>
              )}
            </button>
          )}

          <p className="flex items-center justify-center gap-1.5 text-center text-[0.68rem] text-muted-foreground">
            <Lock className="size-3.5" /> Dados tokenizados diretamente pelo Mercado Pago
          </p>
        </div>
      </form>
    </Modal>
  );
}
