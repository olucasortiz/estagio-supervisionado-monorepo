package com.lionfitness.backend.member.service;

import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;

import com.lionfitness.backend.cancellationrecord.dto.CancellationRecordResponse;
import com.lionfitness.backend.cancellationrecord.dto.CancellationRequest;
import com.lionfitness.backend.cancellationrecord.exception.CancellationBlockedException;
import com.lionfitness.backend.cancellationrecord.model.CancellationRecord;
import com.lionfitness.backend.cancellationrecord.repository.CancellationRecordRepository;
import com.lionfitness.backend.member.dto.MemberCreateRequest;
import com.lionfitness.backend.member.dto.MemberResponse;
import com.lionfitness.backend.member.dto.MemberUpdateRequest;
import com.lionfitness.backend.member.dto.OverdueMemberResponse;
import com.lionfitness.backend.member.exception.DuplicateCpfException;
import com.lionfitness.backend.member.exception.MemberNotFoundException;
import com.lionfitness.backend.member.model.Member;
import com.lionfitness.backend.member.repository.MemberRepository;
import com.lionfitness.backend.payment.repository.PaymentRepository;
import com.lionfitness.backend.user.dto.UserCreateRequest;
import com.lionfitness.backend.user.exception.DuplicateEmailException;
import com.lionfitness.backend.user.repository.UserRepository;
import com.lionfitness.backend.workout.repository.WorkoutRepository;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;
import com.lionfitness.backend.user.service.UserService;
import com.lionfitness.backend.personaltrainer.repository.PersonalTrainerRepository;

@Service
public class MemberService {

    private final MemberRepository memberRepository;
    private final PaymentRepository paymentRepository;
    private final CancellationRecordRepository cancellationRecordRepository;
    private final JdbcTemplate jdbcTemplate;
    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;
    private final WorkoutRepository workoutRepository;
    private final UserService userService;
    private final PersonalTrainerRepository personalTrainerRepository;

    public MemberService(
            MemberRepository memberRepository,
            PaymentRepository paymentRepository,
            CancellationRecordRepository cancellationRecordRepository,
            JdbcTemplate jdbcTemplate,
            UserRepository userRepository,
            PasswordEncoder passwordEncoder,
            WorkoutRepository workoutRepository,
            UserService userService,
            PersonalTrainerRepository personalTrainerRepository
    ) {
        this.memberRepository = memberRepository;
        this.paymentRepository = paymentRepository;
        this.cancellationRecordRepository = cancellationRecordRepository;
        this.jdbcTemplate = jdbcTemplate;
        this.userRepository = userRepository;
        this.passwordEncoder = passwordEncoder;
        this.workoutRepository = workoutRepository;
        this.userService = userService;
        this.personalTrainerRepository = personalTrainerRepository;
    }

    // Transacional: se salvar o member falhar, o user criado será revertido
    @Transactional
    public MemberResponse create(MemberCreateRequest request) {
        com.lionfitness.backend.common.validation.CpfValidator.requireValid(request.cpf());
        validateBirthDate(request.birthDate());
        validatePersonalTrainer(request.personalTrainerId());

        if (memberRepository.existsActiveByCpf(request.cpf())) {
            throw new DuplicateCpfException(request.cpf());
        }

        // Verifica email duplicado antes de tentar inserir (evita 500 por constraint)
        if (userRepository.existsActiveByEmail(request.email())) {
            throw new DuplicateEmailException(request.email());
        }

        UUID userId = UUID.randomUUID();
        String secureInitialSecret = UUID.randomUUID().toString().replace("-", "") + UUID.randomUUID().toString().replace("-", "");
        // BUG-11: Não utiliza os 6 dígitos do CPF como senha inicial
        String rawPassword = request.password() == null || request.password().isBlank()
                ? secureInitialSecret
                : request.password();

        UserCreateRequest userRequest = new UserCreateRequest(
                request.name(),
                request.email(),
                passwordEncoder.encode(rawPassword),
                "OPERATIONAL"
        );

        userRepository.save(userId, userRequest);
        Member member = memberRepository.save(UUID.randomUUID(), request, userId);
        return toResponse(member);
    }

    @Transactional
    public MemberResponse createWithPhoto(MemberCreateRequest request, MultipartFile photo) {
        MemberResponse response = create(request);
        if (photo != null && !photo.isEmpty()) {
            userService.saveUserPhoto(response.userId(), photo);
        }
        return findById(response.id());
    }

    public List<MemberResponse> findAll(boolean includeInactive) {
        return memberRepository.findAll(includeInactive).stream().map(this::toResponse).toList();
    }

    public List<MemberResponse> findAll() {
        return findAll(false);
    }

    public MemberResponse findById(UUID id) {
        Member member = memberRepository.findActiveById(id)
                .orElseThrow(() -> new MemberNotFoundException(id));
        return toResponse(member);
    }

    public List<OverdueMemberResponse> findOverdueMembers() {
        return paymentRepository.findOverdueMembers();
    }

    @Transactional
    public MemberResponse update(UUID id, MemberUpdateRequest request) {
        validateBirthDate(request.birthDate());
        validatePersonalTrainer(request.personalTrainerId());

        Member currentMember = memberRepository.findActiveById(id)
                .orElseThrow(() -> new MemberNotFoundException(id));

        com.lionfitness.backend.common.validation.CpfValidator.requireValidChange(request.cpf(), currentMember.cpf());

        if (memberRepository.existsActiveByCpfAndIdNot(request.cpf(), id)) {
            throw new DuplicateCpfException(request.cpf());
        }

        memberRepository.update(id, request);
        userRepository.updateName(currentMember.userId(), request.name());
        return findById(id);
    }

