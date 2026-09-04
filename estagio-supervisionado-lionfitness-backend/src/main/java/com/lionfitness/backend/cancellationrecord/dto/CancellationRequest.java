package com.lionfitness.backend.cancellationrecord.dto;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

@JsonIgnoreProperties(ignoreUnknown = true)
public record CancellationRequest(
        @NotBlank(message = "Reason is required")
        @Size(max = 500, message = "Reason must have at most 500 characters")
        String reason
) {
}
