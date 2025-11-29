package com.hamkkebu.ledgerservice.repository;

import com.hamkkebu.ledgerservice.data.entity.Category;
import com.hamkkebu.ledgerservice.data.enums.TransactionType;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface CategoryRepository extends JpaRepository<Category, Long> {

    List<Category> findByLedgerIdAndIsDeletedFalseOrderByNameAsc(Long ledgerId);

    List<Category> findByLedgerIdAndTypeAndIsDeletedFalse(Long ledgerId, TransactionType type);

    Optional<Category> findByCategoryIdAndIsDeletedFalse(Long categoryId);

    Optional<Category> findByCategoryIdAndLedgerIdAndIsDeletedFalse(Long categoryId, Long ledgerId);
}
