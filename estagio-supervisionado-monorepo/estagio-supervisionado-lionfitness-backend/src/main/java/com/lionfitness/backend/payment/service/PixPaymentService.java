package com.lionfitness.backend.payment.service;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.Map;
import java.util.UUID;

import com.lionfitness.backend.payment.dto.PixConfirmResponse;
import com.lionfitness.backend.payment.dto.PixGenerateResponse;
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

    @Value("${mercado.pago.access-token}")
    private String accessToken;

    private final SubscriptionRepository subscriptionRepository;
    private final PaymentRepository paymentRepository;
    private final OnlinePaymentRepository onlinePaymentRepository;
    private final RestClient restClient;

    public PixPaymentService(
            SubscriptionRepository subscriptionRepository,
            PaymentRepository paymentRepository,
            OnlinePaymentRepository onlinePaymentRepository,
            RestClient.Builder restClientBuilder
    ) {
        this.subscriptionRepository = subscriptionRepository;
        this.paymentRepository = paymentRepository;
        this.onlinePaymentRepository = onlinePaymentRepository;
        this.restClient = restClientBuilder.build();
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
        logger.info("Iniciando geração de transação Pix para subscriptionId={} payerEmail={} customAmount={} isAdmin={}",
                subscriptionId, payerEmail, customAmount, isAdmin);

        if (subscriptionId == null) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "O ID da assinatura é obrigatório.");
        }

        // Validação de Ownership: Aluno só pode pagar sua própria assinatura
        Subscription subscription;
        if (isAdmin) {
            subscription = subscriptionRepository.findActiveById(subscriptionId)
                    .orElseThrow(() -> new SubscriptionNotFoundException(subscriptionId));
        } else {
            subscription = subscriptionRepository.findActiveByIdAndUserEmail(subscriptionId, payerEmail)
                    .orElseThrow(() -> new ResponseStatusException(
                            HttpStatus.FORBIDDEN,
                            "Assinatura não encontrada ou não pertence ao aluno autenticado."
                    ));
        }

        // Obtenção do valor oficial cadastrado no plano (Banco de dados como fonte da verdade)
        SubscriptionRepository.PlanSubscriptionData planData = subscriptionRepository.findActivePlanData(subscription.planId())
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Plano associado à assinatura não encontrado."));

        BigDecimal officialPlanPrice = planData.price() != null ? planData.price() : BigDecimal.ZERO;

        // Para alunos, SEMPRE usar o preço oficial do plano, ignorando qualquer customAmount vindo do frontend
        BigDecimal effectiveAmount = (isAdmin && customAmount != null && customAmount.compareTo(BigDecimal.ZERO) > 0)
                ? customAmount
                : officialPlanPrice;

        UUID effectiveSubscriptionId = subscription.id();

        Payment payment = resolveOrCreatePendingPayment(effectiveSubscriptionId, subscription, effectiveAmount);

        // ── Chama a API real do Mercado Pago ─────────────────────────────────────
        MercadoPagoPixResult mpResult = callMercadoPagoPixApi(
                payment.amount(),
                payerEmail,
                effectiveSubscriptionId
        );

        LocalDateTime requestedAt = LocalDateTime.now();

        // ── Persiste a transação com o external ID do Mercado Pago ───────────────
        OnlinePaymentTransaction transaction = new OnlinePaymentTransaction(
                UUID.randomUUID(),
                effectiveSubscriptionId,
                payment.id(),
                String.valueOf(mpResult.externalId()),   // transactionIdentifier = ID externo do MP
                payment.amount(),
                requestedAt,
                null,
                "PENDING",
                mpResult.qrCode()                        // gatewayReturn armazena o Pix Copia e Cola
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
    private MercadoPagoPixResult callMercadoPagoPixApi(BigDecimal amount, String payerEmail, UUID subscriptionId) {
        String idempotencyKey = UUID.randomUUID().toString();

        Map<String, Object> payload = Map.of(
                "transaction_amount", amount,
                "description", "Mensalidade Lion Fitness - Assinatura ID: " + subscriptionId,
                "payment_method_id", "pix",
                "payer", Map.of("email", payerEmail != null ? payerEmail : "aluno@lionfitness.com.br")
        );

        logger.info("Enviando requisição Pix ao Mercado Pago: subscriptionId={} amount={} idempotencyKey={}",
                subscriptionId, amount, idempotencyKey);

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
    private record MercadoPagoPixResult(
            Long externalId,
            String qrCode,
            String qrCodeBase64
    ) {}
}
