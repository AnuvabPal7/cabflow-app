package com.cab.booking.ws;

import com.cab.booking.dto.Dtos.LocationUpdate;
import com.cab.booking.dto.Dtos.SosAlert;
import com.cab.booking.dto.Dtos.SosRequest;
import com.cab.booking.security.AuthUser;
import com.cab.booking.service.DriverService;
import java.security.Principal;
import java.time.Instant;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.messaging.handler.annotation.MessageMapping;
import org.springframework.messaging.handler.annotation.Payload;
import org.springframework.messaging.handler.annotation.SendTo;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.core.Authentication;
import org.springframework.stereotype.Controller;

/**
 * Real-time messages sent by clients (prefix /app):
 *   /app/driver.location  {lat,lng}            driver -> server -> that ride's rider (/user/queue/location)
 *   /app/sos              {rideId,lat,lng,..}  rider or driver -> all admins (/topic/admin.sos)
 * Server -> client events (ride status changes) are pushed by NotificationService to /user/queue/rides.
 */
@Controller
public class LiveController {
    private static final Logger log = LoggerFactory.getLogger(LiveController.class);

    private final DriverService driverService;

    public LiveController(DriverService driverService) {
        this.driverService = driverService;
    }

    @MessageMapping("/driver.location")
    public void driverLocation(@Payload LocationUpdate location, Principal principal) {
        AuthUser user = authUser(principal);
        if (location == null || location.lat() == null || location.lng() == null) {
            return;
        }
        // Only drivers have a Driver profile; anyone else is rejected inside the service.
        driverService.updateLocation(user.getId(), location.lat(), location.lng());
    }

    @MessageMapping("/sos")
    @SendTo("/topic/admin.sos")
    public SosAlert sos(@Payload SosRequest request, Principal principal) {
        AuthUser user = authUser(principal);
        log.warn("SOS alert from user {} (ride {})", user.getId(), request.rideId());
        return new SosAlert(request.rideId(), user.getId(), user.getUsername(),
                request.lat(), request.lng(), request.message(), Instant.now());
    }

    private static AuthUser authUser(Principal principal) {
        if (principal instanceof Authentication auth && auth.getPrincipal() instanceof AuthUser user) {
            return user;
        }
        throw new AccessDeniedException("Not authenticated");
    }
}
