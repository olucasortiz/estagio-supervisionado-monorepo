package com.lionfitness.backend.member.service;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.Map;
import java.util.UUID;

@Service
public class MemberPhotoStorageService {

    private static final long MAX_FILE_SIZE_BYTES = 5 * 1024 * 1024;
    private static final Map<String, String> ALLOWED_EXTENSIONS_BY_CONTENT_TYPE = Map.of(
            "image/jpeg", ".jpg",
            "image/png", ".png",
            "image/webp", ".webp"
    );

    private final Path uploadDirectory;

    public MemberPhotoStorageService(@Value("${app.upload.members-dir:uploads/members}") String uploadDirectory) {
        this.uploadDirectory = Path.of(uploadDirectory).normalize();
        try {
            Files.createDirectories(this.uploadDirectory);
        } catch (IOException exception) {
            throw new IllegalStateException("Nao foi possivel criar a pasta de upload de membros.", exception);
        }
    }

    public String storeMemberPhoto(MultipartFile file) {
        if (file == null || file.isEmpty()) {
            return null;
        }

        if (file.getSize() > MAX_FILE_SIZE_BYTES) {
            throw new IllegalArgumentException("A foto deve ter no maximo 5MB.");
        }

        String contentType = file.getContentType();
        String extension = ALLOWED_EXTENSIONS_BY_CONTENT_TYPE.get(contentType);

        if (extension == null) {
            throw new IllegalArgumentException("Formato de foto invalido. Envie JPG, PNG ou WEBP.");
        }

        String filename = UUID.randomUUID() + extension;
        Path destination = uploadDirectory.resolve(filename).normalize();

        if (!destination.startsWith(uploadDirectory)) {
            throw new IllegalArgumentException("Nome de arquivo invalido.");
        }

        try {
            file.transferTo(destination);
        } catch (IOException exception) {
            throw new IllegalStateException("Nao foi possivel salvar a foto do membro.", exception);
        }

        return "/uploads/members/" + filename;
    }
}
