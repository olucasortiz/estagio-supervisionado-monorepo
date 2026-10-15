package com.lionfitness.backend.payment.service;

import com.lionfitness.backend.payment.dto.PaymentCreateRequest;
import com.lionfitness.backend.payment.dto.PaymentUpdateRequest;
import com.lionfitness.backend.payment.repository.PaymentRepository;
import com.lionfitness.backend.subscription.dto.SubscriptionCreateRequest;
import com.lionfitness.backend.subscription.repository.SubscriptionRepository;
import com.lionfitness.backend.subscription.service.SubscriptionService;
import com.lionfitness.backend.subscription.service.SubscriptionRenewalEligibilityService;
import org.junit.jupiter.api.*;
import org.junit.jupiter.api.condition.EnabledIfEnvironmentVariable;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.ValueSource;
import org.springframework.aop.framework.ProxyFactory;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.datasource.DriverManagerDataSource;
import org.springframework.jdbc.datasource.DataSourceTransactionManager;
import org.springframework.transaction.annotation.AnnotationTransactionAttributeSource;
import org.springframework.transaction.interceptor.TransactionInterceptor;
import org.springframework.core.io.ClassPathResource;
import org.springframework.jdbc.datasource.init.ScriptUtils;
import java.math.BigDecimal;
import java.time.*;
import java.util.*;
import java.util.concurrent.*;
import java.util.function.Supplier;
import static org.assertj.core.api.Assertions.*;

/** Real PostgreSQL, disposable per-test schema; never loads production properties or integrations. */
@EnabledIfEnvironmentVariable(named = "F51_POSTGRES_URL", matches = "jdbc:postgresql://127\\.0\\.0\\.1:55451/lion_f51_test")
class PaymentConcurrencyTest {
    JdbcTemplate jdbc;
    DriverManagerDataSource admin, ds;
    String schema;
    PaymentService payments;
    SubscriptionService subscriptions;
    DataSourceTransactionManager tm;
    UUID member = UUID.randomUUID(), plan = UUID.randomUUID(), subscription = UUID.randomUUID();
    LocalDate today = LocalDate.now(ZoneId.of("America/Sao_Paulo"));
    BigDecimal amount = new BigDecimal("100.00");

