package com.cab.booking.util;

public final class GeoUtils {
    private static final double EARTH_RADIUS_KM = 6371.0088;

    private GeoUtils() {}

    /** Great-circle distance between two lat/lng points (Haversine formula), in kilometres. */
    public static double haversineKm(double lat1, double lon1, double lat2, double lon2) {
        double dLat = Math.toRadians(lat2 - lat1);
        double dLon = Math.toRadians(lon2 - lon1);
        double a = Math.sin(dLat / 2) * Math.sin(dLat / 2)
                + Math.cos(Math.toRadians(lat1)) * Math.cos(Math.toRadians(lat2))
                * Math.sin(dLon / 2) * Math.sin(dLon / 2);
        return 2 * EARTH_RADIUS_KM * Math.asin(Math.min(1.0, Math.sqrt(a)));
    }

    public record Box(double minLat, double maxLat, double minLng, double maxLng) {}

    /**
     * A cheap rectangle around a point. Used so the database can filter with plain
     * BETWEEN comparisons (index friendly) before we run the exact Haversine check in Java.
     */
    public static Box boundingBox(double lat, double lng, double radiusKm) {
        double dLat = radiusKm / 111.0;
        double cos = Math.max(Math.cos(Math.toRadians(lat)), 0.01);
        double dLng = radiusKm / (111.320 * cos);
        return new Box(lat - dLat, lat + dLat, lng - dLng, lng + dLng);
    }
}
