package com.lionfitness.backend.payment.repository;

import java.sql.Timestamp;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

import com.lionfitness.backend.payment.model.OnlinePaymentTransaction;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.core.RowMapper;
import org.springframework.stereotype.Repository;

@Repository
public class OnlinePaymentRepository {

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
                rs.getString("gateway_return")
        );
    };

    private final JdbcTemplate jdbcTemplate;

    public OnlinePaymentRepository(JdbcTemplate jdbcTemplate) {
        this.jdbcTemplate = jdbcTemplate;
    }

    public OnlinePaymentTransaction save(OnlinePaymentTransaction transaction) {
        String sql = """
                INSERT INTO online_payment_transactions
                    (id, subscription_id, payment_id, transaction_identifier, amount, requested_at, confirmed_at, status, gateway_return)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
                """;

        jdbcTemplate.update(
                sql,
                transaction.id(),
                transaction.subscriptionId(),
                transaction.paymentId(),
                transaction.transactionIdentifier(),
                transaction.amount(),
                transaction.requestedAt() != null ? Timestamp.valueOf(transaction.requestedAt()) : Timestamp.valueOf(LocalDateTime.now()),
                transaction.confirmedAt() != null ? Timestamp.valueOf(transaction.confirmedAt()) : null,
                transaction.status() != null ? transaction.status() : "PENDING",
                transaction.gatewayReturn()
        );

        return transaction;
    }

    public OnlinePaymentTransaction saveWithIdempotencyKey(
            OnlinePaymentTransaction transaction,
            String idempotencyKey) {
        String sql = """
                INSERT INTO online_payment_transactions
                    (id, subscription_id, payment_id, transaction_identifier, amount, requested_at,
                     confirmed_at, status, gateway_return, idempotency_key)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                """;

        jdbcTemplate.update(
                sql,
                transaction.id(),
                transaction.subscriptionId(),
                transaction.paymentId(),
                transaction.transactionIdentifier(),
                transaction.amount(),
                transaction.requestedAt() != null ? Timestamp.valueOf(transaction.requestedAt()) : Timestamp.valueOf(LocalDateTime.now()),
                transaction.confirmedAt() != null ? Timestamp.valueOf(transaction.confirmedAt()) : null,
                transaction.status() != null ? transaction.status() : "PENDING",
                transaction.gatewayReturn(),
                idempotencyKey
        );

        return transaction;
    }

    public Optional<OnlinePaymentTransaction> findById(UUID id) {
        String sql = "SELECT * FROM online_payment_transactions WHERE id = ?";
        List<OnlinePaymentTransaction> list = jdbcTemplate.query(sql, ROW_MAPPER, id);
        return list.stream().findFirst();
    }

    public Optional<OnlinePaymentTransaction> findByTransactionIdentifier(String transactionIdentifier) {
        String sql = "SELECT * FROM online_payment_transactions WHERE transaction_identifier = ?";
        List<OnlinePaymentTransaction> list = jdbcTemplate.query(sql, ROW_MAPPER, transactionIdentifier);
        return list.stream().findFirst();
    }

    public Optional<OnlinePaymentTransaction> findByIdempotencyKey(String idempotencyKey) {
        String sql = "SELECT * FROM online_payment_transactions WHERE idempotency_key = ?";
        List<OnlinePaymentTransaction> list = jdbcTemplate.query(sql, ROW_MAPPER, idempotencyKey);
        return list.stream().findFirst();
    }

    public Optional<OnlinePaymentTransaction> findByIdAndUserEmail(UUID id, String userEmail) {
        String sql = """
                SELECT opt.id, opt.subscription_id, opt.payment_id, opt.transaction_identifier,
                       opt.amount, opt.requested_at, opt.confirmed_at, opt.status, opt.gateway_return
                FROM online_payment_transactions opt
                INNER JOIN subscriptions s ON s.id = opt.subscription_id
                INNER JOIN members m ON m.id = s.member_id
                INNER JOIN users u ON u.id = m.user_id
                WHERE opt.id = ?
                  AND lower(u.email) = lower(?)
                  AND m.is_active = true
                  AND s.status::text <> 'CANCELED'
                """;
        List<OnlinePaymentTransaction> list = jdbcTemplate.query(sql, ROW_MAPPER, id, userEmail);
        return list.stream().findFirst();
    }

    public Optional<OnlinePaymentTransaction> findPendingBySubscriptionId(UUID subscriptionId) {
        String sql = """
                SELECT opt.id, opt.subscription_id, opt.payment_id, opt.transaction_identifier,
                       opt.amount, opt.requested_at, opt.confirmed_at, opt.status, opt.gateway_return
                FROM online_payment_transactions opt
                WHERE opt.subscription_id = ?
                  AND opt.status = 'PENDING'
                ORDER BY opt.requested_at DESC
                LIMIT 1
                """;
        List<OnlinePaymentTransaction> list = jdbcTemplate.query(sql, ROW_MAPPER, subscriptionId);
        return list.stream().findFirst();
    }

    public boolean updateStatus(UUID id, String status, LocalDateTime confirmedAt, String gatewayReturn) {
        String sql = """
                UPDATE online_payment_transactions
                SET status = ?, confirmed_at = ?, gateway_return = ?
                WHERE id = ?
                """;

        int rows = jdbcTemplate.update(
                sql,
                status,
                confirmedAt != null ? Timestamp.valueOf(confirmedAt) : null,
                gatewayReturn,
                id
        );

        return rows > 0;
    }
}
