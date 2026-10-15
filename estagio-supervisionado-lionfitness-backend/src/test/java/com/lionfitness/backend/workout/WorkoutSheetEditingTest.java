package com.lionfitness.backend.workout;

import com.lionfitness.backend.exercisecatalog.*;
import com.lionfitness.backend.member.repository.MemberRepository;
import com.lionfitness.backend.personaltrainer.model.PersonalTrainer;
import com.lionfitness.backend.personaltrainer.repository.PersonalTrainerRepository;
import com.lionfitness.backend.user.model.User;
import com.lionfitness.backend.user.repository.UserRepository;
import com.lionfitness.backend.workout.dto.*;
import com.lionfitness.backend.workout.model.WorkoutExercise;
import com.lionfitness.backend.workout.repository.*;
import com.lionfitness.backend.workout.service.WorkoutService;
import com.lionfitness.backend.workoutexercise.model.WorkoutExerciseRecord;
import com.lionfitness.backend.workoutexercise.repository.WorkoutExerciseRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.aop.framework.ProxyFactory;
import org.springframework.jdbc.datasource.DataSourceTransactionManager;
import org.springframework.transaction.annotation.AnnotationTransactionAttributeSource;
import org.springframework.transaction.interceptor.TransactionInterceptor;
import org.springframework.web.server.ResponseStatusException;

import javax.sql.DataSource;
import java.sql.Connection;
import java.time.LocalDateTime;
import java.util.*;
import java.util.concurrent.*;
import java.util.concurrent.atomic.AtomicLong;

import static org.assertj.core.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

class WorkoutSheetEditingTest {
    final UUID sheetId = UUID.randomUUID(), memberId = UUID.randomUUID(), trainerId = UUID.randomUUID();
    final UUID existingId = UUID.randomUUID(), removedId = UUID.randomUUID(), catalogId = UUID.randomUUID();
    final String email = "trainer@example.com";
    final LocalDateTime createdAt = LocalDateTime.of(2026, 1, 10, 12, 0);
    WorkoutRepository sheets;
    WorkoutSheetHistoryRepository history;
    WorkoutExerciseRepository exercises;
    ExerciseCatalogRepository catalog;
    UserRepository users;
    PersonalTrainerRepository trainers;
    WorkoutService service;
    User actor;

    @BeforeEach
    void setUp() {
        sheets = mock(WorkoutRepository.class); history = mock(WorkoutSheetHistoryRepository.class);
        exercises = mock(WorkoutExerciseRepository.class); catalog = mock(ExerciseCatalogRepository.class);
        users = mock(UserRepository.class); trainers = mock(PersonalTrainerRepository.class);
        actor = new User(UUID.randomUUID(), "Personal real", email, "hash", "PERSONAL_TRAINER", true, createdAt, false);
        when(users.findByEmail(email)).thenReturn(Optional.of(actor));
        when(trainers.findActiveByUserId(actor.id())).thenReturn(Optional.of(new PersonalTrainer(trainerId,
                actor.id(), actor.name(), "", email, "", "", true, createdAt, null)));
        when(sheets.memberBelongsToPersonalTrainer(memberId, trainerId)).thenReturn(true);
        when(sheets.findByIdForUpdate(sheetId)).thenReturn(Optional.of(sheet(0)));
        when(sheets.snapshot(any())).thenAnswer(call -> new WorkoutSheetSnapshot(call.getArgument(0), previousExercises()));
        when(sheets.updateSheet(eq(sheetId), anyString(), anyString(), anyLong())).thenReturn(true);
        service = new WorkoutService(sheets, history, users, mock(MemberRepository.class), trainers, exercises, catalog);
    }

    WorkoutSheetResponse sheet(long version) {
        return new WorkoutSheetResponse(sheetId, memberId, trainerId, "Objetivo antigo", "MONDAY", "Segunda-feira", true, createdAt, version);
    }

    List<WorkoutExercise> previousExercises() {
        return List.of(new WorkoutExercise(existingId, sheetId, "Exercício antigo", "Peitoral", "Peito", "Barra", "Média",
                        "Instrução anterior", 3, 12, 60, "Observação anterior", createdAt),
                new WorkoutExercise(removedId, sheetId, "Removido", "Pernas", "Pernas", "Máquina", null, "Anterior", 4, 10, 90, null, createdAt));
    }

