package com.cab.booking.repository;

import com.cab.booking.domain.Payment;
import com.cab.booking.domain.PaymentStatus;
import java.math.BigDecimal;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface PaymentRepository extends JpaRepository<Payment, Long> {
    Optional<Payment> findByRideId(Long rideId);

    Optional<Payment> findByStripePaymentIntentId(String paymentIntentId);

    /** Returns null when there are no matching rows. */
    @Query("select sum(p.amount) from Payment p where p.status = :status")
    BigDecimal sumAmountByStatus(@Param("status") PaymentStatus status);
}
