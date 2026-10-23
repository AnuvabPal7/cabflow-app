package com.cab.booking.repository;

import com.cab.booking.domain.Ride;
import com.cab.booking.domain.RideStatus;
import java.time.Instant;
import java.util.Collection;
import java.util.List;
import java.util.Optional;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface RideRepository extends JpaRepository<Ride, Long> {

    Optional<Ride> findFirstByRiderIdAndStatusInOrderByRequestedAtDesc(Long riderId, Collection<RideStatus> statuses);

    Optional<Ride> findFirstByDriverIdAndStatusInOrderByRequestedAtDesc(Long driverId, Collection<RideStatus> statuses);

    @EntityGraph(attributePaths = {"rider", "driver", "driver.user"})
    Page<Ride> findByRiderId(Long riderId, Pageable pageable);

    @EntityGraph(attributePaths = {"rider", "driver", "driver.user"})
    Page<Ride> findByDriverId(Long driverId, Pageable pageable);

    List<Ride> findByStatusAndRequestedAtBefore(RideStatus status, Instant cutoff);

    long countByStatus(RideStatus status);

    long countByStatusIn(Collection<RideStatus> statuses);

    /** Open ride requests whose pickup point is inside the rectangle (oldest first). */
    @Query("select r from Ride r join fetch r.rider "
            + "where r.status = :status "
            + "and r.pickupLat between :minLat and :maxLat "
            + "and r.pickupLng between :minLng and :maxLng "
            + "order by r.requestedAt asc")
    List<Ride> findOpenInBox(@Param("status") RideStatus status,
                             @Param("minLat") double minLat, @Param("maxLat") double maxLat,
                             @Param("minLng") double minLng, @Param("maxLng") double maxLng);

    @Override
    @EntityGraph(attributePaths = {"rider", "driver", "driver.user"})
    Page<Ride> findAll(Pageable pageable);
}
