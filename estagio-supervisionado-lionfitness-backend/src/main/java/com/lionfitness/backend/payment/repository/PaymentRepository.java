package com.lionfitness.backend.payment.repository;

import java.math.BigDecimal;
import java.sql.Timestamp;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

import com.lionfitness.backend.member.dto.OverdueMemberResponse;
import com.lionfitness.backend.payment.model.Payment;
import com.lionfitness.backend.payment.model.PaymentMethod;
import com.lionfitness.backend.payment.model.PaymentStatus;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.core.RowMapper;
import org.springframework.stereotype.Repository;

@Repository
public class PaymentRepository {

        private static final RowMapper<Payment> PAYMENT_ROW_MAPPER = (resultSet, rowNum) -> {
                LocalDateTime paidAt = resultSet.getObject("paid_at", LocalDateTime.class);

                return new Payment(
                                resultSet.getObject("id", UUID.class),
                                resultSet.getObject("subscription_id", UUID.class),
                                resultSet.getBigDecimal("amount"),
                                paidAt != null ? paidAt.toLocalDate() : null,
                                PaymentMethod.fromDatabaseValue(resultSet.getString("method")),
                                PaymentStatus.fromDatabaseValue(resultSet.getString("status")),
                                resultSet.getObject("created_at", LocalDateTime.class));
        };

        private static final RowMapper<OverdueMemberResponse> OVERDUE_MEMBER_ROW_MAPPER = (resultSet,
                        rowNum) -> new OverdueMemberResponse(
                                        resultSet.getObject("member_id", UUID.class),
                                        resultSet.getString("name"),
                                        resultSet.getString("cpf"),
                                        resultSet.getObject("subscription_id", UUID.class),
                                        resultSet.getString("subscription_status"),
                                        resultSet.getObject("payment_id", UUID.class),
                                        resultSet.getBigDecimal("amount"),
                                        resultSet.getObject("reference_date", LocalDate.class),
                                        resultSet.getString("payment_method"),
                                        resultSet.getString("payment_status"));

        private final JdbcTemplate jdbcTemplate;

        public PaymentRepository(JdbcTemplate jdbcTemplate) {
                this.jdbcTemplate = jdbcTemplate;
        }

        public Payment save(
                        UUID id,
                        UUID subscriptionId,
                        BigDecimal amount,
                        LocalDate paymentDate,
                        PaymentMethod method,
                        PaymentStatus status) {
                LocalDateTime createdAt = LocalDateTime.now();
                LocalDateTime paidAt = paymentDate != null
                                ? paymentDate.atStartOfDay()
                                : null;

                jdbcTemplate.update(
                                """
                                                insert into payments (id, subscription_id, amount, paid_at, method, status, created_at)
                                                values (?, ?, ?, ?, cast(? as payment_method_enum), cast(? as payment_status_enum), ?)
                                                """,
                                id,
                                subscriptionId,
                                amount,
                                paidAt != null ? Timestamp.valueOf(paidAt) : null,
                                method.name(),
                                status.name(),
                                Timestamp.valueOf(createdAt));

                return new Payment(
                                id,
                                subscriptionId,
                                amount,
                                paymentDate,
                                method,
                                status,
                                createdAt);
        }

        public List<Payment> findAllActive() {
                return jdbcTemplate.query(
                                """
                                                select id, subscription_id, amount, paid_at, method, status, created_at
                                                from payments
                                                where status::text <> 'CANCELED'
                                                order by created_at desc
                                                """,
                                PAYMENT_ROW_MAPPER);
        }

        public Optional<Payment> findActiveById(UUID id) {
                List<Payment> payments = jdbcTemplate.query(
                                """
                                                select id, subscription_id, amount, paid_at, method, status, created_at
                                                from payments
                                                where id = ? and status::text <> 'CANCELED'
                                                """,
                                PAYMENT_ROW_MAPPER,
                                id);

                return payments.stream().findFirst();
        }

        public boolean subscriptionExists(UUID subscriptionId) {
                Integer result = jdbcTemplate.queryForObject(
                                """
                                                select count(*)
                                                from subscriptions
                                                where id = ? and status::text <> 'CANCELED'
                                                """,
                                Integer.class,
                                subscriptionId);

                return result != null && result > 0;
        }

