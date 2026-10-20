package com.lionfitness.backend.notification.repository;

import com.lionfitness.backend.notification.model.Notification;
import org.junit.jupiter.api.Test;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.core.RowMapper;
import java.sql.ResultSet;
import java.sql.Timestamp;
import java.time.Instant;
import java.time.LocalDateTime;
import java.util.Calendar;
import java.util.List;
import java.util.UUID;
import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

class NotificationRepositoryTest {
    @Test
    void mapsPostgresTimezoneDatesAndNullableReadDate() throws Exception {
        JdbcTemplate jdbc = mock(JdbcTemplate.class);
        ResultSet row = mock(ResultSet.class);
        UUID user = UUID.randomUUID();
        when(row.getString("type")).thenReturn("OTHER");
        when(row.getTimestamp(eq("created_at"), any(Calendar.class)))
                .thenReturn(Timestamp.from(Instant.parse("2026-10-20T14:30:00Z")));
        when(jdbc.query(anyString(), any(RowMapper.class), eq(user))).thenAnswer(call -> {
            RowMapper<Notification> mapper = call.getArgument(1);
            return List.of(mapper.mapRow(row, 0));
        });
        NotificationRepository repository = new NotificationRepository(jdbc);
        Notification result = repository.findByRecipientUserId(user).getFirst();
        assertEquals(LocalDateTime.of(2026, 10, 20, 14, 30), result.createdAt());
        assertNull(result.readAt());
        verify(row, never()).getObject("created_at", LocalDateTime.class);
        verify(row, never()).getObject("read_at", LocalDateTime.class);
    }
}