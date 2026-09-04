package com.lionfitness.backend.personaltrainer.repository;

import java.sql.Timestamp;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

import com.lionfitness.backend.personaltrainer.dto.PersonalTrainerCreateRequest;
import com.lionfitness.backend.personaltrainer.dto.PersonalTrainerUpdateRequest;
import com.lionfitness.backend.personaltrainer.model.PersonalTrainer;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.core.RowMapper;
import org.springframework.stereotype.Repository;

@Repository
public class PersonalTrainerRepository {

    private static final RowMapper<PersonalTrainer> PERSONAL_TRAINER_ROW_MAPPER = (resultSet, rowNum) -> new PersonalTrainer(
            resultSet.getObject("id", UUID.class),
            resultSet.getObject("user_id", UUID.class),
            resultSet.getString("name"),
            resultSet.getString("cpf"),
            resultSet.getString("email"),
            resultSet.getString("phone"),
            resultSet.getString("specialty"),
            resultSet.getBoolean("is_active"),
            resultSet.getObject("created_at", LocalDateTime.class),
            resultSet.getString("photo_url")
    );

    private final JdbcTemplate jdbcTemplate;

    public PersonalTrainerRepository(JdbcTemplate jdbcTemplate) {
        this.jdbcTemplate = jdbcTemplate;
    }

    // INSERT
    public PersonalTrainer save(UUID id, PersonalTrainerCreateRequest request, UUID userId) {

        LocalDateTime createdAt = LocalDateTime.now();

        jdbcTemplate.update(
                """
                insert into personal_trainers
                (
                    id,
                    user_id,
                    name,
                    cpf,
                    email,
                    phone,
                    specialty,
                    is_active,
                    created_at
                )
                values (?, ?, ?, ?, ?, ?, ?, ?, ?)
                """,
                id,
                userId,
                request.name(),
                request.cpf(),
                request.email(),
                request.phone(),
                request.specialty(),
                true,
                Timestamp.valueOf(createdAt)
        );

        return new PersonalTrainer(
                id,
                userId,
                request.name(),
                request.cpf(),
                request.email(),
                request.phone(),
                request.specialty(),
                true,
                createdAt,
                null
        );
    }

    public List<PersonalTrainer> findAllActive() {

        return jdbcTemplate.query(
                """
                select
                    pt.id,
                    pt.user_id,
                    pt.name,
                    pt.cpf,
                    pt.email,
                    pt.phone,
                    pt.specialty,
                    pt.is_active,
                    pt.created_at,
                    (CASE WHEN u.photo_data IS NOT NULL THEN '/users/' || u.id || '/photo' ELSE NULL END) as photo_url
                from personal_trainers pt
                left join users u on u.id = pt.user_id
                where pt.is_active = true
                order by pt.created_at desc
                """,
                PERSONAL_TRAINER_ROW_MAPPER
        );
    }

    // SELECT BY ID
    public Optional<PersonalTrainer> findActiveById(UUID id) {

        List<PersonalTrainer> personalTrainers = jdbcTemplate.query(
                """
                select
                    pt.id,
                    pt.user_id,
                    pt.name,
                    pt.cpf,
                    pt.email,
                    pt.phone,
                    pt.specialty,
                    pt.is_active,
                    pt.created_at,
                    (CASE WHEN u.photo_data IS NOT NULL THEN '/users/' || u.id || '/photo' ELSE NULL END) as photo_url
                from personal_trainers pt
                left join users u on u.id = pt.user_id
                where pt.id = ?
                  and pt.is_active = true
                """,
                PERSONAL_TRAINER_ROW_MAPPER,
                id
        );

        return personalTrainers.stream().findFirst();
    }

    // CPF EXISTS
    public boolean existsActiveByCpf(String cpf) {

        Integer result = jdbcTemplate.queryForObject(
                """
                select count(*)
                from personal_trainers
                where cpf = ?
                  and is_active = true
                """,
                Integer.class,
                cpf
        );

        return result != null && result > 0;
    }

    // CPF EXISTS EXCLUDING ID
    public boolean existsActiveByCpfAndIdNot(String cpf, UUID id) {

        Integer result = jdbcTemplate.queryForObject(
                """
                select count(*)
                from personal_trainers
                where cpf = ?
                  and id <> ?
                  and is_active = true
                """,
                Integer.class,
                cpf,
                id
        );

        return result != null && result > 0;
    }

    // UPDATE — user_id é preservado (não sobrescrito) para não perder o vínculo de autenticação
    public boolean update(UUID id, PersonalTrainerUpdateRequest request) {

        int updatedRows = jdbcTemplate.update(
                """
                update personal_trainers
                set
                    name = ?,
                    cpf = ?,
                    email = ?,
                    phone = ?,
                    specialty = ?
                where id = ?
                  and is_active = true
                """,
                request.name(),
                request.cpf(),
                request.email(),
                request.phone(),
                request.specialty(),
                id
        );

        return updatedRows > 0;
    }

    public Optional<PersonalTrainer> findActiveByUserId(UUID userId) {
        List<PersonalTrainer> personalTrainers = jdbcTemplate.query(
                """
                select
                    pt.id,
                    pt.user_id,
                    pt.name,
                    pt.cpf,
                    pt.email,
                    pt.phone,
                    pt.specialty,
                    pt.is_active,
                    pt.created_at,
                    (CASE WHEN u.photo_data IS NOT NULL THEN '/users/' || u.id || '/photo' ELSE NULL END) as photo_url
                from personal_trainers pt
                left join users u on u.id = pt.user_id
                where pt.user_id = ?
                  and pt.is_active = true
                """,
                PERSONAL_TRAINER_ROW_MAPPER,
                userId
        );

        return personalTrainers.stream().findFirst();
    }

    public Optional<PersonalTrainer> findActiveByEmail(String email) {
        List<PersonalTrainer> personalTrainers = jdbcTemplate.query(
                """
                select
                    pt.id,
                    pt.user_id,
                    pt.name,
                    pt.cpf,
                    pt.email,
                    pt.phone,
                    pt.specialty,
                    pt.is_active,
                    pt.created_at,
                    (CASE WHEN u.photo_data IS NOT NULL THEN '/users/' || u.id || '/photo' ELSE NULL END) as photo_url
                from personal_trainers pt
                left join users u on u.id = pt.user_id
                where pt.email = ?
                  and pt.is_active = true
                """,
                PERSONAL_TRAINER_ROW_MAPPER,
                email
        );

        return personalTrainers.stream().findFirst();
    }
    // SOFT DELETE
    public boolean softDelete(UUID id) {

        int updatedRows = jdbcTemplate.update(
                """
                update personal_trainers
                set is_active = false
                where id = ?
                  and is_active = true
                """,
                id
        );

        return updatedRows > 0;
    }
}