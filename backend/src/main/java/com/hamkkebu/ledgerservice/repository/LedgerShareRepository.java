package com.hamkkebu.ledgerservice.repository;

import com.hamkkebu.boilerplate.common.ledger.repository.SyncedLedgerShareRepository;
import com.hamkkebu.ledgerservice.data.entity.LedgerShare;
import org.springframework.stereotype.Repository;

/**
 * 가계부 공유 Repository
 *
 * <p>SyncedLedgerShareRepository를 상속받아 기본 쿼리 메서드를 사용합니다.</p>
 */
@Repository
public interface LedgerShareRepository extends SyncedLedgerShareRepository<LedgerShare> {
    // SyncedLedgerShareRepository에서 제공하는 메서드:
    // - findByLedgerIdAndIsDeletedFalse(Long)
    // - findBySharedUserIdAndStatusAndIsDeletedFalse(Long, ShareStatus)
    // - findByLedgerIdAndSharedUserIdAndIsDeletedFalse(Long, Long)
    // - findByLedgerIdAndSharedUserIdAndStatusAndIsDeletedFalse(Long, Long, ShareStatus)
    // - findByOwnerIdAndIsDeletedFalse(Long)
    // - countByLedgerIdAndStatusAndIsDeletedFalse(Long, ShareStatus)
    // - existsByLedgerIdAndSharedUserIdAndStatusAndIsDeletedFalse(Long, Long, ShareStatus)
}
