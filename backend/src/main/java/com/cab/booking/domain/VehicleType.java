package com.cab.booking.domain;

import java.math.BigDecimal;

/** Ride categories the rider can pick. Rates are in the configured currency (INR). */
public enum VehicleType {
    AUTO(30, 11),
    MINI(45, 14),
    SEDAN(75, 18),
    SUV(110, 24),
    PREMIER(180, 36);

    private final BigDecimal baseFare;
    private final BigDecimal perKm;

    VehicleType(int baseFare, int perKm) {
        this.baseFare = BigDecimal.valueOf(baseFare);
        this.perKm = BigDecimal.valueOf(perKm);
    }

    public BigDecimal baseFare() { return baseFare; }
    public BigDecimal perKm() { return perKm; }
}
