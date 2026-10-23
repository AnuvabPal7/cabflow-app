package com.cab.booking.repository;

import com.cab.booking.domain.Rating;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface RatingRepository extends JpaRepository<Rating, Long> {
    boolean existsByRideId(Long rideId);

    long countByDriverId(Long driverId);

    /** Returns null when the driver has no ratings. */
    @Query("select avg(r.stars) from Rating r where r.driver.id = :driverId")
    Double averageStars(@Param("driverId") Long driverId);

    @EntityGraph(attributePaths = "rider")
    Page<Rating> findByDriverId(Long driverId, Pageable pageable);
}
