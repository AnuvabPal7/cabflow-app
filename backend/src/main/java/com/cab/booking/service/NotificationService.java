package com.cab.booking.service;

import com.cab.booking.dto.Dtos.LiveLocation;
import com.cab.booking.dto.Dtos.RideDto;
import com.cab.booking.dto.Dtos.RideEvent;
import com.cab.booking.util.TxUtil;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Service;

/**
 * Pushes real-time events over WebSocket. Clients subscribe to /user/queue/rides and /user/queue/location;
 * "user" destinations are routed by the principal name (the user's email).
 */
@Service
public class NotificationService {
    private final SimpMessagingTemplate template;

    public NotificationService(SimpMessagingTemplate template) {
        this.template = template;
    }

    public void sendRideEvent(String userEmail, String type, RideDto ride) {
        TxUtil.afterCommit(() -> template.convertAndSendToUser(userEmail, "/queue/rides", new RideEvent(type, ride)));
    }

    public void sendLocation(String userEmail, LiveLocation location) {
        template.convertAndSendToUser(userEmail, "/queue/location", location);
    }
}
