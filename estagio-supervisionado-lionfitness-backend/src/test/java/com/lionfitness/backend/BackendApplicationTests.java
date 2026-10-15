package com.lionfitness.backend;

import org.junit.jupiter.api.Test;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.context.TestConfiguration;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Import;
import org.springframework.context.annotation.Primary;
import org.springframework.test.context.TestPropertySource;

import javax.sql.DataSource;
import java.sql.Connection;
import java.sql.DatabaseMetaData;
import java.sql.Statement;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

@SpringBootTest
@Import(BackendApplicationTests.TestDataSourceConfig.class)
@TestPropertySource(properties = {
        "spring.datasource.url=jdbc:postgresql://localhost:5432/testdb",
        "spring.datasource.username=test",
        "spring.datasource.password=test",
        "security.jwt.secret=c2VjdXJpdHktand0LXNlY3JldC1mb3ItdGVzdGluZy1wdXJwb3Nlcy1vbmx5LW11c3QtYmUtbG9uZw==",
        "MP_ACCESS_TOKEN=APP_USR-test-dummy",
        "MP_WEBHOOK_SECRET=test-webhook-secret",
        "mercadopago.access-token=APP_USR-test-dummy",
        "notifications.email.enabled=false"
})
class BackendApplicationTests {

    @TestConfiguration
    static class TestDataSourceConfig {
        @Bean
        @Primary
        public DataSource dataSource() throws Exception {
            DataSource ds = mock(DataSource.class);
            Connection conn = mock(Connection.class);
            Statement stmt = mock(Statement.class);
            DatabaseMetaData meta = mock(DatabaseMetaData.class);

            when(ds.getConnection()).thenReturn(conn);
            when(ds.getConnection(any(), any())).thenReturn(conn);
            when(conn.createStatement()).thenReturn(stmt);
            when(conn.getMetaData()).thenReturn(meta);
            when(conn.isClosed()).thenReturn(false);
            when(stmt.getUpdateCount()).thenReturn(-1);
            when(stmt.getMoreResults()).thenReturn(false);
            return ds;
        }
    }

    @Test
    void contextLoads() {
    }

}