        public boolean update(
                        UUID id,
                        UUID subscriptionId,
                        BigDecimal amount,
                        LocalDate paymentDate,
                        PaymentMethod method,
                        PaymentStatus status) {
                LocalDateTime paidAt = paymentDate != null
                                ? paymentDate.atStartOfDay()
                                : null;

                int updatedRows = jdbcTemplate.update(
                                """
                                                update payments
                                                set subscription_id = ?, amount = ?, paid_at = ?, method = cast(? as payment_method_enum), status = cast(? as payment_status_enum)
                                                where id = ? and status::text <> 'CANCELED'
                                                """,
                                subscriptionId,
                                amount,
                                paidAt != null ? Timestamp.valueOf(paidAt) : null,
                                method.name(),
                                status.name(),
                                id);

                return updatedRows > 0;
        }

        public boolean cancel(UUID id) {
                int updatedRows = jdbcTemplate.update(
                                """
                                                update payments
                                                set status = cast(? as payment_status_enum)
                                                where id = ? and status::text <> 'CANCELED'
                                                """,
                                "CANCELED",
                                id);

                return updatedRows > 0;
        }

        public boolean hasPendingOrOverdueByMemberId(UUID memberId) {
                Integer result = jdbcTemplate.queryForObject(
                                """
                                                select count(*)
                                                from payments p
                                                inner join subscriptions s on s.id = p.subscription_id
                                                where s.member_id = ?
                                                  and s.status::text <> 'CANCELED'
                                                  and p.status::text <> 'CANCELED'
                                                  and (
                                                        p.status::text = 'OVERDUE'
                                                        or (p.status::text = 'PENDING' and s.end_date < current_date)
                                                      )
                                                """,
                                Integer.class,
                                memberId);

                return result != null && result > 0;
        }

        public List<OverdueMemberResponse> findOverdueMembers() {
                return jdbcTemplate.query(
                                """
                                                select m.id as member_id,
                                                       m.name,
                                                       m.cpf,
                                                       s.id as subscription_id,
                                                       s.status::text as subscription_status,
                                                       p.id as payment_id,
                                                       p.amount,
                                                       s.end_date as reference_date,
                                                       p.method::text as payment_method,
                                                       p.status::text as payment_status
                                                from members m
                                                inner join subscriptions s on s.member_id = m.id
                                                inner join payments p on p.subscription_id = s.id
                                                where m.is_active = true
                                                  and s.status::text <> 'CANCELED'
                                                  and p.status::text <> 'CANCELED'
                                                  and (
                                                        p.status::text = 'OVERDUE'
                                                        or (p.status::text = 'PENDING' and s.end_date < current_date)
                                                        )
                                                order by s.end_date asc, m.name asc
                                                """,
                                OVERDUE_MEMBER_ROW_MAPPER);
        }

        public Optional<Payment> findPendingBySubscriptionId(UUID subscriptionId) {
                List<Payment> payments = jdbcTemplate.query(
                                """
                                                select id, subscription_id, amount, paid_at, method, status, created_at
                                                from payments
                                                where subscription_id = ?
                                                  and status::text = 'PENDING'
                                                order by created_at desc
                                                """,
                                PAYMENT_ROW_MAPPER,
                                subscriptionId);

                return payments.stream().findFirst();
        }

        public Optional<Payment> findPendingBySubscriptionIdAndMethod(
                        UUID subscriptionId,
                        PaymentMethod method) {
                List<Payment> payments = jdbcTemplate.query(
                                """
                                                select id, subscription_id, amount, paid_at, method, status, created_at
                                                from payments
                                                where subscription_id = ?
                                                  and status::text = 'PENDING'
                                                  and method::text = ?
                                                order by created_at desc
                                                """,
                                PAYMENT_ROW_MAPPER,
                                subscriptionId,
                                method.name());

                return payments.stream().findFirst();
        }

        public boolean markAsPaid(UUID paymentId, LocalDate paidAt) {
                LocalDateTime paidAtDateTime = paidAt != null ? paidAt.atStartOfDay() : LocalDateTime.now();
                int rows = jdbcTemplate.update(
                                """
                                                update payments
                                                set status = cast('PAID' as payment_status_enum), paid_at = ?
                                                where id = ? and status::text = 'PENDING'
                                                """,
                                Timestamp.valueOf(paidAtDateTime),
                                paymentId);

                return rows > 0;
        }
}


