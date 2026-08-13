package com.lionfitness.backend.exercisecatalog;

import jakarta.annotation.PostConstruct;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.core.io.ClassPathResource;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.core.RowMapper;
import org.springframework.stereotype.Repository;
import org.springframework.util.StringUtils;

import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.sql.Timestamp;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

@Repository
public class ExerciseCatalogRepository {

    private static final Logger logger = LoggerFactory.getLogger(ExerciseCatalogRepository.class);

    private static final RowMapper<ExerciseCatalog> ROW_MAPPER = (rs, rowNum) -> new ExerciseCatalog(
            rs.getObject("id", UUID.class),
            rs.getString("name"),
            rs.getString("category"),
            rs.getString("muscle"),
            rs.getString("equipment"),
            rs.getString("instructions"),
            rs.getBoolean("is_custom"),
            rs.getObject("created_by_personal_trainer_id", UUID.class),
            rs.getBoolean("is_active"),
            rs.getObject("created_at", LocalDateTime.class)
    );

    private final JdbcTemplate jdbcTemplate;

    public ExerciseCatalogRepository(JdbcTemplate jdbcTemplate) {
        this.jdbcTemplate = jdbcTemplate;
    }

    @PostConstruct
    public void init() {
        ensureTableExists();
        runSeed();
    }

    public List<ExerciseCatalog> findAll(String name, String category, String muscle) {
        List<Object> params = new ArrayList<>();
        StringBuilder sql = new StringBuilder("""
                SELECT id, name, category, muscle, equipment, instructions,
                       is_custom, created_by_personal_trainer_id, is_active, created_at
                FROM exercise_catalog
                WHERE is_active = true
                """);

        if (StringUtils.hasText(name)) {
            sql.append(" AND name ILIKE ?");
            params.add("%" + name.trim() + "%");
        }

        if (StringUtils.hasText(category)) {
            sql.append(" AND category ILIKE ?");
            params.add("%" + category.trim() + "%");
        }

        if (StringUtils.hasText(muscle)) {
            sql.append(" AND muscle ILIKE ?");
            params.add("%" + muscle.trim() + "%");
        }

        // Exercícios padrão primeiro, depois personalizados; ambos em ordem alfabética
        sql.append(" ORDER BY is_custom ASC, name ASC LIMIT 200");

        return jdbcTemplate.query(sql.toString(), ROW_MAPPER, params.toArray());
    }

    public boolean existsStandardByNameAndCategory(String name, String category) {
        Integer count = jdbcTemplate.queryForObject(
                """
                SELECT COUNT(*)
                FROM exercise_catalog
                WHERE LOWER(name) = LOWER(?)
                  AND LOWER(category) = LOWER(?)
                  AND is_custom = false
                  AND is_active = true
                """,
                Integer.class,
                name,
                category
        );

        return count != null && count > 0;
    }

    public ExerciseCatalog save(UUID id, ExerciseCatalogCreateRequest request, UUID createdByPersonalTrainerId) {
        LocalDateTime now = LocalDateTime.now();
        String equipment = StringUtils.hasText(request.equipment()) ? request.equipment().trim() : null;

        jdbcTemplate.update(
                """
                INSERT INTO exercise_catalog
                (id, name, category, muscle, equipment, instructions, is_custom, created_by_personal_trainer_id, is_active, created_at)
                VALUES (?, ?, ?, ?, ?, ?, true, ?, true, ?)
                """,
                id,
                request.name().trim(),
                request.category().trim(),
                request.muscle().trim(),
                equipment,
                request.instructions().trim(),
                createdByPersonalTrainerId,
                Timestamp.valueOf(now)
        );

        return new ExerciseCatalog(
                id,
                request.name().trim(),
                request.category().trim(),
                request.muscle().trim(),
                equipment,
                request.instructions().trim(),
                true,
                createdByPersonalTrainerId,
                true,
                now
        );
    }

    // ----- DDL em runtime (padrão do projeto, usa IF NOT EXISTS) -----

    private void ensureTableExists() {
        jdbcTemplate.execute("""
                CREATE TABLE IF NOT EXISTS exercise_catalog (
                    id UUID PRIMARY KEY,
                    name VARCHAR(150) NOT NULL,
                    category VARCHAR(80) NOT NULL,
                    muscle VARCHAR(80) NOT NULL,
                    equipment VARCHAR(100),
                    instructions TEXT NOT NULL,
                    is_custom BOOLEAN NOT NULL DEFAULT FALSE,
                    created_by_personal_trainer_id UUID NULL REFERENCES personal_trainers(id),
                    is_active BOOLEAN NOT NULL DEFAULT TRUE,
                    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
                )
                """);

        jdbcTemplate.execute(
                "CREATE INDEX IF NOT EXISTS idx_exercise_catalog_category ON exercise_catalog(category)");
        jdbcTemplate.execute(
                "CREATE INDEX IF NOT EXISTS idx_exercise_catalog_muscle ON exercise_catalog(muscle)");
        jdbcTemplate.execute(
                "CREATE INDEX IF NOT EXISTS idx_exercise_catalog_name ON exercise_catalog(name)");

        logger.info("exercise_catalog table and indexes ensured");
    }

    // ----- Seed de exercícios padrão (idempotente via WHERE NOT EXISTS) -----

    private void runSeed() {
        try {
            ClassPathResource resource = new ClassPathResource("db/manual/exercise_catalog_seed.sql");
            String sql = new String(resource.getInputStream().readAllBytes(), StandardCharsets.UTF_8);

            // Cada instrução termina com ;\n — dividir por isso
            String[] statements = sql.split(";\\s*\\r?\\n");

            int executed = 0;
            for (String statement : statements) {
                String trimmed = statement.trim();
                if (trimmed.isEmpty() || trimmed.startsWith("--")) {
                    continue;
                }

                try {
                    jdbcTemplate.execute(trimmed);
                    executed++;
                } catch (Exception e) {
                    logger.warn("Seed statement skipped (possibly already exists): {}", e.getMessage());
                }
            }

            logger.info("Exercise catalog seed completed: {} statements processed", executed);
        } catch (IOException e) {
            logger.error("Could not read exercise catalog seed file", e);
        }
    }
}