    WorkoutSheetUpdateRequest request(long version, boolean addNew) {
        var retained = new WorkoutSheetUpdateRequest.ExerciseUpdate(existingId, null, 5, 8, 120, "Instrução nova", "Observação nova");
        var added = new WorkoutSheetUpdateRequest.ExerciseUpdate(null, catalogId, 2, 15, 30, null, "Novo");
        return new WorkoutSheetUpdateRequest(" Objetivo novo ", "FRIDAY", version, " Progressão do aluno ",
                addNew ? List.of(retained, added) : List.of(retained));
    }

    void activeCustom() {
        when(catalog.findByIdForShare(catalogId)).thenReturn(Optional.of(new ExerciseCatalog(catalogId, "Personalizado",
                "Pernas", "Quadríceps", "Halter", "Instrução do catálogo", true, trainerId, true, createdAt)));
    }

    @Test
    void completeUpdatePreservesEntirePreviousVersionBeforeChangingAnyData() {
        activeCustom();
        WorkoutSheetSnapshot result = service.updateWorkoutSheet(email, sheetId, request(0, true));
        var snapshot = org.mockito.ArgumentCaptor.forClass(WorkoutSheetSnapshot.class);
        var order = inOrder(history, sheets, exercises);
        order.verify(history).recordSnapshot(snapshot.capture(), eq(actor), eq("Progressão do aluno"));
        order.verify(sheets).updateSheet(sheetId, "Objetivo novo", "FRIDAY", 0);
        order.verify(exercises).deactivateBySheet(sheetId);
        order.verify(exercises).updateExisting(argThat(record -> record.id().equals(existingId) && record.sets() == 5
                && record.reps() == 8 && record.restSeconds() == 120 && record.notes().equals("Observação nova")), eq(0));
        order.verify(exercises).save(argThat(record -> record.exerciseName().equals("Personalizado")
                && record.instructions().equals("Instrução do catálogo") && record.equipment().equals("Halter")), eq(1));
        assertThat(snapshot.getValue().sheet()).isEqualTo(sheet(0));
        assertThat(snapshot.getValue().exercises()).isEqualTo(previousExercises());
        assertThat(snapshot.getValue().exercises().getFirst().sets()).isEqualTo(3);
        assertThat(result.sheet().version()).isEqualTo(1);
        assertThat(result.sheet().title()).isEqualTo("Objetivo novo");
    }

    @Test
    void successiveUpdatesSnapshotEachActualPrecedingState() {
        WorkoutExercise changed = new WorkoutExercise(existingId, sheetId, "Exercício antigo", "Peitoral", "Peito", "Barra",
                "Média", "Instrução nova", 5, 8, 120, "Observação nova", createdAt);
        when(sheets.findByIdForUpdate(sheetId)).thenReturn(Optional.of(sheet(0)), Optional.of(sheet(1)));
        when(sheets.snapshot(any())).thenAnswer(call -> {
            WorkoutSheetResponse value = call.getArgument(0);
            return new WorkoutSheetSnapshot(value, value.version() == 0 ? previousExercises() : List.of(changed));
        });
        service.updateWorkoutSheet(email, sheetId, request(0, false));
        service.updateWorkoutSheet(email, sheetId, request(1, false));
        var snapshots = org.mockito.ArgumentCaptor.forClass(WorkoutSheetSnapshot.class);
        verify(history, times(2)).recordSnapshot(snapshots.capture(), eq(actor), anyString());
        assertThat(snapshots.getAllValues()).extracting(value -> value.sheet().version()).containsExactly(0L, 1L);
        assertThat(snapshots.getAllValues().get(1).exercises()).containsExactly(changed);
        verify(sheets).updateSheet(sheetId, "Objetivo novo", "FRIDAY", 1);
    }

    @Test
    void retainingExistingExerciseDoesNotConsultItsNowInactiveCatalogSource() {
        service.updateWorkoutSheet(email, sheetId, request(0, false));
        verifyNoInteractions(catalog);
        verify(exercises).updateExisting(argThat(record -> record.id().equals(existingId)
                && record.exerciseName().equals("Exercício antigo")), eq(0));
    }

