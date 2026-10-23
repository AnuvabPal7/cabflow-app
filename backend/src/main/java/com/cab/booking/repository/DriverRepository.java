package com.cab.booking.repository;

import com.cab.booking.domain.Driver;
import com.cab.booking.domain.DriverStatus;
import java.util.List;
import java.util.Optional;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface DriverRepository extends JpaRepository<Driver, Long> {

    @EntityGraph(attributePaths = "user")
    Optional<Driver> findByUserId(Long userId);

    long countByStatus(DriverStatus status);

    /** Drivers with the given status whose last known position is inside the rectangle. */
    @Query("select d from Driver d join fetch d.user "
            + "where d.status = :status "
            + "and d.currentLat between :minLat and :maxLat "
            + "and d.currentLng between :minLng and :maxLng")
    List<Driver> findInBox(@Param("status") DriverStatus status,
                           @Param("minLat") double minLat, @Param("maxLat") double maxLat,
                           @Param("minLng") double minLng, @Param("maxLng") double maxLng);

    @EntityGraph(attributePaths = "user")
    List<Driver> findByRatingCountGreaterThanOrderByRatingAverageDescRatingCountDesc(int minRatings, Pageable pageable);

    @Override
    @EntityGraph(attributePaths = "user")
    Page<Driver> findAll(Pageable pageable);
}
