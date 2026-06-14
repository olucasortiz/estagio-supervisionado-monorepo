package com.lionfitness.backend.auth;

import java.nio.charset.StandardCharsets;
import java.time.Instant;
import java.util.Base64;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

import javax.crypto.Mac;
import javax.crypto.spec.SecretKeySpec;

import com.lionfitness.backend.user.model.User;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

@Service
public class JwtService {

    private static final Logger logger = LoggerFactory.getLogger(JwtService.class);
    private static final String HMAC_ALGORITHM = "HmacSHA256";
    private static final Base64.Encoder BASE64_URL_ENCODER = Base64.getUrlEncoder().withoutPadding();
    private static final Base64.Decoder BASE64_URL_DECODER = Base64.getUrlDecoder();
    private static final Pattern SUBJECT_PATTERN = Pattern.compile("\"sub\"\\s*:\\s*\"([^\"]+)\"");
    private static final Pattern EXPIRATION_PATTERN = Pattern.compile("\"exp\"\\s*:\\s*(\\d+)");

    private final String secret;
    private final long expirationSeconds;

    public JwtService(
            @Value("${security.jwt.secret:lionfitness-development-secret-change-me}") String secret,
            @Value("${security.jwt.expiration-seconds:86400}") long expirationSeconds
    ) {
        if (secret == null || secret.trim().isEmpty()) {
            throw new IllegalStateException("JWT secret não configurado.");
        }
        this.secret = secret;
        this.expirationSeconds = expirationSeconds;
        logger.info("JWT secret carregado com sucesso.");
    }

    public String generateToken(User user) {
        Instant now = Instant.now();
        String header = "{\"alg\":\"HS256\",\"typ\":\"JWT\"}";
        String payload = "{"
                + "\"sub\":\"" + escapeJson(user.email()) + "\","
                + "\"userId\":\"" + user.id() + "\","
                + "\"name\":\"" + escapeJson(user.name()) + "\","
                + "\"role\":\"" + escapeJson(user.role()) + "\","
                + "\"iat\":" + now.getEpochSecond() + ","
                + "\"exp\":" + now.plusSeconds(expirationSeconds).getEpochSecond()
                + "}";

        String encodedHeader = BASE64_URL_ENCODER.encodeToString(header.getBytes(StandardCharsets.UTF_8));
        String encodedPayload = BASE64_URL_ENCODER.encodeToString(payload.getBytes(StandardCharsets.UTF_8));
        String unsignedToken = encodedHeader + "." + encodedPayload;

        return unsignedToken + "." + sign(unsignedToken);
    }

    public String extractUsername(String token) {
        return extractStringClaim(token, SUBJECT_PATTERN);
    }

    public boolean isTokenValid(String token) {
        try {
            String[] parts = splitToken(token);
            String unsignedToken = parts[0] + "." + parts[1];

            if (!sign(unsignedToken).equals(parts[2])) {
                return false;
            }

            long expiresAt = Long.parseLong(extractStringClaim(token, EXPIRATION_PATTERN));

            return Instant.now().getEpochSecond() < expiresAt;
        } catch (RuntimeException exception) {
            return false;
        }
    }

    private String extractStringClaim(String token, Pattern pattern) {
        String payload = new String(BASE64_URL_DECODER.decode(splitToken(token)[1]), StandardCharsets.UTF_8);
        Matcher matcher = pattern.matcher(payload);
        if (!matcher.find()) {
            throw new IllegalArgumentException("JWT claim not found");
        }

        return matcher.group(1);
    }

    private String sign(String value) {
        if (secret == null || secret.trim().isEmpty()) {
            throw new IllegalStateException("JWT secret não configurado.");
        }
        try {
            Mac mac = Mac.getInstance(HMAC_ALGORITHM);
            SecretKeySpec key = new SecretKeySpec(secret.getBytes(StandardCharsets.UTF_8), HMAC_ALGORITHM);
            mac.init(key);
            return BASE64_URL_ENCODER.encodeToString(mac.doFinal(value.getBytes(StandardCharsets.UTF_8)));
        } catch (Exception exception) {
            throw new IllegalStateException("Unable to sign JWT", exception);
        }
    }

    private String[] splitToken(String token) {
        String[] parts = token.split("\\.");
        if (parts.length != 3) {
            throw new IllegalArgumentException("Invalid JWT format");
        }

        return parts;
    }

    private String escapeJson(String value) {
        return value
                .replace("\\", "\\\\")
                .replace("\"", "\\\"");
    }
}
