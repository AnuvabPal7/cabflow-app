package com.cab.booking.web;

import com.cab.booking.dto.Dtos.RatingDto;
import com.cab.booking.dto.Dtos.RatingRequest;
import com.cab.booking.security.AuthUser;
import com.cab.booking.service.RatingService;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/ratings")
public class RatingController {
    private final RatingService ratingService;

    public RatingController(RatingService ratingService) {
        this.ratingService = ratingService;
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public RatingDto rate(@AuthenticationPrincipal AuthUser user, @Valid @RequestBody RatingRequest req) {
        return ratingService.rate(user.getId(), req);
    }
}
