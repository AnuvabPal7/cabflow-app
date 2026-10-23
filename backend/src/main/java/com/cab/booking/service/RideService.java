package com.cab.booking.service;

import com.cab.booking.config.AppProperties;
import com.cab.booking.domain.AppUser;
import com.cab.booking.domain.Driver;
import com.cab.booking.domain.DriverStatus;
import com.cab.booking.domain.PromoCode;
import com.cab.booking.domain.Ride;
import com.cab.booking.domain.RideStatus;
import com.cab.booking.domain.VehicleType;
import com.cab.booking.domain.Role;
import com.cab.booking.dto.Dtos.FareEstimate;
import com.cab.booking.dto.Dtos.RideDto;
import com.cab.booking.dto.Dtos.RideRequest;
import com.cab.booking.dto.Mapper;
import com.cab.booking.repository.AppUserRepository;
import com.cab.booking.repository.DriverRepository;
import com.cab.booking.repository.RideRepository;
import com.cab.booking.security.AuthUser;
import com.cab.booking.util.GeoUtils;
import com.cab.booking.web.ApiException;
import java.math.BigDecimal;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.SecureRandom;
import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.List;
import java.util.Optional;
import java.util.Set;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * The ride lifecycle:
 * REQUESTED -> ACCEPTED -> ARRIVED -> IN_PROGRESS -> COMPLETED   (or CANCELLED before the trip starts)
 */
@Service
public class RideService {
    private static final Logger log = LoggerFactory.getLogger(RideService.class);

    private static final List<RideStatus> ACTIVE =
            List.of(RideStatus.REQUESTED, RideStatus.ACCEPTED, RideStatus.ARRIVED, RideStatus.IN_PROGRESS);
    private static final List<RideStatus> DRIVER_ACTIVE =
            List.of(RideStatus.ACCEPTED, RideStatus.ARRIVED, RideStatus.IN_PROGRESS);
    private static final long REQUEST_TTL_MINUTES = 10;

    private final RideRepository rides;
    private final AppUserRepository users;
    private final DriverRepository drivers;
    private final FareService fareService;
    private final PromoService promoService;
    private final MatchingService matching;
    private final NotificationService notifications;
    private final AppProperties props;
    private final SecureRandom random = new SecureRandom();

    public RideService(RideRepository rides, AppUserRepository users, DriverRepository drivers,
                       FareService fareService, PromoService promoService, MatchingService matching,
                       NotificationService notifications, AppProperties props) {
        this.rides = rides;
        this.users = users;
        this.drivers = drivers;
        this.fareService = fareService;
        this.promoService = promoService;
        this.matching = matching;
        this.notifications = notifications;
        this.props = props;
    }

    // ------------------------------------------------------------------ rider side

    @Transactional(readOnly = true)
    public FareEstimate estimate(RideRequest req) {
        VehicleType type = req.vehicleType() == null ? VehicleType.SEDAN : req.vehicleType();
        FareService.Quote quote = fareService.quote(req.pickup(), req.drop(), type);
        PromoCode promo = promoService.resolve(req.promoCode());
        BigDecimal discount = promoService.discountFor(quote.subtotal(), promo);
        BigDecimal tax = fareService.tax(quote.subtotal().subtract(discount));
        return new FareEstimate(type, quote.distanceKm(), quote.minutes(), quote.baseFare(), quote.distanceFare(),
                quote.subtotal(), discount, tax, quote.subtotal().subtract(discount).add(tax), fareService.currency());
    }

    @Transactional
    public RideDto request(Long riderId, RideRequest req) {
        AppUser rider = users.findById(riderId).orElseThrow(() -> ApiException.notFound("User not found"));
        if (rides.findFirstByRiderIdAndStatusInOrderByRequestedAtDesc(riderId, ACTIVE).isPresent()) {
            throw ApiException.conflict("You already have an active ride");
        }

        VehicleType type = req.vehicleType() == null ? VehicleType.SEDAN : req.vehicleType();
        FareService.Quote quote = fareService.quote(req.pickup(), req.drop(), type);
        PromoCode promo = promoService.resolve(req.promoCode());
        BigDecimal discount = promoService.discountFor(quote.subtotal(), promo);
        BigDecimal tax = fareService.tax(quote.subtotal().subtract(discount));

        Ride ride = new Ride();
        ride.setRider(rider);
        ride.setPickupLat(req.pickup().lat());
        ride.setPickupLng(req.pickup().lng());
        ride.setPickupAddress(req.pickup().address());
        ride.setDropLat(req.drop().lat());
        ride.setDropLng(req.drop().lng());
        ride.setDropAddress(req.drop().address());
        ride.setDistanceKm(quote.distanceKm());
        ride.setEstimatedMinutes(quote.minutes());
        ride.setVehicleType(type);
        ride.setBaseFare(quote.baseFare());
        ride.setDistanceFare(quote.distanceFare());
        ride.setTaxAmount(tax);
        ride.setFare(quote.subtotal().subtract(discount).add(tax));
        ride.setDiscount(discount);
        ride.setPromoCode(promo == null ? null : promo.getCode());
        ride.setStartOtp(String.format("%04d", random.nextInt(10_000)));   // rider tells this to the driver to start
        ride.setStatus(RideStatus.REQUESTED);
        rides.save(ride);

        // Day 5: notify the closest available drivers (the driver app also polls GET /api/rides/available).
        RideDto forDrivers = Mapper.toRideDto(ride, false);
        for (MatchingService.Candidate c : matching.findNearbyDrivers(
                ride.getPickupLat(), ride.getPickupLng(), Set.of(), props.matching().maxDrivers())) {
            notifications.sendRideEvent(c.driver().getUser().getEmail(), "RIDE_REQUESTED", forDrivers);
        }
        return Mapper.toRideDto(ride, true);
    }

