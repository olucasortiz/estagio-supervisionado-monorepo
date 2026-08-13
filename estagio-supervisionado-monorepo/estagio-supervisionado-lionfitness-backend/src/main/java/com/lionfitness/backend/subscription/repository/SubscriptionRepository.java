package com.lionfitness.backend.subscription.repository;

import java.math.BigDecimal;
import java.sql.Timestamp;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

import com.lionfitness.backend.subscription.dto.MySubscriptionResponse;
import com.lionfitness.backend.subscription.dto.SubscriptionCreateRequest;
import com.lionfitness.backend.subscription.dto.SubscriptionUpdateRequest;
import com.lionfitness.backend.subscription.model.Subscription;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.core.RowMapper;
import org.springframework.stereotype.Repository;

@Repository
public class SubscriptionRepository {

    public record PlanSubscriptionData(String type, int durationDays, BigDecimal price) {
    }

    private static final RowMapper<Subscription> SUBSCRIPTION_ROW_MAPPER = (resultSet, rowNum) -> new Subscription(
            resultSet.getObject("id", UUID.class),
            resultSet.getObject("member_id", UUID.class),
            resultSet.getObject("plan_id", UUID.class),
            resultSet.getObject("start_date", LocalDate.class),
            resultSet.getObject("end_date", LocalDate.class),
            resultSet.getString("status"),
            resultSet.getObject("created_at", LocalDateTime.class)
    );

    private static final RowMapper<MySubscriptionResponse> MY_SUBSCRIPTION_ROW_MAPPER = (resultSet, rowNum) ->
            new MySubscriptionResponse(
                    resultSet.getObject("id", UUID.class),
                    resultSet.getObject("member_id", UUID.class),
                    resultSet.getObject("plan_id", UUID.class),
                    resultSet.getString("plan_name"),
                    resultSet.getString("plan_type"),
                    resultSet.getObject("plan_price", BigDecimal.class),
                    resultSet.getObject("start_date", LocalDate.class),
                    resultSet.getObject("end_date", LocalDate.class),
                    resultSet.getString("status"),
                    resultSet.getObject("created_at", LocalDateTime.class),
                    0, // daysRemaining (será calculado no Service)
                    true // hasSubscription (será configurado no Service/Controller)
            );

    private final JdbcTemplate jdbcTemplate;

    public SubscriptionRepository(JdbcTemplate jdbcTemplate) {
        this.jdbcTemplate = jdbcTemplate;
    }

    public Subscription save(UUID id, SubscriptionCreateRequest request, LocalDate endDate) {
        LocalDateTime createdAt = LocalDateTime.now();
        String statusForBank = "ACTIVE";

        jdbcTemplate.update(
                """
                insert into subscriptions (id, member_id, plan_id, start_date, end_date, status, created_at)
                values (?, ?, ?, ?, ?, cast(? as subscription_status_enum), ?)
                """,
                id,
                request.memberId(),
                request.planId(),
                request.startDate(),
                endDate,
                statusForBank,
                Timestamp.valueOf(createdAt)
        );

        return new Subscription(
                id,
                request.memberId(),
                request.planId(),
                request.startDate(),
                endDate,
                statusForBank,
                createdAt
        );
    }

    public List<Subscription> findAllActive() {
        return jdbcTemplate.query(
                """
                select id, member_id, plan_id, start_date, end_date, status::text as status, created_at
                from subscriptions
                where status::text <> 'CANCELED'
                order by created_at desc
                """,
                SUBSCRIPTION_ROW_MAPPER
        );
    }

    public Optional<Subscription> findActiveById(UUID id) {
        List<Subscription> subscriptions = jdbcTemplate.query(
                """
                select id, member_id, plan_id, start_date, end_date, status::text as status, created_at
                from subscriptions
                where id = ? and status::text <> 'CANCELED'
                """,
                SUBSCRIPTION_ROW_MAPPER,
                id
        );

        return subscriptions.stream().findFirst();
    }

    public boolean memberExists(UUID memberId) {
        Integer result = jdbcTemplate.queryForObject(
                """
                select count(*)
                from members
                where id = ? and is_active = true
                """,
                Integer.class,
                memberId
        );

        return result != null && result > 0;
    }

    public Optional<PlanSubscriptionData> findActivePlanData(UUID planId) {
        List<PlanSubscriptionData> plans = jdbcTemplate.query(
                """
                select type::text as type, duration_days, price
                from plans
                where id = ? and is_active = true
                """,
                (resultSet, rowNum) -> new PlanSubscriptionData(
                        resultSet.getString("type"),
                        resultSet.getInt("duration_days"),
                        resultSet.getBigDecimal("price")
                ),
                planId
        );

        return plans.stream().findFirst();
    }

    public boolean update(UUID id, SubscriptionUpdateRequest request, LocalDate endDate) {
        int updatedRows = jdbcTemplate.update(
                """
                update subscriptions
                set member_id = ?, plan_id = ?, start_date = ?, end_date = ?, status = cast(? as subscription_status_enum)
                where id = ? and status::text <> 'CANCELED'
                """,
                request.memberId(),
                request.planId(),
                request.startDate(),
                endDate,
                "ACTIVE",
                id
        );

        return updatedRows > 0;
    }

    public boolean cancel(UUID id) {
        int updatedRows = jdbcTemplate.update(
                """
                update subscriptions
                set status = cast(? as subscription_status_enum)
                where id = ? and status::text <> 'CANCELED'
                """,
                "CANCELED",
                id
        );

        return updatedRows > 0;
    }

    public Optional<MySubscriptionResponse> findActiveByUserEmail(String email) {
        List<MySubscriptionResponse> subscriptions = jdbcTemplate.query(
                """
                select
                    s.id,
                    s.member_id,
                    s.plan_id,
                    p.name as plan_name,
                    p.type::text as plan_type,
                    p.price as plan_price,
                    s.start_date,
                    s.end_date,
                    s.status::text as status,
                    s.created_at
                from subscriptions s
                inner join members m on m.id = s.member_id
                inner join users u on u.id = m.user_id
                inner join plans p on p.id = s.plan_id
                where lower(u.email) = lower(?)
                  and m.is_active = true
                order by s.created_at desc nulls last, s.end_date desc
                limit 1
                """,
                MY_SUBSCRIPTION_ROW_MAPPER,
                email
        );

        return subscriptions.stream().findFirst();
    }
}
