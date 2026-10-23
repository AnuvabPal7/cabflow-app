package com.cab.booking.web;

import com.cab.booking.dto.Dtos.AuthResponse;
import com.cab.booking.dto.Dtos.ChangeEmailRequest;
import com.cab.booking.dto.Dtos.ChangePasswordRequest;
import com.cab.booking.dto.Dtos.LoginRequest;
import com.cab.booking.dto.Dtos.RegisterRequest;
import com.cab.booking.dto.Dtos.UserDto;
import com.cab.booking.security.AuthUser;
import com.cab.booking.service.AuthService;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

@RestController
public class AuthController {
    private final AuthService authService;

    public AuthController(AuthService authService) {
        this.authService = authService;
    }

    @PostMapping("/api/auth/register")
    @ResponseStatus(HttpStatus.CREATED)
    public AuthResponse register(@Valid @RequestBody RegisterRequest req) {
        return authService.register(req);
    }

    @PostMapping("/api/auth/login")
    public AuthResponse login(@Valid @RequestBody LoginRequest req) {
        return authService.login(req);
    }

    @GetMapping("/api/users/me")
    public UserDto me(@AuthenticationPrincipal AuthUser user) {
        return authService.me(user);
    }

    @PutMapping("/api/users/me/password")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void changePassword(@AuthenticationPrincipal AuthUser user, @Valid @RequestBody ChangePasswordRequest req) {
        authService.changePassword(user, req);
    }

    @PutMapping("/api/users/me/email")
    public AuthResponse changeEmail(@AuthenticationPrincipal AuthUser user, @Valid @RequestBody ChangeEmailRequest req) {
        return authService.changeEmail(user, req);
    }
}
