package com.lionfitness.backend.cancellationrecord.controller;

import com.lionfitness.backend.cancellationrecord.dto.CancellationRecordResponse;
import com.lionfitness.backend.cancellationrecord.service.CancellationRecordService;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("/cancellations")
public class CancellationRecordController {

    private final CancellationRecordService cancellationRecordService;

    public CancellationRecordController(CancellationRecordService cancellationRecordService) {
        this.cancellationRecordService = cancellationRecordService;
    }

    // Apenas ADMIN pode listar cancelamentos
    @GetMapping
    @PreAuthorize("hasRole('ADMIN')")
    public List<CancellationRecordResponse> findAll() {
        return cancellationRecordService.findAll();
    }
}
