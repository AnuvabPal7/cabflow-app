package com.cab.booking.service;

import com.cab.booking.config.AppProperties;
import com.cab.booking.domain.Driver;
import com.cab.booking.domain.DriverStatus;
import com.cab.booking.repository.DriverRepository;
import com.cab.booking.util.GeoUtils;
import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.Comparator;
import java.util.List;
import java.util.Set;
import org.springframework.stereotype.Service;

/** Finds the closest available drivers for a pickup point. */
@Service
public class MatchingService {
    public record Candidate(Driver driver, double distanceKm) {}

    private final DriverRepository drivers;
    private final AppProperties props;

    public MatchingService(DriverRepository drivers, AppProperties props) {
        this.drivers = drivers;
        this.props = props;
    }

    public List<Candidate> findNearbyDrivers(double lat, double lng, Set<Long> excludeDriverIds, int limit) {
        double radius = props.matching().radiusKm();
        Instant freshAfter = Instant.now().minus(props.matching().locationStaleMinutes(), ChronoUnit.MINUTES);
        GeoUtils.Box box = GeoUtils.boundingBox(lat, lng, radius);

        return drivers.findInBox(DriverStatus.AVAILABLE, box.minLat(), box.maxLat(), box.minLng(), box.maxLng())
                .stream()
                .filter(d -> !excludeDriverIds.contains(d.getId()))
                .filter(d -> d.getLocationUpdatedAt() != null && d.getLocationUpdatedAt().isAfter(freshAfter))
                .map(d -> new Candidate(d, GeoUtils.haversineKm(lat, lng, d.getCurrentLat(), d.getCurrentLng())))
                .filter(c -> c.distanceKm() <= radius)
                .sorted(Comparator.comparingDouble(Candidate::distanceKm))
                .limit(limit)
                .toList();
    }
}
