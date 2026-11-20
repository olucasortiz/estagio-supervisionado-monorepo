package com.lionfitness.backend.loadlog.service;

import com.lionfitness.backend.loadlog.dto.LoadLogRequest;
import com.lionfitness.backend.loadlog.dto.LoadLogResponse;
import com.lionfitness.backend.loadlog.repository.LoadLogRepository;
import com.lionfitness.backend.member.model.Member;
import com.lionfitness.backend.member.repository.MemberRepository;
import com.lionfitness.backend.personaltrainer.repository.PersonalTrainerRepository;
import com.lionfitness.backend.user.model.User;
import com.lionfitness.backend.user.repository.UserRepository;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

import java.math.RoundingMode;
import java.time.Clock;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Objects;
import java.util.UUID;

/**
 * Registro de carga/peso por aparelho: o aluno anota a carga de cada série durante o treino;
 * o personal do aluno e o ADMIN acompanham a evolução.
 */
@Service
public class LoadLogService {

    static final int HISTORY_LIMIT = 500;

    private final LoadLogRepository repository;
    private final UserRepository userRepository;
    private final MemberRepository memberRepository;
    private final PersonalTrainerRepository personalTrainerRepository;
    private final Clock clock;

    public LoadLogService(LoadLogRepository repository, UserRepository userRepository,
                          MemberRepository memberRepository, PersonalTrainerRepository personalTrainerRepository,
                          Clock applicationClock) {
        this.repository = repository;
        this.userRepository = userRepository;
        this.memberRepository = memberRepository;
        this.personalTrainerRepository = personalTrainerRepository;
        this.clock = applicationClock;
    }

    public LoadLogResponse register(String email, LoadLogRequest request) {
        Member member = requireOwnMember(email);
        LoadLogRepository.PrescribedExercise exercise = repository
                .findActiveExerciseOfMember(request.workoutExerciseId(), member.id())
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND,
                        "Exercício não encontrado na sua ficha ativa."));
        return repository.save(UUID.randomUUID(), member.id(), exercise, request.setNumber(), request.reps(),
                request.loadKg().setScale(2, RoundingMode.HALF_UP), LocalDateTime.now(clock));
    }

    public List<LoadLogResponse> findMine(String email) {
        return repository.findRecentByMemberId(requireOwnMember(email).id(), HISTORY_LIMIT);
    }

    public List<LoadLogResponse> findByMember(String email, UUID memberId) {
        User actor = userRepository.findByEmail(email)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Usuário não encontrado."));
        if (!actor.active()) throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Usuário inativo.");
        Member member = memberRepository.findActiveById(memberId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Aluno não encontrado ou inativo."));
        if (!"ADMIN".equalsIgnoreCase(actor.role())) {
            UUID trainerId = personalTrainerRepository.findActiveByUserId(actor.id())
                    .orElseThrow(() -> new ResponseStatusException(HttpStatus.FORBIDDEN, "Personal trainer não encontrado."))
                    .id();
            if (!Objects.equals(trainerId, member.personalTrainerId())) {
                throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Você só acompanha as cargas dos seus próprios alunos.");
            }
        }
        return repository.findRecentByMemberId(memberId, HISTORY_LIMIT);
    }

    private Member requireOwnMember(String email) {
        User user = userRepository.findByEmail(email)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Usuário não encontrado."));
        if (!user.active()) throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Usuário inativo.");
        return memberRepository.findByUserId(user.id())
                .filter(Member::active)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.FORBIDDEN, "Aluno não encontrado ou inativo."));
    }
}
