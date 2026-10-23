package com.cab.booking.service;

import com.cab.booking.domain.Driver;
import com.cab.booking.domain.DriverStatus;
import com.cab.booking.domain.RideStatus;
import com.cab.booking.dto.Dtos.DriverDto;
import com.cab.booking.dto.Dtos.LiveLocation;
import com.cab.booking.dto.Dtos.NearbyDriverDto;
import com.cab.booking.dto.Dtos.RatingDto;
import com.cab.booking.dto.Mapper;
import com.cab.booking.repository.DriverRepository;
import com.cab.booking.repository.RatingRepository;
import com.cab.booking.repository.RideRepository;
import com.cab.booking.web.ApiException;
import java.time.Instant;
import java.util.List;
import java.util.Set;
import org.springframework.cache.annotation.Cacheable;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class DriverService {
    private static final List<RideStatus> LIVE_RIDE = List.of(RideStatus.ACCEPTED, RideStatus.ARRIVED, RideStatus.IN_PROGRESS);

    private final DriverRepository drivers;
    private final RideRepository rides;
    private final RatingRepository ratings;
    private final MatchingService matching;
    private final NotificationService notifications;

    public DriverService(DriverRepository drivers, RideRepository rides, RatingRepository ratings,
                         MatchingService matching, NotificationService notifications) {
        this.drivers = drivers;
        this.rides = rides;
        this.ratings = ratings;
        this.matching = matching;
        this.notifications = notifications;
    }

    @Transactional(readOnly = true)
    public DriverDto me(Long userId) {
        return Mapper.toDriverDto(byUser(userId));
    }

    @Transactional
    public DriverDto setStatus(Long userId, DriverStatus requested) {
        if (requested == DriverStatus.ON_RIDE) {
            throw ApiException.badRequest("Status can only be set to AVAILABLE or OFFLINE");
        }
        Driver d = byUser(userId);
        if (d.getStatus() == DriverStatus.ON_RIDE) {
            throw ApiException.conflict("Finish your current ride first");
        }
        if (requested == DriverStatus.AVAILABLE && d.getCurrentLat() == null) {
            throw ApiException.conflict("Send your location before going online");
        }
        d.setStatus(requested);
        return Mapper.toDriverDto(d);
    }

    /** Called from REST and from the WebSocket (/app/driver.location). */
    @Transactional
    public void updateLocation(Long userId, double lat, double lng) {
        if (lat < -90 || lat > 90 || lng < -180 || lng > 180) {
            throw ApiException.badRequest("Invalid coordinates");
        }
        Driver d = byUser(userId);
        d.setCurrentLat(lat);
        d.setCurrentLng(lng);
        d.setLocationUpdatedAt(Instant.now());

        // If the driver is on a trip, stream the position to that ride's rider.
        rides.findFirstByDriverIdAndStatusInOrderByRequestedAtDesc(d.getId(), LIVE_RIDE).ifPresent(ride ->
                notifications.sendLocation(ride.getRider().getEmail(), new LiveLocation(ride.getId(), lat, lng, Instant.now())));
    }

    @Transactional(readOnly = true)
    public List<NearbyDriverDto> nearby(double lat, double lng) {
        if (lat < -90 || lat > 90 || lng < -180 || lng > 180) {
            throw ApiException.badRequest("Invalid coordinates");
        }
        return matching.findNearbyDrivers(lat, lng, Set.of(), 10).stream()
                .map(c -> new NearbyDriverDto(c.driver().getId(), c.driver().getUser().getName(),
                        c.driver().getVehicleModel(), c.driver().getCurrentLat(), c.driver().getCurrentLng(),
                        Math.round(c.distanceKm() * 100.0) / 100.0, c.driver().getRatingAverage()))
                .toList();
    }

    /** Driver ranking: best average first, ties broken by number of ratings. Cached; evicted when a rating is added. */
    @Cacheable(value = "topDrivers", key = "#limit")
    @Transactional(readOnly = true)
    public List<DriverDto> top(int limit) {
        int size = Math.max(1, Math.min(limit, 50));
        return drivers.findByRatingCountGreaterThanOrderByRatingAverageDescRatingCountDesc(0, PageRequest.of(0, size))
                .stream().map(Mapper::toDriverDto).toList();
    }

    @Transactional(readOnly = true)
    public Page<RatingDto> ratingsFor(Long driverId, Pageable pageable) {
        return ratings.findByDriverId(driverId, pageable).map(Mapper::toRatingDto);
    }

    private Driver byUser(Long userId) {
        return drivers.findByUserId(userId).orElseThrow(() -> ApiException.forbidden("Driver profile not found"));
    }
}
