"use client";

import { useEffect, useState, useId } from "react";
import { 
  CreditCard, 
  Lock, 
  ShieldCheck, 
  X, 
  LoaderCircle, 
  AlertCircle, 
  Calendar, 
  User, 
  Hash, 
  FileText 
} from "lucide-react";
import { processCardPayment, getMercadoPagoPublicKey } from "../../services/api";

function formatCurrency(val) {
  if (val == null) return "R$ 0,00";
  return Number(val).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

// Detecção simples e segura da bandeira a partir dos primeiros dígitos
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

// Logo SVG estilizado de cada bandeira
function BrandLogo({ brand }) {
  switch (brand) {
    case "visa":
      return (
        <span className="font-black italic text-xl tracking-tighter text-white drop-shadow">
          VISA
        </span>
      );
    case "master":
      return (
        <div className="flex items-center -space-x-2">
          <div className="w-6 h-6 rounded-full bg-red-500/90 shadow-sm" />
          <div className="w-6 h-6 rounded-full bg-amber-400/90 shadow-sm" />
        </div>
      );
    case "elo":
      return (
        <span className="font-extrabold text-lg text-amber-300 drop-shadow flex items-center gap-0.5">
          <span className="text-red-400">e</span><span className="text-blue-400">l</span><span className="text-amber-300">o</span>
        </span>
      );
    case "hipercard":
      return (
        <span className="font-black text-sm bg-red-700 text-white px-2 py-0.5 rounded tracking-tighter shadow-sm">
          HIPERCARD
        </span>
      );
    case "amex":
      return (
        <span className="font-bold text-xs bg-blue-600 text-white px-2 py-0.5 rounded tracking-wider shadow-sm">
          AMEX
        </span>
      );
    default:
      return <CreditCard className="w-6 h-6 text-slate-300" />;
  }
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
  const modalTitleId = useId();
  // Dados do formulário (apenas representação visual / inputs)
  const [paymentType, setPaymentType] = useState("credit_card"); // 'credit_card' ou 'debit_card'
  const [cardNumber, setCardNumber] = useState("");
  const [cardholderName, setCardholderName] = useState("");
  const [expiration, setExpiration] = useState("");
  const [cvv, setCvv] = useState("");
  const [cpf, setCpf] = useState("");
  const [installments, setInstallments] = useState(1);

  // Estados da interface
  const [isFlipped, setIsFlipped] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  // Fechamento via ESC
  useEffect(() => {
    if (!open) return;
    const handleKeyDown = (e) => {
      if (e.key === "Escape" && !loading) {
        if (onClose) onClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [open, loading, onClose]);

  // Reset de estados ao abrir/fechar
  useEffect(() => {
    if (open) {
      setError("");
      setSuccessMessage("");
      setLoading(false);
      setIsFlipped(false);
    }
  }, [open]);

  // Se open for falso, não renderiza absolutamente nada no DOM
  if (!open) {
    return null;
  }

  // Formatação de Número do Cartão (agrupa de 4 em 4)
  const handleCardNumberChange = (e) => {
    const raw = e.target.value.replace(/\D/g, "").slice(0, 16);
    const formatted = raw.replace(/(\d{4})(?=\d)/g, "$1 ");
    setCardNumber(formatted);
  };

  // Formatação de Validade (MM/AA)
  const handleExpirationChange = (e) => {
    let raw = e.target.value.replace(/\D/g, "").slice(0, 4);
    if (raw.length > 2) {
      raw = raw.slice(0, 2) + "/" + raw.slice(2);
    }
    setExpiration(raw);
  };

  // Formatação de CPF (000.000.000-00)
  const handleCpfChange = (e) => {
    let raw = e.target.value.replace(/\D/g, "").slice(0, 11);
    raw = raw
      .replace(/(\d{3})(\d)/, "$1.$2")
      .replace(/(\d{3})(\d)/, "$1.$2")
      .replace(/(\d{3})(\d{1,2})$/, "$1-$2");
    setCpf(raw);
  };

  // Carregamento dinâmico do SDK Mercado Pago JS v2
  const loadMercadoPagoSdk = () => {
    return new Promise((resolve, reject) => {
      if (typeof window !== "undefined" && window.MercadoPago) {
        resolve(window.MercadoPago);
        return;
      }
      const existingScript = document.getElementById("mp-sdk-v2");
      if (existingScript) {
        existingScript.onload = () => resolve(window.MercadoPago);
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

  // Submissão do Pagamento com Cartão
  const handlePayment = async (e) => {
    e.preventDefault();
    if (loading) return;

    setError("");

    // Validações básicas de preenchimento
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
    const year = parseInt("20" + cleanExp.slice(2), 10);
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
      // 1. Obter Public Key do Mercado Pago (via env ou endpoint seguro do backend)
      let publicKey = process.env.NEXT_PUBLIC_MP_PUBLIC_KEY;
      if (!publicKey) {
        try {
          const config = await getMercadoPagoPublicKey();
          publicKey = config?.publicKey;
        } catch {
          // segue com fallback
        }
      }

      if (!publicKey) {
        throw new Error("Chave de integração do Mercado Pago não configurada no ambiente.");
      }

      // 2. Carregar SDK Mercado Pago no browser
      const MpConstructor = await loadMercadoPagoSdk();
      if (!MpConstructor) {
        throw new Error("Não foi possível inicializar o módulo de pagamento seguro.");
      }

      const mp = new MpConstructor(publicKey, { locale: "pt-BR" });

      // 3. TOKENIZAÇÃO SEGURA DO CARTÃO DIRETAMENTE NO MERCADO PAGO
      // NOTA CRUCIAL DE SEGURANÇA: Os dados brutos do cartão são enviados DIRETAMENTE
      // pelo browser aos servidores do Mercado Pago. NUNCA passam pelo backend Spring Boot!
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

      const token = cardTokenResult.id;
      const detectedBrand = detectBrand(cleanCardNumber);
      const paymentMethodId = detectedBrand !== "generic" ? detectedBrand : "visa";

      // 4. Enviar APENAS o token e dados seguros para a nossa API Spring Boot
      const payload = {
        subscriptionId,
        token,
        paymentMethodId,
        paymentTypeId: paymentType,
        installments: paymentType === "credit_card" ? parseInt(installments, 10) : 1,
        identificationType: "CPF",
        identificationNumber: cleanCpf,
      };

      const response = await processCardPayment(payload);

      if (response?.status === "APPROVED") {
        setSuccessMessage("Pagamento aprovado com sucesso! Sua assinatura foi renovada.");
        setTimeout(() => {
          if (onSuccess) onSuccess();
          if (onClose) onClose();
        }, 2200);
      } else if (response?.status === "REJECTED") {
        setError(response?.message || "Pagamento não autorizado pela emissora do cartão.");
      } else {
        setSuccessMessage(response?.message || "Pagamento em análise pelo Mercado Pago.");
        setTimeout(() => {
          if (onSuccess) onSuccess();
          if (onClose) onClose();
        }, 2500);
      }
    } catch (err) {
      console.error("[CardPaymentModal] Erro ao processar cartão:", err);
      setError(err?.message || "Não foi possível processar o pagamento com cartão. Tente novamente.");
    } finally {
      setLoading(false);
    }
  };

  const brand = detectBrand(cardNumber);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-md animate-fade-in overflow-y-auto"
      onClick={(e) => {
        if (e.target === e.currentTarget && !loading && onClose) {
          onClose();
        }
      }}
    >
      <div
        className="w-full max-w-lg rounded-[28px] bg-slate-900 border border-slate-800 text-slate-100 shadow-2xl overflow-hidden flex flex-col relative my-8"
        style={{ padding: "30px" }}
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby={modalTitleId}
      >
        {/* Header do Modal */}
        <div className="flex items-start justify-between gap-4 border-b border-slate-800 pb-4">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-blue-500/20 to-indigo-500/10 border border-blue-500/30 flex items-center justify-center text-blue-400">
              <CreditCard className="h-5 w-5" />
            </div>
            <div>
              <h2 id={modalTitleId} className="text-xl font-black text-white tracking-tight m-0">Pagamento com Cartão</h2>
              {isAdmin && memberName ? (
                <p className="text-xs text-slate-400 mt-0.5 m-0">
                  Aluno: <span className="font-semibold text-slate-200">{memberName}</span>
                  {planName ? <> &mdash; Plano <span className="font-semibold text-slate-200">{planName}</span></> : null}
                </p>
              ) : (
                <p className="text-xs text-slate-400 mt-0.5 m-0">Crédito ou Débito direto e seguro</p>
              )}
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            disabled={loading}
            className="w-8 h-8 rounded-full bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white flex items-center justify-center transition-colors cursor-pointer border border-slate-700 disabled:opacity-50"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* ========================================================================= */}
        {/* TEMPLATE VISUAL DO CARTÃO 3D (FRENTE E VERSO COM ANIMAÇÃO FLIP) */}
        {/* ========================================================================= */}
        <div className="pt-6 pb-4 flex justify-center" style={{ perspective: "1000px" }}>
          <div
            className="w-full max-w-[360px] h-[200px] rounded-2xl relative shadow-2xl transition-transform duration-700 cursor-pointer"
            style={{
              transformStyle: "preserve-3d",
              transform: isFlipped ? "rotateY(180deg)" : "rotateY(0deg)",
            }}
            onClick={() => setIsFlipped(!isFlipped)}
          >
            {/* ─── FRENTE DO CARTÃO ───────────────────────────────────────── */}
            <div
              className="absolute inset-0 rounded-2xl p-5 flex flex-col justify-between overflow-hidden border border-slate-700/60 bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-900 text-white shadow-xl"
              style={{
                backfaceVisibility: "hidden",
                WebkitBackfaceVisibility: "hidden",
              }}
            >
              {/* Efeito sutil de brilho metálico */}
              <div className="absolute -top-12 -right-12 w-40 h-40 bg-indigo-500/10 rounded-full blur-2xl pointer-events-none" />

              {/* Linha Superior: Chip + Ícone Contactless + Bandeira */}
              <div className="flex items-center justify-between z-10">
                <div className="flex items-center gap-3">
                  {/* Chip metálico moderno */}
                  <div className="w-10 h-7 rounded-md bg-gradient-to-br from-amber-200 via-yellow-400 to-amber-600 border border-amber-300 shadow-inner flex flex-col justify-around p-0.5">
                    <div className="w-full h-px bg-amber-700/40" />
                    <div className="w-full h-px bg-amber-700/40" />
                  </div>
                  {/* Ícone Contactless / NFC */}
                  <svg className="w-4 h-4 text-slate-400/80" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12a4 4 0 018 0M6 9a7 7 0 0112 0M4 6a10 10 0 0116 0" />
                  </svg>
                </div>
                <div className="h-7 flex items-center">
                  <BrandLogo brand={brand} />
                </div>
              </div>

              {/* Centro: Número do Cartão */}
              <div className="z-10 py-1">
                <div className="font-mono text-lg md:text-xl font-bold tracking-[0.2em] text-slate-100 drop-shadow">
                  {cardNumber || "•••• •••• •••• ••••"}
                </div>
              </div>

              {/* Linha Inferior: Titular e Validade */}
              <div className="flex items-end justify-between z-10">
                <div className="max-w-[70%]">
                  <span className="text-[9px] uppercase font-bold tracking-wider text-slate-400 block">Titular</span>
                  <span className="text-xs font-semibold tracking-wider text-slate-100 uppercase truncate block">
                    {cardholderName || "NOME DO TITULAR"}
                  </span>
                </div>
                <div className="text-right">
                  <span className="text-[9px] uppercase font-bold tracking-wider text-slate-400 block">Validade</span>
                  <span className="text-xs font-semibold tracking-wider text-slate-100 font-mono block">
                    {expiration || "MM/AA"}
                  </span>
                </div>
              </div>
            </div>

            {/* ─── VERSO DO CARTÃO ────────────────────────────────────────── */}
            <div
              className="absolute inset-0 rounded-2xl flex flex-col justify-between overflow-hidden border border-slate-700/60 bg-gradient-to-br from-slate-900 via-slate-950 to-indigo-950 text-white shadow-xl"
              style={{
                backfaceVisibility: "hidden",
                WebkitBackfaceVisibility: "hidden",
                transform: "rotateY(180deg)",
              }}
            >
              {/* Tarja magnética */}
              <div className="w-full h-10 bg-black mt-4 shadow-sm" />

              {/* Faixa de assinatura com o CVV */}
              <div className="px-5 my-auto">
                <div className="text-[9px] uppercase font-bold tracking-wider text-slate-400 mb-1 text-right">
                  Código de Segurança
                </div>
                <div className="h-8 bg-slate-200 rounded flex items-center justify-end px-3">
                  <span className="font-mono text-sm font-bold tracking-widest text-slate-900">
                    {cvv ? "•••" : ""}
                  </span>
                </div>
              </div>

              {/* Rodapé do verso */}
              <div className="px-5 pb-4 flex items-center justify-between text-[10px] text-slate-500">
                <span>Lion Fitness Card</span>
                <BrandLogo brand={brand} />
              </div>
            </div>
          </div>
        </div>

        {/* Alternador Crédito / Débito */}
        <div className="grid grid-cols-2 gap-2 mt-2 mb-4 bg-slate-950 p-1.5 rounded-xl border border-slate-800">
          <button
            type="button"
            onClick={() => setPaymentType("credit_card")}
            className={`py-2 text-xs font-extrabold rounded-lg transition-all cursor-pointer ${
              paymentType === "credit_card"
                ? "bg-blue-600 text-white shadow-sm"
                : "text-slate-400 hover:text-white"
            }`}
          >
            Cartão de Crédito
          </button>
          <button
            type="button"
            onClick={() => {
              setPaymentType("debit_card");
              setInstallments(1);
            }}
            className={`py-2 text-xs font-extrabold rounded-lg transition-all cursor-pointer ${
              paymentType === "debit_card"
                ? "bg-blue-600 text-white shadow-sm"
                : "text-slate-400 hover:text-white"
            }`}
          >
            Cartão de Débito
          </button>
        </div>

        {/* Mensagens de Sucesso ou Erro */}
        {error && (
          <div className="mb-4 rounded-xl bg-red-500/15 border border-red-500/30 p-3.5 flex items-start gap-2.5 text-xs text-red-200 animate-fade-in">
            <AlertCircle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        {successMessage && (
          <div className="mb-4 rounded-xl bg-emerald-500/15 border border-emerald-500/40 p-4 flex items-center gap-3 text-emerald-200 animate-slide-up">
            <ShieldCheck className="w-6 h-6 text-emerald-400 shrink-0" />
            <div>
              <h4 className="font-extrabold text-sm text-emerald-200">Aprovado!</h4>
              <p className="text-xs text-emerald-300/90 mt-0.5">{successMessage}</p>
            </div>
          </div>
        )}

        {/* Formulário de Dados */}
        <form onSubmit={handlePayment} className="flex flex-col gap-3">
          {/* Número do Cartão */}
          <div>
            <label className="text-[11px] font-bold text-slate-300 uppercase tracking-wider block mb-1">
              Número do Cartão
            </label>
            <div className="relative">
              <input
                type="text"
                value={cardNumber}
                onChange={handleCardNumberChange}
                placeholder="0000 0000 0000 0000"
                maxLength={19}
                disabled={loading}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-sm font-mono text-white placeholder:text-slate-600 focus:outline-none focus:border-blue-500 transition-colors"
                required
              />
              <div className="absolute right-3.5 top-1/2 -translate-y-1/2">
                <BrandLogo brand={brand} />
              </div>
            </div>
          </div>

          {/* Nome do Titular */}
          <div>
            <label className="text-[11px] font-bold text-slate-300 uppercase tracking-wider block mb-1">
              Nome do Titular (como impresso no cartão)
            </label>
            <div className="relative">
              <input
                type="text"
                value={cardholderName}
                onChange={(e) => setCardholderName(e.target.value.toUpperCase())}
                placeholder="NOME COMPLETO"
                disabled={loading}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-sm text-white placeholder:text-slate-600 focus:outline-none focus:border-blue-500 transition-colors uppercase"
                required
              />
              <User className="w-4 h-4 text-slate-600 absolute right-3.5 top-1/2 -translate-y-1/2" />
            </div>
          </div>

          {/* Validade e CVV lado a lado */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-[11px] font-bold text-slate-300 uppercase tracking-wider block mb-1">
                Validade
              </label>
              <div className="relative">
                <input
                  type="text"
                  value={expiration}
                  onChange={handleExpirationChange}
                  placeholder="MM/AA"
                  maxLength={5}
                  disabled={loading}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-sm font-mono text-white placeholder:text-slate-600 focus:outline-none focus:border-blue-500 transition-colors"
                  required
                />
                <Calendar className="w-4 h-4 text-slate-600 absolute right-3.5 top-1/2 -translate-y-1/2" />
              </div>
            </div>

            <div>
              <label className="text-[11px] font-bold text-slate-300 uppercase tracking-wider block mb-1">
                CVV
              </label>
              <div className="relative">
                <input
                  type="password"
                  value={cvv}
                  onChange={(e) => setCvv(e.target.value.replace(/\D/g, "").slice(0, 4))}
                  onFocus={() => setIsFlipped(true)}
                  onBlur={() => setIsFlipped(false)}
                  placeholder="123"
                  maxLength={4}
                  disabled={loading}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-sm font-mono text-white placeholder:text-slate-600 focus:outline-none focus:border-blue-500 transition-colors"
                  required
                />
                <Lock className="w-4 h-4 text-slate-600 absolute right-3.5 top-1/2 -translate-y-1/2" />
              </div>
            </div>
          </div>

          {/* CPF do Titular */}
          <div>
            <label className="text-[11px] font-bold text-slate-300 uppercase tracking-wider block mb-1">
              CPF do Titular
            </label>
            <div className="relative">
              <input
                type="text"
                value={cpf}
                onChange={handleCpfChange}
                placeholder="000.000.000-00"
                maxLength={14}
                disabled={loading}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-sm font-mono text-white placeholder:text-slate-600 focus:outline-none focus:border-blue-500 transition-colors"
                required
              />
              <FileText className="w-4 h-4 text-slate-600 absolute right-3.5 top-1/2 -translate-y-1/2" />
            </div>
          </div>

          {/* Parcelas (Exclusivo Crédito) */}
          {paymentType === "credit_card" && (
            <div>
              <label className="text-[11px] font-bold text-slate-300 uppercase tracking-wider block mb-1">
                Parcelamento
              </label>
              <select
                value={installments}
                onChange={(e) => setInstallments(Number(e.target.value))}
                disabled={loading}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-sm text-white focus:outline-none focus:border-blue-500 transition-colors cursor-pointer"
              >
                <option value={1}>1x de {formatCurrency(amount)} (à vista)</option>
                {amount && amount >= 30 && (
                  <>
                    <option value={2}>2x de {formatCurrency(amount / 2)} sem juros</option>
                    <option value={3}>3x de {formatCurrency(amount / 3)} sem juros</option>
                  </>
                )}
                {amount && amount >= 60 && (
                  <>
                    <option value={4}>4x de {formatCurrency(amount / 4)} sem juros</option>
                    <option value={5}>5x de {formatCurrency(amount / 5)} sem juros</option>
                    <option value={6}>6x de {formatCurrency(amount / 6)} sem juros</option>
                  </>
                )}
              </select>
            </div>
          )}

          {/* Botão de Ação / Pagar */}
          <button
            type="submit"
            disabled={loading}
            className="mt-3 w-full py-3.5 px-4 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-extrabold text-sm tracking-wide transition-all shadow-lg shadow-blue-600/25 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {loading ? (
              <>
                <LoaderCircle className="w-4 h-4 animate-spin text-white" />
                <span>Processando com Mercado Pago...</span>
              </>
            ) : (
              <>
                <Lock className="w-4 h-4 text-blue-200" />
                <span>Pagar {formatCurrency(amount)}</span>
              </>
            )}
          </button>

          <p className="text-[10px] text-center text-slate-500 mt-1 flex items-center justify-center gap-1">
            <Lock className="w-3 h-3 text-slate-500" />
            Pagamento 100% criptografado e seguro via Mercado Pago
          </p>
        </form>
      </div>
    </div>
  );
}
