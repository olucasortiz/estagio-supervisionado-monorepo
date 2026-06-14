package com.lionfitness.backend.user.service;

import java.util.List;
import java.util.Locale;
import java.util.UUID;
import org.springframework.web.multipart.MultipartFile;
import java.io.IOException;
import com.lionfitness.backend.user.model.UserPhoto;
import java.util.Optional;

import com.lionfitness.backend.user.dto.UserCreateRequest;
import com.lionfitness.backend.user.dto.UserResponse;
import com.lionfitness.backend.user.dto.UserUpdateRequest;
import com.lionfitness.backend.user.exception.DuplicateEmailException;
import com.lionfitness.backend.user.exception.UserNotFoundException;
import com.lionfitness.backend.user.model.User;
import com.lionfitness.backend.user.repository.UserRepository;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;

@Service
public class UserService {

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;

    public UserService(UserRepository userRepository, PasswordEncoder passwordEncoder) {
        this.userRepository = userRepository;
        this.passwordEncoder = passwordEncoder;
    }


    // Altere o tipo de retorno de UserResponse para User
    public User create(UserCreateRequest request) {
        if (userRepository.existsActiveByEmail(request.email())) {
            throw new DuplicateEmailException(request.email());
        }

        UserCreateRequest encodedRequest = new UserCreateRequest(
                request.name(),
                request.email(),
                encodePasswordIfNeeded(request.passwordHash()),
                normalizeRole(request.role())
        );

        // Agora retornamos o objeto 'user' diretamente em vez de converter para DTO aqui
        return userRepository.save(UUID.randomUUID(), encodedRequest);
    }

    public List<UserResponse> findAll() {
        return userRepository.findAllActive()
                .stream()
                .map(this::toResponse)
                .toList();
    }

    public UserResponse findById(UUID id) {
        User user = userRepository.findActiveById(id)
                .orElseThrow(() -> new UserNotFoundException(id));

        return toResponse(user);
    }

    public void updatePassword(UUID userId, String encodedPassword) {
        userRepository.updatePassword(userId, encodedPassword);
    }
    public UserResponse update(UUID id, UserUpdateRequest request) {
        if (!userRepository.findActiveById(id).isPresent()) {
            throw new UserNotFoundException(id);
        }

        if (userRepository.existsActiveByEmailAndIdNot(request.email(), id)) {
            throw new DuplicateEmailException(request.email());
        }

        UserUpdateRequest encodedRequest = new UserUpdateRequest(
                request.name(),
                request.email(),
                encodePasswordIfNeeded(request.passwordHash()),
                normalizeRole(request.role())
        );

        userRepository.update(id, encodedRequest);
        return findById(id);
    }

    public void delete(UUID id) {
        if (!userRepository.softDelete(id)) {
            throw new UserNotFoundException(id);
        }
    }

    public UserResponse toResponse(User user) {
        String photoUrl = user.hasPhoto() ? "/users/" + user.id() + "/photo" : null;
        return new UserResponse(
                user.id(),
                user.name(),
                user.email(),
                user.role(),
                user.active(),
                user.createdAt(),
                photoUrl
        );
    }

    public void saveUserPhoto(UUID userId, MultipartFile photo) {
        if (photo == null || photo.isEmpty()) {
            return;
        }

        // Validate size (max 5MB)
        if (photo.getSize() > 5 * 1024 * 1024) {
            throw new IllegalArgumentException("A foto de perfil não pode exceder 5MB");
        }

        // Validate content type (PNG, JPEG, WEBP)
        String contentType = photo.getContentType();
        if (contentType == null || (!contentType.equals("image/png") && !contentType.equals("image/jpeg") && !contentType.equals("image/jpg") && !contentType.equals("image/webp"))) {
            throw new IllegalArgumentException("Apenas imagens PNG, JPEG e WEBP são permitidas");
        }

        try {
            byte[] photoData = photo.getBytes();
            userRepository.updatePhoto(userId, photoData, contentType, photo.getOriginalFilename());
        } catch (IOException e) {
            throw new IllegalArgumentException("Falha ao ler os dados da foto de perfil", e);
        }
    }

    public Optional<UserPhoto> findPhotoByUserId(UUID userId) {
        return userRepository.findPhotoByUserId(userId);
    }

    private String encodePasswordIfNeeded(String password) {
        if (password.startsWith("$2a$") || password.startsWith("$2b$") || password.startsWith("$2y$")) {
            return password;
        }

        return passwordEncoder.encode(password);
    }

    private String normalizeRole(String role) {
        if (role == null || role.isBlank()) {
            throw new IllegalArgumentException("Role is required");
        }

        String normalizedRole = role.trim().toUpperCase(Locale.ROOT);
        if ("USER".equals(normalizedRole) || "ALUNO".equals(normalizedRole)) {
            return "OPERATIONAL";
        }

        return normalizedRole;
    }
}
