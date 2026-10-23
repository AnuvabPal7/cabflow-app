package com.cab.booking.repository;

import com.cab.booking.domain.SupportTicket;
import java.util.List;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;

public interface SupportTicketRepository extends JpaRepository<SupportTicket, Long> {
    @EntityGraph(attributePaths = "user")
    List<SupportTicket> findByUserIdOrderByCreatedAtDesc(Long userId);

    @Override
    @EntityGraph(attributePaths = "user")
    Page<SupportTicket> findAll(Pageable pageable);
}
