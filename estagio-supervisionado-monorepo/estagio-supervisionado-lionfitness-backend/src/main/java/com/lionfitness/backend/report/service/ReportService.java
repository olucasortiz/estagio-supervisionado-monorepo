package com.lionfitness.backend.report.service;

import java.time.LocalDate;
import java.util.List;

import com.lionfitness.backend.report.dto.CancellationReportResponse;
import com.lionfitness.backend.report.dto.NewMemberReportResponse;
import com.lionfitness.backend.report.repository.ReportRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;

@Service
public class ReportService {

    private static final Logger logger = LoggerFactory.getLogger(ReportService.class);

    private final ReportRepository reportRepository;

    public ReportService(ReportRepository reportRepository) {
        this.reportRepository = reportRepository;
    }

    public List<NewMemberReportResponse> getNewMembersReport(LocalDate startDate, LocalDate endDate) {
        logger.info("Report solicitado: Novos Alunos | Periodo: de {} ate {}", startDate, endDate);
        
        List<NewMemberReportResponse> result = reportRepository.getNewMembers(startDate, endDate);
        
        logger.info("Report gerado: Novos Alunos | Quantidade encontrada: {}", result.size());
        return result;
    }

    public List<CancellationReportResponse> getCancellationsReport(LocalDate startDate, LocalDate endDate) {
        logger.info("Report solicitado: Cancelamentos | Periodo: de {} ate {}", startDate, endDate);
        
        List<CancellationReportResponse> result = reportRepository.getCancellations(startDate, endDate);
        
        logger.info("Report gerado: Cancelamentos | Quantidade encontrada: {}", result.size());
        return result;
    }
}
