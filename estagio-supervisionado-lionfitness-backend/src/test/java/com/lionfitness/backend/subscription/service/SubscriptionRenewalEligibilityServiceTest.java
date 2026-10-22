package com.lionfitness.backend.subscription.service;

import java.time.Clock;
import java.time.Instant;
import java.time.LocalDate;
import java.time.ZoneId;
import java.time.ZoneOffset;
import java.time.LocalDateTime;
import java.util.UUID;

import com.lionfitness.backend.subscription.exception.SubscriptionRenewalNotAvailableException;
import com.lionfitness.backend.subscription.model.Subscription;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

class SubscriptionRenewalEligibilityServiceTest {

    private static final ZoneId BRASILIA_ZONE = ZoneId.of("America/Sao_Paulo");

    @Test
    @DisplayName("BUG-10: Bloqueia renovação quando faltam 6 dias para o vencimento")
    void blocksWhenSixDaysRemain() {
        SubscriptionRenewalEligibilityService service = serviceOn(LocalDate.of(2026, 10, 25));

        SubscriptionRenewalEligibilityService.RenewalEligibility eligibility =
                service.assess(subscriptionEndingOn(LocalDate.of(2026, 10, 31)));

        assertThat(eligibility.eligible()).isFalse();
        assertThat(eligibility.availableFrom()).isEqualTo(LocalDate.of(2026, 10, 26));
        assertThat(eligibility.daysUntilRenewal()).isEqualTo(1);
        assertThatThrownBy(() -> service.requireEligible(subscriptionEndingOn(LocalDate.of(2026, 10, 31))))
                .isInstanceOf(SubscriptionRenewalNotAvailableException.class);
    }

    @Test
    @DisplayName("BUG-10: Permite renovação exatamente 5 dias antes do vencimento")
    void allowsAtExactlyFiveDaysBeforeExpiration() {
        SubscriptionRenewalEligibilityService service = serviceOn(LocalDate.of(2026, 10, 26));

        SubscriptionRenewalEligibilityService.RenewalEligibility eligibility =
                service.assess(subscriptionEndingOn(LocalDate.of(2026, 10, 31)));

        assertThat(eligibility.eligible()).isTrue();
        assertThat(eligibility.daysUntilRenewal()).isZero();
        assertThat(eligibility.availableFrom()).isEqualTo(LocalDate.of(2026, 10, 26));
    }

    @Test
    @DisplayName("BUG-10: Permite renovação na data exata do vencimento e nos dias posteriores")
    void allowsAtExpirationDayAndAfter() {
        LocalDate endDate = LocalDate.of(2026, 10, 31);
        for (LocalDate today : new LocalDate[]{
                LocalDate.of(2026, 10, 31), LocalDate.of(2026, 11, 1), LocalDate.of(2026, 11, 5)}) {
            SubscriptionRenewalEligibilityService.RenewalEligibility eligibility =
                    serviceOn(today).assess(subscriptionEndingOn(endDate));
            assertThat(eligibility.eligible()).isTrue();
            assertThat(eligibility.daysUntilRenewal()).isZero();
        }
    }

    @Test
    @DisplayName("Matrícula permanece ativa até o fim da data de vencimento e expira no dia seguinte")
    void derivesExpiredStatusOnlyAfterEndDate() {
        SubscriptionRenewalEligibilityService service = serviceOn(LocalDate.of(2026, 10, 31));

        assertThat(service.effectiveStatus("ACTIVE", LocalDate.of(2026, 10, 31))).isEqualTo("ACTIVE");
        assertThat(service.effectiveStatus("ACTIVE", LocalDate.of(2026, 10, 30))).isEqualTo("EXPIRED");
        assertThat(service.effectiveStatus("CANCELED", LocalDate.of(2026, 10, 30))).isEqualTo("CANCELED");
        assertThat(service.effectiveStatus("PENDING", LocalDate.of(2026, 10, 30))).isEqualTo("PENDING");
    }