    @Test
    void inactiveCatalogSourceCannotBeIncludedAsNew() {
        when(catalog.findByIdForShare(catalogId)).thenReturn(Optional.of(new ExerciseCatalog(catalogId, "Inativo", "Pernas",
                "Pernas", "Máquina", "Anterior", true, trainerId, false, createdAt)));
        assertConflict(() -> service.updateWorkoutSheet(email, sheetId, request(0, true)));
        verifyNoInteractions(history, exercises);
        verify(sheets, never()).updateSheet(any(), anyString(), anyString(), anyLong());
    }

    @Test
    void foreignExerciseIdAndRepeatedExistingIdAreRejectedBeforeHistoryWrite() {
        var foreign = new WorkoutSheetUpdateRequest.ExerciseUpdate(UUID.randomUUID(), null, 3, 10, 60, null, null);
        assertThatThrownBy(() -> service.updateWorkoutSheet(email, sheetId,
                new WorkoutSheetUpdateRequest("Novo", "MONDAY", 0L, "Motivo", List.of(foreign))))
                .isInstanceOfSatisfying(ResponseStatusException.class, error -> assertThat(error.getStatusCode().value()).isEqualTo(400));
        var repeated = request(0, false).exercises().getFirst();
        assertThatThrownBy(() -> service.updateWorkoutSheet(email, sheetId,
                new WorkoutSheetUpdateRequest("Novo", "MONDAY", 0L, "Motivo", List.of(repeated, repeated))))
                .isInstanceOf(ResponseStatusException.class);
        verifyNoInteractions(history, exercises);
    }

    @Test
    void obsoleteVersionAndInactiveSheetAreRejected() {
        when(sheets.findByIdForUpdate(sheetId)).thenReturn(Optional.of(sheet(1)));
        assertConflict(() -> service.updateWorkoutSheet(email, sheetId, request(0, false)));
        when(sheets.findByIdForUpdate(sheetId)).thenReturn(Optional.of(new WorkoutSheetResponse(sheetId, memberId,
                trainerId, "Antiga", "MONDAY", "Segunda-feira", false, createdAt, 0)));
        assertConflict(() -> service.updateWorkoutSheet(email, sheetId, request(0, false)));
        verifyNoInteractions(history, exercises);
    }

    @Test
    void trainerCannotUpdateAnotherMembersSheet() {
        when(sheets.memberBelongsToPersonalTrainer(memberId, trainerId)).thenReturn(false);
        assertThatThrownBy(() -> service.updateWorkoutSheet(email, sheetId, request(0, false)))
                .isInstanceOfSatisfying(ResponseStatusException.class, error -> assertThat(error.getStatusCode().value()).isEqualTo(403));
        verifyNoInteractions(history, exercises, catalog);
    }

    @Test
    void trainerCannotReadAnotherMembersCurrentState() {
        when(sheets.findByIdForShare(sheetId)).thenReturn(Optional.of(sheet(0)));
        when(sheets.memberBelongsToPersonalTrainer(memberId, trainerId)).thenReturn(false);
        assertThatThrownBy(() -> service.findWorkoutSheet(email, sheetId)).isInstanceOf(ResponseStatusException.class);
        verify(sheets, never()).snapshot(any());
    }

    @Test
    void removingAllExercisesKeepsRowsThroughLogicalDeactivation() {
        service.updateWorkoutSheet(email, sheetId, new WorkoutSheetUpdateRequest("Descanso", "SUNDAY", 0L, "Recuperação", List.of()));
        verify(exercises).deactivateBySheet(sheetId);
        verify(exercises, never()).save(any(), any());
        verify(exercises, never()).updateExisting(any(), anyInt());
        verify(history).recordSnapshot(any(), eq(actor), eq("Recuperação"));
    }

    @Test
    void databaseFailureDuringExerciseUpdateRollsBackHistoryAndSheetTransaction() throws Exception {
        Connection connection = mock(Connection.class);
        WorkoutService transactional = transactionalService(() -> connection);
        doThrow(new IllegalStateException("Falha no banco")).when(exercises).updateExisting(any(), anyInt());
        assertThatThrownBy(() -> transactional.updateWorkoutSheet(email, sheetId, request(0, false)))
                .isInstanceOf(IllegalStateException.class);
        verify(history).recordSnapshot(any(), eq(actor), anyString());
        verify(sheets).updateSheet(sheetId, "Objetivo novo", "FRIDAY", 0);
        verify(connection).rollback();
        verify(connection, never()).commit();
    }

