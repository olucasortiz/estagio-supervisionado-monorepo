package com.lionfitness.backend.user.controller;

import java.net.URI;
import java.util.List;
import java.util.UUID;

import com.lionfitness.backend.user.dto.UserCreateRequest;
import com.lionfitness.backend.user.dto.UserResponse;
import com.lionfitness.backend.user.dto.UserUpdateRequest;
import com.lionfitness.backend.user.model.User;
import com.lionfitness.backend.user.service.UserService;
import com.lionfitness.backend.user.model.UserPhoto;
import jakarta.validation.Valid;
import jakarta.validation.Validator;
import org.springframework.http.ResponseEntity;
import org.springframework.http.MediaType;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.multipart.MultipartFile;

@RestController
@RequestMapping("/users")
public class UserController {

    private final UserService userService;
    private final Validator validator;

    public UserController(UserService userService, Validator validator) {
        this.userService = userService;
        this.validator = validator;
    }

    @PostMapping(consumes = MediaType.APPLICATION_JSON_VALUE)
    public ResponseEntity<UserResponse> create(@Valid @RequestBody UserCreateRequest request) {
        User user = userService.create(request);

        UserResponse response = userService.toResponse(user);

        return ResponseEntity
                .created(URI.create("/users/" + response.id()))
                .body(response);
    }

    @PostMapping(consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ResponseEntity<UserResponse> createWithPhoto(
            @RequestParam String name,
            @RequestParam String email,
            @RequestParam String password,
            @RequestParam String role,
            @RequestParam(required = false) MultipartFile photo
    ) {
        UserCreateRequest request = new UserCreateRequest(name, email, password, role);
        var violations = validator.validate(request);
        if (!violations.isEmpty()) {
            throw new jakarta.validation.ConstraintViolationException(violations);
        }

        User user = userService.create(request);
        if (photo != null && !photo.isEmpty()) {
            userService.saveUserPhoto(user.id(), photo);
        }
        UserResponse response = userService.findById(user.id());
        return ResponseEntity
                .created(URI.create("/users/" + response.id()))
                .body(response);
    }

    @GetMapping
    public List<UserResponse> findAll() {
        return userService.findAll();
    }

    @GetMapping("/{id}")
    public UserResponse findById(@PathVariable UUID id) {
        return userService.findById(id);
    }

    @GetMapping("/{id}/photo")
    public ResponseEntity<byte[]> getPhoto(@PathVariable UUID id) {
        return userService.findPhotoByUserId(id)
                .map(photo -> ResponseEntity.ok()
                        .contentType(MediaType.parseMediaType(photo.contentType()))
                        .body(photo.data()))
                .orElse(ResponseEntity.notFound().build());
    }

    @PutMapping(value = "/{id}", consumes = MediaType.APPLICATION_JSON_VALUE)
    public UserResponse update(@PathVariable UUID id, @Valid @RequestBody UserUpdateRequest request) {
        return userService.update(id, request);
    }

    @PutMapping(value = "/{id}", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public UserResponse updateWithPhoto(
            @PathVariable UUID id,
            @RequestParam String name,
            @RequestParam String email,
            @RequestParam String password,
            @RequestParam String role,
            @RequestParam(required = false) MultipartFile photo
    ) {
        UserUpdateRequest request = new UserUpdateRequest(name, email, password, role);
        var violations = validator.validate(request);
        if (!violations.isEmpty()) {
            throw new jakarta.validation.ConstraintViolationException(violations);
        }

        userService.update(id, request);
        if (photo != null && !photo.isEmpty()) {
            userService.saveUserPhoto(id, photo);
        }
        return userService.findById(id);
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> delete(@PathVariable UUID id) {
        userService.delete(id);
        return ResponseEntity.noContent().build();
    }
}
