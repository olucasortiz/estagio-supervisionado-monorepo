package com.lionfitness.backend.exercisecatalog;

import com.fasterxml.jackson.core.JsonParser;
import com.fasterxml.jackson.core.JsonToken;
import com.fasterxml.jackson.databind.DeserializationContext;
import com.fasterxml.jackson.databind.JsonDeserializer;
import com.fasterxml.jackson.databind.annotation.JsonDeserialize;
import jakarta.validation.constraints.NotNull;

import java.io.IOException;

public record ExerciseCatalogStatusRequest(
        @NotNull(message = "isActive é obrigatório.")
        @JsonDeserialize(using = StrictBooleanDeserializer.class)
        Boolean isActive
) {
    public static class StrictBooleanDeserializer extends JsonDeserializer<Boolean> {
        @Override
        public Boolean deserialize(JsonParser parser, DeserializationContext context) throws IOException {
            if (parser.currentToken() == JsonToken.VALUE_TRUE) return true;
            if (parser.currentToken() == JsonToken.VALUE_FALSE) return false;
            return context.reportInputMismatch(Boolean.class, "isActive deve ser um booleano.");
        }
    }
}
