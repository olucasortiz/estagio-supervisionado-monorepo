package com.lionfitness.backend.payment.service;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.lionfitness.backend.payment.dto.CardPaymentRequest;
import com.lionfitness.backend.payment.dto.CardPaymentResponse;
import com.lionfitness.backend.payment.exception.MercadoPagoGatewayException;
import com.lionfitness.backend.payment.model.OnlinePaymentTransaction;
import com.lionfitness.backend.payment.model.Payment;
import com.lionfitness.backend.payment.model.PaymentMethod;
import com.lionfitness.backend.payment.model.PaymentStatus;
import com.lionfitness.backend.payment.repository.OnlinePaymentRepository;
import com.lionfitness.backend.payment.repository.PaymentRepository;
import com.lionfitness.backend.subscription.model.Subscription;
import com.lionfitness.backend.subscription.repository.SubscriptionRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.client.RestClient;
import org.springframework.web.client.RestClientResponseException;
import org.springframework.web.server.ResponseStatusException;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.*;

/**
 * Serviço responsável pelo processamento seguro de pagamentos com cartão (crédito e débito)
 * via API oficial do Mercado Pago.
 *
 * <p><b>SEGURANÇA ARQUITETURAL:</b>
 * <ul>
 *   <li>Este serviço NUNCA manipula ou recebe dados brutos do cartão (número, CVV, validade).</li>
 *   <li>O frontend tokeniza o cartão diretamente nos servidores seguros do Mercado Pago e envia apenas o token.</li>
 *   <li>O valor cobrado é SEMPRE o preço oficial do plano cadastrado no banco, ignorando qualquer valor externo.</li>
 *   <li>Alunos só podem pagar a própria assinatura (validado com bloqueio pessimista).</li>
 *   <li>Admins podem pagar para o aluno selecionado.</li>
 * </ul>
 */
@Service
public class CardPaymentService {

    private static final Logger logger = LoggerFactory.getLogger(CardPaymentService.class);
    private static final String MERCADO_PAGO_PAYMENTS_URL = "https://api.mercadopago.com/v1/payments";

    private final SubscriptionRepository subscriptionRepository;
    private final PaymentRepository paymentRepository;
    private final OnlinePaymentRepository onlinePaymentRepository;
    private final RestClient restClient;
    private final ObjectMapper objectMapper;

    @Value("${mercado.pago.access-token}")
    private String accessToken;

    @Value("${mercado.pago.notification-url:}")
    private String notificationUrl;

    public CardPaymentService(
            SubscriptionRepository subscriptionRepository,
            PaymentRepository paymentRepository,
            OnlinePaymentRepository onlinePaymentRepository,
            RestClient.Builder restClientBuilder,
            ObjectMapper objectMapper
    ) {
        this.subscriptionRepository = subscriptionRepository;
        this.paymentRepository = paymentRepository;
        this.onlinePaymentRepository = onlinePaymentRepository;
        this.restClient = restClientBuilder.build();
        this.objectMapper = objectMapper;
    }

