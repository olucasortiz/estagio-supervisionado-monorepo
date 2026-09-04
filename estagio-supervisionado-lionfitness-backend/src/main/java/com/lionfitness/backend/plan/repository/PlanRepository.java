package com.lionfitness.backend.plan.repository;

import java.sql.Timestamp;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

import com.lionfitness.backend.plan.dto.PlanCreateRequest;
import com.lionfitness.backend.plan.dto.PlanUpdateRequest;
import com.lionfitness.backend.plan.model.Plan;
import com.lionfitness.backend.plan.model.PlanType;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.core.RowMapper;
import org.springframework.stereotype.Repository;

@Repository
public class PlanRepository {

    private static final RowMapper<Plan> PLAN_ROW_MAPPER = (resultSet, rowNum) -> new Plan(
            resultSet.getObject("id", UUID.class),
            resultSet.getString("name"),
            PlanType.valueOf(resultSet.getString("type")),
            resultSet.getBigDecimal("price"),
            resultSet.getInt("duration_days"),
            resultSet.getBoolean("is_active"),
            resultSet.getObject("created_at", LocalDateTime.class)
    );

    private final JdbcTemplate jdbcTemplate;

    public PlanRepository(JdbcTemplate jdbcTemplate) {
        this.jdbcTemplate = jdbcTemplate;
    }

    public Plan save(UUID id, PlanCreateRequest request) {
        LocalDateTime createdAt = LocalDateTime.now();

        jdbcTemplate.update(
                """
                insert into plans (id, name, type, price, duration_days, is_active, created_at)
                values (?, ?, CAST(? AS plan_type_enum), ?, ?, ?, ?)
                """,
                id,
                request.name(),
                request.type().toUpperCase(),
                request.price(),
                request.durationDays(),
                true,
                Timestamp.valueOf(createdAt)
        );

        return new Plan(id, request.name(), PlanType.valueOf(request.type().toUpperCase()), request.price(), request.durationDays(), true, createdAt);
    }

    public List<Plan> findAllActive() {
        return jdbcTemplate.query(
                """
                select id, name, type, price, duration_days, is_active, created_at
                from plans
                where is_active = true
                order by created_at desc
                """,
                PLAN_ROW_MAPPER
        );
    }

    public Optional<Plan> findActiveById(UUID id) {
        List<Plan> plans = jdbcTemplate.query(
                """
                select id, name, type, price, duration_days, is_active, created_at
                from plans
                where id = ? and is_active = true
                """,
                PLAN_ROW_MAPPER,
                id
        );

        return plans.stream().findFirst();
    }

    public boolean update(UUID id, PlanUpdateRequest request) {
        int updatedRows = jdbcTemplate.update(
                """
                update plans
                set name = ?, type = CAST(? AS plan_type_enum), price = ?, duration_days = ?
                where id = ? and is_active = true
                """,
                request.name(),
                request.type().toUpperCase(),
                request.price(),
                request.durationDays(),
                id
        );

        return updatedRows > 0;
    }

    public boolean softDelete(UUID id) {
        int updatedRows = jdbcTemplate.update(
                """
                update plans
                set is_active = false
                where id = ? and is_active = true
                """,
                id
        );

        return updatedRows > 0;
    }
}