    @BeforeEach void setup() throws Exception {
        admin = new DriverManagerDataSource(System.getenv("F51_POSTGRES_URL"), "postgres", "lion_local_test");
        schema = "f51_" + UUID.randomUUID().toString().replace("-", "");
        new JdbcTemplate(admin).execute("create schema " + schema);
        ds = new DriverManagerDataSource(System.getenv("F51_POSTGRES_URL") + "?currentSchema=" + schema, "postgres", "lion_local_test");
        jdbc = new JdbcTemplate(ds);
        jdbc.execute("create type subscription_status_enum as enum ('ACTIVE','EXPIRED','CANCELED')");
        jdbc.execute("create type payment_status_enum as enum ('PAID','PENDING','OVERDUE','CANCELED')");
        jdbc.execute("create type payment_method_enum as enum ('CASH','PIX','CREDIT_CARD','DEBIT_CARD','ONLINE_GATEWAY')");
        jdbc.execute("create table members(id uuid primary key, is_active boolean not null default true)");
        jdbc.execute("create table plans(id uuid primary key, type text, duration_days int, price numeric(10,2), is_active boolean default true)");
        jdbc.execute("create table subscriptions(id uuid primary key, member_id uuid references members(id), plan_id uuid references plans(id), start_date date, end_date date, status subscription_status_enum, created_at timestamp)");
        jdbc.execute("create table payments(id uuid primary key, subscription_id uuid references subscriptions(id), amount numeric(10,2) check(amount > 0), paid_at timestamp, method payment_method_enum, status payment_status_enum, created_at timestamp)");
        try (var connection = ds.getConnection()) {
            var migration = new ClassPathResource("db/manual/2026-10-15-fase51-payment-idempotency.sql");
            ScriptUtils.executeSqlScript(connection, migration);
            ScriptUtils.executeSqlScript(connection, migration); // idempotent DDL
        }
        jdbc.update("insert into members(id) values (?)", member);
        jdbc.update("insert into plans(id,type,duration_days,price) values (?,'MONTHLY',30,100)", plan);
        jdbc.update("insert into subscriptions values (?,?,?,?,?,'ACTIVE',now() - interval '1 day')", subscription, member, plan, today.minusDays(30), today);
        tm = new DataSourceTransactionManager(ds);
        var paymentRepo = new PaymentRepository(jdbc);
        var subscriptionRepo = new SubscriptionRepository(jdbc);
        var clock = Clock.system(ZoneId.of("America/Sao_Paulo"));
        var eligibility = new SubscriptionRenewalEligibilityService(clock);
        payments = proxy(new PaymentService(paymentRepo, subscriptionRepo, eligibility, clock));
        subscriptions = proxy(new SubscriptionService(subscriptionRepo, paymentRepo, eligibility));
    }
    @SuppressWarnings("unchecked") <T> T proxy(T target) {
        var factory = new ProxyFactory(target);
        factory.setProxyTargetClass(true);
        factory.addAdvice(new TransactionInterceptor(tm, new AnnotationTransactionAttributeSource()));
        return (T) factory.getProxy();
    }
    @AfterEach void cleanup() {
        if (admin != null && schema != null) new JdbcTemplate(admin).execute("drop schema " + schema + " cascade");
    }
    <T> List<T> concurrent(int n, Supplier<T> action) throws Exception {
        var pool = Executors.newFixedThreadPool(n);
        var ready = new CountDownLatch(n);
        var start = new CountDownLatch(1);
        try {
            List<Future<T>> jobs = new ArrayList<>();
            for (int i=0; i<n; i++) jobs.add(pool.submit(() -> { ready.countDown(); if (!start.await(10, TimeUnit.SECONDS)) throw new TimeoutException(); return action.get(); }));
            assertThat(ready.await(10, TimeUnit.SECONDS)).isTrue();
            start.countDown();
            List<T> results = new ArrayList<>();
            for (var job : jobs) results.add(job.get(30, TimeUnit.SECONDS));
            return results;
        } finally { start.countDown(); pool.shutdownNow(); assertThat(pool.awaitTermination(5, TimeUnit.SECONDS)).isTrue(); }
    }
    PaymentCreateRequest request(UUID key, String status) { return new PaymentCreateRequest(subscription, amount, today, "CASH", status, key); }
    int count(String table) { return jdbc.queryForObject("select count(*) from " + table, Integer.class); }
    LocalDate end() { return jdbc.queryForObject("select end_date from subscriptions where id=?", LocalDate.class, subscription); }

