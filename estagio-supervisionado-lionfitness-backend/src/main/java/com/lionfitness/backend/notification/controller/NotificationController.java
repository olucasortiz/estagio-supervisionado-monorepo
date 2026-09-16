package com.lionfitness.backend.notification.controller;

import java.util.List;
import java.util.UUID;

import com.lionfitness.backend.notification.dto.MarkAllNotificationsReadResponse;
import com.lionfitness.backend.notification.dto.NotificationReplyRequest;
import com.lionfitness.backend.notification.dto.NotificationResponse;
import com.lionfitness.backend.notification.dto.StudentNotificationCreateRequest;
import com.lionfitness.backend.notification.dto.UnreadNotificationCountResponse;
import com.lionfitness.backend.notification.service.NotificationService;
import jakarta.validation.Valid;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/notifications")
public class NotificationController {

    private final NotificationService notificationService;

    public NotificationController(NotificationService notificationService) {
        this.notificationService = notificationService;
    }

    @PostMapping("/trainer-message")
    @PreAuthorize("hasAnyRole('OPERATIONAL', 'USER')")
    public ResponseEntity<NotificationResponse> sendStudentMessage(
            Authentication authentication,
            @Valid @RequestBody StudentNotificationCreateRequest request
    ) {
        return ResponseEntity.ok(notificationService.sendStudentMessage(authentication.getName(), request));
    }

    @GetMapping
    @PreAuthorize("hasAnyRole('OPERATIONAL', 'USER', 'PERSONAL_TRAINER', 'ADMIN')")
    public ResponseEntity<List<NotificationResponse>> findMine(Authentication authentication) {
        return ResponseEntity.ok(notificationService.findMine(authentication.getName()));
    }

    @GetMapping("/unread-count")
    @PreAuthorize("hasAnyRole('OPERATIONAL', 'USER', 'PERSONAL_TRAINER', 'ADMIN')")
    public ResponseEntity<UnreadNotificationCountResponse> unreadCount(Authentication authentication) {
        return ResponseEntity.ok(notificationService.unreadCount(authentication.getName()));
    }

    @PatchMapping("/{notificationId}/read")
    @PreAuthorize("hasAnyRole('OPERATIONAL', 'USER', 'PERSONAL_TRAINER', 'ADMIN')")
    public ResponseEntity<NotificationResponse> markAsRead(Authentication authentication,
                                                            @PathVariable UUID notificationId) {
        return ResponseEntity.ok(notificationService.markAsRead(authentication.getName(), notificationId));
    }

    @PatchMapping("/read-all")
    @PreAuthorize("hasAnyRole('OPERATIONAL', 'USER', 'PERSONAL_TRAINER', 'ADMIN')")
    public ResponseEntity<MarkAllNotificationsReadResponse> markAllAsRead(Authentication authentication) {
        return ResponseEntity.ok(notificationService.markAllAsRead(authentication.getName()));
    }

    @PostMapping("/{notificationId}/reply")
    @PreAuthorize("hasRole('PERSONAL_TRAINER')")
    public ResponseEntity<NotificationResponse> reply(Authentication authentication,
                                                       @PathVariable UUID notificationId,
                                                       @Valid @RequestBody NotificationReplyRequest request) {
        return ResponseEntity.ok(notificationService.replyAsPersonal(authentication.getName(), notificationId, request));
    }
}
