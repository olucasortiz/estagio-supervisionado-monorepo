"use client";

import { useState, useCallback } from "react";
import PlanoAlunoPage from "./PlanoAluno";
import PixPaymentModal from "@/components/ui/PixPaymentModal";
import CardPaymentModal from "@/components/ui/CardPaymentModal";
import ProtectedRoute from "@/components/auth/ProtectedRoute";

export default function AlunoPage() {
  const [pixOpen, setPixOpen] = useState(false);
  const [cardOpen, setCardOpen] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);

  // Estado dinâmico: subscriptionId e amount vêm do backend via PlanoAluno
  const [subscriptionId, setSubscriptionId] = useState<string | null>(null);
  const [amount, setAmount]                 = useState<number | null>(null);

  /**
   * Callback chamado pelo PlanoAluno assim que GET /subscriptions/me responde.
   * Popula os dados reais para o PixPaymentModal e CardPaymentModal.
   */
  const handleSubscriptionLoaded = useCallback(
    (subId: string, planPrice: number) => {
      setSubscriptionId(subId);
      setAmount(planPrice);
    },
    []
  );

  /**
   * Chamado quando o Pix ou Cartão for confirmado com sucesso.
   * Fecha os modais e recarrega a Área do Aluno com os dados atualizados de assinatura.
   */
  const handlePaymentSuccess = useCallback(() => {
    setPixOpen(false);
    setCardOpen(false);
    setRefreshKey((prev) => prev + 1);
  }, []);

  return (
    <ProtectedRoute allowedRoles={["OPERATIONAL", "USER", "ADMIN"]}>
      <PlanoAlunoPage
        key={refreshKey}
        onOpenPixModal={() => setPixOpen(true)}
        onOpenCardModal={() => setCardOpen(true)}
        onSubscriptionLoaded={handleSubscriptionLoaded}
      />
      {pixOpen && subscriptionId && amount !== null && (
        <PixPaymentModal
          open={pixOpen}
          onClose={() => setPixOpen(false)}
          subscriptionId={subscriptionId}
          amount={amount}
          onSuccess={handlePaymentSuccess}
        />
      )}
      {cardOpen && subscriptionId && amount !== null && (
        <CardPaymentModal
          open={cardOpen}
          onClose={() => setCardOpen(false)}
          subscriptionId={subscriptionId}
          amount={amount}
          onSuccess={handlePaymentSuccess}
        />
      )}
    </ProtectedRoute>
  );
}

