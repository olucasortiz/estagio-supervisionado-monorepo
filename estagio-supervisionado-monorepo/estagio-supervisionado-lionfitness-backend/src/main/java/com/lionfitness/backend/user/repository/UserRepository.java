package com.lionfitness.backend.user.repository;

import java.sql.Timestamp;
import java.sql.Types;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import jakarta.annotation.PostConstruct;

import com.lionfitness.backend.user.dto.UserCreateRequest;
import com.lionfitness.backend.user.dto.UserUpdateRequest;
import com.lionfitness.backend.user.model.User;
import com.lionfitness.backend.user.model.UserPhoto;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.core.RowMapper;
import org.springframework.stereotype.Repository;

@Repository
public class UserRepository {

    private static final RowMapper<User> USER_ROW_MAPPER = (resultSet, rowNum) -> new User(
            resultSet.getObject("id", UUID.class),
            resultSet.getString("name"),
            resultSet.getString("email"),
            resultSet.getString("password_hash"),
            resultSet.getString("role"),
            resultSet.getBoolean("is_active"),
            resultSet.getObject("created_at", LocalDateTime.class),
            resultSet.getBoolean("has_photo")
    );

    private final JdbcTemplate jdbcTemplate;

    public UserRepository(JdbcTemplate jdbcTemplate) {
        this.jdbcTemplate = jdbcTemplate;
    }

    @PostConstruct
    public void init() {
        jdbcTemplate.execute("""
            ALTER TABLE users
            ADD COLUMN IF NOT EXISTS photo_data BYTEA,
            ADD COLUMN IF NOT EXISTS photo_content_type VARCHAR(100),
            ADD COLUMN IF NOT EXISTS photo_file_name VARCHAR(255)
        """);
    }

    public User save(UUID id, UserCreateRequest request) {
        LocalDateTime createdAt = LocalDateTime.now();
        String roleFormatted = request.role().toUpperCase();

        // Ajustado para usar user_role_enum que contém PERSONAL_TRAINER
        String sql = """
        INSERT INTO users (id, name, email, password_hash, role, is_active, created_at)
        VALUES (?, ?, ?, ?, CAST(? AS user_role_enum), ?, ?)
        """;

        jdbcTemplate.update(
                sql,
                id,
                request.name(),
                request.email(),
                request.passwordHash(),
                roleFormatted,
                true,
                Timestamp.valueOf(createdAt)
        );

        return new User(id, request.name(), request.email(), request.passwordHash(), roleFormatted, true, createdAt, false);
    }

    public void updatePassword(UUID userId, String passwordHash) {
        String sql = "UPDATE users SET password_hash = ? WHERE id = ?";
        jdbcTemplate.update(sql, passwordHash, userId);
    }

    public List<User> findAllActive() {
        return jdbcTemplate.query(
                """
                select id, name, email, password_hash, role, is_active, created_at,
                       (case when photo_data is not null then true else false end) as has_photo
                from users
                where is_active = true
                order by created_at desc
                """,
                USER_ROW_MAPPER
        );
    }

    public Optional<User> findActiveById(UUID id) {
        List<User> users = jdbcTemplate.query(
                """
                select id, name, email, password_hash, role, is_active, created_at,
                       (case when photo_data is not null then true else false end) as has_photo
                from users
                where id = ? and is_active = true
                """,
                USER_ROW_MAPPER,
                id
        );

        return users.stream().findFirst();
    }

    public Optional<User> findByEmail(String email) {
        List<User> users = jdbcTemplate.query(
                """
                select id, name, email, password_hash, role, is_active, created_at,
                       (case when photo_data is not null then true else false end) as has_photo
                from users
                where email = ?
                """,
                USER_ROW_MAPPER,
                email
        );

        return users.stream().findFirst();
    }

    public Optional<User> findActiveByEmail(String email) {
        List<User> users = jdbcTemplate.query(
                """
                select id, name, email, password_hash, role, is_active, created_at,
                       (case when photo_data is not null then true else false end) as has_photo
                from users
                where email = ? and is_active = true
                """,
                USER_ROW_MAPPER,
                email
        );

        return users.stream().findFirst();
    }

    public boolean existsActiveByEmail(String email) {
        Integer result = jdbcTemplate.queryForObject(
                """
                select count(*)
                from users
                where email = ? and is_active = true
                """,
                Integer.class,
                email
        );

        return result != null && result > 0;
    }

    public boolean existsActiveByEmailAndIdNot(String email, UUID id) {
        Integer result = jdbcTemplate.queryForObject(
                """
                select count(*)
                from users
                where email = ? and id <> ? and is_active = true
                """,
                Integer.class,
                email,
                id
        );

        return result != null && result > 0;
    }

    public boolean update(UUID id, UserUpdateRequest request) {
        String roleFormatted = request.role().toUpperCase();

        int updatedRows = jdbcTemplate.update(
                """
                update users
                set name = ?, email = ?, password_hash = ?, role = CAST(? AS user_role_enum)
                where id = ? and is_active = true
                """,
                request.name(),
                request.email(),
                request.passwordHash(),
                roleFormatted,
                id
        );

        return updatedRows > 0;
    }

    public boolean softDelete(UUID id) {
        int updatedRows = jdbcTemplate.update(
                """
                update users
                set is_active = false
                where id = ? and is_active = true
                """,
                id
        );

        return updatedRows > 0;
    }

    public boolean updateName(UUID id, String name) {
        int updatedRows = jdbcTemplate.update(
                """
                update users
                set name = ?
                where id = ? and is_active = true
                """,
                name,
                id
        );
        return updatedRows > 0;
    }

    public boolean updateNameAndEmail(UUID id, String name, String email) {
        int updatedRows = jdbcTemplate.update(
                """
                update users
                set name = ?, email = ?
                where id = ? and is_active = true
                """,
                name,
                email,
                id
        );
        return updatedRows > 0;
    }

    public void updatePhoto(UUID userId, byte[] photoData, String contentType, String fileName) {
        String sql = """
            UPDATE users
            SET photo_data = ?, photo_content_type = ?, photo_file_name = ?
            WHERE id = ? AND is_active = true
        """;
        jdbcTemplate.update(sql, photoData, contentType, fileName, userId);
    }

    public Optional<UserPhoto> findPhotoByUserId(UUID userId) {
        String sql = """
            SELECT photo_data, photo_content_type, photo_file_name
            FROM users
            WHERE id = ? AND is_active = true
        """;
        List<UserPhoto> photos = jdbcTemplate.query(sql, (rs, rowNum) -> new UserPhoto(
                rs.getBytes("photo_data"),
                rs.getString("photo_content_type"),
                rs.getString("photo_file_name")
        ), userId);
        return photos.stream().filter(p -> p.data() != null).findFirst();
    }
}
