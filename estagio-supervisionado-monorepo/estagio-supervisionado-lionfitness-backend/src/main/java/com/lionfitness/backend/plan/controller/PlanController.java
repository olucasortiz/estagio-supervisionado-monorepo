package com.lionfitness.backend.plan.controller;

import java.net.URI;
import java.util.List;
import java.util.UUID;

import com.lionfitness.backend.plan.dto.PlanCreateRequest;
import com.lionfitness.backend.plan.dto.PlanResponse;
import com.lionfitness.backend.plan.dto.PlanUpdateRequest;
import com.lionfitness.backend.plan.service.PlanService;
import jakarta.validation.Valid;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/plans")
public class PlanController {

    private final PlanService planService;

    public PlanController(PlanService planService) {
        this.planService = planService;
    }

    @PostMapping
    public ResponseEntity<PlanResponse> create(@Valid @RequestBody PlanCreateRequest request) {
        PlanResponse response = planService.create(request);
        return ResponseEntity
                .created(URI.create("/plans/" + response.id()))
                .body(response);
    }

    @GetMapping
    public List<PlanResponse> findAll() {
        return planService.findAll();
    }

    @GetMapping("/{id}")
    public PlanResponse findById(@PathVariable UUID id) {
        return planService.findById(id);
    }

    @PutMapping("/{id}")
    public PlanResponse update(@PathVariable UUID id, @Valid @RequestBody PlanUpdateRequest request) {
        return planService.update(id, request);
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> delete(@PathVariable UUID id) {
        planService.delete(id);
        return ResponseEntity.noContent().build();
    }
}
