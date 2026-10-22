package com.lionfitness.backend.workout;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.SerializationFeature;
import com.fasterxml.jackson.datatype.jsr310.JavaTimeModule;
import com.lionfitness.backend.common.exception.GlobalExceptionHandler;
import com.lionfitness.backend.user.model.User;
import com.lionfitness.backend.user.repository.UserRepository;
import com.lionfitness.backend.workout.controller.WorkoutSheetController;
import com.lionfitness.backend.workout.dto.WorkoutSheetHistoryResponse;
import com.lionfitness.backend.workout.dto.WorkoutSheetResponse;
import com.lionfitness.backend.workout.dto.WorkoutSheetSnapshot;
import com.lionfitness.backend.workout.repository.WorkoutRepository;
import com.lionfitness.backend.workout.repository.WorkoutSchemaMigration;
import com.lionfitness.backend.workout.repository.WorkoutSheetHistoryRepository;
import com.lionfitness.backend.workout.service.WorkoutService;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.condition.EnabledIfEnvironmentVariable;
import org.junit.jupiter.api.parallel.ResourceLock;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.CsvSource;
import org.junit.jupiter.params.provider.ValueSource;
import org.springframework.core.io.ClassPathResource;
import org.springframework.http.converter.json.MappingJackson2HttpMessageConverter;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.datasource.DriverManagerDataSource;
import org.springframework.jdbc.datasource.init.ScriptUtils;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;
import org.springframework.core.io.ByteArrayResource;

import java.nio.charset.StandardCharsets;
import java.time.Instant;
import java.time.LocalDateTime;
import java.time.OffsetDateTime;
import java.time.ZoneId;
import java.util.List;
import java.util.TimeZone;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/** Real JDBC, repository, service and MVC serialization; no remote properties or gateway clients. */
@EnabledIfEnvironmentVariable(named = "F51_POSTGRES_URL", matches = "jdbc:postgresql://127\\.0\\.0\\.1:55451/lion_f51_test")
@ResourceLock("JVM_DEFAULT_TIME_ZONE")
class WorkoutSheetHistoryPostgresTest {
    private static final String EMAIL = "history.fixture@lion.local";
    private final UUID sheetId = UUID.randomUUID(), actorId = UUID.randomUUID(), memberId = UUID.randomUUID();
    private final ObjectMapper mapper = new ObjectMapper().registerModule(new JavaTimeModule())
            .disable(SerializationFeature.WRITE_DATES_AS_TIMESTAMPS);
    private DriverManagerDataSource admin, dataSource;
    private JdbcTemplate jdbc;
    private String schema;
    private TimeZone originalTimeZone;
    private String sessionTimeZone = "UTC";
    private WorkoutSheetHistoryRepository history;
    private WorkoutService service;
    private MockMvc mvc;

