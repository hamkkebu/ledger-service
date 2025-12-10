package com.hamkkebu.ledgerservice.repository;

import com.hamkkebu.ledgerservice.data.entity.Transaction;
import com.hamkkebu.ledgerservice.data.enums.TransactionType;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;
import java.util.Optional;

@Repository
public interface TransactionRepository extends JpaRepository<Transaction, Long> {

    Page<Transaction> findByLedgerIdAndIsDeletedFalseOrderByTransactionDateDesc(Long ledgerId, Pageable pageable);

    List<Transaction> findByLedgerIdAndTransactionDateBetweenAndIsDeletedFalse(
            Long ledgerId, LocalDate startDate, LocalDate endDate);

    Optional<Transaction> findByTransactionIdAndIsDeletedFalse(Long transactionId);

    Optional<Transaction> findByTransactionIdAndLedgerIdAndIsDeletedFalse(Long transactionId, Long ledgerId);

    boolean existsByTransactionIdAndIsDeletedFalse(Long transactionId);

    @Query("SELECT COALESCE(SUM(t.amount), 0) FROM Transaction t " +
           "WHERE t.ledgerId = :ledgerId AND t.type = :type AND t.isDeleted = false")
    BigDecimal sumAmountByLedgerIdAndType(@Param("ledgerId") Long ledgerId, @Param("type") TransactionType type);

    @Query("SELECT COALESCE(SUM(t.amount), 0) FROM Transaction t " +
           "WHERE t.ledgerId = :ledgerId AND t.type = :type " +
           "AND t.transactionDate BETWEEN :startDate AND :endDate AND t.isDeleted = false")
    BigDecimal sumAmountByLedgerIdAndTypeAndDateBetween(
            @Param("ledgerId") Long ledgerId,
            @Param("type") TransactionType type,
            @Param("startDate") LocalDate startDate,
            @Param("endDate") LocalDate endDate);
}
