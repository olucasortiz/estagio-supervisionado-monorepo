package com.lionfitness.backend.auth;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.HttpMethod;
import org.springframework.security.config.annotation.method.configuration.EnableMethodSecurity;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configurers.AbstractHttpConfigurer;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.security.core.userdetails.UsernameNotFoundException;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.authentication.UsernamePasswordAuthenticationFilter;
import org.springframework.web.cors.CorsConfiguration;
import org.springframework.web.cors.CorsConfigurationSource;
import org.springframework.web.cors.UrlBasedCorsConfigurationSource;
import org.springframework.beans.factory.annotation.Value;

import java.util.ArrayList;
import java.util.Arrays;
import java.util.List;

@Configuration
@EnableMethodSecurity // Habilita @PreAuthorize nos controllers
public class SecurityConfig {

    private final JwtAuthenticationFilter jwtAuthenticationFilter;

    @Value("${app.frontend.url:http://localhost:3000}")
    private String frontendUrl;

    public SecurityConfig(JwtAuthenticationFilter jwtAuthenticationFilter) {
        this.jwtAuthenticationFilter = jwtAuthenticationFilter;
    }

    @Bean
    public SecurityFilterChain securityFilterChain(HttpSecurity http) throws Exception {
        return http
                .csrf(AbstractHttpConfigurer::disable)
                .cors(cors -> cors.configurationSource(corsConfigurationSource()))
                .formLogin(AbstractHttpConfigurer::disable)
                .httpBasic(AbstractHttpConfigurer::disable)
                .logout(AbstractHttpConfigurer::disable)
                .sessionManagement((session) -> session.sessionCreationPolicy(SessionCreationPolicy.STATELESS))
                .authorizeHttpRequests((requests) -> requests
                        // 1. Rotas Públicas
                        .requestMatchers(HttpMethod.OPTIONS, "/**").permitAll()
                        .requestMatchers("/auth/login", "/auth/forgot-password", "/auth/reset-password", "/health",
                                "/db-test")
                        .permitAll()
                        .requestMatchers(HttpMethod.GET, "/uploads/**").permitAll()
                        .requestMatchers(HttpMethod.GET, "/users/*/photo").permitAll()

                        // 2. Rotas de ALUNO e PERSONAL (Prioridade Alta)
                        .requestMatchers("/workouts/me").hasAnyRole("OPERATIONAL", "ADMIN")
                        .requestMatchers("/members/me").hasAnyRole("OPERATIONAL", "ADMIN")
                        .requestMatchers("/subscriptions/me").hasAnyRole("OPERATIONAL", "ADMIN")
                        .requestMatchers("/members/my-students").hasAnyRole("OPERATIONAL", "ADMIN")
                        .requestMatchers("/payments/pix/**", "/payments/pix").hasAnyRole("OPERATIONAL", "ALUNO", "ADMIN")
                        .requestMatchers("/exercise-catalog/**").hasAnyRole("PERSONAL_TRAINER", "ADMIN")
                        .requestMatchers("/workout-exercises/**").hasAnyRole("PERSONAL_TRAINER", "ADMIN")
                        .requestMatchers("/workout-sheets/**").hasAnyRole("PERSONAL_TRAINER", "ADMIN")


                        // 3. Permissão para visualizar listas básicas
                        .requestMatchers(HttpMethod.GET, "/members", "/members/").hasAnyRole("OPERATIONAL", "ADMIN")
                        .requestMatchers(HttpMethod.GET, "/plans", "/plans/").hasAnyRole("OPERATIONAL", "ADMIN")
                        .requestMatchers(HttpMethod.GET, "/personal-trainers/me/members")
                        .hasRole("PERSONAL_TRAINER")
                        // 4. Regras Administrativas Restritas (qualquer outra sub-rota)
                        .requestMatchers(
                                "/members/**",
                                "/payments/**",
                                "/subscriptions/**",
                                "/plans/**",
                                "/users/**",
                                "/personal-trainers/**",
                                "/cancellations/**",
                                "/workouts/**",
                                "/reports/**")
                        .hasRole("ADMIN")

                        .anyRequest().authenticated())
                .addFilterBefore(jwtAuthenticationFilter, UsernamePasswordAuthenticationFilter.class)
                .build();
    }

    @Bean
    public CorsConfigurationSource corsConfigurationSource() {
        CorsConfiguration configuration = new CorsConfiguration();

        List<String> allowedOrigins = new ArrayList<>(List.of(
                "http://localhost:3000",
                "http://127.0.0.1:3000",
                "https://estagio-supervisionado-monorepo.onrender.com",
                "https://estagio-supervisionado-frontend.onrender.com",
                "https://estagio-supervisionado-frontend.vercel.app",
                "https://estagio-supervisionado-monorepo.vercel.app"));

        if (frontendUrl != null && !frontendUrl.isBlank() && !allowedOrigins.contains(frontendUrl)) {
            allowedOrigins.add(frontendUrl);
        }

        configuration.setAllowedOrigins(allowedOrigins);
        configuration.setAllowedMethods(List.of("GET", "POST", "PUT", "DELETE", "OPTIONS", "PATCH"));
        configuration.setAllowedHeaders(List.of("Authorization", "Content-Type", "Cache-Control", "Accept", "Origin"));
        configuration.setExposedHeaders(List.of("Authorization"));
        configuration.setAllowCredentials(true);
        configuration.setMaxAge(3600L);

        UrlBasedCorsConfigurationSource source = new UrlBasedCorsConfigurationSource();
        source.registerCorsConfiguration("/**", configuration);
        return source;
    }

    @Bean
    public PasswordEncoder passwordEncoder() {
        return new BCryptPasswordEncoder();
    }

    @Bean
    public UserDetailsService userDetailsService() {
        return (username) -> {
            throw new UsernameNotFoundException(username);
        };
    }
}
