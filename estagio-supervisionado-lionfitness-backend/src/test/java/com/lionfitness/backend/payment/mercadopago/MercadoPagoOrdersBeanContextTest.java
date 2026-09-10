package com.lionfitness.backend.payment.mercadopago;

import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.Test;
import org.springframework.context.annotation.AnnotationConfigApplicationContext;
import org.springframework.core.env.MapPropertySource;
import org.springframework.web.client.RestClient;

import java.util.Map;
import java.util.function.Supplier;

import static org.assertj.core.api.Assertions.assertThat;

class MercadoPagoOrdersBeanContextTest {

    @Test
    void createsOrdersClientAndSignatureValidatorWithConstructorInjection() {
        try (AnnotationConfigApplicationContext context = new AnnotationConfigApplicationContext()) {
            context.getEnvironment().getPropertySources().addFirst(new MapPropertySource(
                    "mercado-pago-test",
                    Map.of(
                            "mercado.pago.access-token", "test-access-token",
                            "mercado.pago.webhook-secret", "test-webhook-secret"
                    )
            ));
            context.registerBean(
                    RestClient.Builder.class,
                    (Supplier<RestClient.Builder>) RestClient::builder
            );
            context.registerBean(
                    ObjectMapper.class,
                    (Supplier<ObjectMapper>) ObjectMapper::new
            );
            context.register(MercadoPagoOrderClient.class, MercadoPagoWebhookSignatureValidator.class);

            context.refresh();

            assertThat(context.getBean(MercadoPagoOrderClient.class)).isNotNull();
            assertThat(context.getBean(MercadoPagoWebhookSignatureValidator.class)).isNotNull();
            assertThat(context.getBean(RestClient.Builder.class)).isNotNull();
            assertThat(context.getBean(ObjectMapper.class)).isNotNull();
        }
    }
}
