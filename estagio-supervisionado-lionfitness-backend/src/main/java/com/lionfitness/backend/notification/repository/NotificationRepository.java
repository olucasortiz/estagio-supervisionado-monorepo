package com.lionfitness.backend.notification.repository;

import java.sql.Timestamp;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.time.ZoneOffset;
import java.util.Calendar;
import java.util.TimeZone;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

import com.lionfitness.backend.notification.model.Notification;
import com.lionfitness.backend.notification.model.NotificationType;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.core.RowMapper;
import org.springframework.stereotype.Repository;

@Repository
public class NotificationRepository {

    private static final String NOTIFICATION_COLUMNS = """
            n.id, n.recipient_user_id, n.sender_user_id, sender.name as sender_name,
            n.type, n.title, n.message, n.is_read, n.created_at, n.read_at
            """;

    private static final RowMapper<Notification> ROW_MAPPER = (resultSet, rowNum) -> new Notification(
            resultSet.getObject("id", UUID.class),
            resultSet.getObject("recipient_user_id", UUID.class),
            resultSet.getObject("sender_user_id", UUID.class),
            resultSet.getString("sender_name"),
            NotificationType.valueOf(resultSet.getString("type")),
            resultSet.getString("title"),
            resultSet.getString("message"),
            resultSet.getBoolean("is_read"),
            readUtcTimestamp(resultSet, "created_at"),
            readUtcTimestamp(resultSet, "read_at")
    );

    private static LocalDateTime readUtcTimestamp(ResultSet resultSet, String column) throws SQLException {
        // PostgreSQL does not support getObject(LocalDateTime.class) for TIMESTAMPTZ.
        Timestamp timestamp = resultSet.getTimestamp(column, Calendar.getInstance(TimeZone.getTimeZone("UTC")));
        return timestamp == null ? null : LocalDateTime.ofInstant(timestamp.toInstant(), ZoneOffset.UTC);
    }
    private final JdbcTemplate jdbcTemplate;

    public NotificationRepository(JdbcTemplate jdbcTemplate) {
        this.jdbcTemplate = jdbcTemplate;
        ensureTableExists();
    }

    private void ensureTableExists() {
        jdbcTemplate.execute("""
                CREATE TABLE IF NOT EXISTS notifications (
                    id UUID PRIMARY KEY,
                    recipient_user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
                    sender_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
                    type VARCHAR(64) NOT NULL,
                    title VARCHAR(255) NOT NULL,
                    message TEXT NOT NULL,
                    is_read BOOLEAN NOT NULL DEFAULT FALSE,
                    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT TIMEZONE('utc', NOW()),
                    read_at TIMESTAMP WITH TIME ZONE
                )
                """);

        jdbcTemplate.execute("""
                CREATE INDEX IF NOT EXISTS idx_notifications_recipient_read_created
                    ON notifications (recipient_user_id, is_read, created_at DESC)
                """);
        jdbcTemplate.execute("""
                CREATE INDEX IF NOT EXISTS idx_notifications_recipient_user_id
                    ON notifications (recipient_user_id)
                """);
        jdbcTemplate.execute("""
                CREATE INDEX IF NOT EXISTS idx_notifications_sender_user_id
                    ON notifications (sender_user_id)
                """);
    }

    public Notification save(UUID recipientUserId, UUID senderUserId, NotificationType type,
                             String title, String message, LocalDateTime createdAt) {
        UUID id = UUID.randomUUID();
        jdbcTemplate.update(
                """
                insert into notifications (id, recipient_user_id, sender_user_id, type, title, message, is_read, created_at)
                values (?, ?, ?, ?, ?, ?, false, ?)
                """,
                id, recipientUserId, senderUserId, type.name(), title, message, Timestamp.valueOf(createdAt)
        );
        return new Notification(id, recipientUserId, senderUserId, null, type, title, message,
                false, createdAt, null);
    }

    public List<Notification> findByRecipientUserId(UUID recipientUserId) {
        return jdbcTemplate.query(
                """
                select
                """ + NOTIFICATION_COLUMNS + """
                from notifications n
                left join users sender on sender.id = n.sender_user_id
                where n.recipient_user_id = ?
                order by n.created_at desc, n.id desc
                """,
                ROW_MAPPER,
                recipientUserId
        );
    }

    public Optional<Notification> findByIdAndRecipientUserId(UUID notificationId, UUID recipientUserId) {
        List<Notification> notifications = jdbcTemplate.query(
                """
                select
                """ + NOTIFICATION_COLUMNS + """
                from notifications n
                left join users sender on sender.id = n.sender_user_id
                where n.id = ? and n.recipient_user_id = ?
                """,
                ROW_MAPPER,
                notificationId,
                recipientUserId
        );
        return notifications.stream().findFirst();
    }

    public long countUnreadByRecipientUserId(UUID recipientUserId) {
        Long count = jdbcTemplate.queryForObject(
                "select count(*) from notifications where recipient_user_id = ? and is_read = false",
                Long.class,
                recipientUserId
        );
        return count == null ? 0 : count;
    }

    public boolean markAsRead(UUID notificationId, UUID recipientUserId, LocalDateTime readAt) {
        return jdbcTemplate.update(
                """
                update notifications
                set is_read = true, read_at = ?
                where id = ? and recipient_user_id = ? and is_read = false
                """,
                Timestamp.valueOf(readAt), notificationId, recipientUserId
        ) > 0;
    }

    public int markAllAsRead(UUID recipientUserId, LocalDateTime readAt) {
        return jdbcTemplate.update(
                """
                update notifications
                set is_read = true, read_at = ?
                where recipient_user_id = ? and is_read = false
                """,
                Timestamp.valueOf(readAt), recipientUserId
        );
    }

    public List<Notification> findConversation(UUID userA, UUID userB) {
        return jdbcTemplate.query(
                """
                select
                """ + NOTIFICATION_COLUMNS + """
                from notifications n
                left join users sender on sender.id = n.sender_user_id
                where (n.recipient_user_id = ? and n.sender_user_id = ?)
                   or (n.recipient_user_id = ? and n.sender_user_id = ?)
                order by n.created_at asc, n.id asc
                """,
                ROW_MAPPER,
                userA, userB, userB, userA
        );
    }

    public int markConversationAsRead(UUID recipientUserId, UUID senderUserId, LocalDateTime readAt) {
        return jdbcTemplate.update(
                """
                update notifications
                set is_read = true, read_at = ?
                where recipient_user_id = ? and sender_user_id = ? and is_read = false
                """,
                Timestamp.valueOf(readAt), recipientUserId, senderUserId
        );
    }
}
