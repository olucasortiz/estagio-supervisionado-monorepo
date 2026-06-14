package com.lionfitness.backend.personaltrainer.controller;

import java.net.URI;
import java.util.List;
import java.util.UUID;

import com.lionfitness.backend.member.dto.MemberResponse;
import com.lionfitness.backend.personaltrainer.dto.PersonalTrainerCreateRequest;
import com.lionfitness.backend.personaltrainer.dto.PersonalTrainerResponse;
import com.lionfitness.backend.personaltrainer.dto.PersonalTrainerUpdateRequest;
import com.lionfitness.backend.personaltrainer.service.PersonalTrainerService;
import jakarta.validation.Valid;
import jakarta.validation.Validator;
import org.springframework.http.ResponseEntity;
import org.springframework.http.MediaType;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.multipart.MultipartFile;

@RestController
@RequestMapping("/personal-trainers")
public class PersonalTrainerController {

    private final PersonalTrainerService personalTrainerService;
    private final Validator validator;

    public PersonalTrainerController(PersonalTrainerService personalTrainerService, Validator validator) {
        this.personalTrainerService = personalTrainerService;
        this.validator = validator;
    }

    @PostMapping(consumes = MediaType.APPLICATION_JSON_VALUE)
    public ResponseEntity<PersonalTrainerResponse> create(@Valid @RequestBody PersonalTrainerCreateRequest request) {
        PersonalTrainerResponse response = personalTrainerService.create(request);

        return ResponseEntity
                .created(URI.create("/personal-trainers/" + response.id()))
                .body(response);
    }

    @PostMapping(consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ResponseEntity<PersonalTrainerResponse> createWithPhoto(
            @RequestParam String name,
            @RequestParam String cpf,
            @RequestParam String email,
            @RequestParam String phone,
            @RequestParam String specialty,
            @RequestParam(required = false) MultipartFile photo
    ) {
        PersonalTrainerCreateRequest request = new PersonalTrainerCreateRequest(null, name, cpf, email, phone, specialty);
        var violations = validator.validate(request);
        if (!violations.isEmpty()) {
            throw new jakarta.validation.ConstraintViolationException(violations);
        }

        PersonalTrainerResponse response = personalTrainerService.createWithPhoto(request, photo);
        return ResponseEntity
                .created(URI.create("/personal-trainers/" + response.id()))
                .body(response);
    }

    @GetMapping
    public List<PersonalTrainerResponse> findAll() {
        return personalTrainerService.findAll();
    }

    @GetMapping("/me/members")
    @PreAuthorize("hasAnyRole('PERSONAL_TRAINER', 'ADMIN')")
    public ResponseEntity<List<MemberResponse>> findMyMembers(Authentication authentication) {
        String email = authentication.getName();

        return ResponseEntity.ok(personalTrainerService.findMyMembersByEmail(email));
    }

    @GetMapping("/{id}")
    public PersonalTrainerResponse findById(@PathVariable UUID id) {
        return personalTrainerService.findById(id);
    }

    @PutMapping(value = "/{id}", consumes = MediaType.APPLICATION_JSON_VALUE)
    public PersonalTrainerResponse update(
            @PathVariable UUID id,
            @Valid @RequestBody PersonalTrainerUpdateRequest request
    ) {
        return personalTrainerService.update(id, request);
    }

    @PutMapping(value = "/{id}", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public PersonalTrainerResponse updateWithPhoto(
            @PathVariable UUID id,
            @RequestParam String name,
            @RequestParam String cpf,
            @RequestParam String email,
            @RequestParam String phone,
            @RequestParam String specialty,
            @RequestParam(required = false) MultipartFile photo
    ) {
        PersonalTrainerUpdateRequest request = new PersonalTrainerUpdateRequest(name, cpf, email, phone, specialty);
        var violations = validator.validate(request);
        if (!violations.isEmpty()) {
            throw new jakarta.validation.ConstraintViolationException(violations);
        }

        return personalTrainerService.updateWithPhoto(id, request, photo);
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> delete(@PathVariable UUID id) {
        personalTrainerService.delete(id);
        return ResponseEntity.noContent().build();
    }
}