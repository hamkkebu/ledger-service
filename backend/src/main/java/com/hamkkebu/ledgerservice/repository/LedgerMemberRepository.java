package com.hamkkebu.ledgerservice.repository;

import com.hamkkebu.boilerplate.common.enums.MemberRole;
import com.hamkkebu.boilerplate.common.ledger.repository.SyncedLedgerMemberRepository;
import com.hamkkebu.ledgerservice.data.entity.LedgerMember;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

/**
 * 가계부 멤버 Repository
 *
 * <p>SyncedLedgerMemberRepository를 상속받아 기본 쿼리 메서드를 사용합니다.</p>
 */
@Repository
public interface LedgerMemberRepository extends SyncedLedgerMemberRepository<LedgerMember> {
    // SyncedLedgerMemberRepository에서 제공하는 메서드:
    // - findByLedgerIdAndIsDeletedFalse(Long)
    // - findByLedgerIdAndAccountIdAndIsDeletedFalse(Long, Long)
    // - findByAccountIdAndIsDeletedFalse(Long)
    // - existsByLedgerIdAndAccountIdAndIsDeletedFalse(Long, Long)
    // - findByLedgerMemberIdAndIsDeletedFalse(Long)
    // - countByLedgerIdAndIsDeletedFalse(Long)

    /**
     * 특정 가계부의 특정 역할을 가진 멤버 조회
     */
    List<LedgerMember> findByLedgerIdAndRoleAndIsDeletedFalse(Long ledgerId, MemberRole role);

    /**
     * 특정 가계부의 멤버 조회 (soft-deleted 포함)
     */
    Optional<LedgerMember> findByLedgerIdAndAccountId(Long ledgerId, Long accountId);
}