    /**
     * Processa uma tentativa de pagamento com cartão tokenizado.
     */
    @Transactional
    public CardPaymentResponse processCardPayment(
            CardPaymentRequest request,
            String requesterEmail,
            boolean isAdmin
    ) {
        UUID subscriptionId = request.subscriptionId();
        logger.info("Iniciando processamento de pagamento com cartão: subscriptionId={} requester={} isAdmin={}",
                subscriptionId, requesterEmail, isAdmin);

        // 1. Validação de autorização e lock pessimista da assinatura
        Subscription subscription;
        if (isAdmin) {
            subscription = subscriptionRepository.findActiveByIdForUpdate(subscriptionId)
                    .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Assinatura não encontrada."));
        } else {
            subscription = subscriptionRepository.findActiveByIdAndUserEmailForUpdate(subscriptionId, requesterEmail)
                    .orElseThrow(() -> new ResponseStatusException(
                            HttpStatus.FORBIDDEN,
                            "Assinatura não encontrada ou não pertence ao aluno autenticado."
                    ));
        }

        // 2. Preço oficial do plano no banco de dados (nunca confiamos em dados do frontend)
        SubscriptionRepository.PlanSubscriptionData planData = subscriptionRepository
                .findActivePlanData(subscription.planId())
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Plano associado à assinatura não encontrado."));

        BigDecimal officialPlanPrice = planData.price();
        if (officialPlanPrice == null || officialPlanPrice.compareTo(BigDecimal.ZERO) <= 0) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "O valor oficial do plano associado é inválido.");
        }

        // 3. Determina se é débito ou crédito
        boolean isDebit = "debit_card".equalsIgnoreCase(request.paymentTypeId())
                || (request.paymentMethodId() != null && request.paymentMethodId().toLowerCase().contains("deb"));
        PaymentMethod paymentMethod = isDebit ? PaymentMethod.DEBIT_CARD : PaymentMethod.CREDIT_CARD;
        int installments = isDebit ? 1 : request.resolveInstallments();

        // 4. Cria ou reutiliza o Payment associado
        Payment payment = paymentRepository.findPendingBySubscriptionId(subscriptionId)
                .orElseGet(() -> paymentRepository.save(
                        UUID.randomUUID(),
                        subscriptionId,
                        officialPlanPrice,
                        null,
                        paymentMethod,
                        PaymentStatus.PENDING
                ));

        // 5. Chamada oficial à API do Mercado Pago com o token seguro
        String effectivePayerEmail = (request.payerEmail() != null && !request.payerEmail().isBlank())
                ? request.payerEmail()
                : requesterEmail;

        Map<String, Object> mpResponse = callMercadoPagoCardApi(
                officialPlanPrice,
                request.token(),
                request.paymentMethodId(),
                installments,
                effectivePayerEmail,
                request.identificationType(),
                request.identificationNumber(),
                subscriptionId
        );

        // 6. Interpreta o resultado do Mercado Pago
        String externalPaymentId = String.valueOf(mpResponse.get("id"));
        String rawStatus = String.valueOf(mpResponse.getOrDefault("status", "pending"));
        String statusDetail = String.valueOf(mpResponse.getOrDefault("status_detail", ""));

        String normalizedStatus;
        if ("approved".equalsIgnoreCase(rawStatus)) {
            normalizedStatus = "APPROVED";
        } else if ("rejected".equalsIgnoreCase(rawStatus)) {
            normalizedStatus = "REJECTED";
        } else {
            normalizedStatus = "PENDING";
        }

        LocalDateTime now = LocalDateTime.now();
        LocalDateTime confirmedAt = "APPROVED".equals(normalizedStatus) ? now : null;

        // 7. Persiste a transação no banco de dados local
        String gatewayReturnJson;
        try {
            Map<String, Object> returnMap = new LinkedHashMap<>();
            returnMap.put("id", externalPaymentId);
            returnMap.put("status", rawStatus);
            returnMap.put("status_detail", statusDetail);
            returnMap.put("payment_method_id", request.paymentMethodId());
            returnMap.put("payment_type_id", request.paymentTypeId());
            returnMap.put("installments", installments);
            returnMap.put("card", mpResponse.get("card"));
            gatewayReturnJson = objectMapper.writeValueAsString(returnMap);
        } catch (JsonProcessingException e) {
            gatewayReturnJson = "{\"id\":\"" + externalPaymentId + "\",\"status\":\"" + rawStatus + "\"}";
        }

        OnlinePaymentTransaction transaction = new OnlinePaymentTransaction(
                UUID.randomUUID(),
                subscriptionId,
                payment.id(),
                externalPaymentId,
                officialPlanPrice,
                now,
                confirmedAt,
                normalizedStatus,
                gatewayReturnJson
        );
        onlinePaymentRepository.save(transaction);

        // 8. Se aprovado imediatamente, baixa o pagamento e renova a assinatura
        String userFriendlyMessage;
        if ("APPROVED".equals(normalizedStatus)) {
            logger.info("Pagamento com cartão APROVADO para subscription={} externalId={}", subscriptionId, externalPaymentId);
            paymentRepository.markAsPaid(payment.id(), LocalDate.now());
            subscriptionRepository.renewSubscription(subscription.id());
            userFriendlyMessage = "Pagamento aprovado com sucesso! Sua assinatura foi renovada.";
        } else if ("REJECTED".equals(normalizedStatus)) {
            logger.warn("Pagamento com cartão RECUSADO para subscription={} statusDetail={}", subscriptionId, statusDetail);
            userFriendlyMessage = mapRejectionReason(statusDetail);
        } else {
            logger.info("Pagamento com cartão EM PROCESSAMENTO para subscription={} externalId={}", subscriptionId, externalPaymentId);
            userFriendlyMessage = "Pagamento em análise pelo Mercado Pago. A confirmação ocorrerá em instantes.";
        }

        return new CardPaymentResponse(
                transaction.id(),
                subscriptionId,
                payment.id(),
                externalPaymentId,
                officialPlanPrice,
                normalizedStatus,
                statusDetail,
                userFriendlyMessage,
                request.paymentMethodId(),
                installments,
                now
        );
    }

    /**
     * Executa a chamada HTTP para o Mercado Pago com headers de idempotência e token.
     */
    @SuppressWarnings("unchecked")
    protected Map<String, Object> callMercadoPagoCardApi(
            BigDecimal amount,
            String token,
            String paymentMethodId,
            int installments,
            String payerEmail,
            String identificationType,
            String identificationNumber,
            UUID subscriptionId
    ) {
        String idempotencyKey = UUID.randomUUID().toString();

        Map<String, Object> payload = new HashMap<>();
        payload.put("transaction_amount", amount);
        payload.put("token", token);
        payload.put("description", "Mensalidade Lion Fitness - Assinatura ID: " + subscriptionId);
        payload.put("installments", installments);
        payload.put("payment_method_id", paymentMethodId);

        Map<String, Object> payerMap = new HashMap<>();
        payerMap.put("email", payerEmail != null ? payerEmail : "aluno@lionfitness.com.br");
        if (identificationNumber != null && !identificationNumber.isBlank()) {
            payerMap.put("identification", Map.of(
                    "type", (identificationType != null && !identificationType.isBlank()) ? identificationType : "CPF",
                    "number", identificationNumber.replaceAll("\\D", "")
            ));
        }
        payload.put("payer", payerMap);
        payload.put("external_reference", subscriptionId.toString());

        if (notificationUrl != null && !notificationUrl.isBlank()) {
            payload.put("notification_url", notificationUrl);
        }

        logger.info("Enviando requisição de cartão ao Mercado Pago: subscriptionId={} amount={} installments={} method={}",
                subscriptionId, amount, installments, paymentMethodId);

        try {
            Map<String, Object> response = restClient.post()
                    .uri(MERCADO_PAGO_PAYMENTS_URL)
                    .header("Authorization", "Bearer " + accessToken)
                    .header("X-Idempotency-Key", idempotencyKey)
                    .contentType(MediaType.APPLICATION_JSON)
                    .body(payload)
                    .retrieve()
                    .body(Map.class);

            if (response == null || !response.containsKey("id")) {
                throw new MercadoPagoGatewayException("Mercado Pago retornou resposta inválida para pagamento com cartão.");
            }

            return response;
        } catch (RestClientResponseException ex) {
            String errorBody = ex.getResponseBodyAsString();
            logger.error("Erro da API do Mercado Pago ao processar cartão: status={} body={}", ex.getStatusCode(), errorBody);
            throw new MercadoPagoGatewayException("Falha ao processar cartão junto ao Mercado Pago: " + ex.getStatusCode().value(), ex);
        } catch (Exception ex) {
            logger.error("Exceção de comunicação ao chamar Mercado Pago cartão: {}", ex.getMessage(), ex);
            throw new MercadoPagoGatewayException("Erro de comunicação com o Mercado Pago para cartão.", ex);
        }
    }

    /**
     * Mapeia os status_detail do Mercado Pago para mensagens amigáveis em português.
     */
    private String mapRejectionReason(String statusDetail) {
        if (statusDetail == null) return "Pagamento não aprovado pela emissora do cartão.";
        return switch (statusDetail) {
            case "cc_rejected_bad_filled_security_code" -> "Código de segurança (CVV) inválido.";
            case "cc_rejected_bad_filled_date" -> "Data de validade do cartão incorreta.";
            case "cc_rejected_bad_filled_other" -> "Dados do cartão incorretos. Por favor, revise as informações.";
            case "cc_rejected_insufficient_amount" -> "Saldo ou limite insuficiente no cartão.";
            case "cc_rejected_call_for_authorize" -> "Pagamento requer autorização da emissora do cartão.";
            case "cc_rejected_card_disabled" -> "Cartão desabilitado ou bloqueado pela emissora.";
            case "cc_rejected_duplicated_payment" -> "Pagamento duplicado detectado para esta cobrança.";
            case "cc_rejected_high_risk" -> "Pagamento recusado por segurança pela operadora.";
            case "cc_rejected_max_attempts" -> "Limite de tentativas excedido. Tente novamente mais tarde ou use outro cartão.";
            default -> "Pagamento não aprovado pela operadora (" + statusDetail + "). Tente outro cartão.";
        };
    }
}
