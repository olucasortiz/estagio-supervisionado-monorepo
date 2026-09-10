package com.lionfitness.backend.payment.mercadopago;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

import javax.crypto.Mac;
import javax.crypto.spec.SecretKeySpec;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.time.Clock;
import java.time.Duration;
import java.time.Instant;
import java.util.HexFormat;
import java.util.Locale;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

@Component
public class MercadoPagoWebhookSignatureValidator {

    private static final Duration MAX_TIMESTAMP_SKEW = Duration.ofMinutes(30);
    private static final Duration RESERVATION_RETENTION = MAX_TIMESTAMP_SKEW;
    private final byte[] secret;
    private final Clock clock;
    private final Map<String, RequestReservation> requestReservations = new ConcurrentHashMap<>();

    @Autowired
    public MercadoPagoWebhookSignatureValidator(
            @Value("${mercado.pago.webhook-secret}") String secret
    ) {
        this(secret, Clock.systemUTC());
    }

    MercadoPagoWebhookSignatureValidator(String secret, Clock clock) {
        if (secret == null || secret.isBlank()) {
            throw new IllegalArgumentException("MP_WEBHOOK_SECRET é obrigatório.");
        }
        this.secret = secret.getBytes(StandardCharsets.UTF_8);
        this.clock = clock;
    }

    public ReservationResult validateAndReserve(String xSignature, String xRequestId, String dataId) {
        if (isBlank(xSignature) || isBlank(xRequestId) || isBlank(dataId)) {
            return ReservationResult.INVALID;
        }
        String normalizedRequestId = xRequestId.trim();
        String normalizedDataId = normalizeDataId(dataId);
        String timestamp = null;
        String suppliedHash = null;
        for (String part : xSignature.split(",")) {
            String[] pair = part.split("=", 2);
            if (pair.length != 2) continue;
            String key = pair[0].trim().toLowerCase(Locale.ROOT);
            String value = pair[1].trim();
            if ("ts".equals(key)) timestamp = value;
            if ("v1".equals(key)) suppliedHash = value;
        }
        if (isBlank(timestamp) || !timestamp.chars().allMatch(Character::isDigit)
                || !timestampIsFresh(timestamp) || isBlank(suppliedHash)) {
            return ReservationResult.INVALID;
        }

        String manifest = "id:" + normalizedDataId
                + ";request-id:" + normalizedRequestId + ";ts:" + timestamp + ";";
        try {
            Mac mac = Mac.getInstance("HmacSHA256");
            mac.init(new SecretKeySpec(secret, "HmacSHA256"));
            byte[] expectedHash = mac.doFinal(manifest.getBytes(StandardCharsets.UTF_8));
            byte[] receivedHash = HexFormat.of().parseHex(suppliedHash);
            boolean signatureMatches = MessageDigest.isEqual(
                    expectedHash,
                    receivedHash);
            if (!signatureMatches) {
                return ReservationResult.INVALID;
            }
            cleanupReservations();
            RequestReservation reservation = new RequestReservation(RequestState.PROCESSING, clock.instant());
            RequestReservation existing = requestReservations.putIfAbsent(normalizedRequestId, reservation);
            if (existing == null) {
                return ReservationResult.RESERVED;
            }
            return existing.state() == RequestState.COMPLETED
                    ? ReservationResult.COMPLETED
                    : ReservationResult.PROCESSING;
        } catch (Exception exception) {
            return ReservationResult.INVALID;
        }
    }

    public void markCompleted(String requestId) {
        if (!isBlank(requestId)) {
            requestReservations.computeIfPresent(requestId.trim(),
                    (key, current) -> new RequestReservation(RequestState.COMPLETED, clock.instant()));
        }
    }

    public void release(String requestId) {
        if (isBlank(requestId)) return;
        requestReservations.computeIfPresent(requestId.trim(), (key, current) ->
                current.state() == RequestState.PROCESSING ? null : current);
    }

    private void cleanupReservations() {
        Instant now = clock.instant();
        requestReservations.entrySet().removeIf(entry ->
                Duration.between(entry.getValue().reservedAt(), now).abs().compareTo(RESERVATION_RETENTION) > 0);
    }

    private String normalizeDataId(String dataId) {
        String normalized = dataId.trim();
        return normalized.chars().allMatch(Character::isLetterOrDigit)
                ? normalized.toLowerCase(Locale.ROOT)
                : normalized;
    }

    private boolean timestampIsFresh(String rawTimestamp) {
        try {
            long value = Long.parseLong(rawTimestamp);
            Instant signedAt = value >= 1_000_000_000_000L
                    ? Instant.ofEpochMilli(value)
                    : Instant.ofEpochSecond(value);
            return Duration.between(signedAt, clock.instant()).abs().compareTo(MAX_TIMESTAMP_SKEW) <= 0;
        } catch (RuntimeException exception) {
            return false;
        }
    }

    private boolean isBlank(String value) {
        return value == null || value.isBlank();
    }

    public enum ReservationResult {
        RESERVED,
        PROCESSING,
        COMPLETED,
        INVALID
    }

    private enum RequestState {
        PROCESSING,
        COMPLETED
    }

    private record RequestReservation(RequestState state, Instant reservedAt) {}
}