    @BeforeEach void setup() {
        originalTimeZone = TimeZone.getDefault();
        admin = new DriverManagerDataSource(System.getenv("F51_POSTGRES_URL"), "postgres", "lion_local_test");
        assertThat(new JdbcTemplate(admin).queryForObject("show server_version_num", Integer.class))
                .isBetween(160000, 169999);
        schema = "history611_" + UUID.randomUUID().toString().replace("-", "");
        new JdbcTemplate(admin).execute("create schema " + schema);
        dataSource = new DriverManagerDataSource(System.getenv("F51_POSTGRES_URL") + "?currentSchema=" + schema,
                "postgres", "lion_local_test") {
            @Override public java.sql.Connection getConnection() throws java.sql.SQLException {
                var connection = super.getConnection();
                // pgJDBC sets TimeZone from the JVM during connection startup; set it afterwards
                // to actually exercise a database session with a different timezone.
                try (var statement = connection.prepareStatement("select set_config('TimeZone', ?, false)")) {
                    statement.setString(1, sessionTimeZone);
                    statement.execute();
                } catch (java.sql.SQLException failure) {
                    connection.close();
                    throw failure;
                }
                return connection;
            }
        };
        jdbc = new JdbcTemplate(dataSource);
        jdbc.execute("""
                create table users(id uuid primary key, name varchar(150), email text, password_hash text,
                    role text, is_active boolean, created_at timestamp default current_timestamp)
                """);
        jdbc.execute("create table workout_sheets(id uuid primary key, member_id uuid)");
        jdbc.execute("create table workout_exercises(id uuid primary key)");
        jdbc.update("insert into users(id,name,email,password_hash,role,is_active) values (?, ?, ?, 'fixture', 'ADMIN', true)",
                actorId, "Autor sintético", EMAIL);
        jdbc.update("insert into workout_sheets(id,member_id) values (?,?)", sheetId, memberId);
        UserRepository users = new UserRepository(jdbc);
        users.init(); // actual startup DDL, confined to the disposable schema
        history = new WorkoutSheetHistoryRepository(jdbc, mapper);
        service = new WorkoutService(new WorkoutRepository(jdbc), history, users, null, null, null, null);
        // Standalone MVC tests serialization and the real service; existing security tests cover filter/roles.
        mvc = MockMvcBuilders.standaloneSetup(new WorkoutSheetController(service))
                .setControllerAdvice(new GlobalExceptionHandler())
                .setMessageConverters(new MappingJackson2HttpMessageConverter(mapper)).build();
    }

    @AfterEach void cleanup() {
        try {
            if (admin != null && schema != null) new JdbcTemplate(admin).execute("drop schema " + schema + " cascade");
        } finally {
            if (originalTimeZone != null) TimeZone.setDefault(originalTimeZone);
        }
    }

    private void migrate(String kind) throws Exception {
        if ("startup".equals(kind)) new WorkoutSchemaMigration(dataSource).migrate();
        else try (var connection = dataSource.getConnection()) {
            String script = new ClassPathResource("db/manual/2026-10-15-workout-sheet-history-safe-migration.sql")
                    .getContentAsString(StandardCharsets.UTF_8)
                    .replace("public.", schema + ".");
            ScriptUtils.executeSqlScript(connection, new ByteArrayResource(script.getBytes(StandardCharsets.UTF_8)));
        }
    }

    private void zones(String jvmZone, String sessionZone) {
        TimeZone.setDefault(TimeZone.getTimeZone(jvmZone));
        sessionTimeZone = sessionZone;
        assertThat(jdbc.queryForObject("show TimeZone", String.class)).isEqualTo(sessionZone);
    }

    private WorkoutSheetSnapshot snapshot() {
        return new WorkoutSheetSnapshot(new WorkoutSheetResponse(sheetId, memberId, null, "Ficha sintética",
                "MONDAY", "Segunda-feira", true, LocalDateTime.of(2026, 10, 8, 9, 30), 7), List.of());
    }

    private void insert(UUID id, OffsetDateTime time, WorkoutSheetSnapshot snapshot) throws Exception {
        jdbc.update("""
                insert into workout_sheet_history(id,workout_sheet_id,change_reason,created_at,snapshot,
                    changed_by_user_id,changed_by_name) values (?,?,'Registro conhecido',?,cast(? as jsonb),?,?)
                """, id, sheetId, time, snapshot == null ? null : mapper.writeValueAsString(snapshot),
                snapshot == null ? null : actorId, snapshot == null ? null : "Autor sintético");
    }

    private OffsetDateTime stored(UUID id) {
        return jdbc.queryForObject("select created_at from workout_sheet_history where id=?",
                (rs, row) -> rs.getObject("created_at", OffsetDateTime.class), id);
    }

    private List<WorkoutSheetHistoryResponse> read() { return service.findWorkoutSheetHistory(EMAIL, sheetId); }

    private org.springframework.test.web.servlet.ResultActions request() throws Exception {
        return mvc.perform(get("/workout-sheets/" + sheetId + "/history")
                .principal(new UsernamePasswordAuthenticationToken(EMAIL, null)));
    }

