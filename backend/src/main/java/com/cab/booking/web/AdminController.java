package com.cab.booking.web;

import com.cab.booking.dto.Dtos.AdminStats;
import com.cab.booking.dto.Dtos.DriverDto;
import com.cab.booking.dto.Dtos.PromoDto;
import com.cab.booking.dto.Dtos.PromoRequest;
import com.cab.booking.dto.Dtos.RideDto;
import com.cab.booking.dto.Dtos.TicketDto;
import com.cab.booking.dto.Dtos.UserDto;
import com.cab.booking.service.AdminService;
import com.cab.booking.service.PromoService;
import com.cab.booking.service.SupportService;
import jakarta.validation.Valid;
import java.util.List;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.data.web.PageableDefault;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

/** Everything under /api/admin requires the ADMIN role (see SecurityConfig). */
@RestController
@RequestMapping("/api/admin")
public class AdminController {
    private final AdminService adminService;
    private final PromoService promoService;
    private final SupportService supportService;

    public AdminController(AdminService adminService, PromoService promoService, SupportService supportService) {
        this.adminService = adminService;
        this.promoService = promoService;
        this.supportService = supportService;
    }

    @GetMapping("/stats")
    public AdminStats stats() {
        return adminService.stats();
    }

    @GetMapping("/users")
    public Page<UserDto> users(@PageableDefault(size = 20, sort = "id", direction = Sort.Direction.DESC) Pageable p) {
        return adminService.users(p);
    }

    @GetMapping("/drivers")
    public Page<DriverDto> drivers(@PageableDefault(size = 20, sort = "id", direction = Sort.Direction.DESC) Pageable p) {
        return adminService.drivers(p);
    }

    @GetMapping("/rides")
    public Page<RideDto> rides(@PageableDefault(size = 20, sort = "requestedAt", direction = Sort.Direction.DESC) Pageable p) {
        return adminService.rides(p);
    }

    @GetMapping("/tickets")
    public Page<TicketDto> tickets(@PageableDefault(size = 20, sort = "createdAt", direction = Sort.Direction.DESC) Pageable p) {
        return supportService.all(p);
    }

    @PatchMapping("/tickets/{id}/resolve")
    public TicketDto resolve(@PathVariable Long id) {
        return supportService.resolve(id);
    }

    @GetMapping("/promos")
    public List<PromoDto> promos() {
        return promoService.list();
    }

    @PostMapping("/promos")
    @ResponseStatus(HttpStatus.CREATED)
    public PromoDto createPromo(@Valid @RequestBody PromoRequest req) {
        return promoService.create(req);
    }

    @PatchMapping("/promos/{id}/toggle")
    public PromoDto togglePromo(@PathVariable Long id) {
        return promoService.toggle(id);
    }
}
