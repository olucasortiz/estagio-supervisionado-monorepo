package com.lionfitness.backend.auth.repository;

import com.lionfitness.backend.auth.model.PasswordResetToken;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.core.RowMapper;
import org.springframework.stereotype.Repository;

import java.sql.Timestamp;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public class PasswordResetTokenRepository {

    private static final RowMapper<PasswordResetToken> TOKEN_ROW_MAPPER = (resultSet, rowNum) ->
            new PasswordResetToken(
                    resultSet.getObject("id", UUID.class),
                    resultSet.getObject("user_id", UUID.class),
                    resultSet.getString("token"),
                    resultSet.getObject("expires_at", LocalDateTime.class),
                    resultSet.getBoolean("used"),
                    resultSet.getObject("created_at", LocalDateTime.class)
            );

    private final JdbcTemplate jdbcTemplate;

    public PasswordResetTokenRepository(JdbcTemplate jdbcTemplate) {
        this.jdbcTemplate = jdbcTemplate;
    }

    public void save(PasswordResetToken resetToken) {
        ensureTableExists();

        jdbcTemplate.update(
                """
                insert into password_reset_tokens (id, user_id, token, expires_at, used, created_at)
                values (?, ?, ?, ?, ?, ?)
                """,
                resetToken.id(),
                resetToken.userId(),
                resetToken.token(),
                Timestamp.valueOf(resetToken.expiresAt()),
                resetToken.used(),
                Timestamp.valueOf(resetToken.createdAt())
        );
    }

    public Optional<PasswordResetToken> findValidByToken(String token) {
        ensureTableExists();

        List<PasswordResetToken> tokens = jdbcTemplate.query(
                """
                select id, user_id, token, expires_at, used, created_at
                from password_reset_tokens
                where token = ?
                  and used = false
                  and expires_at > ?
                """,
                TOKEN_ROW_MAPPER,
                token,
                Timestamp.valueOf(LocalDateTime.now())
        );

        return tokens.stream().findFirst();
    }

    public void markAsUsed(UUID id) {
        ensureTableExists();

        jdbcTemplate.update(
                """
                update password_reset_tokens
                set used = true
                where id = ?
                """,
                id
        );
    }

    public void invalidateActiveTokensByUserId(UUID userId) {
        ensureTableExists();

        jdbcTemplate.update(
                """
                update password_reset_tokens
                set used = true
                where user_id = ?
                  and used = false
                """,
                userId
        );
    }

    private void ensureTableExists() {
        jdbcTemplate.execute(
                """
                create table if not exists password_reset_tokens (
                    id uuid primary key,
                    user_id uuid not null references users(id),
                    token varchar(255) not null unique,
                    expires_at timestamp not null,
                    used boolean not null default false,
                    created_at timestamp not null default current_timestamp
                )
                """
        );
    }
}
