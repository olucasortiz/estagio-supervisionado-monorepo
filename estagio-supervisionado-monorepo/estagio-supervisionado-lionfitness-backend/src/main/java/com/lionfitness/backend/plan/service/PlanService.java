package com.lionfitness.backend.plan.service;

import java.util.List;
import java.util.UUID;

import com.lionfitness.backend.plan.dto.PlanCreateRequest;
import com.lionfitness.backend.plan.dto.PlanResponse;
import com.lionfitness.backend.plan.dto.PlanUpdateRequest;
import com.lionfitness.backend.plan.exception.PlanNotFoundException;
import com.lionfitness.backend.plan.model.Plan;
import com.lionfitness.backend.plan.repository.PlanRepository;
import org.springframework.stereotype.Service;

@Service
public class PlanService {

    private final PlanRepository planRepository;

    public PlanService(PlanRepository planRepository) {
        this.planRepository = planRepository;
    }

    public PlanResponse create(PlanCreateRequest request) {
        Plan plan = planRepository.save(UUID.randomUUID(), request);
        return toResponse(plan);
    }

    public List<PlanResponse> findAll() {
        return planRepository.findAllActive()
                .stream()
                .map(this::toResponse)
                .toList();
    }

    public PlanResponse findById(UUID id) {
        Plan plan = planRepository.findActiveById(id)
                .orElseThrow(() -> new PlanNotFoundException(id));

        return toResponse(plan);
    }

    public PlanResponse update(UUID id, PlanUpdateRequest request) {
        if (!planRepository.update(id, request)) {
            throw new PlanNotFoundException(id);
        }

        return findById(id);
    }

    public void delete(UUID id) {
        if (!planRepository.softDelete(id)) {
            throw new PlanNotFoundException(id);
        }
    }

    private PlanResponse toResponse(Plan plan) {
        return new PlanResponse(
                plan.id(),
                plan.name(),
                plan.type(),
                plan.price(),
                plan.durationDays(),
                plan.active(),
                plan.createdAt()
        );
    }
}
