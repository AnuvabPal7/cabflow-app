package com.cab.booking.service;

import com.cab.booking.domain.AppUser;
import com.cab.booking.domain.Driver;
import com.cab.booking.domain.Role;
import com.cab.booking.dto.Dtos.AuthResponse;
import com.cab.booking.dto.Dtos.ChangeEmailRequest;
import com.cab.booking.dto.Dtos.ChangePasswordRequest;
import com.cab.booking.dto.Dtos.LoginRequest;
import com.cab.booking.dto.Dtos.RegisterRequest;
import com.cab.booking.dto.Dtos.UserDto;
import com.cab.booking.dto.Mapper;
import com.cab.booking.repository.AppUserRepository;
import com.cab.booking.repository.DriverRepository;
import com.cab.booking.security.AuthUser;
import com.cab.booking.security.JwtService;
import com.cab.booking.web.ApiException;
import java.util.Locale;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.AuthenticationException;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class AuthService {
    private final AppUserRepository users;
    private final DriverRepository drivers;
    private final PasswordEncoder encoder;
    private final AuthenticationManager authenticationManager;
    private final JwtService jwtService;

    public AuthService(AppUserRepository users, DriverRepository drivers, PasswordEncoder encoder,
                       AuthenticationManager authenticationManager, JwtService jwtService) {
        this.users = users;
        this.drivers = drivers;
        this.encoder = encoder;
        this.authenticationManager = authenticationManager;
        this.jwtService = jwtService;
    }

    @Transactional
    public AuthResponse register(RegisterRequest req) {
        if (req.role() == Role.ADMIN) {
            throw ApiException.badRequest("Role must be RIDER or DRIVER");
        }
        String email = normalize(req.email());
        if (users.existsByEmail(email)) {
            throw ApiException.conflict("Email is already registered");
        }
        if (req.role() == Role.DRIVER && (isBlank(req.vehicleModel()) || isBlank(req.vehiclePlate()))) {
            throw ApiException.badRequest("Drivers must provide vehicleModel and vehiclePlate");
        }

        AppUser user = new AppUser();
        user.setName(req.name().trim());
        user.setEmail(email);
        user.setPasswordHash(encoder.encode(req.password()));   // BCrypt - the plain password is never stored
        user.setRole(req.role());
        users.save(user);

        if (req.role() == Role.DRIVER) {
            Driver driver = new Driver();
            driver.setUser(user);
            driver.setVehicleModel(req.vehicleModel().trim());
            driver.setVehiclePlate(req.vehiclePlate().trim().toUpperCase(Locale.ROOT));
            drivers.save(driver);
        }
        return new AuthResponse(jwtService.generate(user), Mapper.toUserDto(user));
    }

    @Transactional(readOnly = true)
    public AuthResponse login(LoginRequest req) {
        String email = normalize(req.email());
        try {
            authenticationManager.authenticate(new UsernamePasswordAuthenticationToken(email, req.password()));
        } catch (AuthenticationException e) {
            // Same message for "no such user" and "wrong password" so attackers cannot probe for accounts.
            throw ApiException.unauthorized("Invalid email or password");
        }
        AppUser user = users.findByEmail(email)
                .orElseThrow(() -> ApiException.unauthorized("Invalid email or password"));
        return new AuthResponse(jwtService.generate(user), Mapper.toUserDto(user));
    }

    @Transactional(readOnly = true)
    public UserDto me(AuthUser principal) {
        return users.findById(principal.getId())
                .map(Mapper::toUserDto)
                .orElseThrow(() -> ApiException.notFound("User not found"));
    }

    /** Wrong current password is a 400 (not 401), otherwise the frontend would treat it as an expired session. */
    @Transactional
    public void changePassword(AuthUser principal, ChangePasswordRequest req) {
        AppUser user = users.findById(principal.getId()).orElseThrow(() -> ApiException.notFound("User not found"));
        if (!encoder.matches(req.currentPassword(), user.getPasswordHash())) {
            throw ApiException.badRequest("Current password is incorrect");
        }
        if (req.currentPassword().equals(req.newPassword())) {
            throw ApiException.badRequest("The new password must be different from the current one");
        }
        user.setPasswordHash(encoder.encode(req.newPassword()));
    }

    /** The JWT subject is the email, so a new token is issued; the old token stops working. */
    @Transactional
    public AuthResponse changeEmail(AuthUser principal, ChangeEmailRequest req) {
        AppUser user = users.findById(principal.getId()).orElseThrow(() -> ApiException.notFound("User not found"));
        if (!encoder.matches(req.currentPassword(), user.getPasswordHash())) {
            throw ApiException.badRequest("Current password is incorrect");
        }
        String email = normalize(req.newEmail());
        if (email.equals(user.getEmail())) {
            throw ApiException.badRequest("That is already your email");
        }
        if (users.existsByEmail(email)) {
            throw ApiException.conflict("Email is already registered");
        }
        user.setEmail(email);
        return new AuthResponse(jwtService.generate(user), Mapper.toUserDto(user));
    }

    private static String normalize(String email) {
        return email.trim().toLowerCase(Locale.ROOT);
    }

    private static boolean isBlank(String s) {
        return s == null || s.isBlank();
    }
}
