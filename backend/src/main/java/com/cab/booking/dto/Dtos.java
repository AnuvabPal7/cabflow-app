package com.cab.booking.dto;

import com.cab.booking.domain.DriverStatus;
import com.cab.booking.domain.PaymentStatus;
import com.cab.booking.domain.RideStatus;
import com.cab.booking.domain.Role;
import com.cab.booking.domain.TicketStatus;
import com.cab.booking.domain.VehicleType;
import jakarta.validation.Valid;
import jakarta.validation.constraints.DecimalMax;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import java.math.BigDecimal;
import java.time.Instant;
import java.util.Map;

/** All request/response shapes of the API in one place (Java records = immutable DTOs). */
public final class Dtos {
    private Dtos() {}

    // ---------- auth ----------
    public record RegisterRequest(
            @NotBlank @Size(max = 100) String name,
            @NotBlank @Email @Size(max = 150) String email,
            @NotBlank @Size(min = 8, max = 72) String password,
            @NotNull Role role,
            @Size(max = 80) String vehicleModel,
            @Size(max = 20) String vehiclePlate) {}

    public record LoginRequest(@NotBlank @Email String email, @NotBlank String password) {}

    public record UserDto(Long id, String name, String email, Role role) {}

    public record ChangePasswordRequest(
            @NotBlank String currentPassword,
            @NotBlank @Size(min = 8, max = 72) String newPassword) {}

    public record ChangeEmailRequest(
            @NotBlank @Email @Size(max = 150) String newEmail,
            @NotBlank String currentPassword) {}

    public record AuthResponse(String token, UserDto user) {}

    // ---------- geo / rides ----------
    public record Point(
            @NotNull @DecimalMin("-90.0") @DecimalMax("90.0") Double lat,
            @NotNull @DecimalMin("-180.0") @DecimalMax("180.0") Double lng,
            @Size(max = 255) String address) {}

    public record RideRequest(
            @NotNull @Valid Point pickup,
            @NotNull @Valid Point drop,
            VehicleType vehicleType,
            @Size(max = 30) String promoCode) {}

    public record FareEstimate(VehicleType vehicleType, double distanceKm, int estimatedMinutes,
                               BigDecimal baseFare, BigDecimal distanceFare, BigDecimal subtotal,
                               BigDecimal discount, BigDecimal taxAmount, BigDecimal total, String currency) {}

    public record RideDto(
            Long id, RideStatus status,
            Long riderId, String riderName,
            Long driverId, String driverName, String vehicleModel, String vehiclePlate,
            Double driverLat, Double driverLng,
            Point pickup, Point drop,
            VehicleType vehicleType, double distanceKm, int estimatedMinutes,
            BigDecimal baseFare, BigDecimal distanceFare, BigDecimal taxAmount,
            BigDecimal fare, BigDecimal discount, String promoCode,
            String startOtp,
            Instant requestedAt, Instant completedAt) {}

    public record StartRideRequest(@NotBlank @Size(min = 4, max = 4) String otp) {}

    // ---------- drivers ----------
    public record LocationUpdate(
            @NotNull @DecimalMin("-90.0") @DecimalMax("90.0") Double lat,
            @NotNull @DecimalMin("-180.0") @DecimalMax("180.0") Double lng) {}

    public record StatusUpdate(@NotNull DriverStatus status) {}

    public record DriverDto(Long id, Long userId, String name, String vehicleModel, String vehiclePlate,
                            DriverStatus status, Double lat, Double lng,
                            double ratingAverage, int ratingCount, BigDecimal totalEarnings) {}

    public record NearbyDriverDto(Long id, String name, String vehicleModel,
                                  double lat, double lng, double distanceKm, double ratingAverage) {}

    // ---------- payments ----------
    public record PaymentIntentDto(Long rideId, String paymentIntentId, String clientSecret,
                                   BigDecimal amount, String currency, PaymentStatus status, boolean mock) {}

    // ---------- ratings ----------
    public record RatingRequest(
            @NotNull Long rideId,
            @NotNull @Min(1) @Max(5) Integer stars,
            @Size(max = 500) String comment) {}

    public record RatingDto(Long id, Long rideId, Long driverId, int stars, String comment,
                            String riderName, Instant createdAt) {}

    // ---------- support / promo / admin ----------
    public record TicketRequest(@NotBlank @Size(max = 150) String subject,
                                @NotBlank @Size(max = 2000) String message) {}

    public record TicketDto(Long id, Long userId, String userName, String subject, String message,
                            TicketStatus status, Instant createdAt) {}

    public record PromoRequest(@NotBlank @Size(max = 30) String code,
                               @NotNull @Min(1) @Max(90) Integer discountPercent) {}

    public record PromoDto(Long id, String code, int discountPercent, boolean active) {}

    public record AdminStats(long totalUsers, long totalDrivers, long availableDrivers, long activeRides,
                             long completedRides, long cancelledRides, BigDecimal revenue) {}

    // ---------- websocket payloads ----------
    public record RideEvent(String type, RideDto ride) {}

    public record LiveLocation(Long rideId, double lat, double lng, Instant at) {}

    public record SosRequest(Long rideId, Double lat, Double lng, @Size(max = 300) String message) {}

    public record SosAlert(Long rideId, Long userId, String userEmail, Double lat, Double lng,
                           String message, Instant at) {}

    // ---------- errors ----------
    public record ApiError(Instant timestamp, int status, String message, Map<String, String> fieldErrors) {}
}
