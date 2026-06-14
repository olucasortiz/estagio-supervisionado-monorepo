package com.lionfitness.backend.member.controller;

import java.net.URI;
import java.time.LocalDate;
import java.util.List;
import java.util.UUID;

import com.lionfitness.backend.cancellationrecord.dto.CancellationRecordResponse;
import com.lionfitness.backend.cancellationrecord.dto.CancellationRequest;
import com.lionfitness.backend.member.dto.MemberCreateRequest;
import com.lionfitness.backend.member.dto.MemberResponse;
import com.lionfitness.backend.member.dto.MemberUpdateRequest;
import com.lionfitness.backend.member.dto.OverdueMemberResponse;
import com.lionfitness.backend.member.model.Member;
import com.lionfitness.backend.member.service.MemberPhotoStorageService;
import com.lionfitness.backend.member.service.MemberService;
import com.lionfitness.backend.user.model.User;
import com.lionfitness.backend.user.repository.UserRepository;
import jakarta.validation.Valid;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;

@RestController
@RequestMapping("/members")
public class MemberController {

    private final MemberService memberService;
    private final MemberPhotoStorageService photoStorageService;
    private final UserRepository userRepository;
    private final jakarta.validation.Validator validator;

    public MemberController(
            MemberService memberService,
            MemberPhotoStorageService photoStorageService,
            UserRepository userRepository,
            jakarta.validation.Validator validator
    ) {
        this.memberService = memberService;
        this.photoStorageService = photoStorageService;
        this.userRepository = userRepository;
        this.validator = validator;
    }

    @PostMapping(consumes = MediaType.APPLICATION_JSON_VALUE)
    public ResponseEntity<MemberResponse> create(@Valid @RequestBody MemberCreateRequest request) {
        MemberResponse response = memberService.create(request);
        return ResponseEntity
                .created(URI.create("/members/" + response.id()))
                .body(response);
    }

    @PostMapping(consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ResponseEntity<MemberResponse> createWithPhoto(
            @RequestParam String name,
            @RequestParam String cpf,
            @RequestParam String email,
            @RequestParam(required = false) String password,
            @RequestParam LocalDate birthDate,
            @RequestParam(required = false) UUID personalTrainerId,
            @RequestParam(required = false) MultipartFile photo
    ) {
        MemberCreateRequest request = new MemberCreateRequest(
                name,
                cpf,
                email,
                password,
                birthDate,
                null,
                personalTrainerId
        );
        var violations = validator.validate(request);
        if (!violations.isEmpty()) {
            throw new jakarta.validation.ConstraintViolationException(violations);
        }
        MemberResponse response = memberService.createWithPhoto(request, photo);
        return ResponseEntity
                .created(URI.create("/members/" + response.id()))
                .body(response);
    }

    @GetMapping
    public List<MemberResponse> findAll() {
        return memberService.findAll();
    }

    @GetMapping("/overdue")
    public List<OverdueMemberResponse> findOverdueMembers() {
        return memberService.findOverdueMembers();
    }

    @GetMapping("/{id}")
    public MemberResponse findById(@PathVariable UUID id) {
        return memberService.findById(id);
    }

    @PutMapping(value = "/{id}", consumes = MediaType.APPLICATION_JSON_VALUE)
    public MemberResponse update(@PathVariable UUID id, @Valid @RequestBody MemberUpdateRequest request) {
        return memberService.update(id, request);
    }

    @PutMapping(value = "/{id}", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public MemberResponse updateWithPhoto(
            @PathVariable UUID id,
            @RequestParam String name,
            @RequestParam String cpf,
            @RequestParam(required = false) LocalDate birthDate,
            @RequestParam(required = false) UUID personalTrainerId,
            @RequestParam(required = false) MultipartFile photo
    ) {
        MemberUpdateRequest request = new MemberUpdateRequest(
                name,
                cpf,
                birthDate,
                null,
                personalTrainerId
        );
        var violations = validator.validate(request);
        if (!violations.isEmpty()) {
            throw new jakarta.validation.ConstraintViolationException(violations);
        }
        return memberService.updateWithPhoto(id, request, photo);
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> delete(@PathVariable UUID id) {
        memberService.delete(id);
        return ResponseEntity.noContent().build();
    }

    @PostMapping("/{id}/cancel")
    public CancellationRecordResponse cancel(@PathVariable UUID id, @Valid @RequestBody CancellationRequest request) {
        return memberService.cancel(id, request);
    }

    @GetMapping("/me")
    public ResponseEntity<Member> getMyProfile(Authentication authentication) {
        String email = authentication.getName();
        User user = userRepository.findByEmail(email)
                .orElseThrow(() -> new RuntimeException("Usuario nao encontrado"));

        Member member = memberService.findByUserId(user.id());
        return ResponseEntity.ok(member);
    }

    @GetMapping("/my-students")
    @PreAuthorize("hasRole('PERSONAL_TRAINER')")
    public ResponseEntity<List<MemberResponse>> getMyStudents(Authentication authentication) {
        UUID personalId = memberService.findPersonalIdByEmail(authentication.getName());
        return ResponseEntity.ok(memberService.findByPersonalTrainerId(personalId));
    }
}
