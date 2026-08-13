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
