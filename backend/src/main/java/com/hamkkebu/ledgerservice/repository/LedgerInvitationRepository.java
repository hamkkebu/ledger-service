package com.hamkkebu.ledgerservice.repository;

import com.hamkkebu.ledgerservice.data.entity.LedgerInvitation;
import com.hamkkebu.ledgerservice.data.enums.InvitationStatus;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

/**
 * 가계부 초대 Repository
 *
 * <p>가계부 초대 관련 데이터 접근을 처리합니다.</p>
 */
@Repository
public interface LedgerInvitationRepository extends JpaRepository<LedgerInvitation, Long> {

    /**
     * 초대 코드와 상태로 초대 조회
     */
    Optional<LedgerInvitation> findByInviteCodeAndStatusAndIsDeletedFalse(
            String inviteCode,
            InvitationStatus status
    );

    /**
     * 가계부의 모든 미삭제 초대 조회
     */
    List<LedgerInvitation> findByLedgerIdAndIsDeletedFalse(Long ledgerId);

    /**
     * 가계부의 특정 상태 초대 조회
     */
    List<LedgerInvitation> findByLedgerIdAndStatusAndIsDeletedFalse(Long ledgerId, InvitationStatus status);

    /**
     * 이메일과 상태로 초대 조회
     */
    List<LedgerInvitation> findByInviteeEmailAndStatusAndIsDeletedFalse(
            String email,
            InvitationStatus status
    );

    /**
     * 가계부의 특정 이메일 초대 존재 여부 확인
     */
    boolean existsByLedgerIdAndInviteeEmailAndStatusAndIsDeletedFalse(
            Long ledgerId,
            String email,
            InvitationStatus status
    );
}
