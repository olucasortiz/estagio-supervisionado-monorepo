package com.lionfitness.backend.payment.repository;

import com.lionfitness.backend.member.dto.OverdueMemberResponse;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.condition.EnabledIfEnvironmentVariable;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.datasource.DriverManagerDataSource;

import java.time.LocalDate;
import java.time.OffsetDateTime;
import java.time.ZoneId;
import java.util.List;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;

/** Exercises the overdue query and JDBC mapping against a disposable PostgreSQL schema. */
@EnabledIfEnvironmentVariable(named = "F51_POSTGRES_URL", matches = "jdbc:postgresql://127\\.0\\.0\\.1:55451/lion_f51_test")
class PaymentRepositoryOverduePostgresTest {
    private static final ZoneId BUSINESS_ZONE = ZoneId.of("America/Sao_Paulo");

    private DriverManagerDataSource admin;
    private JdbcTemplate jdbc;
    private String schema;
    private UUID delinquentMemberId;

    @BeforeEach
    void setUp() {
        admin = new DriverManagerDataSource(System.getenv("F51_POSTGRES_URL"), "postgres", "lion_local_test");
        schema = "overdue_" + UUID.randomUUID().toString().replace("-", "");
        new JdbcTemplate(admin).execute("create schema " + schema);
        var dataSource = new DriverManagerDataSource(
                System.getenv("F51_POSTGRES_URL") + "?currentSchema=" + schema,
                "postgres",
                "lion_local_test");
        jdbc = new JdbcTemplate(dataSource);

        jdbc.execute("create table members (id uuid primary key, name text not null, cpf text, is_active boolean not null)");
        jdbc.execute("create table plans (id uuid primary key, name text not null)");
        jdbc.execute("create table subscriptions (id uuid primary key, member_id uuid not null, plan_id uuid not null, end_date date not null, status text not null)");
        jdbc.execute("create table payments (id uuid primary key, subscription_id uuid not null, amount numeric(10,2) not null, created_at timestamptz not null, method text not null, status text not null)");

        LocalDate today = LocalDate.now(BUSINESS_ZONE);
        UUID activeMember = UUID.randomUUID();
        UUID futureMember = UUID.randomUUID();
        UUID inactiveMember = UUID.randomUUID();
        UUID canceledMember = UUID.randomUUID();
        UUID monthlyPlan = UUID.randomUUID();
        UUID weeklyPlan = UUID.randomUUID();
        delinquentMemberId = activeMember;

        jdbc.update("insert into members values (?, 'Aluno inadimplente', '00000000001', true)", activeMember);
        jdbc.update("insert into members values (?, 'Aluno em dia', '00000000002', true)", futureMember);
        jdbc.update("insert into members values (?, 'Aluno inativo', '00000000003', false)", inactiveMember);
        jdbc.update("insert into members values (?, 'Aluno cancelado', '00000000004', true)", canceledMember);
        jdbc.update("insert into plans values (?, 'Plano Mensal')", monthlyPlan);
        jdbc.update("insert into plans values (?, 'Plano Semanal')", weeklyPlan);

        UUID overdueSubscription = UUID.randomUUID();
        UUID futureOverdueSubscription = UUID.randomUUID();
        UUID currentSubscription = UUID.randomUUID();
        UUID inactiveSubscription = UUID.randomUUID();
        UUID canceledSubscription = UUID.randomUUID();
        jdbc.update("insert into subscriptions values (?, ?, ?, ?, 'ACTIVE')", overdueSubscription,
                activeMember, monthlyPlan, today.minusDays(2));
        jdbc.update("insert into subscriptions values (?, ?, ?, ?, 'ACTIVE')", futureOverdueSubscription,
                activeMember, weeklyPlan, today.plusDays(10));
        jdbc.update("insert into subscriptions values (?, ?, ?, ?, 'ACTIVE')", currentSubscription,
                futureMember, monthlyPlan, today.plusDays(1));
        jdbc.update("insert into subscriptions values (?, ?, ?, ?, 'ACTIVE')", inactiveSubscription,
                inactiveMember, monthlyPlan, today.minusDays(5));
        jdbc.update("insert into subscriptions values (?, ?, ?, ?, 'CANCELED')", canceledSubscription,
                canceledMember, monthlyPlan, today.minusDays(5));

        insertPayment(overdueSubscription, "100.00", "CASH", "PENDING", OffsetDateTime.now().minusDays(3));
        insertPayment(overdueSubscription, "20.00", "PIX", "PENDING", OffsetDateTime.now().minusDays(2));
        insertPayment(futureOverdueSubscription, "30.00", "CREDIT_CARD", "OVERDUE", OffsetDateTime.now().minusDays(1));
        insertPayment(currentSubscription, "50.00", "CASH", "PENDING", OffsetDateTime.now());
        insertPayment(inactiveSubscription, "60.00", "CASH", "OVERDUE", OffsetDateTime.now());
        insertPayment(canceledSubscription, "70.00", "CASH", "OVERDUE", OffsetDateTime.now());
        insertPayment(overdueSubscription, "40.00", "PIX", "CANCELED", OffsetDateTime.now());
    }

    @AfterEach
    void cleanUp() {
        if (admin != null && schema != null) {
            new JdbcTemplate(admin).execute("drop schema " + schema + " cascade");
        }
    }

    @Test
    void returnsOneMemberWithTotalDebtAndExcludesIneligibleRows() {
        List<OverdueMemberResponse> overdue = new PaymentRepository(jdbc).findOverdueMembers();

        assertThat(overdue).hasSize(1);
        OverdueMemberResponse member = overdue.getFirst();
        assertThat(member.memberId()).isEqualTo(delinquentMemberId);
        assertThat(member.amount()).isEqualByComparingTo("150.00");
        assertThat(member.openPaymentCount()).isEqualTo(3);
        assertThat(member.paymentDate()).isEqualTo(LocalDate.now(BUSINESS_ZONE).minusDays(2));
        assertThat(member.planName()).isEqualTo("Plano Mensal");
    }

    private void insertPayment(UUID subscriptionId, String amount, String method, String status, OffsetDateTime createdAt) {
        jdbc.update("insert into payments values (?, ?, ?, ?, ?, ?)", UUID.randomUUID(), subscriptionId,
                new java.math.BigDecimal(amount), createdAt, method, status);
    }
}
