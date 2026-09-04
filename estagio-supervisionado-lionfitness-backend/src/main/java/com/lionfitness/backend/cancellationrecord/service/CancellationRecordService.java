package com.lionfitness.backend.cancellationrecord.service;

import com.lionfitness.backend.cancellationrecord.dto.CancellationRecordResponse;
import com.lionfitness.backend.cancellationrecord.repository.CancellationRecordRepository;
import org.springframework.stereotype.Service;

import java.util.List;

@Service
public class CancellationRecordService {

    private final CancellationRecordRepository cancellationRecordRepository;

    public CancellationRecordService(CancellationRecordRepository cancellationRecordRepository) {
        this.cancellationRecordRepository = cancellationRecordRepository;
    }

    public List<CancellationRecordResponse> findAll() {
        return cancellationRecordRepository.findAll();
    }
}
