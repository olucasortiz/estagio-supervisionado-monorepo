package com.lionfitness.backend;

import org.junit.jupiter.api.Test;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.TestPropertySource;

@SpringBootTest
@TestPropertySource(properties = {
        "MP_ACCESS_TOKEN=APP_USR-test-dummy",
        "mercadopago.access-token=APP_USR-test-dummy"
})
class BackendApplicationTests {

    @Test
    void contextLoads() {
    }

}

