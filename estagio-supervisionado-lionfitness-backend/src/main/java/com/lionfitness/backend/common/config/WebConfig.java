package com.lionfitness.backend.common.config;

import org.springframework.context.annotation.Configuration;
import org.springframework.web.servlet.config.annotation.ResourceHandlerRegistry;
import org.springframework.web.servlet.config.annotation.WebMvcConfigurer;

import java.nio.file.Path;

@Configuration
public class WebConfig implements WebMvcConfigurer {

    @Override
    public void addResourceHandlers(ResourceHandlerRegistry registry) {
        String uploadsPath = Path.of("uploads").toAbsolutePath().normalize().toUri().toString();
        if (!uploadsPath.endsWith("/")) {
            uploadsPath = uploadsPath + "/";
        }

        registry.addResourceHandler("/uploads/**")
                .addResourceLocations(uploadsPath);
    }
}
