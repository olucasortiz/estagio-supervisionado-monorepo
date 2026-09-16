package com.lionfitness.backend.payment.repository;

import org.junit.jupiter.api.Test;
import org.springframework.jdbc.core.JdbcTemplate;

import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

class PaymentRepositoryDebtTest {
    @Test
    void pendingAndOverdueBlockRegardlessOfDueDateOrSubscriptionStatus() {
        JdbcTemplate jdbcTemplate = mock(JdbcTemplate.class);
        UUID memberId = UUID.randomUUID();
        when(jdbcTemplate.queryForObject(anyString(), eq(Integer.class), eq(memberId))).thenReturn(1);

        assertThat(new PaymentRepository(jdbcTemplate).hasPendingOrOverdueByMemberId(memberId)).isTrue();

        var sql = org.mockito.ArgumentCaptor.forClass(String.class);
        verify(jdbcTemplate).queryForObject(sql.capture(), eq(Integer.class), eq(memberId));
        assertThat(sql.getValue()).contains("s.member_id = ?", "'PENDING'", "'OVERDUE'")
                .doesNotContain("s.end_date < current_date", "s.status::text <> 'CANCELED'");
    }
}
