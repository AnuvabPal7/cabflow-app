package com.cab.booking.config;

import com.cab.booking.domain.AppUser;
import com.cab.booking.domain.Role;
import com.cab.booking.repository.AppUserRepository;
import java.util.Locale;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;

/** Creates the first ADMIN account on startup (admins cannot self-register). */
@Component
public class AdminSeeder implements ApplicationRunner {
    private static final Logger log = LoggerFactory.getLogger(AdminSeeder.class);

    private final AppUserRepository users;
    private final PasswordEncoder encoder;
    private final AppProperties props;

    public AdminSeeder(AppUserRepository users, PasswordEncoder encoder, AppProperties props) {
        this.users = users;
        this.encoder = encoder;
        this.props = props;
    }

    @Override
    public void run(ApplicationArguments args) {
        String email = props.admin().email() == null ? "" : props.admin().email().trim().toLowerCase(Locale.ROOT);
        String password = props.admin().password();
        if (email.isEmpty() || password == null || password.length() < 8) {
            log.warn("Admin account not created: set ADMIN_EMAIL and an ADMIN_PASSWORD of 8+ characters");
            return;
        }
        if (users.existsByRole(Role.ADMIN) || users.existsByEmail(email)) {
            return;   // an admin already exists (they may have changed their email in the UI)
        }
        AppUser admin = new AppUser();
        admin.setName(props.admin().name());
        admin.setEmail(email);
        admin.setPasswordHash(encoder.encode(password));
        admin.setRole(Role.ADMIN);
        users.save(admin);
        log.info("Created admin account {}", email);
    }
}