    @ParameterizedTest @ValueSource(strings = {"manual", "startup"})
    void bothMigrationOrdersReadNonEmptyHistoryThroughJavaAndRest(String first) throws Exception {
        String second = "manual".equals(first) ? "startup" : "manual";
        migrate(first); migrate(second); migrate(first); migrate(second);
        UUID id = UUID.randomUUID();
        OffsetDateTime time = OffsetDateTime.parse("2026-10-15T18:04:56.123456+05:30");
        insert(id, time, snapshot());
        assertThat(read()).singleElement().satisfies(entry -> {
            assertThat(entry.createdAt()).isEqualTo(LocalDateTime.parse("2026-10-15T09:34:56.123456"));
            assertThat(entry.snapshot()).isEqualTo(snapshot());
            assertThat(entry.changedByUserId()).isEqualTo(actorId);
        });
        request().andExpect(status().isOk())
                .andExpect(jsonPath("$[0].createdAt").value("2026-10-15T09:34:56.123456"))
                .andExpect(jsonPath("$[0].changedByName").value("Autor sintético"))
                .andExpect(jsonPath("$[0].snapshot.sheet.createdAt").value("2026-10-08T09:30:00"))
                .andExpect(jsonPath("$[0].snapshot.sheet.version").value(7));
        assertThat(stored(id).toInstant()).isEqualTo(time.toInstant());
        assertThat(jdbc.queryForObject("select count(*) from workout_sheet_history", Integer.class)).isEqualTo(1);
    }

    @ParameterizedTest
    @CsvSource({"UTC,UTC", "Asia/Tokyo,Pacific/Auckland", "America/Los_Angeles,Asia/Kolkata",
            "America/Sao_Paulo,America/Sao_Paulo"})
    void instantConversionIgnoresJvmAndSessionZoneAndRespectsHistoricalDst(String jvm, String session) throws Exception {
        migrate("manual"); zones(jvm, session);
        UUID modern = UUID.randomUUID(), historical = UUID.randomUUID();
        insert(modern, OffsetDateTime.parse("2026-10-15T01:30:00Z"), null);
        insert(historical, OffsetDateTime.parse("2018-12-01T12:34:56Z"), null);
        assertThat(read()).extracting(WorkoutSheetHistoryResponse::createdAt).containsExactly(
                LocalDateTime.parse("2026-10-14T22:30:00"), LocalDateTime.parse("2018-12-01T10:34:56"));
        request().andExpect(status().isOk())
                .andExpect(jsonPath("$[0].createdAt").value("2026-10-14T22:30:00"))
                .andExpect(jsonPath("$[1].createdAt").value("2018-12-01T10:34:56"));
        assertThat(stored(modern).toInstant()).isEqualTo(Instant.parse("2026-10-15T01:30:00Z"));
    }

    @ParameterizedTest @ValueSource(strings = {"manual", "startup"})
    void legacyTimestampColumnAndOldRowsRemainUnchanged(String first) throws Exception {
        zones("Asia/Tokyo", "Pacific/Auckland");
        jdbc.execute("""
                create table workout_sheet_history(id uuid primary key, workout_sheet_id uuid not null
                    references workout_sheets(id), change_reason text, created_at timestamp default now())
                """);
        LocalDateTime wallTime = LocalDateTime.parse("2018-12-01T09:12:13.123456");
        jdbc.update("insert into workout_sheet_history values (?,?,'Evento legado',?)", UUID.randomUUID(), sheetId, wallTime);
        migrate(first); migrate("manual".equals(first) ? "startup" : "manual");
        assertThat(read()).singleElement().satisfies(entry -> {
            assertThat(entry.createdAt()).isEqualTo(wallTime);
            assertThat(entry.snapshot()).isNull();
            assertThat(entry.changedByUserId()).isNull();
            assertThat(entry.changedByName()).isNull();
        });
        request().andExpect(status().isOk())
                .andExpect(jsonPath("$[0].createdAt").value("2018-12-01T09:12:13.123456"))
                .andExpect(jsonPath("$[0].snapshot").doesNotExist());
        assertThat(jdbc.queryForObject("select created_at from workout_sheet_history", LocalDateTime.class)).isEqualTo(wallTime);
        assertThat(jdbc.queryForObject("""
                select data_type from information_schema.columns where table_schema=?
                    and table_name='workout_sheet_history' and column_name='created_at'
                """, String.class, schema)).isEqualTo("timestamp without time zone");
    }

