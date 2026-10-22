package com.lionfitness.backend.subscription.service;

import java.time.Clock;
import java.time.LocalDate;
import java.time.ZoneId;
import java.time.temporal.ChronoUnit;

import com.lionfitness.backend.subscription.exception.SubscriptionRenewalNotAvailableException;
import com.lionfitness.backend.subscription.model.Subscription;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

@Service
public class SubscriptionRenewalEligibilityService {

    public static final int RENEWAL_WINDOW_DAYS = 5;
    public static final ZoneId BUSINESS_ZONE = ZoneId.of("America/Sao_Paulo");

    private final Clock clock;
    private final ZoneId zoneId;

    @Autowired
    public SubscriptionRenewalEligibilityService(Clock applicationClock) {
        this(applicationClock, BUSINESS_ZONE);
    }

    public SubscriptionRenewalEligibilityService(Clock applicationClock, ZoneId zoneId) {
        this.clock = applicationClock;
        this.zoneId = zoneId != null ? zoneId : BUSINESS_ZONE;
    }

    public RenewalEligibility assess(Subscription subscription) {
        LocalDate today = businessDate();
        LocalDate availableFrom = subscription.endDate().minusDays(RENEWAL_WINDOW_DAYS);
        boolean renewableStatus = "ACTIVE".equalsIgnoreCase(subscription.status())
                || "EXPIRED".equalsIgnoreCase(subscription.status());
        boolean eligible = renewableStatus && !today.isBefore(availableFrom);
        int daysUntilRenewal = eligible ? 0 : Math.toIntExact(ChronoUnit.DAYS.between(today, availableFrom));
        return new RenewalEligibility(eligible, availableFrom, daysUntilRenewal);
    }

    public void requireEligible(Subscription subscription) {
        RenewalEligibility eligibility = assess(subscription);
        if (!eligibility.eligible()) {
            throw new SubscriptionRenewalNotAvailableException(eligibility.availableFrom());
        }
    }

    public LocalDate businessDate() {
        return LocalDate.now(clock.withZone(zoneId));
    }

    public String effectiveStatus(String status, LocalDate endDate) {
        if ("ACTIVE".equalsIgnoreCase(status) && endDate != null && endDate.isBefore(businessDate())) {
            return "EXPIRED";
        }
        return status;
    }

    public record RenewalEligibility(boolean eligible, LocalDate availableFrom, int daysUntilRenewal) {
    }
}
