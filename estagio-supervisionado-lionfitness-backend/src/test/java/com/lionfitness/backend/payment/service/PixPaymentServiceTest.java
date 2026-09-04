package com.lionfitness.backend.payment.service;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.Optional;
import java.util.UUID;
import java.util.concurrent.atomic.AtomicInteger;
import java.util.concurrent.atomic.AtomicReference;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.lionfitness.backend.payment.dto.PixGenerateResponse;
import com.lionfitness.backend.payment.model.OnlinePaymentTransaction;
import com.lionfitness.backend.payment.model.Payment;
import com.lionfitness.backend.payment.model.PaymentMethod;
import com.lionfitness.backend.payment.model.PaymentStatus;
import com.lionfitness.backend.payment.repository.OnlinePaymentRepository;
import com.lionfitness.backend.payment.repository.PaymentRepository;
import com.lionfitness.backend.subscription.model.Subscription;
import com.lionfitness.backend.subscription.repository.SubscriptionRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.mockito.Mockito;
import org.springframework.http.HttpStatus;
import org.springframework.web.client.RestClient;
import org.springframework.web.server.ResponseStatusException;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

class PixPaymentServiceTest {

    private SubscriptionRepository subscriptionRepository;
    private PaymentRepository paymentRepository;
    private OnlinePaymentRepository onlinePaymentRepository;
    private ObjectMapper objectMapper;

    private AtomicInteger mpApiCallCount;
    private AtomicReference<BigDecimal> mpAmountReceived;
    private PixPaymentService pixPaymentService;

    private final UUID subscriptionId = UUID.randomUUID();
    private final UUID planId = UUID.randomUUID();
    private final UUID memberId = UUID.randomUUID();
    private final String studentEmail = "aluno@lionfitness.com.br";
    private final BigDecimal officialPlanPrice = new BigDecimal("89.90");

    @BeforeEach
    void setUp() {
        subscriptionRepository = Mockito.mock(SubscriptionRepository.class);
        paymentRepository = Mockito.mock(PaymentRepository.class);
        onlinePaymentRepository = Mockito.mock(OnlinePaymentRepository.class);
        objectMapper = new ObjectMapper();

        mpApiCallCount = new AtomicInteger(0);
        mpAmountReceived = new AtomicReference<>(null);

        // Subclasse de teste para isolar chamadas HTTP externas
        pixPaymentService = new PixPaymentService(
                subscriptionRepository,
                paymentRepository,
                onlinePaymentRepository,
                RestClient.builder(),
                objectMapper
        ) {
            @Override
            protected MercadoPagoPixResult callMercadoPagoPixApi(BigDecimal amount, String payerEmail, UUID subId) {
                mpApiCallCount.incrementAndGet();
                mpAmountReceived.set(amount);
                return new MercadoPagoPixResult(999888777L, "00020126...pix-copia-e-cola", "iVBORw0KGgoAAAANSUhEUgAA...");
            }
        };
    }

    private Subscription createDummySubscription() {
        return new Subscription(
                subscriptionId,
                memberId,
                planId,
                LocalDate.now(),
                LocalDate.now().plusDays(30),
                "ACTIVE",
                LocalDateTime.now()
        );
    }

    @Test
    @DisplayName("Teste 1: ALUNO e ADMIN com customAmount arbitrário recebem officialPlanPrice no Mercado Pago")
    void test1_customAmountIgnored_officialPlanPriceUsed() {
        Subscription dummySub = createDummySubscription();
        when(subscriptionRepository.findActiveByIdAndUserEmailForUpdate(subscriptionId, studentEmail))
                .thenReturn(Optional.of(dummySub));
        when(subscriptionRepository.findActivePlanData(planId))
                .thenReturn(Optional.of(new SubscriptionRepository.PlanSubscriptionData("MONTHLY", 30, officialPlanPrice)));
        when(onlinePaymentRepository.findPendingBySubscriptionId(subscriptionId))
                .thenReturn(Optional.empty());

        when(paymentRepository.findPendingBySubscriptionId(subscriptionId))
                .thenReturn(Optional.empty());
        when(paymentRepository.save(any(), eq(subscriptionId), any(), any(), any(), any()))
                .thenAnswer(inv -> new Payment(UUID.randomUUID(), subscriptionId, inv.getArgument(2), null, PaymentMethod.PIX, PaymentStatus.PENDING, LocalDateTime.now()));

        // Tentativa de enviar R$ 1.00 pelo frontend (ALUNO)
        BigDecimal arbitraryAmount = new BigDecimal("1.00");
        PixGenerateResponse response = pixPaymentService.generatePixTransaction(
                subscriptionId,
                arbitraryAmount,
                studentEmail,
                false
        );

        assertThat(response).isNotNull();
        assertThat(response.amount()).isEqualTo(officialPlanPrice);
        assertThat(mpAmountReceived.get()).isEqualTo(officialPlanPrice);
        assertThat(mpApiCallCount.get()).isEqualTo(1);

        // Tentativa de enviar R$ 5.00 pelo frontend (ADMIN)
        when(subscriptionRepository.findActiveByIdForUpdate(subscriptionId))
                .thenReturn(Optional.of(dummySub));
        mpApiCallCount.set(0);
        mpAmountReceived.set(null);

        PixGenerateResponse adminResponse = pixPaymentService.generatePixTransaction(
                subscriptionId,
                new BigDecimal("5.00"),
                "admin@lionfitness.com.br",
                true
        );

        assertThat(adminResponse).isNotNull();
        assertThat(adminResponse.amount()).isEqualTo(officialPlanPrice);
        assertThat(mpAmountReceived.get()).isEqualTo(officialPlanPrice);
        assertThat(mpApiCallCount.get()).isEqualTo(1);
    }

