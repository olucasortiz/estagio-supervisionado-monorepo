package com.lionfitness.backend.auth;

import java.io.IOException;
import java.util.List;

import com.lionfitness.backend.user.model.User;
import com.lionfitness.backend.user.repository.UserRepository;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.web.authentication.WebAuthenticationDetailsSource;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

@Component
public class JwtAuthenticationFilter extends OncePerRequestFilter {

    private static final String BEARER_PREFIX = "Bearer ";

    private final JwtService jwtService;
    private final UserRepository userRepository;

    public JwtAuthenticationFilter(JwtService jwtService, UserRepository userRepository) {
        this.jwtService = jwtService;
        this.userRepository = userRepository;
    }

    @Override
    protected void doFilterInternal(
            HttpServletRequest request,
            HttpServletResponse response,
            FilterChain filterChain
    ) throws ServletException, IOException {
        if ("OPTIONS".equalsIgnoreCase(request.getMethod())) {
            filterChain.doFilter(request, response);
            return;
        }

        String authorizationHeader = request.getHeader("Authorization");

        if (authorizationHeader == null || !authorizationHeader.startsWith(BEARER_PREFIX)) {
            filterChain.doFilter(request, response);
            return;
        }

        try {
            String token = authorizationHeader.substring(BEARER_PREFIX.length());
            org.springframework.security.core.Authentication auth = SecurityContextHolder.getContext().getAuthentication();
            boolean isUnauthenticated = auth == null || auth instanceof org.springframework.security.authentication.AnonymousAuthenticationToken;

            if (isUnauthenticated && jwtService.isTokenValid(token)) {
                String email = jwtService.extractUsername(token);
                userRepository.findByEmail(email)
                        .filter(User::active)
                        .ifPresent((user) -> authenticate(request, user));
            }
        } catch (Exception ignored) {
            // Em caso de token malformado ou erro de parsing, apenas continua a cadeia
        }

        filterChain.doFilter(request, response);
    }

    @Override
    protected boolean shouldNotFilter(HttpServletRequest request) {
        if ("OPTIONS".equalsIgnoreCase(request.getMethod())) {
            return true;
        }
        String path = request.getServletPath();
        String uri = request.getRequestURI();
        return (path != null && (path.startsWith("/auth") || path.startsWith("/health") || path.startsWith("/db-test") || path.startsWith("/payments/webhook")))
                || (uri != null && (uri.startsWith("/auth") || uri.startsWith("/health") || uri.startsWith("/db-test") || uri.startsWith("/payments/webhook")));
    }

    private void authenticate(HttpServletRequest request, User user) {
        String role = user.role().startsWith("ROLE_") ? user.role() : "ROLE_" + user.role();
        UsernamePasswordAuthenticationToken authentication = new UsernamePasswordAuthenticationToken(
                user.email(),
                null,
                List.of(new SimpleGrantedAuthority(role))
        );
        authentication.setDetails(new WebAuthenticationDetailsSource().buildDetails(request));
        SecurityContextHolder.getContext().setAuthentication(authentication);
    }
}
