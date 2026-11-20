package com.lionfitness.backend.physicalassessment.controller;

import com.lionfitness.backend.physicalassessment.dto.PhysicalAssessmentRequest;
import com.lionfitness.backend.physicalassessment.dto.PhysicalAssessmentResponse;
import com.lionfitness.backend.physicalassessment.service.PhysicalAssessmentService;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/physical-assessments")
public class PhysicalAssessmentController {

    private final PhysicalAssessmentService service;

    public PhysicalAssessmentController(PhysicalAssessmentService service) {
        this.service = service;
    }

    @PostMapping
    @PreAuthorize("hasAnyRole('PERSONAL_TRAINER', 'ADMIN')")
    public ResponseEntity<PhysicalAssessmentResponse> create(Authentication authentication,
                                                             @Valid @RequestBody PhysicalAssessmentRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED).body(service.create(authentication.getName(), request));
    }

    @GetMapping("/member/{memberId}")
    @PreAuthorize("hasAnyRole('PERSONAL_TRAINER', 'ADMIN')")
    public List<PhysicalAssessmentResponse> findByMember(Authentication authentication, @PathVariable UUID memberId) {
        return service.findByMember(authentication.getName(), memberId);
    }

    @GetMapping("/me")
    @PreAuthorize("hasAnyRole('OPERATIONAL', 'USER')")
    public List<PhysicalAssessmentResponse> findMine(Authentication authentication) {
        return service.findMine(authentication.getName());
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("hasAnyRole('PERSONAL_TRAINER', 'ADMIN')")
    public ResponseEntity<Void> delete(Authentication authentication, @PathVariable UUID id) {
        service.delete(authentication.getName(), id);
        return ResponseEntity.noContent().build();
    }
}
