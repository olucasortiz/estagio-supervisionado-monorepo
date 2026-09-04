package com.lionfitness.backend.payment.service;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.HashMap;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.lionfitness.backend.payment.dto.PixConfirmResponse;
import com.lionfitness.backend.payment.dto.PixGenerateResponse;
import com.lionfitness.backend.payment.dto.PixStatusResponse;
import com.lionfitness.backend.payment.exception.MercadoPagoGatewayException;
import com.lionfitness.backend.payment.model.OnlinePaymentTransaction;
import com.lionfitness.backend.payment.model.Payment;
import com.lionfitness.backend.payment.model.PaymentMethod;
import com.lionfitness.backend.payment.model.PaymentStatus;
import com.lionfitness.backend.payment.repository.OnlinePaymentRepository;
import com.lionfitness.backend.payment.repository.PaymentRepository;
import com.lionfitness.backend.subscription.exception.SubscriptionNotFoundException;
import com.lionfitness.backend.subscription.model.Subscription;
import com.lionfitness.backend.subscription.repository.SubscriptionRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.http.HttpStatusCode;
import org.springframework.http.MediaType;
import org.springframework.http.client.SimpleClientHttpRequestFactory;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.client.RestClient;
import org.springframework.web.client.RestClientException;
import org.springframework.web.client.RestClientResponseException;

import org.springframework.web.server.ResponseStatusException;

@Service
public class PixPaymentService {

    private static final Logger logger = LoggerFactory.getLogger(PixPaymentService.class);
    private static final String MERCADO_PAGO_PAYMENTS_URL = "https://api.mercadopago.com/v1/payments";

    /** Token de acesso ao Mercado Pago — obrigatório, vem exclusivamente de MP_ACCESS_TOKEN. */
    @Value("${mercado.pago.access-token}")
    private String accessToken;

    /**
     * URL pública de webhook registrada no Mercado Pago.
     * Quando vazia (MP_NOTIFICATION_URL não definida), o campo notification_url
     * não é enviado na criação do Pix.
     */
    @Value("${mercado.pago.notification-url:}")
    private String notificationUrl;

    private static final int CONNECT_TIMEOUT_MS = 5_000;
    private static final int READ_TIMEOUT_MS    = 10_000;

    private final SubscriptionRepository subscriptionRepository;
    private final PaymentRepository paymentRepository;
    private final OnlinePaymentRepository onlinePaymentRepository;
    private final RestClient restClient;
    private final ObjectMapper objectMapper;

    public PixPaymentService(
            SubscriptionRepository subscriptionRepository,
            PaymentRepository paymentRepository,
            OnlinePaymentRepository onlinePaymentRepository,
            RestClient.Builder restClientBuilder,
            ObjectMapper objectMapper
    ) {
        this.subscriptionRepository = subscriptionRepository;
        this.paymentRepository = paymentRepository;
        this.onlinePaymentRepository = onlinePaymentRepository;
        this.objectMapper = objectMapper != null ? objectMapper : new ObjectMapper();

        // Configura timeouts explícitos para as chamadas ao Mercado Pago.
        // Evita que lentidão do gateway segure threads indefinidamente.
        SimpleClientHttpRequestFactory factory = new SimpleClientHttpRequestFactory();
        factory.setConnectTimeout(CONNECT_TIMEOUT_MS);
        factory.setReadTimeout(READ_TIMEOUT_MS);

        this.restClient = restClientBuilder
                .requestFactory(factory)
                .build();
    }

    // ─────────────────────────────────────────────────────────────────────────────
    // Geração do Pix — chamado pelo ALUNO (sem valor customizado)
    // ─────────────────────────────────────────────────────────────────────────────

    @Transactional
    public PixGenerateResponse generatePixTransaction(UUID subscriptionId, String payerEmail) {
        return generatePixTransaction(subscriptionId, null, payerEmail, false);
    }

    @Transactional
    public PixGenerateResponse generatePixTransaction(UUID subscriptionId, BigDecimal customAmount, String payerEmail) {
        return generatePixTransaction(subscriptionId, customAmount, payerEmail, false);
    }

