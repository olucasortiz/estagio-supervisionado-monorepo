package com.lionfitness.backend.common.controller;

import java.time.OffsetDateTime;
import java.util.Map;

import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
public class DatabaseTestController {

    private final JdbcTemplate jdbcTemplate;

    public DatabaseTestController(JdbcTemplate jdbcTemplate) {
        this.jdbcTemplate = jdbcTemplate;
    }

    @GetMapping("/db-test")
    public Map<String, Object> testConnection() {
        OffsetDateTime databaseTime = jdbcTemplate.queryForObject(
                "select now()",
                OffsetDateTime.class
        );

        return Map.of(
                "status", "success",
                "message", "Database connection is working",
                "databaseTime", databaseTime
        );
    }
}
