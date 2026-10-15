package com.lionfitness.backend.workout.repository;

import jakarta.annotation.PostConstruct;
import org.springframework.core.io.ClassPathResource;
import org.springframework.jdbc.datasource.init.ResourceDatabasePopulator;
import org.springframework.stereotype.Component;

import javax.sql.DataSource;

@Component
public class WorkoutSchemaMigration {
    private final DataSource dataSource;

    public WorkoutSchemaMigration(DataSource dataSource) { this.dataSource = dataSource; }

    @PostConstruct
    public void migrate() {
        new ResourceDatabasePopulator(new ClassPathResource("db/manual/2026-10-08-workout-sheet-versioning.sql"))
                .execute(dataSource);
    }
}
