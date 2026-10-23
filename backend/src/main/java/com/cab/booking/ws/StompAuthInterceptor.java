package com.cab.booking.ws;

import com.cab.booking.security.AppUserDetailsService;
import com.cab.booking.security.JwtService;
import java.security.Principal;
import org.springframework.messaging.Message;
import org.springframework.messaging.MessageChannel;
import org.springframework.messaging.MessageDeliveryException;
import org.springframework.messaging.simp.stomp.StompCommand;
import org.springframework.messaging.simp.stomp.StompHeaderAccessor;
import org.springframework.messaging.support.ChannelInterceptor;
import org.springframework.messaging.support.MessageHeaderAccessor;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.core.userdetails.UsernameNotFoundException;
import org.springframework.stereotype.Component;

/**
 * Secures the WebSocket:
 *  - CONNECT must carry "Authorization: Bearer <jwt>" in the STOMP headers.
 *  - SUBSCRIBE is only allowed to the user's own queues (/user/queue/**) and, for admins, /topic/admin.*
 */
@Component
public class StompAuthInterceptor implements ChannelInterceptor {
    private final JwtService jwtService;
    private final AppUserDetailsService userDetailsService;

    public StompAuthInterceptor(JwtService jwtService, AppUserDetailsService userDetailsService) {
        this.jwtService = jwtService;
        this.userDetailsService = userDetailsService;
    }

    @Override
    public Message<?> preSend(Message<?> message, MessageChannel channel) {
        StompHeaderAccessor accessor = MessageHeaderAccessor.getAccessor(message, StompHeaderAccessor.class);
        if (accessor == null || accessor.getCommand() == null) {
            return message;
        }
        StompCommand command = accessor.getCommand();

        if (StompCommand.CONNECT.equals(command)) {
            String header = accessor.getFirstNativeHeader("Authorization");
            if (header == null || !header.startsWith("Bearer ")) {
                throw new MessageDeliveryException("Missing bearer token");
            }
            String email = jwtService.extractEmail(header.substring(7))
                    .orElseThrow(() -> new MessageDeliveryException("Invalid or expired token"));
            try {
                UserDetails user = userDetailsService.loadUserByUsername(email);
                accessor.setUser(new UsernamePasswordAuthenticationToken(user, null, user.getAuthorities()));
            } catch (UsernameNotFoundException e) {
                throw new MessageDeliveryException("Unknown user");
            }
        } else if (StompCommand.SUBSCRIBE.equals(command)) {
            Principal principal = accessor.getUser();
            String destination = accessor.getDestination();
            if (principal == null || destination == null) {
                throw new MessageDeliveryException("Not authenticated");
            }
            boolean allowed = destination.startsWith("/user/queue/")
                    || (destination.startsWith("/topic/admin.") && isAdmin(principal));
            if (!allowed) {
                throw new MessageDeliveryException("Subscription not allowed: " + destination);
            }
        } else if (StompCommand.SEND.equals(command) && accessor.getUser() == null) {
            throw new MessageDeliveryException("Not authenticated");
        }
        return message;
    }

    private static boolean isAdmin(Principal principal) {
        return principal instanceof Authentication auth
                && auth.getAuthorities().stream().anyMatch(a -> "ROLE_ADMIN".equals(a.getAuthority()));
    }
}
