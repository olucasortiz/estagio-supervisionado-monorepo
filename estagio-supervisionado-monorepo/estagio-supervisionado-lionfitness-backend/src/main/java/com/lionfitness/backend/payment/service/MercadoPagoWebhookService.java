package com.lionfitness.backend.payment.service;

import java.time.LocalDateTime;
import java.util.Map;

import com.lionfitness.backend.payment.model.OnlinePaymentTransaction;
import com.lionfitness.backend.payment.repository.OnlinePaymentRepository;
import com.lionfitness.backend.payment.repository.PaymentRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatusCode;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.client.RestClient;
import org.springframework.web.client.RestClientException;
import org.springframework.web.client.RestClientResponseException;

/**
 * Serviço responsável por processar as notificações (webhooks) do Mercado Pago.
 *
 * <p>Fluxo executado a cada notificação recebida:
 * <ol>
 *   <li>Recebe o ID do pagamento extraído do payload do webhook.</li>
 *   <li>Consulta a API do Mercado Pago ({@code GET /v1/payments/{id}}) para obter o status real.</li>
 *   <li>Se {@code status == "approved"}, localiza a transação interna pelo
 *       {@code transaction_identifier} (que armazena o ID externo do MP) e atualiza
 *       o status da {@code OnlinePaymentTransaction} para {@code APPROVED} e do
 *       {@code Payment} vinculado para {@code PAID}.</li>
 *   <li>Registra logs estruturados em todos os estágios.</li>
 * </ol>
 */
import com.lionfitness.backend.subscription.repository.SubscriptionRepository;

@Service
public class MercadoPagoWebhookService {

    private static final Logger logger = LoggerFactory.getLogger(MercadoPagoWebhookService.class);
    private static final String MERCADO_PAGO_PAYMENTS_URL = "https://api.mercadopago.com/v1/payments/";
    private static final String STATUS_APPROVED = "approved";

    @Value("${mercado.pago.access-token}")
    private String accessToken;

    private final OnlinePaymentRepository onlinePaymentRepository;
    private final PaymentRepository paymentRepository;
    private final SubscriptionRepository subscriptionRepository;
    private final RestClient restClient;

    public MercadoPagoWebhookService(
            OnlinePaymentRepository onlinePaymentRepository,
            PaymentRepository paymentRepository,
            SubscriptionRepository subscriptionRepository,
            RestClient.Builder restClientBuilder
    ) {
        this.onlinePaymentRepository = onlinePaymentRepository;
        this.paymentRepository = paymentRepository;
        this.subscriptionRepository = subscriptionRepository;
        this.restClient = restClientBuilder.build();
    }

    // ─────────────────────────────────────────────────────────────────────────────
    // Ponto de entrada principal — chamado pelo WebhookController
    // ─────────────────────────────────────────────────────────────────────────────

