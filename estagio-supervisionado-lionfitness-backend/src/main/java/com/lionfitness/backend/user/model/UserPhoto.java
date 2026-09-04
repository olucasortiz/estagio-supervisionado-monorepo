package com.lionfitness.backend.user.model;

public record UserPhoto(
        byte[] data,
        String contentType,
        String fileName
) {
}
