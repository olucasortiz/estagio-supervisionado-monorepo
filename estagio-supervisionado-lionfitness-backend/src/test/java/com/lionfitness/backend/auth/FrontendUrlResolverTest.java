package com.lionfitness.backend.auth;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.NullAndEmptySource;
import org.junit.jupiter.params.provider.ValueSource;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

class FrontendUrlResolverTest {

    @Test
    @DisplayName("Deve resolver URL HTTPS válida com sucesso")
    void resolvesValidHttpsUrl() {
        String resolved = FrontendUrlResolver.resolveBaseUrl("https://lionfitness-sa.duckdns.org");
        assertThat(resolved).isEqualTo("https://lionfitness-sa.duckdns.org");
    }

    @Test
    @DisplayName("Deve remover barras finais de URL válida")
    void removesTrailingSlashesFromValidUrl() {
        String resolved = FrontendUrlResolver.resolveBaseUrl("https://lionfitness-sa.duckdns.org///");
        assertThat(resolved).isEqualTo("https://lionfitness-sa.duckdns.org");
    }

    @Test
    @DisplayName("Deve resolver URL HTTP localhost com porta válida")
    void resolvesValidLocalhostHttpUrl() {
        String resolved = FrontendUrlResolver.resolveBaseUrl("http://localhost:3000");
        assertThat(resolved).isEqualTo("http://localhost:3000");
    }

    @Test
    @DisplayName("Deve selecionar a primeira URL válida quando houver múltiplas URLs separadas por vírgula")
    void resolvesFirstValidUrlFromCommaSeparatedList() {
        String resolved = FrontendUrlResolver.resolveBaseUrl("https://lionfitness-sa.duckdns.org,http://localhost:3000");
        assertThat(resolved).isEqualTo("https://lionfitness-sa.duckdns.org");
    }

    @Test
    @DisplayName("Deve ignorar candidato inválido e resolver o próximo candidato válido")
    void skipsInvalidCandidateAndResolvesNextValidUrl() {
        String resolved = FrontendUrlResolver.resolveBaseUrl("ftp://invalid-scheme.com,http://localhost:3000");
        assertThat(resolved).isEqualTo("http://localhost:3000");
    }

    @ParameterizedTest
    @NullAndEmptySource
    @ValueSource(strings = {"   ", "\t", "\n"})
    @DisplayName("Deve lançar IllegalStateException quando a configuração for ausente ou vazia")
    void throwsWhenConfigIsMissingOrBlank(String missingConfig) {
        assertThatThrownBy(() -> FrontendUrlResolver.resolveBaseUrl(missingConfig))
                .isInstanceOf(IllegalStateException.class)
                .hasMessageContaining("Configuração app.frontend.url ausente ou inválida");
    }

    @ParameterizedTest
    @ValueSource(strings = {
            "javascript:alert(1)",
            "ftp://files.example.com",
            "file:///etc/passwd",
            "data:text/html,<html></html>",
            "not-a-valid-url",
            "http:///no-host",
            "https://user:password@evil.com"
    })
    @DisplayName("Deve rejeitar esquemas e URLs inseguras ou malformadas")
    void throwsWhenUrlsAreInvalidOrInsecure(String invalidConfig) {
        assertThatThrownBy(() -> FrontendUrlResolver.resolveBaseUrl(invalidConfig))
                .isInstanceOf(IllegalStateException.class)
                .hasMessageContaining("não contém nenhuma URL válida e segura");
    }
}
