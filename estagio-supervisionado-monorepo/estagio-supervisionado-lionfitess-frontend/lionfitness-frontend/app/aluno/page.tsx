"use client";

import { useState, useCallback } from "react";
import PlanoAlunoPage from "./PlanoAluno";
import PixPaymentModal from "@/components/ui/PixPaymentModal";

export default function AlunoPage() {
  const [pixOpen, setPixOpen] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);

  // Estado dinâmico: subscriptionId e amount vêm do backend via PlanoAluno
  const [subscriptionId, setSubscriptionId] = useState<string | null>(null);
  const [amount, setAmount]                 = useState<number | null>(null);

  /**
   * Callback chamado pelo PlanoAluno assim que GET /subscriptions/me responde.
   * Popula os dados reais para o PixPaymentModal.
   */
  const handleSubscriptionLoaded = useCallback(
    (subId: string, planPrice: number) => {
      setSubscriptionId(subId);
      setAmount(planPrice);
    },
    []
  );

  /**
   * Chamado quando o Pix for confirmado com sucesso (webhook ou simulação).
   * Fecha o modal e recarrega a Área do Aluno com os dados atualizados de assinatura.
   */
  const handlePaymentSuccess = useCallback(() => {
    setPixOpen(false);
    setRefreshKey((prev) => prev + 1);
  }, []);

  return (
    <>
      <PlanoAlunoPage
        key={refreshKey}
        onOpenPixModal={() => setPixOpen(true)}
        onSubscriptionLoaded={handleSubscriptionLoaded}
      />
      {subscriptionId && amount !== null && (
        <PixPaymentModal
          open={pixOpen}
          onClose={() => setPixOpen(false)}
          subscriptionId={subscriptionId}
          amount={amount}
          onSuccess={handlePaymentSuccess}
        />
      )}
    </>
  );
}
