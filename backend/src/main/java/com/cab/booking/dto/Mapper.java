package com.cab.booking.dto;

import com.cab.booking.domain.AppUser;
import com.cab.booking.domain.Driver;
import com.cab.booking.domain.PromoCode;
import com.cab.booking.domain.Rating;
import com.cab.booking.domain.Ride;
import com.cab.booking.domain.SupportTicket;
import com.cab.booking.dto.Dtos.DriverDto;
import com.cab.booking.dto.Dtos.Point;
import com.cab.booking.dto.Dtos.PromoDto;
import com.cab.booking.dto.Dtos.RatingDto;
import com.cab.booking.dto.Dtos.RideDto;
import com.cab.booking.dto.Dtos.TicketDto;
import com.cab.booking.dto.Dtos.UserDto;

/** Entity -> DTO conversion. Call inside a transaction (lazy associations are read here). */
public final class Mapper {
    private Mapper() {}

    public static UserDto toUserDto(AppUser u) {
        return new UserDto(u.getId(), u.getName(), u.getEmail(), u.getRole());
    }

    public static DriverDto toDriverDto(Driver d) {
        return new DriverDto(d.getId(), d.getUser().getId(), d.getUser().getName(),
                d.getVehicleModel(), d.getVehiclePlate(), d.getStatus(),
                d.getCurrentLat(), d.getCurrentLng(),
                d.getRatingAverage(), d.getRatingCount(), d.getTotalEarnings());
    }

    /** includeOtp must only be true when the DTO is for the rider of this ride. */
    public static RideDto toRideDto(Ride r, boolean includeOtp) {
        Driver d = r.getDriver();
        return new RideDto(
                r.getId(), r.getStatus(),
                r.getRider().getId(), r.getRider().getName(),
                d == null ? null : d.getId(),
                d == null ? null : d.getUser().getName(),
                d == null ? null : d.getVehicleModel(),
                d == null ? null : d.getVehiclePlate(),
                d == null ? null : d.getCurrentLat(),
                d == null ? null : d.getCurrentLng(),
                new Point(r.getPickupLat(), r.getPickupLng(), r.getPickupAddress()),
                new Point(r.getDropLat(), r.getDropLng(), r.getDropAddress()),
                r.getVehicleType(), r.getDistanceKm(), r.getEstimatedMinutes(),
                r.getBaseFare(), r.getDistanceFare(), r.getTaxAmount(),
                r.getFare(), r.getDiscount(), r.getPromoCode(),
                includeOtp ? r.getStartOtp() : null,
                r.getRequestedAt(), r.getCompletedAt());
    }

    public static RatingDto toRatingDto(Rating r) {
        return new RatingDto(r.getId(), r.getRide().getId(), r.getDriver().getId(), r.getStars(),
                r.getComment(), r.getRider().getName(), r.getCreatedAt());
    }

    public static TicketDto toTicketDto(SupportTicket t) {
        return new TicketDto(t.getId(), t.getUser().getId(), t.getUser().getName(),
                t.getSubject(), t.getMessage(), t.getStatus(), t.getCreatedAt());
    }

    public static PromoDto toPromoDto(PromoCode p) {
        return new PromoDto(p.getId(), p.getCode(), p.getDiscountPercent(), p.isActive());
    }
}
