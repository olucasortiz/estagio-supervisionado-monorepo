package com.lionfitness.backend.personaltrainer.service;

import java.util.List;
import java.util.UUID;

import com.lionfitness.backend.member.dto.MemberResponse;
import com.lionfitness.backend.member.repository.MemberRepository;
import com.lionfitness.backend.member.service.MemberService;
import com.lionfitness.backend.personaltrainer.dto.PersonalTrainerCreateRequest;
import com.lionfitness.backend.personaltrainer.dto.PersonalTrainerResponse;
import com.lionfitness.backend.personaltrainer.dto.PersonalTrainerUpdateRequest;
import com.lionfitness.backend.personaltrainer.exception.DuplicatePersonalTrainerCpfException;
import com.lionfitness.backend.personaltrainer.exception.PersonalTrainerNotFoundException;
import com.lionfitness.backend.personaltrainer.model.PersonalTrainer;
import com.lionfitness.backend.personaltrainer.repository.PersonalTrainerRepository;
import com.lionfitness.backend.user.dto.UserCreateRequest;
import com.lionfitness.backend.user.model.User;
import com.lionfitness.backend.user.service.UserService;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;
import org.springframework.web.server.ResponseStatusException;

@Service
public class PersonalTrainerService {

    private final PersonalTrainerRepository personalTrainerRepository;
    private final UserService userService;
    private final MemberService memberService;
    private final com.lionfitness.backend.user.repository.UserRepository userRepository;

    public PersonalTrainerService(
            PersonalTrainerRepository personalTrainerRepository,
            UserService userService,
            MemberService memberService,
            com.lionfitness.backend.user.repository.UserRepository userRepository
    ) {
        this.personalTrainerRepository = personalTrainerRepository;
        this.userService = userService;
        this.memberService = memberService;
        this.userRepository = userRepository;
    }

    @Transactional
    public PersonalTrainerResponse create(PersonalTrainerCreateRequest request) {
        if (request == null || request.cpf() == null || request.cpf().isBlank()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "CPF é obrigatório.");
        }

        String cleanCpf = com.lionfitness.backend.common.validation.CpfValidator.normalize(request.cpf());
        if (cleanCpf.length() != 11) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "CPF deve conter exatamente 11 dígitos.");
        }

        com.lionfitness.backend.common.validation.CpfValidator.requireValid(cleanCpf);

        if (personalTrainerRepository.existsActiveByCpf(cleanCpf)) {
            throw new DuplicatePersonalTrainerCpfException(cleanCpf);
        }

        // BUG-11: Elimina o uso dos 6 primeiros dígitos do CPF como senha inicial
        String secureInitialSecret = UUID.randomUUID().toString().replace("-", "") + UUID.randomUUID().toString().replace("-", "");

        PersonalTrainerCreateRequest normalizedRequest = new PersonalTrainerCreateRequest(
                request.userId(),
                request.name(),
                cleanCpf,
                request.email(),
                request.phone(),
                request.specialty()
        );

        User user = userService.create(new UserCreateRequest(
                normalizedRequest.name(),
                normalizedRequest.email(),
                secureInitialSecret,
                "PERSONAL_TRAINER"
        ));

        PersonalTrainer personalTrainer = personalTrainerRepository.save(
                UUID.randomUUID(),
                normalizedRequest,
                user.id()
        );

        return toResponse(personalTrainer);
    }

    @Transactional
    public PersonalTrainerResponse createWithPhoto(PersonalTrainerCreateRequest request, MultipartFile photo) {
        PersonalTrainerResponse response = create(request);
        if (photo != null && !photo.isEmpty()) {
            userService.saveUserPhoto(response.userId(), photo);
        }
        return findById(response.id());
    }

    public List<MemberResponse> findMyMembersByEmail(String email) {
        PersonalTrainer personalTrainer = personalTrainerRepository.findActiveByEmail(email)
                .orElseThrow(() ->
                        new PersonalTrainerNotFoundException("Personal trainer não encontrado para o e-mail: " + email));

        return memberService.findByPersonalTrainerId(personalTrainer.id());
    }
    public List<PersonalTrainerResponse> findAll() {
        return personalTrainerRepository.findAllActive()
                .stream()
                .map(this::toResponse)
                .toList();
    }

    public PersonalTrainerResponse findById(UUID id) {
        PersonalTrainer personalTrainer = personalTrainerRepository.findActiveById(id)
                .orElseThrow(() -> new PersonalTrainerNotFoundException(id));

        return toResponse(personalTrainer);
    }

    @Transactional
    public PersonalTrainerResponse update(UUID id, PersonalTrainerUpdateRequest request) {
        PersonalTrainer currentPersonal = personalTrainerRepository.findActiveById(id)
                .orElseThrow(() -> new PersonalTrainerNotFoundException(id));

        if (request == null || request.cpf() == null || request.cpf().isBlank()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "CPF é obrigatório.");
        }

        String cleanCpf = com.lionfitness.backend.common.validation.CpfValidator.normalize(request.cpf());
        if (cleanCpf.length() != 11) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "CPF deve conter exatamente 11 dígitos.");
        }

        com.lionfitness.backend.common.validation.CpfValidator.requireValidChange(cleanCpf, currentPersonal.cpf());

        if (personalTrainerRepository.existsActiveByCpfAndIdNot(cleanCpf, id)) {
            throw new DuplicatePersonalTrainerCpfException(cleanCpf);
        }

        // Validate email uniqueness on users table (excluding this personal trainer's user ID)
        if (userRepository.existsActiveByEmailAndIdNot(request.email(), currentPersonal.userId())) {
            throw new com.lionfitness.backend.user.exception.DuplicateEmailException(request.email());
        }

        PersonalTrainerUpdateRequest normalizedRequest = new PersonalTrainerUpdateRequest(
                request.name(),
                cleanCpf,
                request.email(),
                request.phone(),
                request.specialty()
        );

        personalTrainerRepository.update(id, normalizedRequest);
        userRepository.updateNameAndEmail(currentPersonal.userId(), normalizedRequest.name(), normalizedRequest.email());
        return findById(id);
    }

    @Transactional
    public PersonalTrainerResponse updateWithPhoto(UUID id, PersonalTrainerUpdateRequest request, MultipartFile photo) {
        PersonalTrainerResponse response = update(id, request);
        if (photo != null && !photo.isEmpty()) {
            userService.saveUserPhoto(response.userId(), photo);
        }
        return findById(id);
    }

    public void delete(UUID id) {
        if (!personalTrainerRepository.softDelete(id)) {
            throw new PersonalTrainerNotFoundException(id);
        }
    }

    private PersonalTrainerResponse toResponse(PersonalTrainer personalTrainer) {

        return new PersonalTrainerResponse(
                personalTrainer.id(),
                personalTrainer.userId(),
                personalTrainer.name(),
                personalTrainer.cpf(),
                personalTrainer.email(),
                personalTrainer.phone(),
                personalTrainer.specialty(),
                personalTrainer.active(),
                personalTrainer.createdAt(),
                personalTrainer.photoUrl()
        );
    }
}
