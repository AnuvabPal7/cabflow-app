package com.cab.booking.service;

import com.cab.booking.config.AppProperties;
import com.cab.booking.domain.Driver;
import com.cab.booking.domain.Payment;
import com.cab.booking.domain.PaymentStatus;
import com.cab.booking.domain.Ride;
import com.cab.booking.domain.RideStatus;
import com.cab.booking.dto.Dtos.PaymentIntentDto;
import com.cab.booking.dto.Mapper;
import com.cab.booking.repository.DriverRepository;
import com.cab.booking.repository.PaymentRepository;
import com.cab.booking.repository.RideRepository;
import com.cab.booking.util.TxUtil;
import com.cab.booking.web.ApiException;
import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.stripe.Stripe;
import com.stripe.exception.SignatureVerificationException;
import com.stripe.exception.StripeException;
import com.stripe.model.PaymentIntent;
import com.stripe.net.RequestOptions;
import com.stripe.net.Webhook;
import com.stripe.param.PaymentIntentCreateParams;
import jakarta.annotation.PostConstruct;
import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.Instant;
import java.util.Locale;
import java.util.UUID;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * Stripe flow (as in the project doc):
 *  ride completes -> POST .../intent creates a PaymentIntent -> the frontend confirms it with Stripe.js
 *  -> Stripe calls our webhook -> we verify the signature and mark the payment SUCCEEDED.
 *
 * Without a STRIPE_SECRET_KEY the service runs in MOCK mode so you can develop without a Stripe account.
 */
@Service
public class PaymentService {
    private static final Logger log = LoggerFactory.getLogger(PaymentService.class);

    private final AppProperties props;
    private final PaymentRepository payments;
    private final RideRepository rides;
    private final DriverRepository drivers;
    private final NotificationService notifications;
    private final MailService mailService;
    private final ObjectMapper objectMapper;

    public PaymentService(AppProperties props, PaymentRepository payments, RideRepository rides,
                          DriverRepository drivers, NotificationService notifications,
                          MailService mailService, ObjectMapper objectMapper) {
        this.props = props;
        this.payments = payments;
        this.rides = rides;
        this.drivers = drivers;
        this.notifications = notifications;
        this.mailService = mailService;
        this.objectMapper = objectMapper;
    }

    @PostConstruct
    void init() {
        if (live()) {
            Stripe.apiKey = props.stripe().secretKey();
            log.info("Stripe live/test mode enabled");
        } else {
            log.info("Stripe not configured - payments run in MOCK mode (mock-enabled={})", props.stripe().mockEnabled());
        }
    }

    private boolean live() {
        String key = props.stripe().secretKey();
        return key != null && !key.isBlank();
    }

    @Transactional
    public PaymentIntentDto createIntent(Long riderUserId, Long rideId) {
        Ride ride = ownedCompletedRide(riderUserId, rideId);
        if (!live() && !props.stripe().mockEnabled()) {
            throw ApiException.of(HttpStatus.SERVICE_UNAVAILABLE, "Payments are not configured");
        }
        String currency = props.fare().currency();
        Payment payment = payments.findByRideId(rideId).orElseGet(() -> {
            Payment p = new Payment();
            p.setRide(ride);
            p.setAmount(ride.getFare());
            p.setCurrency(currency);
            return p;
        });
        if (payment.getStatus() == PaymentStatus.SUCCEEDED) {
            throw ApiException.conflict("This ride is already paid");
        }

        String clientSecret;
        if (live()) {
            try {
                PaymentIntent intent;
                if (payment.getStripePaymentIntentId() == null) {
                    PaymentIntentCreateParams params = PaymentIntentCreateParams.builder()
                            .setAmount(toMinorUnits(ride.getFare()))
                            .setCurrency(currency.toLowerCase(Locale.ROOT))
                            .putMetadata("rideId", String.valueOf(rideId))
                            .setAutomaticPaymentMethods(
                                    PaymentIntentCreateParams.AutomaticPaymentMethods.builder().setEnabled(true).build())
                            .build();
                    // Idempotency key: retrying this request can never create two charges for one ride.
                    RequestOptions options = RequestOptions.builder().setIdempotencyKey("ride-payment-" + rideId).build();
                    intent = PaymentIntent.create(params, options);
                    payment.setStripePaymentIntentId(intent.getId());
                } else {
                    intent = PaymentIntent.retrieve(payment.getStripePaymentIntentId());
                }
                clientSecret = intent.getClientSecret();
            } catch (StripeException e) {
                log.error("Stripe error while creating PaymentIntent for ride {}", rideId, e);
                throw ApiException.of(HttpStatus.BAD_GATEWAY, "Payment provider error");
            }
        } else {
            if (payment.getStripePaymentIntentId() == null) {
                payment.setStripePaymentIntentId("pi_mock_" + UUID.randomUUID().toString().replace("-", ""));
            }
            clientSecret = payment.getStripePaymentIntentId() + "_secret_mock";
        }

        payment.setStatus(PaymentStatus.PENDING);
        payments.save(payment);
        return toDto(payment, clientSecret);
    }