    @Test
    @DisplayName("Matrícula cancelada não pode ser renovada como se ainda estivesse ativa")
    void canceledSubscriptionIsNotRenewalEligible() {
        Subscription canceled = new Subscription(UUID.randomUUID(), UUID.randomUUID(), UUID.randomUUID(),
                LocalDate.of(2026, 10, 1), LocalDate.of(2026, 10, 20), "CANCELED",
                LocalDateTime.of(2026, 10, 1, 12, 0));

        SubscriptionRenewalEligibilityService.RenewalEligibility eligibility =
                serviceOn(LocalDate.of(2026, 10, 31)).assess(canceled);

        assertThat(eligibility.eligible()).isFalse();
    }

    @Test
    @DisplayName("BUG-10: Transição entre UTC e horário de Brasília (22h30 BRT = 01h30 UTC do dia seguinte)")
    void handlesDateTransitionBetweenUtcAndBrasiliaTime() {
        // Instant: 2026-10-26T01:30:00Z.
        // Em UTC (servidor AWS padrão), já é dia 2026-10-26.
        // Em Brasília (America/Sao_Paulo, UTC-3), ainda é dia 2026-10-25 às 22:30.
        // Para uma assinatura que vence em 2026-10-31, a janela de 5 dias abre no dia 2026-10-26.
        // Portanto, às 22:30 de 2026-10-25 em Brasília, a renovação DEVE estar bloqueada!
        Instant transitionInstant = Instant.parse("2026-10-26T01:30:00Z");

        // Mesmo se o Clock injetado for configurado como UTC (típico da AWS):
        Clock awsUtcClock = Clock.fixed(transitionInstant, ZoneOffset.UTC);
        SubscriptionRenewalEligibilityService service = new SubscriptionRenewalEligibilityService(awsUtcClock);

        Subscription subscription = subscriptionEndingOn(LocalDate.of(2026, 10, 31));
        SubscriptionRenewalEligibilityService.RenewalEligibility eligibility = service.assess(subscription);

        // Deve avaliar conforme a data de Brasília (2026-10-25), portanto NÃO elegível
        assertThat(eligibility.eligible()).isFalse();
        assertThat(eligibility.availableFrom()).isEqualTo(LocalDate.of(2026, 10, 26));
        assertThat(eligibility.daysUntilRenewal()).isEqualTo(1);
    }

    @Test
    @DisplayName("BUG-10: Avaliação idêntica e consistente em servidores configurados em fusos horários distintos")
    void evaluatesIdenticallyRegardlessOfServerTimeZone() {
        // Exatamente meia-noite em Brasília no dia 2026-10-26 (abertura da janela de 5 dias)
        // 2026-10-26T00:00:00-03:00 = 2026-10-26T03:00:00Z
        Instant midnightBrt = Instant.parse("2026-10-26T03:00:00Z");

        ZoneId[] serverZones = new ZoneId[]{
                ZoneOffset.UTC,
                ZoneId.of("Asia/Tokyo"),
                ZoneId.of("America/New_York"),
                ZoneId.of("Europe/London")
        };

        Subscription subscription = subscriptionEndingOn(LocalDate.of(2026, 10, 31));

        for (ZoneId serverZone : serverZones) {
            Clock serverClock = Clock.fixed(midnightBrt, serverZone);
            SubscriptionRenewalEligibilityService service = new SubscriptionRenewalEligibilityService(serverClock);

            SubscriptionRenewalEligibilityService.RenewalEligibility eligibility = service.assess(subscription);
            assertThat(eligibility.eligible())
                    .as("Servidor com timezone %s deve reconhecer elegibilidade em horário de Brasília", serverZone)
                    .isTrue();
            assertThat(eligibility.daysUntilRenewal()).isZero();
        }
    }

    private SubscriptionRenewalEligibilityService serviceOn(LocalDate today) {
        return new SubscriptionRenewalEligibilityService(
                Clock.fixed(today.atStartOfDay(BRASILIA_ZONE).toInstant(), BRASILIA_ZONE));
    }

    private Subscription subscriptionEndingOn(LocalDate endDate) {
        return new Subscription(UUID.randomUUID(), UUID.randomUUID(), UUID.randomUUID(),
                endDate.minusDays(30), endDate, "ACTIVE", LocalDateTime.of(2026, 10, 1, 12, 0));
    }
}
