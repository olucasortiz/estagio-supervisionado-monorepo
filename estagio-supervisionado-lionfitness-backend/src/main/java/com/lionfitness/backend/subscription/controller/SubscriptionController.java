package com.lionfitness.backend.subscription.controller;

import java.net.URI;
import java.util.List;
import java.util.UUID;

import com.lionfitness.backend.subscription.dto.MySubscriptionResponse;
import com.lionfitness.backend.subscription.dto.SubscriptionCreateRequest;
import com.lionfitness.backend.subscription.dto.SubscriptionResponse;
import com.lionfitness.backend.subscription.dto.SubscriptionUpdateRequest;
import com.lionfitness.backend.subscription.service.SubscriptionService;
import jakarta.validation.Valid;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/subscriptions")
public class SubscriptionController {

    private final SubscriptionService subscriptionService;

    public SubscriptionController(SubscriptionService subscriptionService) {
        this.subscriptionService = subscriptionService;
    }

    @PostMapping
    public ResponseEntity<SubscriptionResponse> create(@Valid @RequestBody SubscriptionCreateRequest request) {
        SubscriptionResponse response = subscriptionService.create(request);
        return ResponseEntity
                .created(URI.create("/subscriptions/" + response.id()))
                .body(response);
    }

    @GetMapping
    public List<SubscriptionResponse> findAll() {
        return subscriptionService.findAll();
    }

    @GetMapping("/me")
    @PreAuthorize("hasAnyRole('OPERATIONAL', 'ADMIN')")
    public ResponseEntity<?> findMine(Authentication authentication) {
        java.util.Optional<MySubscriptionResponse> subscription = subscriptionService.findMine(authentication.getName());
        if (subscription.isPresent()) {
            return ResponseEntity.ok(subscription.get());
        }
        return ResponseEntity.ok(java.util.Map.of("hasSubscription", false));
    }

    @GetMapping("/{id}")
    public SubscriptionResponse findById(@PathVariable UUID id) {
        return subscriptionService.findById(id);
    }

    @PutMapping("/{id}")
    public SubscriptionResponse update(@PathVariable UUID id, @Valid @RequestBody SubscriptionUpdateRequest request) {
        return subscriptionService.update(id, request);
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> delete(@PathVariable UUID id) {
        subscriptionService.delete(id);
        return ResponseEntity.noContent().build();
    }
}
