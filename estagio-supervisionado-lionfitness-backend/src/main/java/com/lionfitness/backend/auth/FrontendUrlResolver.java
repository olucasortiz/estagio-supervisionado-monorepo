package com.lionfitness.backend.auth;

import java.net.URI;
import java.net.URISyntaxException;
import java.util.List;

public final class FrontendUrlResolver {

    private static final List<String> ALLOWED_SCHEMES = List.of("http", "https");

    private FrontendUrlResolver() {
    }

    public static String resolveBaseUrl(String rawConfiguredUrl) {
        if (rawConfiguredUrl == null || rawConfiguredUrl.isBlank()) {
            throw new IllegalStateException("Configuração app.frontend.url ausente ou inválida.");
        }

        String[] candidates = rawConfiguredUrl.split(",");
        for (String candidate : candidates) {
            String trimmed = candidate.trim();
            if (trimmed.isEmpty()) {
                continue;
            }

            try {
                URI uri = new URI(trimmed);
                String scheme = uri.getScheme();
                if (scheme == null || !ALLOWED_SCHEMES.contains(scheme.toLowerCase())) {
                    continue;
                }

                String host = uri.getHost();
                if (host == null || host.isBlank()) {
                    continue;
                }

                if (uri.getUserInfo() != null) {
                    continue;
                }

                return trimmed.replaceAll("/+$", "");
            } catch (URISyntaxException ignored) {
                // Tenta próximo candidato
            }
        }

        throw new IllegalStateException("Configuração app.frontend.url não contém nenhuma URL válida e segura.");
    }
}
