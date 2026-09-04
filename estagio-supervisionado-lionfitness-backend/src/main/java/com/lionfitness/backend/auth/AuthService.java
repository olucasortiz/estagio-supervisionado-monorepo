package com.lionfitness.backend.auth;

import com.lionfitness.backend.auth.dto.AuthUserResponse;
import com.lionfitness.backend.auth.dto.LoginRequest;
import com.lionfitness.backend.auth.dto.LoginResponse;
import com.lionfitness.backend.auth.exception.AuthUserNotFoundException;
import com.lionfitness.backend.auth.exception.InactiveUserException;
import com.lionfitness.backend.auth.exception.InvalidCredentialsException;
import com.lionfitness.backend.user.model.User;
import com.lionfitness.backend.user.repository.UserRepository;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;

@Service
public class AuthService {

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;
    private final JwtService jwtService;

    public AuthService(
            UserRepository userRepository,
            PasswordEncoder passwordEncoder,
            JwtService jwtService
    ) {
        this.userRepository = userRepository;
        this.passwordEncoder = passwordEncoder;
        this.jwtService = jwtService;
    }

    public LoginResponse login(LoginRequest request) {
        User user = userRepository.findByEmail(request.email())
                .orElseThrow(() -> new AuthUserNotFoundException(request.email()));

        if (!user.active()) {
            throw new InactiveUserException(request.email());
        }

        if (!passwordMatches(request.password(), user.passwordHash())) {
            throw new InvalidCredentialsException();
        }

        return new LoginResponse(
                jwtService.generateToken(user),
                new AuthUserResponse(user.id(), user.name(), user.email(), user.role())
        );
    }

    private boolean passwordMatches(String rawPassword, String encodedPassword) {
        try {
            return passwordEncoder.matches(rawPassword, encodedPassword);
        } catch (IllegalArgumentException exception) {
            return false;
        }
    }
}