    @Test
    void failureToSaveSnapshotRollsBackWithoutChangingCurrentContent() throws Exception {
        Connection connection = mock(Connection.class);
        WorkoutService transactional = transactionalService(() -> connection);
        doThrow(new IllegalStateException("Falha no histórico")).when(history).recordSnapshot(any(), any(), anyString());
        assertThatThrownBy(() -> transactional.updateWorkoutSheet(email, sheetId, request(0, false))).isInstanceOf(IllegalStateException.class);
        verifyNoInteractions(exercises);
        verify(sheets, never()).updateSheet(any(), anyString(), anyString(), anyLong());
        verify(connection).rollback();
    }

    @Test
    void successfulUpdateCommitsSingleTransaction() throws Exception {
        Connection connection = mock(Connection.class);
        transactionalService(() -> connection).updateWorkoutSheet(email, sheetId, request(0, false));
        verify(connection).commit();
        verify(connection, never()).rollback();
    }

    @Test
    void concurrentRequestsWithSameRevisionCannotBothCommit() throws Exception {
        // Conexões JDBC simuladas; CAS abaixo exercita a colisão, sem simular a semântica de locks do PostgreSQL.
        Queue<Connection> connections = new ConcurrentLinkedQueue<>();
        WorkoutService transactional = transactionalService(() -> {
            Connection connection = mock(Connection.class); connections.add(connection); return connection;
        });
        AtomicLong revision = new AtomicLong(0);
        CyclicBarrier barrier = new CyclicBarrier(2);
        when(sheets.updateSheet(eq(sheetId), anyString(), anyString(), eq(0L))).thenAnswer(call -> {
            barrier.await(5, TimeUnit.SECONDS);
            return revision.compareAndSet(0, 1);
        });
        try (ExecutorService pool = Executors.newFixedThreadPool(2)) {
            Callable<Integer> update = () -> {
                try { transactional.updateWorkoutSheet(email, sheetId, request(0, false)); return 200; }
                catch (ResponseStatusException error) { return error.getStatusCode().value(); }
            };
            Future<Integer> first = pool.submit(update), second = pool.submit(update);
            assertThat(List.of(first.get(10, TimeUnit.SECONDS), second.get(10, TimeUnit.SECONDS)))
                    .containsExactlyInAnyOrder(200, 409);
        }
        assertThat(revision.get()).isEqualTo(1);
        long commits = connections.stream().flatMap(connection -> mockingDetails(connection).getInvocations().stream())
                .filter(invocation -> invocation.getMethod().getName().equals("commit")).count();
        long rollbacks = connections.stream().flatMap(connection -> mockingDetails(connection).getInvocations().stream())
                .filter(invocation -> invocation.getMethod().getName().equals("rollback")).count();
        assertThat(commits).isEqualTo(1);
        assertThat(rollbacks).isEqualTo(1);
    }

    WorkoutService transactionalService(Callable<Connection> connectionFactory) throws Exception {
        DataSource dataSource = mock(DataSource.class);
        when(dataSource.getConnection()).thenAnswer(call -> {
            Connection connection = connectionFactory.call(); when(connection.getAutoCommit()).thenReturn(true); return connection;
        });
        ProxyFactory proxy = new ProxyFactory(service);
        proxy.setProxyTargetClass(true);
        TransactionInterceptor interceptor = new TransactionInterceptor();
        interceptor.setTransactionManager(new DataSourceTransactionManager(dataSource));
        interceptor.setTransactionAttributeSource(new AnnotationTransactionAttributeSource());
        interceptor.afterPropertiesSet();
        proxy.addAdvice(interceptor);
        return (WorkoutService) proxy.getProxy();
    }

    void assertConflict(org.assertj.core.api.ThrowableAssert.ThrowingCallable action) {
        assertThatThrownBy(action).isInstanceOfSatisfying(ResponseStatusException.class,
                error -> assertThat(error.getStatusCode().value()).isEqualTo(409));
    }
}