    @Test
    @DisplayName("Teste 2: Primeira geração de Pix cria nova transação e chama o Mercado Pago")
    void test2_firstGenerationCreatesTransaction() {
        Subscription dummySub = createDummySubscription();
        when(subscriptionRepository.findActiveByIdAndUserEmailForUpdate(subscriptionId, studentEmail))
                .thenReturn(Optional.of(dummySub));
        when(subscriptionRepository.findActivePlanData(planId))
                .thenReturn(Optional.of(new SubscriptionRepository.PlanSubscriptionData("MONTHLY", 30, officialPlanPrice)));
        when(onlinePaymentRepository.findPendingBySubscriptionId(subscriptionId))
                .thenReturn(Optional.empty());
        when(paymentRepository.findPendingBySubscriptionId(subscriptionId))
                .thenReturn(Optional.empty());
        when(paymentRepository.save(any(), eq(subscriptionId), any(), any(), any(), any()))
                .thenReturn(new Payment(UUID.randomUUID(), subscriptionId, officialPlanPrice, null, PaymentMethod.PIX, PaymentStatus.PENDING, LocalDateTime.now()));

        PixGenerateResponse response = pixPaymentService.generatePixTransaction(subscriptionId, null, studentEmail, false);

        assertThat(response).isNotNull();
        assertThat(response.status()).isEqualTo("PENDING");
        assertThat(response.externalTransactionId()).isEqualTo(999888777L);
        assertThat(mpApiCallCount.get()).isEqualTo(1);
        verify(onlinePaymentRepository, times(1)).save(any(OnlinePaymentTransaction.class));
    }

    @Test
    @DisplayName("Teste 3: Segunda geração enquanto PENDING reutiliza transação e NÃO chama Mercado Pago novamente")
    void test3_secondGenerationWhilePendingReusesTransactionWithoutCallingMercadoPago() {
        Subscription dummySub = createDummySubscription();
        when(subscriptionRepository.findActiveByIdAndUserEmailForUpdate(subscriptionId, studentEmail))
                .thenReturn(Optional.of(dummySub));

        UUID existingTxId = UUID.randomUUID();
        UUID existingPaymentId = UUID.randomUUID();
        LocalDateTime requestedAt = LocalDateTime.now().minusMinutes(5);
        String gatewayReturnJson = "{\"qrCode\":\"copia-e-cola-reutilizado\",\"qrCodeBase64\":\"base64-imagem-reutilizada\"}";

        OnlinePaymentTransaction existingPendingTx = new OnlinePaymentTransaction(
                existingTxId,
                subscriptionId,
                existingPaymentId,
                "123456789",
                officialPlanPrice,
                requestedAt,
                null,
                "PENDING",
                gatewayReturnJson
        );

        // Simula que já existe uma transação PENDING no banco
        when(onlinePaymentRepository.findPendingBySubscriptionId(subscriptionId))
                .thenReturn(Optional.of(existingPendingTx));

        PixGenerateResponse response = pixPaymentService.generatePixTransaction(subscriptionId, null, studentEmail, false);

        assertThat(response).isNotNull();
        assertThat(response.transactionId()).isEqualTo(existingTxId);
        assertThat(response.subscriptionId()).isEqualTo(subscriptionId);
        assertThat(response.paymentId()).isEqualTo(existingPaymentId);
        assertThat(response.transactionIdentifier()).isEqualTo("123456789");
        assertThat(response.qrCodePayload()).isEqualTo("copia-e-cola-reutilizado");
        assertThat(response.qrCodeBase64()).isEqualTo("base64-imagem-reutilizada");
        assertThat(response.status()).isEqualTo("PENDING");

        // Regra crucial: Mercado Pago NÃO foi chamado novamente!
        assertThat(mpApiCallCount.get()).isEqualTo(0);
        verify(onlinePaymentRepository, never()).save(any());
    }

