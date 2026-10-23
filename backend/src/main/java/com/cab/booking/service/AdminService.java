package com.cab.booking.service;

import com.cab.booking.domain.DriverStatus;
import com.cab.booking.domain.PaymentStatus;
import com.cab.booking.domain.RideStatus;
import com.cab.booking.dto.Dtos.AdminStats;
import com.cab.booking.dto.Dtos.DriverDto;
import com.cab.booking.dto.Dtos.RideDto;
import com.cab.booking.dto.Dtos.UserDto;
import com.cab.booking.dto.Mapper;
import com.cab.booking.repository.AppUserRepository;
import com.cab.booking.repository.DriverRepository;
import com.cab.booking.repository.PaymentRepository;
import com.cab.booking.repository.RideRepository;
import java.math.BigDecimal;
import java.util.List;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@Transactional(readOnly = true)
public class AdminService {
    private final AppUserRepository users;
    private final DriverRepository drivers;
    private final RideRepository rides;
    private final PaymentRepository payments;

    public AdminService(AppUserRepository users, DriverRepository drivers, RideRepository rides,
                        PaymentRepository payments) {
        this.users = users;
        this.drivers = drivers;
        this.rides = rides;
        this.payments = payments;
    }

    public AdminStats stats() {
        BigDecimal revenue = payments.sumAmountByStatus(PaymentStatus.SUCCEEDED);
        return new AdminStats(
                users.count(),
                drivers.count(),
                drivers.countByStatus(DriverStatus.AVAILABLE),
                rides.countByStatusIn(List.of(RideStatus.REQUESTED, RideStatus.ACCEPTED,
                        RideStatus.ARRIVED, RideStatus.IN_PROGRESS)),
                rides.countByStatus(RideStatus.COMPLETED),
                rides.countByStatus(RideStatus.CANCELLED),
                revenue == null ? BigDecimal.ZERO : revenue);
    }

    public Page<UserDto> users(Pageable pageable) {
        return users.findAll(pageable).map(Mapper::toUserDto);
    }

    public Page<DriverDto> drivers(Pageable pageable) {
        return drivers.findAll(pageable).map(Mapper::toDriverDto);
    }

    public Page<RideDto> rides(Pageable pageable) {
        return rides.findAll(pageable).map(r -> Mapper.toRideDto(r, false));
    }
}
