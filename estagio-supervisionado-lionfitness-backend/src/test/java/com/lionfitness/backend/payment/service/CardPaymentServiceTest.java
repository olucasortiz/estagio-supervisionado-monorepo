package com.lionfitness.backend.payment.service;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.lionfitness.backend.payment.dto.CardPaymentRequest;
import com.lionfitness.backend.payment.dto.CardPaymentResponse;
import com.lionfitness.backend.payment.model.OnlinePaymentTransaction;
import com.lionfitness.backend.payment.model.Payment;
import com.lionfitness.backend.payment.model.PaymentMethod;
import com.lionfitness.backend.payment.model.PaymentStatus;
import com.lionfitness.backend.payment.repository.OnlinePaymentRepository;
import com.lionfitness.backend.payment.repository.PaymentRepository;
import com.lionfitness.backend.subscription.model.Subscription;
import com.lionfitness.backend.subscription.model.SubscriptionStatus;
import com.lionfitness.backend.subscription.repository.SubscriptionRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.http.HttpStatus;
import org.springframework.test.util.ReflectionTestUtils;
import org.springframework.web.client.RestClient;
import org.springframework.web.server.ResponseStatusException;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.*;
import java.util.concurrent.atomic.AtomicInteger;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class CardPaymentServiceTest {

    @Mock
    private SubscriptionRepository subscriptionRepository;

    @Mock
    private PaymentRepository paymentRepository;

    @Mock
    private OnlinePaymentRepository onlinePaymentRepository;

    private CardPaymentService cardPaymentService;

    private final UUID subscriptionId = UUID.randomUUID();
    private final UUID memberId = UUID.randomUUID();
    private final UUID planId = UUID.randomUUID();
    private final String studentEmail = "aluno@lionfitness.com.br";
    private final BigDecimal officialPlanPrice = new BigDecimal("89.90");

    private final AtomicInteger mpApiCallCount = new AtomicInteger(0);
    private Map<String, Object> simulatedMpResponse;

    @BeforeEach
    void setUp() {
        simulatedMpResponse = new HashMap<>();
        simulatedMpResponse.put("id", 1234567890L);
        simulatedMpResponse.put("status", "approved");
        simulatedMpResponse.put("status_detail", "accredited");
        simulatedMpResponse.put("card", Map.of("last_four_digits", "1234"));

        cardPaymentService = new CardPaymentService(
                subscriptionRepository,
                paymentRepository,
                onlinePaymentRepository,
                RestClient.builder(),
                new ObjectMapper()
        ) {
            @Override
            protected Map<String, Object> callMercadoPagoCardApi(
                    BigDecimal amount,
                    String token,
                    String paymentMethodId,
                    int installments,
                    String payerEmail,
                    String identificationType,
                    String identificationNumber,
                    UUID subId
            ) {
                mpApiCallCount.incrementAndGet();
                return simulatedMpResponse;
            }
        };

        ReflectionTestUtils.setField(cardPaymentService, "accessToken", "APP_USR-test-token");
        ReflectionTestUtils.setField(cardPaymentService, "notificationUrl", "https://lionfitness-sa.duckdns.org/api/payments/webhook");
    }

    private Subscription createDummySubscription() {
        return new Subscription(
                subscriptionId,
                memberId,
                planId,
                LocalDate.now().minusMonths(1),
                LocalDate.now().plusDays(1),
                "ACTIVE",
                LocalDateTime.now().minusMonths(1)
        );
    }

    @Test
    @DisplayName("Teste 1: Pagamento de cartão APROVADO renova assinatura e baixa pagamento com preço oficial")
    void test1_cardPaymentApprovedRenewsSubscription() {
        Subscription dummySub = createDummySubscription();
        when(subscriptionRepository.findActiveByIdAndUserEmailForUpdate(subscriptionId, studentEmail))
                .thenReturn(Optional.of(dummySub));
        when(subscriptionRepository.findActivePlanData(planId))
                .thenReturn(Optional.of(new SubscriptionRepository.PlanSubscriptionData("MONTHLY", 30, officialPlanPrice)));

        UUID paymentId = UUID.randomUUID();
        when(paymentRepository.findPendingBySubscriptionId(subscriptionId))
                .thenReturn(Optional.empty());
        when(paymentRepository.save(any(), eq(subscriptionId), any(), any(), eq(PaymentMethod.CREDIT_CARD), eq(PaymentStatus.PENDING)))
                .thenReturn(new Payment(paymentId, subscriptionId, officialPlanPrice, null, PaymentMethod.CREDIT_CARD, PaymentStatus.PENDING, LocalDateTime.now()));

        CardPaymentRequest request = new CardPaymentRequest(
                subscriptionId,
                "card_token_12345",
                "visa",
                "credit_card",
                1,
                studentEmail,
                "CPF",
                "12345678909"
        );

        CardPaymentResponse response = cardPaymentService.processCardPayment(request, studentEmail, false);

        assertThat(response).isNotNull();
        assertThat(response.status()).isEqualTo("APPROVED");
        assertThat(response.amount()).isEqualTo(officialPlanPrice);
        assertThat(response.transactionIdentifier()).isEqualTo("1234567890");

        // Verifica que o pagamento foi baixado e a assinatura foi renovada
        verify(paymentRepository, times(1)).markAsPaid(eq(paymentId), any(LocalDate.class));
        verify(subscriptionRepository, times(1)).renewSubscription(eq(subscriptionId));
        verify(onlinePaymentRepository, times(1)).save(any(OnlinePaymentTransaction.class));
        assertThat(mpApiCallCount.get()).isEqualTo(1);
    }

    @Test
    @DisplayName("Teste 2: Pagamento de cartão RECUSADO não renova assinatura")
    void test2_cardPaymentRejectedDoesNotRenewSubscription() {
        simulatedMpResponse.put("status", "rejected");
        simulatedMpResponse.put("status_detail", "cc_rejected_insufficient_amount");

        Subscription dummySub = createDummySubscription();
        when(subscriptionRepository.findActiveByIdAndUserEmailForUpdate(subscriptionId, studentEmail))
                .thenReturn(Optional.of(dummySub));
        when(subscriptionRepository.findActivePlanData(planId))
                .thenReturn(Optional.of(new SubscriptionRepository.PlanSubscriptionData("MONTHLY", 30, officialPlanPrice)));

        UUID paymentId = UUID.randomUUID();
        when(paymentRepository.findPendingBySubscriptionId(subscriptionId))
                .thenReturn(Optional.of(new Payment(paymentId, subscriptionId, officialPlanPrice, null, PaymentMethod.CREDIT_CARD, PaymentStatus.PENDING, LocalDateTime.now())));

        CardPaymentRequest request = new CardPaymentRequest(
                subscriptionId,
                "card_token_rejected",
                "master",
                "credit_card",
                2,
                studentEmail,
                "CPF",
                "12345678909"
        );

        CardPaymentResponse response = cardPaymentService.processCardPayment(request, studentEmail, false);

        assertThat(response).isNotNull();
        assertThat(response.status()).isEqualTo("REJECTED");
        assertThat(response.message()).contains("insuficiente");

        // Assinatura e payment NÃO devem ser renovados nem baixados
        verify(paymentRepository, never()).markAsPaid(any(), any());
        verify(subscriptionRepository, never()).renewSubscription(any());
        verify(onlinePaymentRepository, times(1)).save(any(OnlinePaymentTransaction.class));
    }

    @Test
    @DisplayName("Teste 3: Aluno tentando pagar assinatura de outro aluno é bloqueado com 403 FORBIDDEN")
    void test3_studentTryingOtherStudentSubscriptionBlocked() {
        when(subscriptionRepository.findActiveByIdAndUserEmailForUpdate(subscriptionId, studentEmail))
                .thenReturn(Optional.empty());

        CardPaymentRequest request = new CardPaymentRequest(
                subscriptionId,
                "token_qualquer",
                "visa",
                "credit_card",
                1,
                studentEmail,
                "CPF",
                "12345678909"
        );

        assertThatThrownBy(() -> cardPaymentService.processCardPayment(request, studentEmail, false))
                .isInstanceOf(ResponseStatusException.class)
                .satisfies(ex -> {
                    ResponseStatusException rse = (ResponseStatusException) ex;
                    assertThat(rse.getStatusCode()).isEqualTo(HttpStatus.FORBIDDEN);
                });

        assertThat(mpApiCallCount.get()).isEqualTo(0);
        verify(onlinePaymentRepository, never()).save(any());
    }
}