    @Test
    @DisplayName("Teste 4: Transação APPROVED não é reutilizada como PENDING")
    void test4_approvedTransactionNotReusedAsPending() {
        Subscription dummySub = createDummySubscription();
        when(subscriptionRepository.findActiveByIdAndUserEmailForUpdate(subscriptionId, studentEmail))
                .thenReturn(Optional.of(dummySub));
        when(subscriptionRepository.findActivePlanData(planId))
                .thenReturn(Optional.of(new SubscriptionRepository.PlanSubscriptionData("MONTHLY", 30, officialPlanPrice)));

        // findPendingBySubscriptionId só retorna status = 'PENDING'.
        // Se a transação anterior estiver APPROVED, findPending retorna Optional.empty()
        when(onlinePaymentRepository.findPendingBySubscriptionId(subscriptionId))
                .thenReturn(Optional.empty());

        when(paymentRepository.findPendingBySubscriptionId(subscriptionId))
                .thenReturn(Optional.empty());
        when(paymentRepository.save(any(), eq(subscriptionId), any(), any(), any(), any()))
                .thenReturn(new Payment(UUID.randomUUID(), subscriptionId, officialPlanPrice, null, PaymentMethod.PIX, PaymentStatus.PENDING, LocalDateTime.now()));

        PixGenerateResponse response = pixPaymentService.generatePixTransaction(subscriptionId, null, studentEmail, false);

        assertThat(response).isNotNull();
        // Como não havia transação PENDING, o fluxo de geração normal foi executado
        assertThat(mpApiCallCount.get()).isEqualTo(1);
        verify(onlinePaymentRepository, times(1)).save(any());
    }

    @Test
    @DisplayName("Teste 5: ALUNO tentando gerar Pix para assinatura de outro aluno é bloqueado com 403 FORBIDDEN")
    void test5_studentTryingOtherStudentSubscriptionBlocked() {
        // Simula que a assinatura não pertence ao e-mail informado
        when(subscriptionRepository.findActiveByIdAndUserEmailForUpdate(subscriptionId, studentEmail))
                .thenReturn(Optional.empty());

        assertThatThrownBy(() -> pixPaymentService.generatePixTransaction(subscriptionId, null, studentEmail, false))
                .isInstanceOf(ResponseStatusException.class)
                .satisfies(ex -> {
                    ResponseStatusException rse = (ResponseStatusException) ex;
                    assertThat(rse.getStatusCode()).isEqualTo(HttpStatus.FORBIDDEN);
                    assertThat(rse.getReason()).contains("não pertence ao aluno autenticado");
                });

        assertThat(mpApiCallCount.get()).isEqualTo(0);
        verify(onlinePaymentRepository, never()).save(any());
    }

    @Test
    @DisplayName("Teste 6: Transação PENDING legada sem QR Code Base64 é marcada como EXPIRED e gera novo Pix no Mercado Pago")
    void test6_legacyPendingTransactionWithoutBase64IsNotReusedAndCreatesNewPix() {
        Subscription dummySub = createDummySubscription();
        when(subscriptionRepository.findActiveByIdAndUserEmailForUpdate(subscriptionId, studentEmail))
                .thenReturn(Optional.of(dummySub));
        when(subscriptionRepository.findActivePlanData(planId))
                .thenReturn(Optional.of(new SubscriptionRepository.PlanSubscriptionData("MONTHLY", 30, officialPlanPrice)));

        UUID legacyTxId = UUID.randomUUID();
        // Transação legada salva apenas com texto simples no gatewayReturn (sem JSON/sem base64) e de dias atrás
        OnlinePaymentTransaction legacyPendingTx = new OnlinePaymentTransaction(
                legacyTxId,
                subscriptionId,
                UUID.randomUUID(),
                "1350996215",
                officialPlanPrice,
                LocalDateTime.now().minusDays(5),
                null,
                "PENDING",
                "00020126580014br.gov.bcb.pix01"
        );

        when(onlinePaymentRepository.findPendingBySubscriptionId(subscriptionId))
                .thenReturn(Optional.of(legacyPendingTx));
        when(paymentRepository.findPendingBySubscriptionId(subscriptionId))
                .thenReturn(Optional.empty());
        when(paymentRepository.save(any(), eq(subscriptionId), any(), any(), any(), any()))
                .thenReturn(new Payment(UUID.randomUUID(), subscriptionId, officialPlanPrice, null, PaymentMethod.PIX, PaymentStatus.PENDING, LocalDateTime.now()));

        PixGenerateResponse response = pixPaymentService.generatePixTransaction(subscriptionId, null, studentEmail, false);

        assertThat(response).isNotNull();
        // Verifica que a transação legada foi marcada como EXPIRED
        verify(onlinePaymentRepository, times(1)).updateStatus(eq(legacyTxId), eq("EXPIRED"), any(), any());
        // E uma NOVA transação completa foi solicitada ao Mercado Pago
        assertThat(mpApiCallCount.get()).isEqualTo(1);
        verify(onlinePaymentRepository, times(1)).save(any(OnlinePaymentTransaction.class));
    }
}
