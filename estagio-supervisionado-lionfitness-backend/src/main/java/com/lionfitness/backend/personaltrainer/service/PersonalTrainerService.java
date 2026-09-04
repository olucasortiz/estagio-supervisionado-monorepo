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
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

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
        if (personalTrainerRepository.existsActiveByCpf(request.cpf())) {
            throw new DuplicatePersonalTrainerCpfException(request.cpf());
        }

        String defaultPassword = request.cpf().replaceAll("\\D", "").substring(0, 6);

        User user = userService.create(new UserCreateRequest(
                request.name(),
                request.email(), // Certifique-se que o Request do Personal tem email
                defaultPassword,
                "PERSONAL_TRAINER"
        ));


        PersonalTrainer personalTrainer = personalTrainerRepository.save(
                UUID.randomUUID(),
                request,
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
                        new RuntimeException("Personal trainer not found for email: " + email));

        return memberService.findByPersonalTrainerId(personalTrainer.id());
    }
    public List<MemberResponse> findMyMembers(UUID loggedUserId) {

        PersonalTrainer personalTrainer = personalTrainerRepository
                .findActiveByUserId(loggedUserId)
                .orElseThrow(() ->
                        new RuntimeException("Personal trainer not found for logged user"));

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

        if (personalTrainerRepository.existsActiveByCpfAndIdNot(request.cpf(), id)) {
            throw new DuplicatePersonalTrainerCpfException(request.cpf());
        }

        // Validate email uniqueness on users table (excluding this personal trainer's user ID)
        if (userRepository.existsActiveByEmailAndIdNot(request.email(), currentPersonal.userId())) {
            throw new com.lionfitness.backend.user.exception.DuplicateEmailException(request.email());
        }

        personalTrainerRepository.update(id, request);
        userRepository.updateNameAndEmail(currentPersonal.userId(), request.name(), request.email());
        return findById(id);
    }

    @Transactional
    public PersonalTrainerResponse updateWithPhoto(UUID id, PersonalTrainerUpdateRequest request, MultipartFile photo) {
        PersonalTrainer currentPersonal = personalTrainerRepository.findActiveById(id)
                .orElseThrow(() -> new PersonalTrainerNotFoundException(id));
        
        if (personalTrainerRepository.existsActiveByCpfAndIdNot(request.cpf(), id)) {
            throw new DuplicatePersonalTrainerCpfException(request.cpf());
        }

        // Validate email uniqueness on users table (excluding this personal trainer's user ID)
        if (userRepository.existsActiveByEmailAndIdNot(request.email(), currentPersonal.userId())) {
            throw new com.lionfitness.backend.user.exception.DuplicateEmailException(request.email());
        }

        personalTrainerRepository.update(id, request);
        userRepository.updateNameAndEmail(currentPersonal.userId(), request.name(), request.email());
        if (photo != null && !photo.isEmpty()) {
            userService.saveUserPhoto(currentPersonal.userId(), photo);
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
