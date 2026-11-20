package com.lionfitness.backend.physicalassessment.service;

import com.lionfitness.backend.member.model.Member;
import com.lionfitness.backend.member.repository.MemberRepository;
import com.lionfitness.backend.personaltrainer.repository.PersonalTrainerRepository;
import com.lionfitness.backend.physicalassessment.dto.PhysicalAssessmentRequest;
import com.lionfitness.backend.physicalassessment.dto.PhysicalAssessmentResponse;
import com.lionfitness.backend.physicalassessment.model.PhysicalAssessment;
import com.lionfitness.backend.physicalassessment.repository.PhysicalAssessmentRepository;
import com.lionfitness.backend.user.model.User;
import com.lionfitness.backend.user.repository.UserRepository;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

import java.time.Clock;
import java.time.LocalDateTime;
import java.time.Period;
import java.util.List;
import java.util.Objects;
import java.util.UUID;

/**
 * Avaliação física. ADMIN avalia qualquer aluno ativo; o personal trainer, apenas os alunos vinculados a ele.
 * O aluno consulta as próprias avaliações em modo somente leitura.
 */
@Service
public class PhysicalAssessmentService {

    private final PhysicalAssessmentRepository repository;
    private final UserRepository userRepository;
    private final MemberRepository memberRepository;
    private final PersonalTrainerRepository personalTrainerRepository;
    private final Clock clock;

    public PhysicalAssessmentService(PhysicalAssessmentRepository repository, UserRepository userRepository,
                                     MemberRepository memberRepository,
                                     PersonalTrainerRepository personalTrainerRepository, Clock applicationClock) {
        this.repository = repository;
        this.userRepository = userRepository;
        this.memberRepository = memberRepository;
        this.personalTrainerRepository = personalTrainerRepository;
        this.clock = applicationClock;
    }

    public PhysicalAssessmentResponse create(String email, PhysicalAssessmentRequest request) {
        User actor = resolveStaff(email);
        Member member = requireAccessibleMember(actor, request.memberId());
        validate(request, member);

        Integer age = member.birthDate() == null ? null
                : Period.between(member.birthDate(), request.assessmentDate()).getYears();
        PhysicalAssessment assessment = new PhysicalAssessment(UUID.randomUUID(), member.id(), member.name(),
                request.assessmentDate(), request.sex() == null || request.sex().isBlank() ? null : request.sex(), age, trim(request.objective()), request.parqAnswers(),
                trim(request.healthNotes()), request.restingHeartRate(), request.systolicPressure(),
                request.diastolicPressure(), request.weightKg(), request.heightCm(),
                request.circumferences() == null ? PhysicalAssessmentRequest.Circumferences.EMPTY : request.circumferences(),
                request.bodyFatMethod(),
                usesSkinfolds(request.bodyFatMethod()) && request.skinfolds() != null
                        ? request.skinfolds() : PhysicalAssessmentRequest.Skinfolds.EMPTY,
                BodyCompositionCalculator.BIOIMPEDANCE.equals(request.bodyFatMethod())
                        ? request.informedBodyFatPercent() : null,
                trim(request.notes()), actor.id(), actor.name(), LocalDateTime.now(clock));
        repository.save(assessment);
        return toResponse(assessment);
    }

    public List<PhysicalAssessmentResponse> findByMember(String email, UUID memberId) {
        User actor = resolveStaff(email);
        requireAccessibleMember(actor, memberId);
        return repository.findActiveByMemberId(memberId).stream().map(this::toResponse).toList();
    }

    public List<PhysicalAssessmentResponse> findMine(String email) {
        User user = userRepository.findByEmail(email)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Usuário não encontrado."));
        return memberRepository.findByUserId(user.id())
                .map(member -> repository.findActiveByMemberId(member.id()).stream().map(this::toResponse).toList())
                .orElse(List.of());
    }

    public void delete(String email, UUID id) {
        User actor = resolveStaff(email);
        PhysicalAssessment assessment = repository.findActiveById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Avaliação física não encontrada."));
        requireAccessibleMember(actor, assessment.memberId());
        if (!repository.deactivate(id)) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Avaliação física não encontrada.");
        }
    }

    private void validate(PhysicalAssessmentRequest request, Member member) {
        boolean hasSystolic = request.systolicPressure() != null;
        boolean hasDiastolic = request.diastolicPressure() != null;
        if (hasSystolic != hasDiastolic) {
            throw badRequest("Informe a pressão sistólica e a diastólica juntas.");
        }
        if (hasSystolic && request.diastolicPressure() >= request.systolicPressure()) {
            throw badRequest("A pressão diastólica deve ser menor que a sistólica.");
        }
        String method = request.bodyFatMethod();
        if (usesSkinfolds(method)) {
            if (request.sex() == null || request.sex().isBlank()) {
                throw badRequest("Informe o sexo do aluno para usar o protocolo de dobras cutâneas.");
            }
            if (member.birthDate() == null) {
                throw badRequest("Cadastre a data de nascimento do aluno para usar o protocolo de dobras cutâneas.");
            }
            List<String> missing = BodyCompositionCalculator.missingSkinfolds(method, request.sex(), request.skinfolds());
            if (!missing.isEmpty()) {
                throw badRequest("Informe as dobras do protocolo escolhido: " + String.join(", ", missing) + ".");
            }
        }
        if (BodyCompositionCalculator.BIOIMPEDANCE.equals(method) && request.informedBodyFatPercent() == null) {
            throw badRequest("Informe o percentual de gordura medido na bioimpedância.");
        }
    }

    private PhysicalAssessmentResponse toResponse(PhysicalAssessment a) {
        return PhysicalAssessmentResponse.of(a, BodyCompositionCalculator.calculate(a.sex(), a.ageYears(),
                a.weightKg(), a.heightCm(), a.circumferences(), a.bodyFatMethod(), a.skinfolds(),
                a.informedBodyFatPercent(), a.parqAnswers()));
    }

    private User resolveStaff(String email) {
        User user = userRepository.findByEmail(email)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Usuário não encontrado."));
        if (!user.active() || !("ADMIN".equalsIgnoreCase(user.role()) || "PERSONAL_TRAINER".equalsIgnoreCase(user.role()))) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Acesso negado às avaliações físicas.");
        }
        return user;
    }

    private Member requireAccessibleMember(User actor, UUID memberId) {
        Member member = memberRepository.findActiveById(memberId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Aluno não encontrado ou inativo."));
        if ("ADMIN".equalsIgnoreCase(actor.role())) return member;
        UUID trainerId = personalTrainerRepository.findActiveByUserId(actor.id())
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.FORBIDDEN, "Personal trainer não encontrado."))
                .id();
        if (!Objects.equals(trainerId, member.personalTrainerId())) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Você só pode avaliar os seus próprios alunos.");
        }
        return member;
    }

    private static boolean usesSkinfolds(String method) {
        return BodyCompositionCalculator.POLLOCK_3.equals(method) || BodyCompositionCalculator.POLLOCK_7.equals(method);
    }

    private static String trim(String value) {
        return value == null || value.isBlank() ? null : value.trim();
    }

    private static ResponseStatusException badRequest(String message) {
        return new ResponseStatusException(HttpStatus.BAD_REQUEST, message);
    }
}