    @ParameterizedTest @ValueSource(ints={2,10})
    void keyedConcurrentPaymentRenewsOnceAndRetrySurvivesWindow(int n) throws Exception {
        jdbc.update("update subscriptions set end_date=? where id=?", today.minusDays(1), subscription);
        var request = request(UUID.randomUUID(), "PAID");
        var results = concurrent(n, () -> payments.create(request));
        assertThat(results.stream().map(r -> r.id()).distinct()).hasSize(1);
        assertThat(count("payments")).isEqualTo(1);
        assertThat(count("payment_creation_keys")).isEqualTo(1);
        assertThat(end()).isEqualTo(today.plusDays(30));
        jdbc.update("update payments set created_at=now()-interval '1 day'");
        assertThat(payments.create(request).id()).isEqualTo(results.getFirst().id());
        assertThat(end()).isEqualTo(today.plusDays(30));
    }
    @ParameterizedTest @ValueSource(ints={2,10})
    void legacyConcurrentPaymentRenewsOnce(int n) throws Exception {
        jdbc.update("update subscriptions set end_date=? where id=?", today.minusDays(1), subscription);
        var results = concurrent(n, () -> payments.create(request(null, "PAID")));
        assertThat(results.stream().map(r -> r.id()).distinct()).hasSize(1);
        assertThat(count("payments")).isEqualTo(1);
        assertThat(end()).isEqualTo(today.plusDays(30));
    }
    @Test void distinctKeysPreserveLegitimateIdenticalPayments() {
        var first = payments.create(request(UUID.randomUUID(), "PENDING"));
        var second = payments.create(request(UUID.randomUUID(), "PENDING"));
        assertThat(first.id()).isNotEqualTo(second.id());
        assertThat(count("payments")).isEqualTo(2);
        assertThat(end()).isEqualTo(today);
    }
    @Test void distinctKeysPreserveLegitimatePaidPaymentsWithSameValueMethodAndDate() {
        jdbc.update("update plans set duration_days=1");
        jdbc.update("update subscriptions set end_date=?", today.minusDays(1));
        var first = payments.create(request(UUID.randomUUID(), "PAID"));
        var second = payments.create(request(UUID.randomUUID(), "PAID"));
        assertThat(first.id()).isNotEqualTo(second.id());
        assertThat(count("payments")).isEqualTo(2);
        assertThat(end()).isEqualTo(today.plusDays(2));
    }
    @Test void keyReusedWithDifferentPayloadConflicts() {
        UUID key = UUID.randomUUID();
        payments.create(request(key, "PENDING"));
        assertThatThrownBy(() -> payments.create(new PaymentCreateRequest(subscription, new BigDecimal("120"), today, "CASH", "PENDING", key)))
            .isInstanceOf(org.springframework.web.server.ResponseStatusException.class).hasMessageContaining("409");
        assertThat(count("payments")).isEqualTo(1);
    }
    @Test void rollbackRevertsPaymentRenewalAndKeyThenRetrySucceeds() {
        jdbc.update("update subscriptions set end_date=? where id=?", today.minusDays(1), subscription);
        jdbc.execute("alter table payment_creation_keys add constraint force_failure check (request_fingerprint = 'reject')");
        var request = request(UUID.randomUUID(), "PAID");
        assertThatThrownBy(() -> payments.create(request)).isInstanceOf(org.springframework.dao.DataIntegrityViolationException.class);
        assertThat(count("payments")).isZero();
        assertThat(count("payment_creation_keys")).isZero();
        assertThat(end()).isEqualTo(today.minusDays(1));
        jdbc.execute("alter table payment_creation_keys drop constraint force_failure");
        payments.create(request);
        assertThat(count("payments")).isEqualTo(1);
        assertThat(end()).isEqualTo(today.plusDays(30));
    }
    @ParameterizedTest @ValueSource(ints={2,10})
    void concurrentSubscriptionsProduceOneSubscriptionAndInvoice(int n) throws Exception {
        var request = new SubscriptionCreateRequest(member, plan, today);
        var results = concurrent(n, () -> subscriptions.create(request));
        assertThat(results.stream().map(r -> r.id()).distinct()).hasSize(1);
        assertThat(count("subscriptions")).isEqualTo(2); // existing historical fixture + new
        assertThat(count("payments")).isEqualTo(1);
        assertThat(subscriptions.create(request).id()).isEqualTo(results.getFirst().id());
    }
    @Test void subscriptionRollbackRemovesSubscriptionAndInvoiceAndRetryWorks() {
        jdbc.update("update plans set price=0");
        var request = new SubscriptionCreateRequest(member, plan, today);
        assertThatThrownBy(() -> subscriptions.create(request)).isInstanceOf(org.springframework.dao.DataIntegrityViolationException.class);
        assertThat(count("subscriptions")).isEqualTo(1);
        assertThat(count("payments")).isZero();
        jdbc.update("update plans set price=100");
        subscriptions.create(request);
        assertThat(count("subscriptions")).isEqualTo(2);
        assertThat(count("payments")).isEqualTo(1);
    }
    @Test void cancellationAndDifferentPeriodsPreserveHistory() {
        var request = new SubscriptionCreateRequest(member, plan, today);
        var first = subscriptions.create(request);
        subscriptions.delete(first.id());
        var next = subscriptions.create(request);
        assertThat(next.id()).isNotEqualTo(first.id());
        subscriptions.create(new SubscriptionCreateRequest(member, plan, today.plusDays(30)));
        assertThat(count("subscriptions")).isEqualTo(4);
        assertThat(count("payments")).isEqualTo(3);
    }
    @ParameterizedTest @ValueSource(ints={2,10})
    void concurrentSettlementOfSameManualPaymentRenewsOnce(int n) throws Exception {
        jdbc.update("insert into payments values (?,?,100,?,\'CASH\',\'PAID\',now()-interval \'1 day\')", UUID.randomUUID(), subscription, today.minusDays(30).atStartOfDay());
        var payment = payments.create(request(UUID.randomUUID(), "PENDING"));
        concurrent(n, () -> payments.update(payment.id(), new PaymentUpdateRequest(subscription, amount, today, "CASH", "PAID")));
        assertThat(count("payments")).isEqualTo(2);
        assertThat(end()).isEqualTo(today.plusDays(30));
    }
}
