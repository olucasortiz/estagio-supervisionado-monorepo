package com.lionfitness.backend.subscription.repository;

import java.time.LocalDate;
import java.util.UUID;

import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;
import org.springframework.jdbc.core.JdbcTemplate;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

class SubscriptionRepositoryRenewalTest {

    @Test
    void anticipatedRenewalExtendsFromCurrentEndDateInsteadOfPaymentDate() {
        JdbcTemplate jdbcTemplate = mock(JdbcTemplate.class);
        SubscriptionRepository repository = new SubscriptionRepository(jdbcTemplate);
        UUID subscriptionId = UUID.randomUUID();
        LocalDate paymentDate = LocalDate.of(2026, 10, 27);
        when(jdbcTemplate.update(anyString(), any(Object[].class))).thenReturn(1);

        assertThat(repository.renewSubscription(subscriptionId, paymentDate)).isTrue();

        ArgumentCaptor<String> sql = ArgumentCaptor.forClass(String.class);
        verify(jdbcTemplate).update(sql.capture(), eq(paymentDate), eq(paymentDate), eq(subscriptionId));
        assertThat(sql.getValue()).contains("when s.end_date >= ? then s.end_date +")
                .contains("else ? +");
    }
}
