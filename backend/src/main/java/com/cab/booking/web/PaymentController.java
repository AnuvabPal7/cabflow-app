package com.cab.booking.web;

import com.cab.booking.dto.Dtos.PaymentIntentDto;
import com.cab.booking.security.AuthUser;
import com.cab.booking.service.PaymentService;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/payments")
public class PaymentController {
    private final PaymentService paymentService;

    public PaymentController(PaymentService paymentService) {
        this.paymentService = paymentService;
    }

    @PostMapping("/rides/{rideId}/intent")
    public PaymentIntentDto createIntent(@AuthenticationPrincipal AuthUser user, @PathVariable Long rideId) {
        return paymentService.createIntent(user.getId(), rideId);
    }

    /** Only works in MOCK mode (no Stripe key configured). */
    @PostMapping("/rides/{rideId}/mock-confirm")
    public PaymentIntentDto mockConfirm(@AuthenticationPrincipal AuthUser user, @PathVariable Long rideId) {
        return paymentService.confirmMock(user.getId(), rideId);
    }

    @GetMapping("/rides/{rideId}")
    public PaymentIntentDto status(@AuthenticationPrincipal AuthUser user, @PathVariable Long rideId) {
        return paymentService.status(user.getId(), rideId);
    }

    /** Public URL called by Stripe. Needs the RAW body (as a String) to verify the signature. */
    @PostMapping("/webhook")
    public ResponseEntity<Void> webhook(@RequestBody String payload,
                                        @RequestHeader("Stripe-Signature") String signature) {
        paymentService.handleWebhook(payload, signature);
        return ResponseEntity.ok().build();
    }
}
