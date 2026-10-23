package com.cab.booking.web;

import com.cab.booking.dto.Dtos.FareEstimate;
import com.cab.booking.dto.Dtos.RideDto;
import com.cab.booking.dto.Dtos.RideRequest;
import com.cab.booking.dto.Dtos.StartRideRequest;
import com.cab.booking.security.AuthUser;
import com.cab.booking.service.RideService;
import jakarta.validation.Valid;
import java.util.List;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.data.web.PageableDefault;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/rides")
public class RideController {
    private final RideService rideService;

    public RideController(RideService rideService) {
        this.rideService = rideService;
    }

    // ---- rider ----
    @PostMapping("/estimate")
    public FareEstimate estimate(@Valid @RequestBody RideRequest req) {
        return rideService.estimate(req);
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public RideDto request(@AuthenticationPrincipal AuthUser user, @Valid @RequestBody RideRequest req) {
        return rideService.request(user.getId(), req);
    }

    @PostMapping("/{id}/cancel")
    public RideDto cancel(@AuthenticationPrincipal AuthUser user, @PathVariable Long id) {
        return rideService.cancel(user.getId(), id);
    }

    // ---- driver ----
    @GetMapping("/available")
    public List<RideDto> available(@AuthenticationPrincipal AuthUser user) {
        return rideService.availableFor(user.getId());
    }

    @PostMapping("/{id}/accept")
    public RideDto accept(@AuthenticationPrincipal AuthUser user, @PathVariable Long id) {
        return rideService.accept(user.getId(), id);
    }

    @PostMapping("/{id}/decline")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void decline(@AuthenticationPrincipal AuthUser user, @PathVariable Long id) {
        rideService.decline(user.getId(), id);
    }

    @PostMapping("/{id}/arrived")
    public RideDto arrived(@AuthenticationPrincipal AuthUser user, @PathVariable Long id) {
        return rideService.arrived(user.getId(), id);
    }

    @PostMapping("/{id}/start")
    public RideDto start(@AuthenticationPrincipal AuthUser user, @PathVariable Long id,
                         @Valid @RequestBody StartRideRequest req) {
        return rideService.start(user.getId(), id, req.otp());
    }

    @PostMapping("/{id}/complete")
    public RideDto complete(@AuthenticationPrincipal AuthUser user, @PathVariable Long id) {
        return rideService.complete(user.getId(), id);
    }

    // ---- shared ----
    @GetMapping("/active")
    public ResponseEntity<RideDto> active(@AuthenticationPrincipal AuthUser user) {
        return rideService.active(user).map(ResponseEntity::ok).orElseGet(() -> ResponseEntity.noContent().build());
    }

    @GetMapping("/history")
    public Page<RideDto> history(@AuthenticationPrincipal AuthUser user,
                                 @PageableDefault(size = 20, sort = "requestedAt", direction = Sort.Direction.DESC)
                                 Pageable pageable) {
        return rideService.history(user, pageable);
    }

    @GetMapping("/{id}")
    public RideDto get(@AuthenticationPrincipal AuthUser user, @PathVariable Long id) {
        return rideService.get(user, id);
    }
}
