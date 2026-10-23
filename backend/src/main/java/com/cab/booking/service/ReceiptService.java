package com.cab.booking.service;

import com.cab.booking.domain.Payment;
import com.cab.booking.domain.PaymentStatus;
import com.cab.booking.domain.Ride;
import com.cab.booking.repository.PaymentRepository;
import com.cab.booking.repository.RideRepository;
import com.cab.booking.web.ApiException;
import com.itextpdf.text.Chunk;
import com.itextpdf.text.Document;
import com.itextpdf.text.DocumentException;
import com.itextpdf.text.Font;
import com.itextpdf.text.FontFactory;
import com.itextpdf.text.PageSize;
import com.itextpdf.text.Paragraph;
import com.itextpdf.text.Phrase;
import com.itextpdf.text.pdf.PdfPTable;
import com.itextpdf.text.pdf.PdfWriter;
import java.io.ByteArrayOutputStream;
import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.ZoneOffset;
import java.time.format.DateTimeFormatter;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/** Builds the PDF receipt for a paid ride (iText 5). Access control is done by the caller. */
@Service
public class ReceiptService {
    public record ReceiptFile(String riderEmail, byte[] pdf) {}

    private static final Font TITLE = FontFactory.getFont(FontFactory.HELVETICA_BOLD, 20);
    private static final Font BOLD = FontFactory.getFont(FontFactory.HELVETICA_BOLD, 11);
    private static final Font NORMAL = FontFactory.getFont(FontFactory.HELVETICA, 11);
    private static final DateTimeFormatter DATE = DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm 'UTC'");

    private final RideRepository rides;
    private final PaymentRepository payments;

    public ReceiptService(RideRepository rides, PaymentRepository payments) {
        this.rides = rides;
        this.payments = payments;
    }

    @Transactional(readOnly = true)
    public ReceiptFile generate(Long rideId) {
        Ride ride = rides.findById(rideId).orElseThrow(() -> ApiException.notFound("Ride not found"));
        Payment payment = payments.findByRideId(rideId)
                .filter(p -> p.getStatus() == PaymentStatus.SUCCEEDED)
                .orElseThrow(() -> ApiException.conflict("A receipt is available once the ride is paid"));

        BigDecimal subtotal = ride.getBaseFare().add(ride.getDistanceFare());
        String currency = payment.getCurrency();

        ByteArrayOutputStream out = new ByteArrayOutputStream();
        Document doc = new Document(PageSize.A4, 48, 48, 48, 48);
        try {
            PdfWriter.getInstance(doc, out);
            doc.open();
            doc.add(new Paragraph("Cab Booking - Ride Receipt", TITLE));
            doc.add(new Paragraph("Receipt #" + ride.getId(), NORMAL));
            doc.add(Chunk.NEWLINE);

            PdfPTable table = new PdfPTable(2);
            table.setWidthPercentage(100);
            row(table, "Date", payment.getPaidAt() == null ? "-" : DATE.format(payment.getPaidAt().atOffset(ZoneOffset.UTC)));
            row(table, "Rider", ride.getRider().getName());
            row(table, "Driver", ride.getDriver() == null ? "-" : ride.getDriver().getUser().getName());
            row(table, "Vehicle", ride.getDriver() == null ? "-"
                    : ride.getDriver().getVehicleModel() + " (" + ride.getDriver().getVehiclePlate() + ")");
            row(table, "Pickup", describe(ride.getPickupAddress(), ride.getPickupLat(), ride.getPickupLng()));
            row(table, "Drop-off", describe(ride.getDropAddress(), ride.getDropLat(), ride.getDropLng()));
            row(table, "Distance", ride.getDistanceKm() + " km");
            row(table, "Fare", currency + " " + subtotal.setScale(2, RoundingMode.HALF_UP));
            row(table, "Discount" + (ride.getPromoCode() == null ? "" : " (" + ride.getPromoCode() + ")"),
                    "- " + currency + " " + ride.getDiscount().setScale(2, RoundingMode.HALF_UP));
            row(table, "GST", currency + " " + ride.getTaxAmount().setScale(2, RoundingMode.HALF_UP));
            row(table, "Total paid", currency + " " + payment.getAmount().setScale(2, RoundingMode.HALF_UP));
            row(table, "Payment reference", String.valueOf(payment.getStripePaymentIntentId()));
            doc.add(table);

            doc.add(Chunk.NEWLINE);
            doc.add(new Paragraph("Thank you for riding with us.", NORMAL));
            doc.close();
        } catch (DocumentException e) {
            throw new IllegalStateException("Could not build the receipt PDF", e);
        }
        return new ReceiptFile(ride.getRider().getEmail(), out.toByteArray());
    }

    private static void row(PdfPTable table, String label, String value) {
        table.addCell(new Phrase(label, BOLD));
        table.addCell(new Phrase(value, NORMAL));
    }

    private static String describe(String address, double lat, double lng) {
        String coords = String.format("%.5f, %.5f", lat, lng);
        return address == null || address.isBlank() ? coords : address + " (" + coords + ")";
    }
}