    @Transactional
    public RideDto cancel(Long riderId, Long rideId) {
        Ride ride = load(rideId);
        if (!ride.getRider().getId().equals(riderId)) {
            throw ApiException.forbidden("Not your ride");
        }
        if (ride.getStatus() != RideStatus.REQUESTED && ride.getStatus() != RideStatus.ACCEPTED
                && ride.getStatus() != RideStatus.ARRIVED) {
            throw ApiException.conflict("A ride that is " + ride.getStatus() + " cannot be cancelled");
        }
        Driver driver = ride.getDriver();
        ride.setStatus(RideStatus.CANCELLED);
        if (driver != null) {
            driver.setStatus(DriverStatus.AVAILABLE);
            notifications.sendRideEvent(driver.getUser().getEmail(), "RIDE_CANCELLED", Mapper.toRideDto(ride, false));
        }
        return Mapper.toRideDto(ride, false);
    }

    // ------------------------------------------------------------------ driver side

    @Transactional(readOnly = true)
    public List<RideDto> availableFor(Long driverUserId) {
        Driver driver = driverByUser(driverUserId);
        if (driver.getStatus() != DriverStatus.AVAILABLE || driver.getCurrentLat() == null) {
            return List.of();
        }
        double lat = driver.getCurrentLat();
        double lng = driver.getCurrentLng();
        double radius = props.matching().radiusKm();
        GeoUtils.Box box = GeoUtils.boundingBox(lat, lng, radius);

        return rides.findOpenInBox(RideStatus.REQUESTED, box.minLat(), box.maxLat(), box.minLng(), box.maxLng())
                .stream()
                .filter(r -> !r.getDeclinedDriverIds().contains(driver.getId()))
                .filter(r -> GeoUtils.haversineKm(lat, lng, r.getPickupLat(), r.getPickupLng()) <= radius)
                .map(r -> Mapper.toRideDto(r, false))
                .toList();
    }

    @Transactional
    public RideDto accept(Long driverUserId, Long rideId) {
        Driver driver = driverByUser(driverUserId);
        if (driver.getStatus() != DriverStatus.AVAILABLE) {
            throw ApiException.conflict("You must be AVAILABLE to accept a ride (status: " + driver.getStatus() + ")");
        }
        Ride ride = load(rideId);
        requireStatus(ride, RideStatus.REQUESTED);

        ride.setDriver(driver);
        ride.setStatus(RideStatus.ACCEPTED);
        ride.setAcceptedAt(Instant.now());
        driver.setStatus(DriverStatus.ON_RIDE);
        // If another driver accepted first, the @Version check fails here and the caller gets 409.
        rides.saveAndFlush(ride);

        notifyRider(ride, "RIDE_ACCEPTED");
        return Mapper.toRideDto(ride, false);
    }

    @Transactional
    public void decline(Long driverUserId, Long rideId) {
        Driver driver = driverByUser(driverUserId);
        Ride ride = load(rideId);
        requireStatus(ride, RideStatus.REQUESTED);
        ride.getDeclinedDriverIds().add(driver.getId());
    }

    @Transactional
    public RideDto arrived(Long driverUserId, Long rideId) {
        Ride ride = ownedByDriver(driverUserId, rideId);
        requireStatus(ride, RideStatus.ACCEPTED);
        ride.setStatus(RideStatus.ARRIVED);
        notifyRider(ride, "DRIVER_ARRIVED");
        return Mapper.toRideDto(ride, false);
    }

    @Transactional
    public RideDto start(Long driverUserId, Long rideId, String otp) {
        Ride ride = ownedByDriver(driverUserId, rideId);
        requireStatus(ride, RideStatus.ARRIVED);
        boolean match = MessageDigest.isEqual(
                otp.getBytes(StandardCharsets.UTF_8), ride.getStartOtp().getBytes(StandardCharsets.UTF_8));
        if (!match) {
            throw ApiException.badRequest("Invalid start OTP");
        }
        ride.setStatus(RideStatus.IN_PROGRESS);
        ride.setStartedAt(Instant.now());
        notifyRider(ride, "RIDE_STARTED");
        return Mapper.toRideDto(ride, false);
    }

