package com.lionfitness.backend.member;

import com.lionfitness.backend.member.model.Member;
import com.lionfitness.backend.member.repository.MemberRepository;
import com.lionfitness.backend.member.service.MemberService;
import com.lionfitness.backend.personaltrainer.model.PersonalTrainer;
import com.lionfitness.backend.personaltrainer.repository.PersonalTrainerRepository;
import org.junit.jupiter.api.Test;
import java.util.Optional;
import java.util.UUID;
import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

class LinkedPersonalTrainerTest {
    @Test void resolvesOnlyTheTrainerLinkedToTheAuthenticatedMember() {
        var members = mock(MemberRepository.class);
        var trainers = mock(PersonalTrainerRepository.class);
        var service = new MemberService(members, null, null, null, null, null, null, null, trainers);
        UUID userId = UUID.randomUUID(), trainerId = UUID.randomUUID();
        when(members.findByUserId(userId)).thenReturn(Optional.of(new Member(UUID.randomUUID(), userId, trainerId, "Student", "", "", null, null, true, null)));
        when(trainers.findActiveById(trainerId)).thenReturn(Optional.of(new PersonalTrainer(trainerId, UUID.randomUUID(), "Linked trainer", "private-cpf", "private-email", "private-phone", "", true, null, null)));
        var result = service.findMyPersonalTrainer(userId);
        assertEquals(trainerId, result.id());
        assertEquals("Linked trainer", result.name());
        verify(trainers).findActiveById(trainerId);
        verifyNoMoreInteractions(trainers);
    }
    @Test void noRelationshipDoesNotConsultTheTrainerDirectory() {
        var members = mock(MemberRepository.class);
        var trainers = mock(PersonalTrainerRepository.class);
        var service = new MemberService(members, null, null, null, null, null, null, null, trainers);
        UUID userId = UUID.randomUUID();
        when(members.findByUserId(userId)).thenReturn(Optional.of(new Member(UUID.randomUUID(), userId, null, "Student", "", "", null, null, true, null)));
        assertNull(service.findMyPersonalTrainer(userId));
        verifyNoInteractions(trainers);
    }
}
