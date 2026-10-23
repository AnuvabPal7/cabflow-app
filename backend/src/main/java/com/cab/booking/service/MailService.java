package com.cab.booking.service;

import com.cab.booking.config.AppProperties;
import jakarta.mail.internet.MimeMessage;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.ObjectProvider;
import org.springframework.core.io.ByteArrayResource;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.mail.javamail.MimeMessageHelper;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Service;

@Service
public class MailService {
    private static final Logger log = LoggerFactory.getLogger(MailService.class);

    private final ObjectProvider<JavaMailSender> mailSender;
    private final ReceiptService receiptService;
    private final AppProperties props;

    public MailService(ObjectProvider<JavaMailSender> mailSender, ReceiptService receiptService, AppProperties props) {
        this.mailSender = mailSender;
        this.receiptService = receiptService;
        this.props = props;
    }

    /** Runs in a background thread; a mail failure must never break the payment flow. */
    @Async
    public void sendReceipt(Long rideId) {
        if (!props.mail().enabled()) {
            log.info("Mail disabled (MAIL_ENABLED=false) - skipping receipt email for ride {}", rideId);
            return;
        }
        JavaMailSender sender = mailSender.getIfAvailable();
        if (sender == null) {
            log.warn("No JavaMailSender configured - cannot email receipt for ride {}", rideId);
            return;
        }
        try {
            ReceiptService.ReceiptFile receipt = receiptService.generate(rideId);
            MimeMessage message = sender.createMimeMessage();
            MimeMessageHelper helper = new MimeMessageHelper(message, true, "UTF-8");
            helper.setFrom(props.mail().from());
            helper.setTo(receipt.riderEmail());
            helper.setSubject("Your ride receipt #" + rideId);
            helper.setText("Thanks for riding with us. Your receipt is attached.");
            helper.addAttachment("receipt-" + rideId + ".pdf", new ByteArrayResource(receipt.pdf()));
            sender.send(message);
            log.info("Receipt emailed for ride {}", rideId);
        } catch (Exception e) {
            log.warn("Could not email receipt for ride {}: {}", rideId, e.getMessage());
        }
    }
}
