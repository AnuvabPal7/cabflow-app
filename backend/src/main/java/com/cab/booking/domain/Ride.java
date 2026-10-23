package com.cab.booking.domain;

import jakarta.persistence.*;
import java.math.BigDecimal;
import java.time.Instant;
import java.util.HashSet;
import java.util.Set;

@Entity
@Table(name = "rides", indexes = {
        @Index(name = "idx_rides_status", columnList = "status"),
        @Index(name = "idx_rides_rider", columnList = "rider_id"),
        @Index(name = "idx_rides_driver", columnList = "driver_id")
})
public class Ride {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    /** Optimistic lock: if two drivers accept the same ride at once, the second one fails with 409. */
    @Version
    private Long version;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "rider_id", nullable = false)
    private AppUser rider;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "driver_id")
    private Driver driver;

    @Column(name = "pickup_lat", nullable = false) private double pickupLat;
    @Column(name = "pickup_lng", nullable = false) private double pickupLng;
    @Column(name = "pickup_address") private String pickupAddress;
    @Column(name = "drop_lat", nullable = false) private double dropLat;
    @Column(name = "drop_lng", nullable = false) private double dropLng;
    @Column(name = "drop_address") private String dropAddress;

    @Enumerated(EnumType.STRING)
    @Column(name = "vehicle_type", nullable = false, length = 20)
    private VehicleType vehicleType = VehicleType.SEDAN;

    @Column(name = "base_fare", nullable = false, precision = 10, scale = 2)
    private BigDecimal baseFare = BigDecimal.ZERO;

    @Column(name = "distance_fare", nullable = false, precision = 10, scale = 2)
    private BigDecimal distanceFare = BigDecimal.ZERO;

    @Column(name = "tax_amount", nullable = false, precision = 10, scale = 2)
    private BigDecimal taxAmount = BigDecimal.ZERO;

    @Column(name = "distance_km", nullable = false) private double distanceKm;
    @Column(name = "estimated_minutes", nullable = false) private int estimatedMinutes;

    /** Final amount the rider pays (after discount, including GST). */
    @Column(nullable = false, precision = 10, scale = 2)
    private BigDecimal fare;

    @Column(nullable = false, precision = 10, scale = 2)
    private BigDecimal discount = BigDecimal.ZERO;

    @Column(name = "promo_code", length = 30)
    private String promoCode;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private RideStatus status = RideStatus.REQUESTED;

    @Column(name = "start_otp", nullable = false, length = 4)
    private String startOtp;

    @Column(name = "requested_at", nullable = false) private Instant requestedAt = Instant.now();
    @Column(name = "accepted_at") private Instant acceptedAt;
    @Column(name = "started_at") private Instant startedAt;
    @Column(name = "completed_at") private Instant completedAt;

    @ElementCollection(fetch = FetchType.LAZY)
    @CollectionTable(name = "ride_declined_drivers", joinColumns = @JoinColumn(name = "ride_id"))
    @Column(name = "driver_id")
    private Set<Long> declinedDriverIds = new HashSet<>();

    public Long getId() { return id; }
    public AppUser getRider() { return rider; }
    public void setRider(AppUser rider) { this.rider = rider; }
    public Driver getDriver() { return driver; }
    public void setDriver(Driver driver) { this.driver = driver; }
    public double getPickupLat() { return pickupLat; }
    public void setPickupLat(double v) { this.pickupLat = v; }
    public double getPickupLng() { return pickupLng; }
    public void setPickupLng(double v) { this.pickupLng = v; }
    public String getPickupAddress() { return pickupAddress; }
    public void setPickupAddress(String v) { this.pickupAddress = v; }
    public double getDropLat() { return dropLat; }
    public void setDropLat(double v) { this.dropLat = v; }
    public double getDropLng() { return dropLng; }
    public void setDropLng(double v) { this.dropLng = v; }
    public String getDropAddress() { return dropAddress; }
    public void setDropAddress(String v) { this.dropAddress = v; }
    public VehicleType getVehicleType() { return vehicleType; }
    public void setVehicleType(VehicleType vehicleType) { this.vehicleType = vehicleType; }
    public BigDecimal getBaseFare() { return baseFare; }
    public void setBaseFare(BigDecimal baseFare) { this.baseFare = baseFare; }
    public BigDecimal getDistanceFare() { return distanceFare; }
    public void setDistanceFare(BigDecimal distanceFare) { this.distanceFare = distanceFare; }
    public BigDecimal getTaxAmount() { return taxAmount; }
    public void setTaxAmount(BigDecimal taxAmount) { this.taxAmount = taxAmount; }
    public double getDistanceKm() { return distanceKm; }
    public void setDistanceKm(double v) { this.distanceKm = v; }
    public int getEstimatedMinutes() { return estimatedMinutes; }
    public void setEstimatedMinutes(int v) { this.estimatedMinutes = v; }
    public BigDecimal getFare() { return fare; }
    public void setFare(BigDecimal fare) { this.fare = fare; }
    public BigDecimal getDiscount() { return discount; }
    public void setDiscount(BigDecimal discount) { this.discount = discount; }
    public String getPromoCode() { return promoCode; }
    public void setPromoCode(String promoCode) { this.promoCode = promoCode; }
    public RideStatus getStatus() { return status; }
    public void setStatus(RideStatus status) { this.status = status; }
    public String getStartOtp() { return startOtp; }
    public void setStartOtp(String startOtp) { this.startOtp = startOtp; }
    public Instant getRequestedAt() { return requestedAt; }
    public Instant getAcceptedAt() { return acceptedAt; }
    public void setAcceptedAt(Instant acceptedAt) { this.acceptedAt = acceptedAt; }
    public Instant getStartedAt() { return startedAt; }
    public void setStartedAt(Instant startedAt) { this.startedAt = startedAt; }
    public Instant getCompletedAt() { return completedAt; }
    public void setCompletedAt(Instant completedAt) { this.completedAt = completedAt; }
    public Set<Long> getDeclinedDriverIds() { return declinedDriverIds; }
}