    @Test void emptyHistoryReturnsEmptyArray() throws Exception {
        migrate("manual");
        assertThat(read()).isEmpty();
        request().andExpect(status().isOk()).andExpect(jsonPath("$.length()").value(0));
    }

    @Test void nullTimestampAndLegacyNullSnapshotDoNotInventAuthorOrDate() throws Exception {
        migrate("manual");
        insert(UUID.randomUUID(), null, null);
        assertThat(read()).singleElement().satisfies(entry -> {
            assertThat(entry.createdAt()).isNull();
            assertThat(entry.snapshot()).isNull();
            assertThat(entry.changedByUserId()).isNull();
            assertThat(entry.changedByName()).isNull();
        });
        request().andExpect(status().isOk()).andExpect(jsonPath("$[0].createdAt").doesNotExist())
                .andExpect(jsonPath("$[0].snapshot").doesNotExist());
    }

    @ParameterizedTest @CsvSource({"UTC,Pacific/Auckland", "Asia/Tokyo,America/Los_Angeles"})
    void repositoryWritesRealSnapshotWithoutShiftingInstant(String jvm, String session) throws Exception {
        migrate("startup"); zones(jvm, session);
        Instant before = Instant.now();
        User actor = new User(actorId, "Autor sintético", EMAIL, "fixture", "ADMIN", true,
                LocalDateTime.of(2026, 10, 8, 9, 30), false);
        history.recordSnapshot(snapshot(), actor, "Gravação real");
        var entry = read().getFirst();
        Instant instant = stored(entry.id()).toInstant();
        assertThat(instant).isBetween(before.minusSeconds(1), Instant.now().plusSeconds(1));
        assertThat(entry.createdAt()).isEqualTo(instant.atZone(ZoneId.of("America/Sao_Paulo")).toLocalDateTime());
        assertThat(entry.snapshot()).isEqualTo(snapshot());
        request().andExpect(status().isOk()).andExpect(jsonPath("$[0].snapshot.sheet.title").value("Ficha sintética"));
    }

    @Test void legacyRecordChangeUsesDatabaseDefaultAndReadsNonEmptyHistory() throws Exception {
        migrate("manual");
        Instant before = Instant.now();
        history.recordChange(sheetId, "Evento sem snapshot");
        var entry = read().getFirst();
        assertThat(stored(entry.id()).toInstant()).isBetween(before.minusSeconds(1), Instant.now().plusSeconds(1));
        assertThat(entry.snapshot()).isNull();
        request().andExpect(status().isOk()).andExpect(jsonPath("$[0].changeReason").value("Evento sem snapshot"));
    }

    @Test void equalInstantsWithDifferentOffsetsKeepDeterministicOrderAndStoredData() throws Exception {
        migrate("manual");
        UUID first = UUID.fromString("00000000-0000-0000-0000-000000000001");
        UUID second = UUID.fromString("00000000-0000-0000-0000-000000000002");
        insert(first, OffsetDateTime.parse("2026-10-15T12:00:00Z"), null);
        insert(second, OffsetDateTime.parse("2026-10-15T09:00:00-03:00"), null);
        assertThat(read()).extracting(WorkoutSheetHistoryResponse::id).containsExactly(second, first);
        assertThat(read()).extracting(WorkoutSheetHistoryResponse::createdAt)
                .containsExactly(LocalDateTime.parse("2026-10-15T09:00:00"), LocalDateTime.parse("2026-10-15T09:00:00"));
        assertThat(stored(first).toInstant()).isEqualTo(stored(second).toInstant());
    }
}