    // ─────────────────────────────────────────────────────────────────────────────
    // Geração do Pix com controle de Role e Ownership
    // ─────────────────────────────────────────────────────────────────────────────

    @Transactional
    public PixGenerateResponse generatePixTransaction(UUID subscriptionId, BigDecimal customAmount, String payerEmail, boolean isAdmin) {
        logger.info("Iniciando geração de transação Pix para subscriptionId={} payerEmail={} isAdmin={}",
                subscriptionId, payerEmail, isAdmin);

        if (subscriptionId == null) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "O ID da assinatura é obrigatório.");
        }

        // Validação de Ownership com lock pessimista na linha da assinatura para evitar concorrência simultânea
        Subscription subscription;
        if (isAdmin) {
            subscription = subscriptionRepository.findActiveByIdForUpdate(subscriptionId)
                    .orElseThrow(() -> new SubscriptionNotFoundException(subscriptionId));
        } else {
            subscription = subscriptionRepository.findActiveByIdAndUserEmailForUpdate(subscriptionId, payerEmail)
                    .orElseThrow(() -> new ResponseStatusException(
                            HttpStatus.FORBIDDEN,
                            "Assinatura não encontrada ou não pertence ao aluno autenticado."
                    ));
        }

        UUID effectiveSubscriptionId = subscription.id();

        // ── 1. Reutilização de transação PENDING existente (Idempotência / Prevenção de duplicidade) ──
        Optional<OnlinePaymentTransaction> existingPendingTx = onlinePaymentRepository.findPendingBySubscriptionId(effectiveSubscriptionId);
        if (existingPendingTx.isPresent()) {
            OnlinePaymentTransaction pendingTx = existingPendingTx.get();
            ParsedGatewayReturn qrData = parseGatewayReturn(pendingTx.gatewayReturn());

            // A transação só pode ser reutilizada se contiver o QR Code Base64 completo E não tiver expirado (menos de 24h)
            boolean hasCompleteQr = qrData.qrCode() != null && !qrData.qrCode().isBlank()
                    && qrData.qrCodeBase64() != null && !qrData.qrCodeBase64().isBlank();
            boolean isRecent = pendingTx.requestedAt() != null
                    && pendingTx.requestedAt().isAfter(LocalDateTime.now().minusHours(24));

            if (hasCompleteQr && isRecent) {
                logger.info("Reutilizando transação Pix PENDING ativa e completa para subscriptionId={}. internalId={} externalId={}",
                        effectiveSubscriptionId, pendingTx.id(), pendingTx.transactionIdentifier());

                Long externalId = null;
                try {
                    externalId = Long.parseLong(pendingTx.transactionIdentifier());
                } catch (NumberFormatException ignored) {
                }

                return new PixGenerateResponse(
                        pendingTx.id(),
                        pendingTx.subscriptionId(),
                        pendingTx.paymentId(),
                        pendingTx.transactionIdentifier(),
                        pendingTx.amount(),
                        pendingTx.status(),
                        qrData.qrCode(),
                        qrData.qrCodeBase64(),
                        externalId,
                        pendingTx.requestedAt()
                );
            } else {
                logger.info("Transação PENDING anterior para subscriptionId={} é legada ou incompleta (hasCompleteQr={}, isRecent={}). Descartando para gerar nova cobrança.",
                        effectiveSubscriptionId, hasCompleteQr, isRecent);
                onlinePaymentRepository.updateStatus(pendingTx.id(), "EXPIRED", LocalDateTime.now(), pendingTx.gatewayReturn());
            }
        }

        // ── 2. Obtenção do valor oficial cadastrado no plano (Banco de dados como única fonte da verdade) ──
        SubscriptionRepository.PlanSubscriptionData planData = subscriptionRepository.findActivePlanData(subscription.planId())
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Plano associado à assinatura não encontrado."));

        BigDecimal officialPlanPrice = planData.price() != null ? planData.price() : BigDecimal.ZERO;

        // Regra estrita: O valor real do Pix é SEMPRE o preço oficial do plano obtido pelo backend no banco.
        // Qualquer valor arbitrário enviado pelo frontend é terminantemente ignorado (tanto para ALUNO quanto para ADMIN).
        BigDecimal effectiveAmount = officialPlanPrice;

        Payment payment = resolveOrCreatePendingPayment(effectiveSubscriptionId, subscription, effectiveAmount);

        // ── 3. Chama a API real do Mercado Pago ─────────────────────────────────────
        MercadoPagoPixResult mpResult = callMercadoPagoPixApi(
                payment.amount(),
                payerEmail,
                effectiveSubscriptionId
        );

        LocalDateTime requestedAt = LocalDateTime.now();
        String serializedGatewayReturn = serializeGatewayReturn(mpResult.qrCode(), mpResult.qrCodeBase64());

        // ── 4. Persiste a transação com o external ID do Mercado Pago ───────────────
        OnlinePaymentTransaction transaction = new OnlinePaymentTransaction(
                UUID.randomUUID(),
                effectiveSubscriptionId,
                payment.id(),
                String.valueOf(mpResult.externalId()),   // transactionIdentifier = ID externo do MP
                payment.amount(),
                requestedAt,
                null,
                "PENDING",
                serializedGatewayReturn
        );

        onlinePaymentRepository.save(transaction);

        logger.info("Transação Pix criada com sucesso: internalId={} externalId={} subscriptionId={}",
                transaction.id(), mpResult.externalId(), effectiveSubscriptionId);

        return new PixGenerateResponse(
                transaction.id(),
                effectiveSubscriptionId,
                payment.id(),
                String.valueOf(mpResult.externalId()),
                payment.amount(),
                "PENDING",
                mpResult.qrCode(),
                mpResult.qrCodeBase64(),
                mpResult.externalId(),
                requestedAt
        );
    }

    // ─────────────────────────────────────────────────────────────────────────────
    // Confirmação manual do Pix — exclusivo ADMIN / OPERATIONAL (Ambiente Sandbox)
    // ─────────────────────────────────────────────────────────────────────────────

    @Transactional
    public PixConfirmResponse confirmPixPayment(UUID transactionId) {
        logger.info("Confirmando pagamento Pix para transactionId={}", transactionId);

        OnlinePaymentTransaction transaction = onlinePaymentRepository.findById(transactionId)
                .orElseThrow(() -> new RuntimeException("Transação Pix não encontrada para o ID: " + transactionId));

        LocalDateTime confirmedAt = LocalDateTime.now();

        if (!"APPROVED".equalsIgnoreCase(transaction.status()) && !"CONFIRMED".equalsIgnoreCase(transaction.status())) {
            onlinePaymentRepository.updateStatus(transaction.id(), "APPROVED", confirmedAt, transaction.gatewayReturn());
            paymentRepository.markAsPaid(transaction.paymentId(), java.time.LocalDate.now());
            subscriptionRepository.renewSubscription(transaction.subscriptionId());
            logger.info("Transação {}, pagamento {} e assinatura {} confirmados e renovados com sucesso.",
                    transaction.id(), transaction.paymentId(), transaction.subscriptionId());
        } else {
            logger.info("Transação {} já estava aprovada/confirmada.", transaction.id());
        }

        return new PixConfirmResponse(
                transaction.id(),
                transaction.paymentId(),
                transaction.transactionIdentifier(),
                "APPROVED",
                "Pagamento Pix confirmado com sucesso e assinatura renovada.",
                confirmedAt
        );
    }

    // ─────────────────────────────────────────────────────────────────────────────
    // Consulta de status do Pix — somente leitura (Polling)
    // ─────────────────────────────────────────────────────────────────────────────

    @Transactional(readOnly = true)
    public PixStatusResponse getPixTransactionStatus(UUID transactionId, String requesterEmail, boolean isAdmin) {
        if (transactionId == null) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "O ID da transação é obrigatório.");
        }

        OnlinePaymentTransaction transaction;
        if (isAdmin) {
            transaction = onlinePaymentRepository.findById(transactionId)
                    .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Transação Pix não encontrada."));
        } else {
            transaction = onlinePaymentRepository.findByIdAndUserEmail(transactionId, requesterEmail)
                    .orElseThrow(() -> new ResponseStatusException(
                            HttpStatus.FORBIDDEN,
                            "Transação Pix não encontrada ou você não possui autorização para consultá-la."
                    ));
        }

        return new PixStatusResponse(
                transaction.id(),
                transaction.status(),
                transaction.paymentId(),
                transaction.subscriptionId(),
                transaction.amount(),
                transaction.confirmedAt()
        );
    }

    // ─────────────────────────────────────────────────────────────────────────────
    // Helpers privados
    // ─────────────────────────────────────────────────────────────────────────────

    /**
     * Reutiliza pagamento PENDING existente (atualizando o valor se necessário)
     * ou cria um novo registro de pagamento.
     */
    private Payment resolveOrCreatePendingPayment(UUID subscriptionId, Subscription subscription, BigDecimal customAmount) {
        return paymentRepository.findPendingBySubscriptionId(subscriptionId)
                .map(p -> {
                    if (customAmount != null && customAmount.compareTo(BigDecimal.ZERO) > 0 && !customAmount.equals(p.amount())) {
                        logger.info("Atualizando valor do pagamento PENDING {}: {} → {}", p.id(), p.amount(), customAmount);
                        paymentRepository.update(p.id(), p.subscriptionId(), customAmount, p.paidAt(), p.method(), p.status());
                        return new Payment(p.id(), p.subscriptionId(), customAmount, p.paidAt(), p.method(), p.status(), p.createdAt());
                    }
                    return p;
                })
                .orElseGet(() -> {
                    BigDecimal amount = (customAmount != null && customAmount.compareTo(BigDecimal.ZERO) > 0)
                            ? customAmount
                            : subscriptionRepository.findActivePlanData(subscription.planId())
                                    .map(SubscriptionRepository.PlanSubscriptionData::price)
                                    .orElse(BigDecimal.ZERO);

                    if (amount == null) {
                        amount = BigDecimal.ZERO;
                    }

                    logger.info("Criando novo pagamento PENDING para subscription={} valor={}", subscriptionId, amount);
                    return paymentRepository.save(
                            UUID.randomUUID(),
                            subscriptionId,
                            amount,
                            null,
                            PaymentMethod.PIX,
                            PaymentStatus.PENDING
                    );
                });
    }

    /**
     * Realiza a chamada HTTP POST real para a API do Mercado Pago.
     * Extrai qrCode, qrCodeBase64 e externalId da resposta.
     *
     * @throws MercadoPagoGatewayException para qualquer falha de comunicação ou rejeição do gateway.
     */
    @SuppressWarnings("unchecked")
    protected MercadoPagoPixResult callMercadoPagoPixApi(BigDecimal amount, String payerEmail, UUID subscriptionId) {
        String idempotencyKey = UUID.randomUUID().toString();

        // Payload mutável para permitir adição condicional de notification_url.
        Map<String, Object> payload = new HashMap<>();
        payload.put("transaction_amount", amount);
        payload.put("description", "Mensalidade Lion Fitness - Assinatura ID: " + subscriptionId);
        payload.put("payment_method_id", "pix");
        payload.put("payer", Map.of("email", payerEmail != null ? payerEmail : "aluno@lionfitness.com.br"));

        // external_reference: ID da assinatura no banco — vem do backend, nunca do frontend.
        // Permite conciliação e rastreio no dashboard do Mercado Pago.
        payload.put("external_reference", subscriptionId.toString());

        // notification_url: enviado somente quando MP_NOTIFICATION_URL estiver configurada.
        // Sem essa variável, o MP usará a URL configurada no painel (se houver) ou não enviará webhook.
        if (notificationUrl != null && !notificationUrl.isBlank()) {
            payload.put("notification_url", notificationUrl);
            logger.info("Enviando requisição Pix ao Mercado Pago: subscriptionId={} amount={} idempotencyKey={} notificationUrl=[CONFIGURADA]",
                    subscriptionId, amount, idempotencyKey);
        } else {
            logger.info("Enviando requisição Pix ao Mercado Pago: subscriptionId={} amount={} idempotencyKey={} notificationUrl=[NÃO CONFIGURADA]",
                    subscriptionId, amount, idempotencyKey);
        }

        try {
            Map<String, Object> response = restClient.post()
                    .uri(MERCADO_PAGO_PAYMENTS_URL)
                    .header("Authorization", "Bearer " + accessToken)
                    .header("X-Idempotency-Key", idempotencyKey)
                    .contentType(MediaType.APPLICATION_JSON)
                    .body(payload)
                    .retrieve()
                    .onStatus(HttpStatusCode::isError, (req, res) -> {
                        int status = res.getStatusCode().value();
                        String body = new String(res.getBody().readAllBytes());
                        logger.error("Mercado Pago recusou a transação: HTTP {} body={}", status, body);
                        throw new MercadoPagoGatewayException(
                                "Gateway do Mercado Pago retornou erro " + status + ". Tente novamente em instantes.",
                                status,
                                null
                        );
                    })
                    .body(Map.class);

            if (response == null) {
                logger.error("Resposta nula recebida do Mercado Pago para subscriptionId={}", subscriptionId);
                throw new MercadoPagoGatewayException("Resposta inválida do gateway de pagamento.");
            }

            Long externalId = ((Number) response.get("id")).longValue();

            Map<String, Object> pointOfInteraction = (Map<String, Object>) response.get("point_of_interaction");
            Map<String, Object> transactionData = (Map<String, Object>) pointOfInteraction.get("transaction_data");

            String qrCode = (String) transactionData.get("qr_code");
            String qrCodeBase64 = (String) transactionData.get("qr_code_base64");

            logger.info("Resposta Mercado Pago recebida com sucesso: externalId={}", externalId);

            return new MercadoPagoPixResult(externalId, qrCode, qrCodeBase64);

        } catch (MercadoPagoGatewayException e) {
            throw e;
        } catch (RestClientResponseException e) {
            logger.error("Erro HTTP ao comunicar com Mercado Pago: status={} body={}",
                    e.getStatusCode().value(), e.getResponseBodyAsString(), e);
            throw new MercadoPagoGatewayException(
                    "Falha na comunicação com o gateway de pagamento (HTTP " + e.getStatusCode().value() + ").",
                    e.getStatusCode().value(),
                    e
            );
        } catch (RestClientException e) {
            logger.error("Erro de conectividade ao comunicar com Mercado Pago: {}", e.getMessage(), e);
            throw new MercadoPagoGatewayException(
                    "Não foi possível conectar ao gateway de pagamento. Verifique sua conexão e tente novamente.",
                    e
            );
        } catch (Exception e) {
            logger.error("Erro inesperado ao processar resposta do Mercado Pago: {}", e.getMessage(), e);
            throw new MercadoPagoGatewayException(
                    "Erro inesperado ao processar a resposta do gateway de pagamento.",
                    e
            );
        }
    }

    /**
     * Resultado interno da chamada ao Mercado Pago — evita Map genérico circulando pelo service.
     */
    protected record MercadoPagoPixResult(
            Long externalId,
            String qrCode,
            String qrCodeBase64
    ) {}

    private record ParsedGatewayReturn(String qrCode, String qrCodeBase64) {}

    private String serializeGatewayReturn(String qrCode, String qrCodeBase64) {
        if (qrCodeBase64 == null || qrCodeBase64.isBlank()) {
            return qrCode;
        }
        try {
            return objectMapper.writeValueAsString(Map.of(
                    "qrCode", qrCode != null ? qrCode : "",
                    "qrCodeBase64", qrCodeBase64
            ));
        } catch (Exception e) {
            logger.warn("Falha ao serializar gatewayReturn como JSON, salvando qrCode puro: {}", e.getMessage());
            return qrCode;
        }
    }

    private ParsedGatewayReturn parseGatewayReturn(String gatewayReturn) {
        if (gatewayReturn == null || gatewayReturn.isBlank()) {
            return new ParsedGatewayReturn(null, null);
        }
        if (gatewayReturn.trim().startsWith("{")) {
            try {
                Map<?, ?> map = objectMapper.readValue(gatewayReturn, Map.class);
                String qrCode = (String) map.get("qrCode");
                String qrCodeBase64 = (String) map.get("qrCodeBase64");
                return new ParsedGatewayReturn(qrCode, qrCodeBase64);
            } catch (Exception ignored) {
            }
        }
        return new ParsedGatewayReturn(gatewayReturn, null);
    }
}
