package com.lionfitness.backend.loadlog.controller;

import com.lionfitness.backend.loadlog.dto.LoadLogRequest;
import com.lionfitness.backend.loadlog.dto.LoadLogResponse;
import com.lionfitness.backend.loadlog.service.LoadLogService;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/load-logs")
public class LoadLogController {

    private final LoadLogService service;

    public LoadLogController(LoadLogService service) {
        this.service = service;
    }

    @PostMapping
    @PreAuthorize("hasAnyRole('OPERATIONAL', 'USER')")
    public ResponseEntity<LoadLogResponse> register(Authentication authentication,
                                                    @Valid @RequestBody LoadLogRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED).body(service.register(authentication.getName(), request));
    }

    @GetMapping("/me")
    @PreAuthorize("hasAnyRole('OPERATIONAL', 'USER')")
    public List<LoadLogResponse> findMine(Authentication authentication) {
        return service.findMine(authentication.getName());
    }

    @GetMapping("/member/{memberId}")
    @PreAuthorize("hasAnyRole('PERSONAL_TRAINER', 'ADMIN')")
    public List<LoadLogResponse> findByMember(Authentication authentication, @PathVariable UUID memberId) {
        return service.findByMember(authentication.getName(), memberId);
    }
}