    @Transactional
    public RideDto complete(Long driverUserId, Long rideId) {
        Ride ride = ownedByDriver(driverUserId, rideId);
        requireStatus(ride, RideStatus.IN_PROGRESS);
        ride.setStatus(RideStatus.COMPLETED);
        ride.setCompletedAt(Instant.now());
        ride.getDriver().setStatus(DriverStatus.AVAILABLE);
        notifyRider(ride, "RIDE_COMPLETED");
        return Mapper.toRideDto(ride, false);
    }

    // ------------------------------------------------------------------ shared reads

    @Transactional(readOnly = true)
    public Optional<RideDto> active(AuthUser user) {
        if (user.getRole() == Role.RIDER) {
            return rides.findFirstByRiderIdAndStatusInOrderByRequestedAtDesc(user.getId(), ACTIVE)
                    .map(r -> dtoFor(r, user));
        }
        if (user.getRole() == Role.DRIVER) {
            Driver driver = driverByUser(user.getId());
            return rides.findFirstByDriverIdAndStatusInOrderByRequestedAtDesc(driver.getId(), DRIVER_ACTIVE)
                    .map(r -> dtoFor(r, user));
        }
        return Optional.empty();
    }

    @Transactional(readOnly = true)
    public Page<RideDto> history(AuthUser user, Pageable pageable) {
        if (user.getRole() == Role.DRIVER) {
            Driver driver = driverByUser(user.getId());
            return rides.findByDriverId(driver.getId(), pageable).map(r -> dtoFor(r, user));
        }
        if (user.getRole() == Role.RIDER) {
            return rides.findByRiderId(user.getId(), pageable).map(r -> dtoFor(r, user));
        }
        return rides.findAll(pageable).map(r -> dtoFor(r, user));
    }

    @Transactional(readOnly = true)
    public RideDto get(AuthUser user, Long rideId) {
        Ride ride = load(rideId);
        assertParticipant(ride, user);
        return dtoFor(ride, user);
    }

    // ------------------------------------------------------------------ housekeeping

    /** Requests nobody accepted within 10 minutes are cancelled so the rider is not stuck. */
    @Scheduled(fixedDelay = 60_000, initialDelay = 60_000)
    @Transactional
    public void expireStaleRequests() {
        Instant cutoff = Instant.now().minus(REQUEST_TTL_MINUTES, ChronoUnit.MINUTES);
        for (Ride ride : rides.findByStatusAndRequestedAtBefore(RideStatus.REQUESTED, cutoff)) {
            ride.setStatus(RideStatus.CANCELLED);
            notifyRider(ride, "RIDE_EXPIRED");
            log.info("Expired ride request {}", ride.getId());
        }
    }

    // ------------------------------------------------------------------ helpers

    private Ride load(Long rideId) {
        return rides.findById(rideId).orElseThrow(() -> ApiException.notFound("Ride not found"));
    }

    private Driver driverByUser(Long userId) {
        return drivers.findByUserId(userId).orElseThrow(() -> ApiException.forbidden("Driver profile not found"));
    }

    private Ride ownedByDriver(Long driverUserId, Long rideId) {
        Driver driver = driverByUser(driverUserId);
        Ride ride = load(rideId);
        if (ride.getDriver() == null || !ride.getDriver().getId().equals(driver.getId())) {
            throw ApiException.forbidden("This ride is not assigned to you");
        }
        return ride;
    }

    private static void requireStatus(Ride ride, RideStatus expected) {
        if (ride.getStatus() != expected) {
            throw ApiException.conflict("Ride is " + ride.getStatus() + " but must be " + expected + " for this action");
        }
    }

    private static void assertParticipant(Ride ride, AuthUser user) {
        if (user.getRole() == Role.ADMIN) {
            return;
        }
        boolean isRider = ride.getRider().getId().equals(user.getId());
        boolean isDriver = ride.getDriver() != null && ride.getDriver().getUser().getId().equals(user.getId());
        if (!isRider && !isDriver) {
            throw ApiException.forbidden("Not your ride");
        }
    }

    /** The start OTP is only ever shown to the rider, and only while it is still needed. */
    private static RideDto dtoFor(Ride ride, AuthUser viewer) {
        boolean showOtp = viewer.getRole() == Role.RIDER
                && (ride.getStatus() == RideStatus.REQUESTED || ride.getStatus() == RideStatus.ACCEPTED
                || ride.getStatus() == RideStatus.ARRIVED);
        return Mapper.toRideDto(ride, showOtp);
    }

    private void notifyRider(Ride ride, String eventType) {
        boolean showOtp = ride.getStatus() == RideStatus.ACCEPTED || ride.getStatus() == RideStatus.ARRIVED;
        notifications.sendRideEvent(ride.getRider().getEmail(), eventType, Mapper.toRideDto(ride, showOtp));
    }
}
