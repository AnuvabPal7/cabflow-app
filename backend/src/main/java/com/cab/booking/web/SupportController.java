package com.cab.booking.web;

import com.cab.booking.dto.Dtos.TicketDto;
import com.cab.booking.dto.Dtos.TicketRequest;
import com.cab.booking.security.AuthUser;
import com.cab.booking.service.SupportService;
import jakarta.validation.Valid;
import java.util.List;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/support/tickets")
public class SupportController {
    private final SupportService supportService;

    public SupportController(SupportService supportService) {
        this.supportService = supportService;
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public TicketDto create(@AuthenticationPrincipal AuthUser user, @Valid @RequestBody TicketRequest req) {
        return supportService.create(user.getId(), req);
    }

    @GetMapping
    public List<TicketDto> mine(@AuthenticationPrincipal AuthUser user) {
        return supportService.mine(user.getId());
    }
}
