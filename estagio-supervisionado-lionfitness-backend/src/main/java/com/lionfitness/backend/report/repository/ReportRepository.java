package com.lionfitness.backend.report.repository;

import java.sql.Date;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;

import com.lionfitness.backend.report.dto.CancellationReportResponse;
import com.lionfitness.backend.report.dto.NewMemberReportResponse;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.core.RowMapper;
import org.springframework.stereotype.Repository;

@Repository
public class ReportRepository {

    private final JdbcTemplate jdbcTemplate;

    private static final RowMapper<NewMemberReportResponse> NEW_MEMBER_ROW_MAPPER = (rs, rowNum) -> new NewMemberReportResponse(
            rs.getObject("member_id", UUID.class),
            rs.getString("name"),
            rs.getString("cpf"),
            rs.getString("email"),
            rs.getObject("created_at", LocalDateTime.class)
    );

    private static final RowMapper<CancellationReportResponse> CANCELLATION_ROW_MAPPER = (rs, rowNum) -> new CancellationReportResponse(
            rs.getObject("cancellation_id", UUID.class),
            rs.getObject("member_id", UUID.class),
            rs.getString("member_name"),
            rs.getString("member_cpf"),
            rs.getString("reason"),
            rs.getObject("cancellation_date", LocalDate.class),
            rs.getObject("created_at", LocalDateTime.class)
    );

    public ReportRepository(JdbcTemplate jdbcTemplate) {
        this.jdbcTemplate = jdbcTemplate;
    }

    public List<NewMemberReportResponse> getNewMembers(LocalDate startDate, LocalDate endDate) {
        return jdbcTemplate.query(
                """
                select
                    m.id as member_id,
                    m.name,
                    m.cpf,
                    u.email,
                    m.created_at
                from members m
                left join users u on u.id = m.user_id
                where m.created_at::date between ? and ?
                order by m.created_at desc
                """,
                NEW_MEMBER_ROW_MAPPER,
                Date.valueOf(startDate),
                Date.valueOf(endDate)
        );
    }

    public List<CancellationReportResponse> getCancellations(LocalDate startDate, LocalDate endDate) {
        return jdbcTemplate.query(
                """
                select
                    cr.id as cancellation_id,
                    cr.member_id,
                    m.name as member_name,
                    m.cpf as member_cpf,
                    cr.reason,
                    cr.cancellation_date::date as cancellation_date,
                    cr.created_at
                from cancellation_records cr
                join members m on m.id = cr.member_id
                where cr.cancellation_date::date between ? and ?
                order by cr.cancellation_date desc, cr.created_at desc
                """,
                CANCELLATION_ROW_MAPPER,
                Date.valueOf(startDate),
                Date.valueOf(endDate)
        );
    }
}
