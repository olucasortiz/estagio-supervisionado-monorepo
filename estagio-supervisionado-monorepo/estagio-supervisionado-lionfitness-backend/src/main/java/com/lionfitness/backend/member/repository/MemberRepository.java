package com.lionfitness.backend.member.repository;

import java.sql.Timestamp;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import com.lionfitness.backend.member.dto.MemberCreateRequest;
import com.lionfitness.backend.member.dto.MemberUpdateRequest;
import com.lionfitness.backend.member.model.Member;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.core.RowMapper;
import org.springframework.stereotype.Repository;

@Repository
public class MemberRepository {

    private static final String MEMBER_SELECT_COLUMNS = """
            m.id,
            m.user_id,
            m.personal_trainer_id,
            m.name,
            m.cpf,
            u.email,
            m.birth_date,
            (CASE WHEN u.photo_data IS NOT NULL THEN '/users/' || u.id || '/photo' ELSE NULL END) as photo_url,
            m.is_active,
            m.created_at
            """;

    private static final RowMapper<Member> MEMBER_ROW_MAPPER = (rs, rowNum) -> new Member(
            rs.getObject("id", UUID.class),
            rs.getObject("user_id", UUID.class),
            rs.getObject("personal_trainer_id", UUID.class),
            rs.getString("name"),
            rs.getString("cpf"),
            rs.getString("email"),
            rs.getObject("birth_date", LocalDate.class),
            rs.getString("photo_url"),
            rs.getBoolean("is_active"),
            rs.getObject("created_at", LocalDateTime.class)
    );

    private final JdbcTemplate jdbcTemplate;

    public MemberRepository(JdbcTemplate jdbcTemplate) {
        this.jdbcTemplate = jdbcTemplate;
    }

    public Member save(UUID id, MemberCreateRequest request, UUID userId) {
        LocalDateTime createdAt = LocalDateTime.now();
        String sql = """
        INSERT INTO members (id, name, cpf, birth_date, photo_url, is_active, created_at, user_id, personal_trainer_id)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        """;

        jdbcTemplate.update(
                sql,
                id,
                request.name(),
                request.cpf(),
                request.birthDate(),
                request.photoUrl(),
                true,
                createdAt,
                userId,
                request.personalTrainerId()
        );

        return new Member(
                id,
                userId,
                request.personalTrainerId(),
                request.name(),
                request.cpf(),
                request.email(),
                request.birthDate(),
                request.photoUrl(),
                true,
                createdAt
        );
    }

    public Optional<Member> findByUserId(UUID userId) {
        List<Member> members = jdbcTemplate.query(
                """
                select
                """ + MEMBER_SELECT_COLUMNS + """
                from members m
                left join users u on u.id = m.user_id
                where m.user_id = ?
                  and m.is_active = true
                """,
                MEMBER_ROW_MAPPER,
                userId
        );

        return members.stream().findFirst();
    }

    public void cancel(UUID memberId, String reason) {
        // 1. Desativa o membro na tabela 'members'
        String sqlUpdateMember = "UPDATE members SET is_active = false WHERE id = ?";
        jdbcTemplate.update(sqlUpdateMember, memberId);

        // 2. Insere o log na tabela 'cancellation_records'
        // Como sua tabela tem 'reason' como NOT NULL, tratamos o valor vazio aqui
        String finalReason = (reason == null || reason.isBlank()) ? "Cancelamento solicitado pelo administrador" : reason;

        String sqlInsertRecord = """
        INSERT INTO cancellation_records (id, member_id, cancellation_date, reason)
        VALUES (?, ?, ?, ?)
        """;

        jdbcTemplate.update(
                sqlInsertRecord,
                UUID.randomUUID(),                         // id
                memberId,                                  // member_id
                Timestamp.valueOf(LocalDateTime.now()),    // cancellation_date
                finalReason                                // reason (obrigatório no seu banco)
        );
    }
    public List<Member> findByPersonalTrainerId(UUID personalId) {
        return jdbcTemplate.query(
                """
                select
                """ + MEMBER_SELECT_COLUMNS + """
                from members m
                left join users u on u.id = m.user_id
                where m.personal_trainer_id = ?
                  and m.is_active = true
                order by m.name asc
                """,
                MEMBER_ROW_MAPPER,
                personalId
        );
    }
    public List<Member> findActiveByPersonalTrainerId(UUID personalTrainerId) {
        return jdbcTemplate.query(
                """
                select
                """ + MEMBER_SELECT_COLUMNS + """
                from members m
                left join users u on u.id = m.user_id
                where m.personal_trainer_id = ?
                  and m.is_active = true
                order by m.name
                """,
                MEMBER_ROW_MAPPER,
                personalTrainerId
        );
    }
    public List<Member> findAll(boolean includeInactive) {
        String sql = """
                select
                """ + MEMBER_SELECT_COLUMNS + """
                from members m
                left join users u on u.id = m.user_id
                """ + (includeInactive ? "" : "where m.is_active = true ") + """
                order by m.created_at desc
                """;
        return jdbcTemplate.query(sql, MEMBER_ROW_MAPPER);
    }

    public List<Member> findAll() {
        return findAll(false);
    }

    public Optional<Member> findActiveById(UUID id) {
        List<Member> members = jdbcTemplate.query(
                """
                select
                """ + MEMBER_SELECT_COLUMNS + """
                from members m
                left join users u on u.id = m.user_id
                where m.id = ?
                  and m.is_active = true
                """,
                MEMBER_ROW_MAPPER,
                id
        );
        return members.stream().findFirst();
    }

    public boolean existsActiveByCpf(String cpf) {
        Integer result = jdbcTemplate.queryForObject(
                "select count(*) from members where cpf = ? and is_active = true",
                Integer.class, cpf
        );
        return result != null && result > 0;
    }

    public boolean existsActiveByCpfAndIdNot(String cpf, UUID id) {
        Integer result = jdbcTemplate.queryForObject(
                "select count(*) from members where cpf = ? and id <> ? and is_active = true",
                Integer.class, cpf, id
        );
        return result != null && result > 0;
    }

    public boolean update(UUID id, MemberUpdateRequest request) {
        int updatedRows = jdbcTemplate.update(
                """
                update members
                set
                    name = ?,
                    cpf = ?,
                    birth_date = ?,
                    photo_url = ?,
                    personal_trainer_id = ?
                where id = ?
                  and is_active = true
                """,
                request.name(),
                request.cpf(),
                request.birthDate(),
                request.photoUrl(),
                request.personalTrainerId(),
                id
        );

        return updatedRows > 0;
    }

    public boolean softDelete(UUID id) {
        int updatedRows = jdbcTemplate.update(
                "update members set is_active = false where id = ? and is_active = true",
                id
        );
        return updatedRows > 0;
    }
}
