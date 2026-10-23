package com.cab.booking.service;

import com.cab.booking.domain.Driver;
import com.cab.booking.domain.Rating;
import com.cab.booking.domain.Ride;
import com.cab.booking.domain.RideStatus;
import com.cab.booking.dto.Dtos.RatingDto;
import com.cab.booking.dto.Dtos.RatingRequest;
import com.cab.booking.dto.Mapper;
import com.cab.booking.repository.RatingRepository;
import com.cab.booking.repository.RideRepository;
import com.cab.booking.web.ApiException;
import org.springframework.cache.annotation.CacheEvict;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class RatingService {
    private final RatingRepository ratings;
    private final RideRepository rides;

    public RatingService(RatingRepository ratings, RideRepository rides) {
        this.ratings = ratings;
        this.rides = rides;
    }

    @Transactional
    @CacheEvict(value = "topDrivers", allEntries = true)
    public RatingDto rate(Long riderUserId, RatingRequest req) {
        Ride ride = rides.findById(req.rideId()).orElseThrow(() -> ApiException.notFound("Ride not found"));
        if (!ride.getRider().getId().equals(riderUserId)) {
            throw ApiException.forbidden("You can only rate your own rides");
        }
        if (ride.getStatus() != RideStatus.COMPLETED || ride.getDriver() == null) {
            throw ApiException.conflict("Only completed rides can be rated");
        }
        if (ratings.existsByRideId(ride.getId())) {
            throw ApiException.conflict("This ride has already been rated");
        }

        Driver driver = ride.getDriver();
        Rating rating = new Rating();
        rating.setRide(ride);
        rating.setRider(ride.getRider());
        rating.setDriver(driver);
        rating.setStars(req.stars());
        rating.setComment(req.comment() == null || req.comment().isBlank() ? null : req.comment().trim());
        ratings.save(rating);

        // Recompute from the stored ratings (the aggregate query flushes the insert first),
        // so two simultaneous ratings can never leave the average wrong.
        Double avg = ratings.averageStars(driver.getId());
        driver.setRatingAverage(avg == null ? 0.0 : Math.round(avg * 100.0) / 100.0);
        driver.setRatingCount((int) ratings.countByDriverId(driver.getId()));

        return Mapper.toRatingDto(rating);
    }
}
