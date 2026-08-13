package com.lionfitness.backend.cancellationrecord.repository;

import java.sql.Timestamp;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

import com.lionfitness.backend.cancellationrecord.dto.CancellationRecordResponse;
import com.lionfitness.backend.cancellationrecord.model.CancellationRecord;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.core.RowMapper;
import org.springframework.stereotype.Repository;

@Repository
public class CancellationRecordRepository {

    private static final RowMapper<CancellationRecord> CANCELLATION_RECORD_ROW_MAPPER = (resultSet, rowNum) -> new CancellationRecord(
            resultSet.getObject("id", UUID.class),
            resultSet.getObject("member_id", UUID.class),
            resultSet.getObject("cancellation_date", LocalDateTime.class),
            resultSet.getString("reason"),
            resultSet.getObject("created_at", LocalDateTime.class)
    );

    private static final RowMapper<CancellationRecordResponse> CANCELLATION_RECORD_RESPONSE_ROW_MAPPER =
            (resultSet, rowNum) -> new CancellationRecordResponse(
                    resultSet.getObject("id", UUID.class),
                    resultSet.getObject("member_id", UUID.class),
                    resultSet.getString("member_name"),
                    resultSet.getString("member_cpf"),
                    resultSet.getObject("cancellation_date", LocalDateTime.class),
                    resultSet.getString("reason"),
                    resultSet.getObject("created_at", LocalDateTime.class)
            );

    private final JdbcTemplate jdbcTemplate;

    public CancellationRecordRepository(JdbcTemplate jdbcTemplate) {
        this.jdbcTemplate = jdbcTemplate;
    }

    public CancellationRecord save(UUID id, UUID memberId, LocalDateTime cancellationDate, String reason) {
        LocalDateTime createdAt = LocalDateTime.now();

        jdbcTemplate.update(
                """
                insert into cancellation_records (id, member_id, cancellation_date, reason, created_at)
                values (?, ?, ?, ?, ?)
                """,
                id,
                memberId,
                Timestamp.valueOf(cancellationDate), // Convertendo para o banco
                reason != null ? reason : "Motivo não informado",
                Timestamp.valueOf(createdAt)
        );

        return new CancellationRecord(
                id,
                memberId,
                cancellationDate,
                reason,
                createdAt
        );
    }

    public Optional<CancellationRecord> findById(UUID id) {
        List<CancellationRecord> records = jdbcTemplate.query(
                """
                select id, member_id, cancellation_date, reason, created_at
                from cancellation_records
                where id = ?
                """,
                CANCELLATION_RECORD_ROW_MAPPER,
                id
        );

        return records.stream().findFirst();
    }

    public List<CancellationRecordResponse> findAll() {
        return jdbcTemplate.query(
                """
                select
                    cr.id,
                    cr.member_id,
                    m.name as member_name,
                    m.cpf as member_cpf,
                    cr.cancellation_date,
                    cr.reason,
                    cr.created_at
                from cancellation_records cr
                join members m on m.id = cr.member_id
                order by cr.created_at desc nulls last, cr.cancellation_date desc
                """,
                CANCELLATION_RECORD_RESPONSE_ROW_MAPPER
        );
    }
}
