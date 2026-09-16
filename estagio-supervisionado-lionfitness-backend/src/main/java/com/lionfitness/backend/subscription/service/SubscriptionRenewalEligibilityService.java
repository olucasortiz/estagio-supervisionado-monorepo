package com.lionfitness.backend.subscription.service;

import java.time.Clock;
import java.time.LocalDate;
import java.time.temporal.ChronoUnit;

import com.lionfitness.backend.subscription.exception.SubscriptionRenewalNotAvailableException;
import com.lionfitness.backend.subscription.model.Subscription;
import org.springframework.stereotype.Service;

@Service
public class SubscriptionRenewalEligibilityService {

    public static final int RENEWAL_WINDOW_DAYS = 5;

    private final Clock clock;

    public SubscriptionRenewalEligibilityService(Clock applicationClock) {
        this.clock = applicationClock;
    }

    public RenewalEligibility assess(Subscription subscription) {
        LocalDate today = LocalDate.now(clock);
        LocalDate availableFrom = subscription.endDate().minusDays(RENEWAL_WINDOW_DAYS);
        boolean eligible = !today.isBefore(availableFrom);
        int daysUntilRenewal = eligible ? 0 : Math.toIntExact(ChronoUnit.DAYS.between(today, availableFrom));
        return new RenewalEligibility(eligible, availableFrom, daysUntilRenewal);
    }

    public void requireEligible(Subscription subscription) {
        RenewalEligibility eligibility = assess(subscription);
        if (!eligibility.eligible()) {
            throw new SubscriptionRenewalNotAvailableException(eligibility.availableFrom());
        }
    }

    public record RenewalEligibility(boolean eligible, LocalDate availableFrom, int daysUntilRenewal) {
    }
}
