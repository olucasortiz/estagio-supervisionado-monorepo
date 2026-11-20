package com.lionfitness.backend.physicalassessment.repository;

import jakarta.annotation.PostConstruct;
import org.springframework.core.io.ClassPathResource;
import org.springframework.jdbc.datasource.init.ResourceDatabasePopulator;
import org.springframework.stereotype.Component;

import javax.sql.DataSource;

/** Cria as tabelas de avaliação física e de cargas (script idempotente), no mesmo padrão de WorkoutSchemaMigration. */
@Component
public class TrainingRecordsSchemaMigration {
    private final DataSource dataSource;

    public TrainingRecordsSchemaMigration(DataSource dataSource) { this.dataSource = dataSource; }

    @PostConstruct
    public void migrate() {
        new ResourceDatabasePopulator(
                new ClassPathResource("db/manual/2026-11-20-physical-assessments-and-load-logs.sql"))
                .execute(dataSource);
    }
}
