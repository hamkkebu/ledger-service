package com.hamkkebu.ledgerservice.repository;

import com.hamkkebu.boilerplate.common.enums.MemberRole;
import com.hamkkebu.boilerplate.common.ledger.repository.SyncedLedgerMemberRepository;
import com.hamkkebu.ledgerservice.data.entity.LedgerMember;
import org.springframework.stereotype.Repository;

import java.util.List;

/**
 * 가계부 멤버 Repository
 *
 * <p>SyncedLedgerMemberRepository를 상속받아 기본 쿼리 메서드를 사용합니다.</p>
 */
@Repository
public interface LedgerMemberRepository extends SyncedLedgerMemberRepository<LedgerMember> {
    // SyncedLedgerMemberRepository에서 제공하는 메서드:
    // - findByLedgerIdAndIsDeletedFalse(Long)
    // - findByUserIdAndStatusAndIsDeletedFalse(Long, MemberStatus)
    // - findByLedgerIdAndUserIdAndIsDeletedFalse(Long, Long)
    // - findByLedgerIdAndUserIdAndStatusAndIsDeletedFalse(Long, Long, MemberStatus)
    // - countByLedgerIdAndStatusAndIsDeletedFalse(Long, MemberStatus)
    // - existsByLedgerIdAndUserIdAndStatusAndIsDeletedFalse(Long, Long, MemberStatus)

    /**
     * 특정 가계부의 특정 역할을 가진 멤버 조회
     */
    List<LedgerMember> findByLedgerIdAndRoleAndIsDeletedFalse(Long ledgerId, MemberRole role);
}
