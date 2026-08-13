package com.lionfitness.backend.report.controller;

import java.time.LocalDate;
import java.util.List;
import java.util.Map;

import com.lionfitness.backend.report.dto.CancellationReportResponse;
import com.lionfitness.backend.report.dto.NewMemberReportResponse;
import com.lionfitness.backend.report.service.ReportService;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/reports")
@PreAuthorize("hasRole('ADMIN')")
public class ReportController {

    private final ReportService reportService;

    public ReportController(ReportService reportService) {
        this.reportService = reportService;
    }

    @GetMapping("/new-members")
    public ResponseEntity<?> getNewMembersReport(
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate startDate,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate endDate
    ) {
        if (startDate.isAfter(endDate)) {
            return ResponseEntity.badRequest().body(Map.of("message", "A data inicial não pode ser maior que a data final."));
        }
        
        List<NewMemberReportResponse> report = reportService.getNewMembersReport(startDate, endDate);
        return ResponseEntity.ok(report);
    }

    @GetMapping("/cancellations")
    public ResponseEntity<?> getCancellationsReport(
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate startDate,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate endDate
    ) {
        if (startDate.isAfter(endDate)) {
            return ResponseEntity.badRequest().body(Map.of("message", "A data inicial não pode ser maior que a data final."));
        }
        
        List<CancellationReportResponse> report = reportService.getCancellationsReport(startDate, endDate);
        return ResponseEntity.ok(report);
    }
}
