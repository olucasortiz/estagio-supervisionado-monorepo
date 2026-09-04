package com.lionfitness.backend.config;

import jakarta.servlet.*;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.core.Ordered;
import org.springframework.core.annotation.Order;
import org.springframework.stereotype.Component;
import java.io.IOException;

@Component
@Order(Ordered.HIGHEST_PRECEDENCE)
public class RequestLoggingFilter implements Filter {

    @Override
    public void doFilter(ServletRequest request, ServletResponse response, FilterChain chain)
            throws IOException, ServletException {
        HttpServletRequest req = (HttpServletRequest) request;
        HttpServletResponse res = (HttpServletResponse) response;

        System.out.println(">>> [LOG DE REDE] Método: " + req.getMethod() + " | URI: " + req.getRequestURI() + " | Origin: " + req.getHeader("Origin"));

        chain.doFilter(request, response);

        System.out.println("<<< [LOG DE RESPOSTA] Status: " + res.getStatus() + " para URI: " + req.getRequestURI());
    }
}
