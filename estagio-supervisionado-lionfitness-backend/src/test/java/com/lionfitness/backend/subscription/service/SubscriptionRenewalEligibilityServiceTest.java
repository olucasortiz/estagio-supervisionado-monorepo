package com.lionfitness.backend.subscription.service;

import java.math.BigDecimal;
import java.time.Clock;
import java.time.Instant;
import java.time.LocalDate;
import java.time.ZoneId;
import java.time.LocalDateTime;
import java.util.UUID;

import com.lionfitness.backend.subscription.exception.SubscriptionRenewalNotAvailableException;
import com.lionfitness.backend.subscription.model.Subscription;
import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

class SubscriptionRenewalEligibilityServiceTest {

    private static final ZoneId ZONE = ZoneId.of("America/Sao_Paulo");

    @Test
    void blocksWhenSixDaysRemain() {
        SubscriptionRenewalEligibilityService service = serviceOn(LocalDate.of(2026, 10, 25));

        SubscriptionRenewalEligibilityService.RenewalEligibility eligibility = service.assess(subscriptionEndingOn(LocalDate.of(2026, 10, 31)));

        assertThat(eligibility.eligible()).isFalse();
        assertThat(eligibility.availableFrom()).isEqualTo(LocalDate.of(2026, 10, 26));
        assertThat(eligibility.daysUntilRenewal()).isEqualTo(1);
        assertThatThrownBy(() -> service.requireEligible(subscriptionEndingOn(LocalDate.of(2026, 10, 31))))
                .isInstanceOf(SubscriptionRenewalNotAvailableException.class);
    }

    @Test
    void allowsAtFiveDaysOneDayOnExpirationAndAfterExpiration() {
        LocalDate endDate = LocalDate.of(2026, 10, 31);
        for (LocalDate today : new LocalDate[]{
                LocalDate.of(2026, 10, 26), LocalDate.of(2026, 10, 30), endDate, LocalDate.of(2026, 11, 1)}) {
            SubscriptionRenewalEligibilityService.RenewalEligibility eligibility = serviceOn(today)
                    .assess(subscriptionEndingOn(endDate));
            assertThat(eligibility.eligible()).isTrue();
            assertThat(eligibility.daysUntilRenewal()).isZero();
        }
    }

    private SubscriptionRenewalEligibilityService serviceOn(LocalDate today) {
        return new SubscriptionRenewalEligibilityService(
                Clock.fixed(today.atStartOfDay(ZONE).toInstant(), ZONE));
    }

    private Subscription subscriptionEndingOn(LocalDate endDate) {
        return new Subscription(UUID.randomUUID(), UUID.randomUUID(), UUID.randomUUID(),
                endDate.minusDays(30), endDate, "ACTIVE", LocalDateTime.of(2026, 10, 1, 12, 0));
    }
}
