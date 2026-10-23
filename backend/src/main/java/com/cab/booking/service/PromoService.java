package com.cab.booking.service;

import com.cab.booking.domain.PromoCode;
import com.cab.booking.dto.Dtos.PromoDto;
import com.cab.booking.dto.Dtos.PromoRequest;
import com.cab.booking.dto.Mapper;
import com.cab.booking.repository.PromoCodeRepository;
import com.cab.booking.web.ApiException;
import java.math.BigDecimal;
import java.math.RoundingMode;
import java.util.List;
import java.util.Locale;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class PromoService {
    private final PromoCodeRepository promos;

    public PromoService(PromoCodeRepository promos) {
        this.promos = promos;
    }

    /** Returns null when no code was given; throws 400 when a code was given but is invalid. */
    @Transactional(readOnly = true)
    public PromoCode resolve(String code) {
        if (code == null || code.isBlank()) {
            return null;
        }
        return promos.findByCodeIgnoreCaseAndActiveTrue(code.trim())
                .orElseThrow(() -> ApiException.badRequest("Invalid or expired promo code"));
    }

    public BigDecimal discountFor(BigDecimal subtotal, PromoCode promo) {
        if (promo == null) {
            return BigDecimal.ZERO.setScale(2);
        }
        return subtotal.multiply(BigDecimal.valueOf(promo.getDiscountPercent()))
                .divide(BigDecimal.valueOf(100), 2, RoundingMode.HALF_UP);
    }

    // ---- admin ----
    @Transactional
    public PromoDto create(PromoRequest req) {
        String code = req.code().trim().toUpperCase(Locale.ROOT);
        if (promos.existsByCodeIgnoreCase(code)) {
            throw ApiException.conflict("Promo code already exists");
        }
        PromoCode p = new PromoCode();
        p.setCode(code);
        p.setDiscountPercent(req.discountPercent());
        return Mapper.toPromoDto(promos.save(p));
    }

    @Transactional(readOnly = true)
    public List<PromoDto> list() {
        return promos.findAll().stream().map(Mapper::toPromoDto).toList();
    }

    @Transactional
    public PromoDto toggle(Long id) {
        PromoCode p = promos.findById(id).orElseThrow(() -> ApiException.notFound("Promo code not found"));
        p.setActive(!p.isActive());
        return Mapper.toPromoDto(p);
    }
}
