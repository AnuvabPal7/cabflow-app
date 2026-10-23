package com.cab.booking.service;

import com.cab.booking.config.AppProperties;
import com.cab.booking.domain.VehicleType;
import com.cab.booking.dto.Dtos.Point;
import com.cab.booking.util.GeoUtils;
import com.cab.booking.web.ApiException;
import java.math.BigDecimal;
import java.math.RoundingMode;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

@Service
public class FareService {
    public record Quote(double distanceKm, int minutes, BigDecimal baseFare, BigDecimal distanceFare,
                        BigDecimal subtotal) {}

    private final AppProperties.FareProps fare;

    @Autowired
    public FareService(AppProperties props) {
        this(props.fare());
    }

    public FareService(AppProperties.FareProps fare) {
        this.fare = fare;
    }

    /** subtotal = vehicle base fare + (vehicle rate per km * road distance). Discount and GST are applied later. */
    public Quote quote(Point pickup, Point drop, VehicleType vehicleType) {
        VehicleType type = vehicleType == null ? VehicleType.SEDAN : vehicleType;
        double straight = GeoUtils.haversineKm(pickup.lat(), pickup.lng(), drop.lat(), drop.lng());
        if (straight < 0.1) {
            throw ApiException.badRequest("Pickup and drop-off are too close together");
        }
        if (straight > 300) {
            throw ApiException.badRequest("Trips longer than 300 km are not supported");
        }
        double km = Math.round(straight * fare.roadFactor() * 10.0) / 10.0;
        int minutes = Math.max(1, (int) Math.ceil(km / fare.avgSpeedKmh() * 60.0));

        BigDecimal baseFare = type.baseFare().setScale(2, RoundingMode.HALF_UP);
        BigDecimal distanceFare = type.perKm().multiply(BigDecimal.valueOf(km)).setScale(2, RoundingMode.HALF_UP);
        return new Quote(km, minutes, baseFare, distanceFare, baseFare.add(distanceFare));
    }

    /** GST on the amount left after the discount. */
    public BigDecimal tax(BigDecimal taxable) {
        return taxable.multiply(fare.taxRate()).setScale(2, RoundingMode.HALF_UP);
    }

    public String currency() {
        return fare.currency();
    }
}
