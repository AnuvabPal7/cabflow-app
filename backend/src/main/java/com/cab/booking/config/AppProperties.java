package com.cab.booking.config;

import java.math.BigDecimal;
import java.util.List;
import org.springframework.boot.context.properties.ConfigurationProperties;

/** Typed view of the "app.*" section of application.yml. */
@ConfigurationProperties(prefix = "app")
public record AppProperties(
        JwtProps jwt,
        CorsProps cors,
        AdminProps admin,
        FareProps fare,
        MatchingProps matching,
        StripeProps stripe,
        MailProps mail,
        RateLimitProps rateLimit) {

    public record JwtProps(String secret, long expirationMinutes) {}

    public record CorsProps(List<String> allowedOrigins) {}

    public record AdminProps(String name, String email, String password) {}

    public record FareProps(double roadFactor, double avgSpeedKmh, BigDecimal taxRate,
                            String currency, BigDecimal driverShare) {}

    public record MatchingProps(double radiusKm, int maxDrivers, int locationStaleMinutes) {}

    public record StripeProps(String secretKey, String webhookSecret, boolean mockEnabled) {}

    public record MailProps(boolean enabled, String from) {}

    public record RateLimitProps(int authPerMinute) {}
}
