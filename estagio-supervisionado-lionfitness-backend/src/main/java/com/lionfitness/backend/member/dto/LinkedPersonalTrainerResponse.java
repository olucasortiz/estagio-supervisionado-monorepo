package com.lionfitness.backend.member.dto;

import java.util.UUID;

/** Public identity only, scoped to the authenticated member's own trainer. */
public record LinkedPersonalTrainerResponse(UUID id, String name, String photoUrl) {}