    /** MOCK mode only: pretends Stripe confirmed the payment. Disabled as soon as a real Stripe key is set. */
    @Transactional
    public PaymentIntentDto confirmMock(Long riderUserId, Long rideId) {
        if (live() || !props.stripe().mockEnabled()) {
            throw ApiException.notFound("Mock payments are disabled");
        }
        ownedCompletedRide(riderUserId, rideId);
        Payment payment = payments.findByRideId(rideId)
                .orElseThrow(() -> ApiException.conflict("Create the payment intent first"));
        markSucceeded(payment);
        return toDto(payment, null);
    }

    @Transactional(readOnly = true)
    public PaymentIntentDto status(Long riderUserId, Long rideId) {
        Ride ride = rides.findById(rideId).orElseThrow(() -> ApiException.notFound("Ride not found"));
        if (!ride.getRider().getId().equals(riderUserId)) {
            throw ApiException.forbidden("Not your ride");
        }
        Payment payment = payments.findByRideId(rideId)
                .orElseThrow(() -> ApiException.notFound("No payment for this ride yet"));
        return toDto(payment, null);
    }

    /** Called by Stripe. The signature check proves the request really came from Stripe. */
    @Transactional
    public void handleWebhook(String payload, String signatureHeader) {
        String secret = props.stripe().webhookSecret();
        if (secret == null || secret.isBlank()) {
            throw ApiException.of(HttpStatus.SERVICE_UNAVAILABLE, "Webhook secret is not configured");
        }
        try {
            Webhook.constructEvent(payload, signatureHeader, secret);   // throws if the signature is wrong
        } catch (SignatureVerificationException e) {
            throw ApiException.badRequest("Invalid webhook signature");
        }

        // Read the few fields we need straight from the JSON, so this keeps working
        // even if the Stripe API version of the account differs from the SDK's.
        JsonNode root;
        try {
            root = objectMapper.readTree(payload);
        } catch (JsonProcessingException e) {
            throw ApiException.badRequest("Malformed webhook body");
        }
        String type = root.path("type").asText("");
        String intentId = root.path("data").path("object").path("id").asText("");

        switch (type) {
            case "payment_intent.succeeded" -> payments.findByStripePaymentIntentId(intentId).ifPresent(this::markSucceeded);
            case "payment_intent.payment_failed" -> payments.findByStripePaymentIntentId(intentId).ifPresent(p -> {
                if (p.getStatus() != PaymentStatus.SUCCEEDED) {
                    p.setStatus(PaymentStatus.FAILED);
                }
            });
            default -> log.debug("Ignoring Stripe event {}", type);
        }
    }

    // ------------------------------------------------------------------ helpers

    private void markSucceeded(Payment payment) {
        if (payment.getStatus() == PaymentStatus.SUCCEEDED) {
            return;   // webhooks can be delivered more than once - stay idempotent
        }
        payment.setStatus(PaymentStatus.SUCCEEDED);
        payment.setPaidAt(Instant.now());
        payments.save(payment);

        Ride ride = payment.getRide();
        Driver driver = ride.getDriver();
        if (driver != null) {
            BigDecimal share = payment.getAmount().multiply(props.fare().driverShare()).setScale(2, RoundingMode.HALF_UP);
            driver.setTotalEarnings(driver.getTotalEarnings().add(share));
            drivers.save(driver);
        }
        notifications.sendRideEvent(ride.getRider().getEmail(), "PAYMENT_SUCCEEDED", Mapper.toRideDto(ride, false));

        Long rideId = ride.getId();
        TxUtil.afterCommit(() -> mailService.sendReceipt(rideId));   // async, only after the payment is committed
    }

    private Ride ownedCompletedRide(Long riderUserId, Long rideId) {
        Ride ride = rides.findById(rideId).orElseThrow(() -> ApiException.notFound("Ride not found"));
        if (!ride.getRider().getId().equals(riderUserId)) {
            throw ApiException.forbidden("Not your ride");
        }
        if (ride.getStatus() != RideStatus.COMPLETED) {
            throw ApiException.conflict("The ride is not completed yet");
        }
        return ride;
    }

    /** Stripe wants the smallest currency unit (paise/cents). Valid for 2-decimal currencies like INR and USD. */
    private static long toMinorUnits(BigDecimal amount) {
        return amount.movePointRight(2).setScale(0, RoundingMode.HALF_UP).longValueExact();
    }

    private PaymentIntentDto toDto(Payment p, String clientSecret) {
        return new PaymentIntentDto(p.getRide().getId(), p.getStripePaymentIntentId(), clientSecret,
                p.getAmount(), p.getCurrency(), p.getStatus(), !live());
    }
}
