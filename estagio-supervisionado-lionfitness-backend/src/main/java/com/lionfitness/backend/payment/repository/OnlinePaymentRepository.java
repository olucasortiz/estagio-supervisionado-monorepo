package com.lionfitness.backend.payment.repository;

import com.lionfitness.backend.payment.model.OnlinePaymentTransaction;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.core.RowMapper;
import org.springframework.stereotype.Repository;

import java.sql.Timestamp;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public class OnlinePaymentRepository {

    private static final String COLUMNS = """
            opt.id, opt.subscription_id, opt.payment_id, opt.transaction_identifier,
            opt.amount, opt.requested_at, opt.confirmed_at, opt.status, opt.gateway_return,
            opt.idempotency_key
            """;

    private static final RowMapper<OnlinePaymentTransaction> ROW_MAPPER = (rs, rowNum) -> {
        Timestamp requestedAt = rs.getTimestamp("requested_at");
        Timestamp confirmedAt = rs.getTimestamp("confirmed_at");
        return new OnlinePaymentTransaction(
                rs.getObject("id", UUID.class),
                rs.getObject("subscription_id", UUID.class),
                rs.getObject("payment_id", UUID.class),
                rs.getString("transaction_identifier"),
                rs.getBigDecimal("amount"),
                requestedAt != null ? requestedAt.toLocalDateTime() : null,
                confirmedAt != null ? confirmedAt.toLocalDateTime() : null,
                rs.getString("status"),
                rs.getString("gateway_return"),
                rs.getString("idempotency_key")
        );
    };

    private final JdbcTemplate jdbcTemplate;

    public OnlinePaymentRepository(JdbcTemplate jdbcTemplate) {
        this.jdbcTemplate = jdbcTemplate;
    }

    public OnlinePaymentTransaction save(OnlinePaymentTransaction transaction) {
        return saveWithIdempotencyKey(transaction, transaction.idempotencyKey());
    }

    public OnlinePaymentTransaction saveWithIdempotencyKey(
            OnlinePaymentTransaction transaction,
            String idempotencyKey
    ) {
        jdbcTemplate.update(
                """
                INSERT INTO online_payment_transactions
                    (id, subscription_id, payment_id, transaction_identifier, amount, requested_at,
                     confirmed_at, status, gateway_return, idempotency_key)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                """,
                transaction.id(), transaction.subscriptionId(), transaction.paymentId(),
                transaction.transactionIdentifier(), transaction.amount(),
                transaction.requestedAt() != null ? Timestamp.valueOf(transaction.requestedAt()) : Timestamp.valueOf(LocalDateTime.now()),
                transaction.confirmedAt() != null ? Timestamp.valueOf(transaction.confirmedAt()) : null,
                transaction.status() != null ? transaction.status() : "PENDING",
                transaction.gatewayReturn(), idempotencyKey
        );
        return transaction;
    }

    public Optional<OnlinePaymentTransaction> findById(UUID id) {
        return first("SELECT " + COLUMNS + " FROM online_payment_transactions opt WHERE opt.id = ?", id);
    }

    public Optional<OnlinePaymentTransaction> findByIdForUpdate(UUID id) {
        return first("SELECT " + COLUMNS + " FROM online_payment_transactions opt WHERE opt.id = ? FOR UPDATE", id);
    }

    public Optional<OnlinePaymentTransaction> findByTransactionIdentifier(String transactionIdentifier) {
        return first("SELECT " + COLUMNS + " FROM online_payment_transactions opt WHERE opt.transaction_identifier = ?", transactionIdentifier);
    }

    public Optional<OnlinePaymentTransaction> findByIdempotencyKey(String idempotencyKey) {
        return first("SELECT " + COLUMNS + " FROM online_payment_transactions opt WHERE opt.idempotency_key = ?", idempotencyKey);
    }

    public Optional<OnlinePaymentTransaction> findByIdAndUserEmail(UUID id, String userEmail) {
        String sql = """
                SELECT %s
                FROM online_payment_transactions opt
                INNER JOIN subscriptions s ON s.id = opt.subscription_id
                INNER JOIN members m ON m.id = s.member_id
                INNER JOIN users u ON u.id = m.user_id
                WHERE opt.id = ?
                  AND lower(u.email) = lower(?)
                  AND m.is_active = true
                  AND s.status::text <> 'CANCELED'
                """.formatted(COLUMNS);
        return jdbcTemplate.query(sql, ROW_MAPPER, id, userEmail).stream().findFirst();
    }

    public Optional<OnlinePaymentTransaction> findPendingBySubscriptionId(UUID subscriptionId) {
        String sql = """
                SELECT %s
                FROM online_payment_transactions opt
                WHERE opt.subscription_id = ? AND opt.status = 'PENDING'
                ORDER BY opt.requested_at DESC LIMIT 1
                """.formatted(COLUMNS);
        return first(sql, subscriptionId);
    }

    public Optional<OnlinePaymentTransaction> findPendingBySubscriptionIdAndMethod(UUID subscriptionId, String paymentMethod) {
        String sql = """
                SELECT %s
                FROM online_payment_transactions opt
                INNER JOIN payments p ON p.id = opt.payment_id
                WHERE opt.subscription_id = ?
                  AND opt.status = 'PENDING'
                  AND p.method::text = ?
                ORDER BY opt.requested_at DESC LIMIT 1
                """.formatted(COLUMNS);
        return jdbcTemplate.query(sql, ROW_MAPPER, subscriptionId, paymentMethod).stream().findFirst();
    }

    public boolean updateStatus(UUID id, String status, LocalDateTime confirmedAt, String gatewayReturn) {
        int rows = jdbcTemplate.update(
                "UPDATE online_payment_transactions SET status = ?, confirmed_at = ?, gateway_return = ? WHERE id = ?",
                status, confirmedAt != null ? Timestamp.valueOf(confirmedAt) : null, gatewayReturn, id);
        return rows > 0;
    }

    public boolean markRejectedIfPendingLocal(UUID id) {
        int rows = jdbcTemplate.update(
                """
                UPDATE online_payment_transactions
                SET status = 'REJECTED'
                WHERE id = ?
                  AND upper(status) = 'PENDING'
                  AND transaction_identifier LIKE 'LOCAL-%'
                """,
                id);
        return rows > 0;
    }

    public boolean updateOrderStateIfNotApproved(UUID id, String orderId, String status,
                                                  LocalDateTime confirmedAt, String gatewayReturn) {
        int rows = jdbcTemplate.update(
                """
                UPDATE online_payment_transactions
                SET transaction_identifier = ?, status = ?, confirmed_at = ?, gateway_return = ?
                WHERE id = ? AND upper(status) NOT IN ('APPROVED', 'CONFIRMED')
                """,
                orderId, status, confirmedAt != null ? Timestamp.valueOf(confirmedAt) : null, gatewayReturn, id);
        return rows > 0;
    }

    public boolean updateApprovedOrderMetadata(UUID id, String orderId, String gatewayReturn) {
        int rows = jdbcTemplate.update(
                "UPDATE online_payment_transactions SET transaction_identifier = ?, gateway_return = ? WHERE id = ?",
                orderId, gatewayReturn, id);
        return rows > 0;
    }

    private Optional<OnlinePaymentTransaction> first(String sql, Object... args) {
        List<OnlinePaymentTransaction> list = jdbcTemplate.query(sql, ROW_MAPPER, args);
        return list.stream().findFirst();
    }
}