    @Transactional
    public void processPaymentNotification(String externalPaymentId) {
        logger.info("[Webhook MP] Notificação recebida para externalPaymentId={}", externalPaymentId);

        // 1. Consulta o status real na API do Mercado Pago
        String mpStatus = fetchPaymentStatusFromMercadoPago(externalPaymentId);
        if (mpStatus == null) {
            logger.warn("[Webhook MP] Não foi possível obter status do pagamento id={} — notificação ignorada.",
                    externalPaymentId);
            return;
        }

        logger.info("[Webhook MP] Status retornado pelo Mercado Pago: externalId={} status={}",
                externalPaymentId, mpStatus);

        // 2. Processa apenas pagamentos aprovados
        if (!STATUS_APPROVED.equalsIgnoreCase(mpStatus)) {
            logger.info("[Webhook MP] Pagamento id={} com status='{}' não requer ação de baixa automática.",
                    externalPaymentId, mpStatus);
            return;
        }

        // 3. Localiza a transação interna pelo ID externo do MP
        OnlinePaymentTransaction transaction = onlinePaymentRepository
                .findByTransactionIdentifier(externalPaymentId)
                .orElse(null);

        if (transaction == null) {
            logger.warn("[Webhook MP] Nenhuma OnlinePaymentTransaction encontrada para externalId={}. "
                    + "Possível duplicata ou pagamento não gerado via Lion Fitness.", externalPaymentId);
            return;
        }

        // 4. Verifica se já está aprovada (idempotência)
        if ("APPROVED".equalsIgnoreCase(transaction.status()) || "CONFIRMED".equalsIgnoreCase(transaction.status())) {
            logger.info("[Webhook MP] Transação interna id={} já estava aprovada. Notificação duplicada ignorada.",
                    transaction.id());
            return;
        }

        // 5. Atualiza a OnlinePaymentTransaction para APPROVED
        LocalDateTime confirmedAt = LocalDateTime.now();
        String gatewayReturn = "WEBHOOK_APPROVED_BY_MERCADO_PAGO_id=" + externalPaymentId;
        onlinePaymentRepository.updateStatus(transaction.id(), "APPROVED", confirmedAt, gatewayReturn);

        // 6. Marca o Payment vinculado como PAID
        boolean updated = paymentRepository.markAsPaid(transaction.paymentId(), confirmedAt.toLocalDate());

        // 7. Renova a assinatura vinculada (estende end_date e define status = 'ACTIVE')
        boolean renewed = subscriptionRepository.renewSubscription(transaction.subscriptionId());

        if (updated) {
            logger.info("[Webhook MP] ✅ Baixa automática e renovação de assinatura realizadas com sucesso! "
                    + "internalTransactionId={} paymentId={} subscriptionId={} externalPaymentId={} renewed={}",
                    transaction.id(), transaction.paymentId(), transaction.subscriptionId(), externalPaymentId, renewed);
        } else {
            logger.warn("[Webhook MP] ⚠️ updateStatus da OnlinePaymentTransaction OK, mas markAsPaid não atualizou linhas. "
                    + "paymentId={} pode já estar pago ou cancelado.", transaction.paymentId());
        }
    }

    // ─────────────────────────────────────────────────────────────────────────────
    // Consulta de status na API do Mercado Pago
    // ─────────────────────────────────────────────────────────────────────────────

    /**
     * Faz GET /v1/payments/{id} no Mercado Pago e retorna o valor do campo {@code status}.
     *
     * @param externalPaymentId ID do pagamento no Mercado Pago.
     * @return String com o status (ex: "approved", "pending", "rejected") ou {@code null} em caso de falha.
     */
    @SuppressWarnings("unchecked")
    private String fetchPaymentStatusFromMercadoPago(String externalPaymentId) {
        try {
            Map<String, Object> response = restClient.get()
                    .uri(MERCADO_PAGO_PAYMENTS_URL + externalPaymentId)
                    .header("Authorization", "Bearer " + accessToken)
                    .retrieve()
                    .onStatus(HttpStatusCode::isError, (req, res) -> {
                        int statusCode = res.getStatusCode().value();
                        logger.error("[Webhook MP] Mercado Pago retornou HTTP {} ao consultar pagamento id={}",
                                statusCode, externalPaymentId);
                        throw new RuntimeException(
                                "Mercado Pago retornou HTTP " + statusCode + " para pagamento " + externalPaymentId);
                    })
                    .body(Map.class);

            if (response == null) {
                logger.error("[Webhook MP] Resposta nula da API do Mercado Pago para id={}", externalPaymentId);
                return null;
            }

            Object statusObj = response.get("status");
            if (statusObj instanceof String status) {
                return status;
            }

            logger.warn("[Webhook MP] Campo 'status' ausente ou inválido na resposta do MP para id={}", externalPaymentId);
            return null;

        } catch (RestClientResponseException e) {
            logger.error("[Webhook MP] Erro HTTP ao consultar Mercado Pago: id={} httpStatus={} body={}",
                    externalPaymentId, e.getStatusCode().value(), e.getResponseBodyAsString(), e);
            return null;
        } catch (RestClientException e) {
            logger.error("[Webhook MP] Erro de conectividade ao consultar Mercado Pago para id={}: {}",
                    externalPaymentId, e.getMessage(), e);
            return null;
        } catch (Exception e) {
            logger.error("[Webhook MP] Erro inesperado ao consultar Mercado Pago para id={}: {}",
                    externalPaymentId, e.getMessage(), e);
            return null;
        }
    }
}
