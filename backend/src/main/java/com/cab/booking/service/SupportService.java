package com.cab.booking.service;

import com.cab.booking.domain.AppUser;
import com.cab.booking.domain.SupportTicket;
import com.cab.booking.domain.TicketStatus;
import com.cab.booking.dto.Dtos.TicketDto;
import com.cab.booking.dto.Dtos.TicketRequest;
import com.cab.booking.dto.Mapper;
import com.cab.booking.repository.AppUserRepository;
import com.cab.booking.repository.SupportTicketRepository;
import com.cab.booking.web.ApiException;
import java.util.List;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class SupportService {
    private final SupportTicketRepository tickets;
    private final AppUserRepository users;

    public SupportService(SupportTicketRepository tickets, AppUserRepository users) {
        this.tickets = tickets;
        this.users = users;
    }

    @Transactional
    public TicketDto create(Long userId, TicketRequest req) {
        AppUser user = users.findById(userId).orElseThrow(() -> ApiException.notFound("User not found"));
        SupportTicket t = new SupportTicket();
        t.setUser(user);
        t.setSubject(req.subject().trim());
        t.setMessage(req.message().trim());
        return Mapper.toTicketDto(tickets.save(t));
    }

    @Transactional(readOnly = true)
    public List<TicketDto> mine(Long userId) {
        return tickets.findByUserIdOrderByCreatedAtDesc(userId).stream().map(Mapper::toTicketDto).toList();
    }

    @Transactional(readOnly = true)
    public Page<TicketDto> all(Pageable pageable) {
        return tickets.findAll(pageable).map(Mapper::toTicketDto);
    }

    @Transactional
    public TicketDto resolve(Long ticketId) {
        SupportTicket t = tickets.findById(ticketId).orElseThrow(() -> ApiException.notFound("Ticket not found"));
        t.setStatus(TicketStatus.RESOLVED);
        return Mapper.toTicketDto(t);
    }
}