    @Transactional
    public MemberResponse updateWithPhoto(UUID id, MemberUpdateRequest request, MultipartFile photo) {
        MemberResponse response = update(id, request);

        if (photo != null && !photo.isEmpty()) {
            userService.saveUserPhoto(response.userId(), photo);
        }
        return findById(id);
    }

    private void validateBirthDate(java.time.LocalDate birthDate) {
        if (birthDate == null) return;
        if (birthDate.isBefore(java.time.LocalDate.of(1900, 1, 1))) {
            throw new IllegalArgumentException("Data de nascimento inválida. Informe uma data a partir de 1900.");
        }
        if (birthDate.isAfter(java.time.LocalDate.now())) {
            throw new IllegalArgumentException("Data de nascimento não pode ser futura.");
        }
    }

    private void validatePersonalTrainer(UUID personalTrainerId) {
        if (personalTrainerId != null) {
            personalTrainerRepository.findActiveById(personalTrainerId)
                    .orElseThrow(() -> new IllegalArgumentException("Personal Trainer não encontrado ou inativo."));
        }
    }

    public MemberResponse updateKeepingCurrentPhoto(UUID id, MemberUpdateRequest request) {
        Member currentMember = memberRepository.findActiveById(id)
                .orElseThrow(() -> new MemberNotFoundException(id));

        String photoUrl = request.photoUrl() == null || request.photoUrl().isBlank()
                ? currentMember.photoUrl()
                : request.photoUrl();

        return update(id, new MemberUpdateRequest(
                request.name(),
                request.cpf(),
                request.birthDate(),
                photoUrl,
                request.personalTrainerId()
        ));
    }

    @Transactional
    public void delete(UUID id) {
        lockAndAssertNoDebt(id);
        if (!memberRepository.softDelete(id)) {
            throw new MemberNotFoundException(id);
        }
    }

    public List<MemberResponse> findByPersonalTrainerId(UUID personalTrainerId) {
        return memberRepository.findActiveByPersonalTrainerId(personalTrainerId)
                .stream()
                .map(this::toResponse)
                .toList();
    }

    public com.lionfitness.backend.member.dto.LinkedPersonalTrainerResponse findMyPersonalTrainer(UUID userId) {
        Member member = findByUserId(userId);
        if (member.personalTrainerId() == null) return null;
        return personalTrainerRepository.findActiveById(member.personalTrainerId())
                .map(trainer -> new com.lionfitness.backend.member.dto.LinkedPersonalTrainerResponse(
                        trainer.id(), trainer.name(), trainer.photoUrl()))
                .orElse(null);
    }

    public Member findByUserId(UUID userId) {
        return memberRepository.findByUserId(userId)
                .orElseThrow(() -> new MemberNotFoundException("Perfil de aluno não encontrado para o usuário: " + userId));
    }

    @Transactional
    public CancellationRecordResponse cancel(UUID id, CancellationRequest request) {
        MemberCancellationInfo memberInfo = lockAndAssertNoDebt(id);

        CancellationRecord cancellationRecord = cancellationRecordRepository.save(
                UUID.randomUUID(),
                id,
                LocalDateTime.now(),
                request.reason()
        );

        if (!memberRepository.softDelete(id)) {
            throw new MemberNotFoundException(id);
        }
        return toCancellationRecordResponse(cancellationRecord, memberInfo.name(), memberInfo.cpf());
    }

    public record MemberCancellationInfo(boolean active, String name, String cpf) {}

    private MemberCancellationInfo lockAndAssertNoDebt(UUID id) {
        String sqlCheck = "SELECT is_active, name, cpf FROM members WHERE id = ? FOR UPDATE";
        List<MemberCancellationInfo> activeStates = jdbcTemplate.query(sqlCheck, (rs, rowNum) -> new MemberCancellationInfo(rs.getBoolean("is_active"), rs.getString("name"), rs.getString("cpf")), id);
        if (activeStates.isEmpty()) {
            throw new MemberNotFoundException(id);
        }
        if (!activeStates.get(0).active()) {
            throw new IllegalArgumentException("Este aluno já está cancelado/inativo.");
        }

        // Bloqueia as assinaturas para serializar a checagem com novos pagamentos.
        jdbcTemplate.query("SELECT id FROM subscriptions WHERE member_id = ? FOR UPDATE",
                (rs, rowNum) -> rs.getObject("id", UUID.class), id);
        if (paymentRepository.hasPendingOrOverdueByMemberId(id)) {
            throw new CancellationBlockedException(id);
        }
        return activeStates.get(0);
    }

    private MemberResponse toResponse(Member member) {
        return new MemberResponse(
                member.id(),
                member.userId(),
                member.personalTrainerId(),
                workoutRepository.findActiveWorkoutSheetIdByMemberId(member.id()).orElse(null),
                member.name(),
                member.cpf(),
                member.email(),
                member.birthDate(),
                member.photoUrl(),
                member.active(),
                member.createdAt()
        );
    }

    private CancellationRecordResponse toCancellationRecordResponse(CancellationRecord cancellationRecord, String memberName, String memberCpf) {
        return new CancellationRecordResponse(
                cancellationRecord.id(),
                cancellationRecord.memberId(),
                memberName,
                memberCpf,
                cancellationRecord.cancellationDate(),
                cancellationRecord.reason(),
                cancellationRecord.createdAt()
        );
    }
}
