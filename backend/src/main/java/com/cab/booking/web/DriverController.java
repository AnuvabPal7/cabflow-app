package com.cab.booking.web;

import com.cab.booking.dto.Dtos.DriverDto;
import com.cab.booking.dto.Dtos.LocationUpdate;
import com.cab.booking.dto.Dtos.NearbyDriverDto;
import com.cab.booking.dto.Dtos.RatingDto;
import com.cab.booking.dto.Dtos.StatusUpdate;
import com.cab.booking.security.AuthUser;
import com.cab.booking.service.DriverService;
import jakarta.validation.Valid;
import java.util.List;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.data.web.PageableDefault;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/drivers")
public class DriverController {
    private final DriverService driverService;

    public DriverController(DriverService driverService) {
        this.driverService = driverService;
    }

    // ---- driver-only (see SecurityConfig) ----
    @GetMapping("/me")
    public DriverDto me(@AuthenticationPrincipal AuthUser user) {
        return driverService.me(user.getId());
    }

    @PutMapping("/me/status")
    public DriverDto setStatus(@AuthenticationPrincipal AuthUser user, @Valid @RequestBody StatusUpdate req) {
        return driverService.setStatus(user.getId(), req.status());
    }

    @PutMapping("/me/location")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void updateLocation(@AuthenticationPrincipal AuthUser user, @Valid @RequestBody LocationUpdate req) {
        driverService.updateLocation(user.getId(), req.lat(), req.lng());
    }

    // ---- any logged-in user ----
    @GetMapping("/nearby")
    public List<NearbyDriverDto> nearby(@RequestParam double lat, @RequestParam double lng) {
        return driverService.nearby(lat, lng);
    }

    @GetMapping("/top")
    public List<DriverDto> top(@RequestParam(defaultValue = "10") int limit) {
        return driverService.top(limit);
    }

    @GetMapping("/{id}/ratings")
    public Page<RatingDto> ratings(@PathVariable Long id,
                                   @PageableDefault(size = 20, sort = "createdAt", direction = Sort.Direction.DESC)
                                   Pageable pageable) {
        return driverService.ratingsFor(id, pageable);
    }
}
