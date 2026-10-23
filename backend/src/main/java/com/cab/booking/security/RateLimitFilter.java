package com.cab.booking.security;

import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import java.io.IOException;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;
import org.springframework.web.filter.OncePerRequestFilter;

/**
 * Very small fixed-window limiter for login/register and the change-password/email calls (slows down password guessing).
 * Per-IP and in-memory, so it resets on restart and is per-instance. In production use a gateway or Redis.
 * Behind a reverse proxy remoteAddr is the proxy's IP - configure forwarded headers before relying on this.
 */
public class RateLimitFilter extends OncePerRequestFilter {
    private static final long WINDOW_MS = 60_000;
    private static final int MAX_TRACKED_IPS = 10_000;

    private static final class Window {
        long start;
        int count;
    }

    private final int limitPerMinute;
    private final Map<String, Window> windows = new ConcurrentHashMap<>();

    public RateLimitFilter(int limitPerMinute) {
        this.limitPerMinute = limitPerMinute;
    }

    @Override
    protected boolean shouldNotFilter(HttpServletRequest request) {
        String path = request.getRequestURI();
        String method = request.getMethod();
        boolean auth = "POST".equals(method)
                && ("/api/auth/login".equals(path) || "/api/auth/register".equals(path));
        boolean account = "PUT".equals(method)
                && ("/api/users/me/password".equals(path) || "/api/users/me/email".equals(path));
        return !(auth || account);
    }

    @Override
    protected void doFilterInternal(HttpServletRequest request, HttpServletResponse response, FilterChain chain)
            throws ServletException, IOException {
        if (windows.size() > MAX_TRACKED_IPS) {
            windows.clear();
        }
        long now = System.currentTimeMillis();
        Window w = windows.compute(request.getRemoteAddr(), (ip, old) -> {
            if (old == null || now - old.start >= WINDOW_MS) {
                Window fresh = new Window();
                fresh.start = now;
                fresh.count = 1;
                return fresh;
            }
            old.count++;
            return old;
        });
        if (w.count > limitPerMinute) {
            response.setStatus(429);
            response.setContentType("application/json");
            response.getWriter().write("{\"status\":429,\"message\":\"Too many attempts. Try again in a minute.\"}");
            return;
        }
        chain.doFilter(request, response);
    }
}
