package com.cab.booking.web;

import com.cab.booking.security.AuthUser;
import com.cab.booking.service.MailService;
import com.cab.booking.service.ReceiptService;
import com.cab.booking.service.RideService;
import org.springframework.http.ContentDisposition;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/rides/{rideId}/receipt")
public class ReceiptController {
    private final RideService rideService;
    private final ReceiptService receiptService;
    private final MailService mailService;

    public ReceiptController(RideService rideService, ReceiptService receiptService, MailService mailService) {
        this.rideService = rideService;
        this.receiptService = receiptService;
        this.mailService = mailService;
    }

    @GetMapping
    public ResponseEntity<byte[]> download(@AuthenticationPrincipal AuthUser user, @PathVariable Long rideId) {
        rideService.get(user, rideId);   // 404/403 if the ride does not exist or is not yours
        ReceiptService.ReceiptFile file = receiptService.generate(rideId);
        return ResponseEntity.ok()
                .contentType(MediaType.APPLICATION_PDF)
                .header(HttpHeaders.CONTENT_DISPOSITION,
                        ContentDisposition.attachment().filename("receipt-" + rideId + ".pdf").build().toString())
                .body(file.pdf());
    }

    @PostMapping("/email")
    @ResponseStatus(HttpStatus.ACCEPTED)
    public void email(@AuthenticationPrincipal AuthUser user, @PathVariable Long rideId) {
        rideService.get(user, rideId);
        mailService.sendReceipt(rideId);   // runs asynchronously
    }
}
