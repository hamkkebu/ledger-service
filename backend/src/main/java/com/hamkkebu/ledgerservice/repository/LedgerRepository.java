package com.hamkkebu.ledgerservice.repository;

import com.hamkkebu.ledgerservice.data.entity.Ledger;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface LedgerRepository extends JpaRepository<Ledger, Long> {

    List<Ledger> findByUserIdAndIsDeletedFalseOrderByCreatedAtDesc(Long userId);

    Optional<Ledger> findByLedgerIdAndIsDeletedFalse(Long ledgerId);

    Optional<Ledger> findByLedgerIdAndUserIdAndIsDeletedFalse(Long ledgerId, Long userId);

    Optional<Ledger> findByUserIdAndIsDefaultTrueAndIsDeletedFalse(Long userId);

    long countByUserIdAndIsDeletedFalse(Long userId);

    @Query("SELECT l FROM Ledger l LEFT JOIN FETCH l.categories WHERE l.ledgerId = :ledgerId AND l.isDeleted = false")
    Optional<Ledger> findByIdWithCategories(@Param("ledgerId") Long ledgerId);

    boolean existsByLedgerIdAndIsDeletedFalse(Long ledgerId);

    List<Ledger> findByLedgerIdInAndIsDeletedFalse(List<Long> ledgerIds);
}
