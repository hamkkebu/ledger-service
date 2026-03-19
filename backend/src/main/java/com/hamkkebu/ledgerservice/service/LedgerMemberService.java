package com.hamkkebu.ledgerservice.service;

import com.hamkkebu.boilerplate.common.enums.MemberRole;
import com.hamkkebu.boilerplate.common.enums.MemberStatus;
import com.hamkkebu.boilerplate.common.exception.BusinessException;
import com.hamkkebu.boilerplate.common.exception.ErrorCode;
import com.hamkkebu.ledgerservice.data.dto.MemberResponse;
import com.hamkkebu.ledgerservice.data.entity.Ledger;
import com.hamkkebu.ledgerservice.data.entity.LedgerMember;
import com.hamkkebu.ledgerservice.kafka.producer.LedgerMemberEventProducer;
import com.hamkkebu.ledgerservice.repository.LedgerMemberRepository;
import com.hamkkebu.ledgerservice.repository.LedgerRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

/**
 * 가계부 멤버 Service
 *
 * <p>가계부 멤버 관리, 역할 변경, 멤버 제거 등의 비즈니스 로직을 처리합니다.</p>
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class LedgerMemberService {

    private final LedgerMemberRepository ledgerMemberRepository;
    private final LedgerRepository ledgerRepository;
    private final LedgerMemberEventProducer ledgerMemberEventProducer;

    /**
     * 멤버 목록 조회
     *
     * <p>특정 가계부의 모든 멤버를 조회합니다. 사용자가 해당 가계부의 멤버인지 확인합니다.</p>
     *
     * @param userId 조회 사용자 ID
     * @param ledgerId 가계부 ID
     * @return 멤버 정보 목록
     */
    @Transactional(readOnly = true)
    public List<MemberResponse> getMembers(Long userId, Long ledgerId) {
        log.debug("Getting members for ledger: userId={}, ledgerId={}", userId, ledgerId);

        // 조회 사용자가 가계부 멤버인지 확인
        validateMemberAccess(userId, ledgerId);

        List<LedgerMember> members = ledgerMemberRepository.findByLedgerIdAndIsDeletedFalse(ledgerId);

        return members.stream()
                .map(MemberResponse::from)
                .toList();
    }

    /**
     * 멤버 역할 변경
     *
     * <p>가계부 소유자가 멤버의 역할을 변경합니다.</p>
     *
     * @param userId 변경 요청자 ID (OWNER여야 함)
     * @param ledgerId 가계부 ID
     * @param memberId 멤버 ID
     * @param newRole 새로운 역할
     */
    @Transactional
    public void changeMemberRole(Long userId, Long ledgerId, Long memberId, String newRole) {
        log.info("Changing member role: userId={}, ledgerId={}, memberId={}, newRole={}", userId, ledgerId, memberId, newRole);

        // 요청자가 OWNER인지 확인
        validateOwnerAccess(userId, ledgerId);

        LedgerMember member = ledgerMemberRepository.findById(memberId)
                .orElseThrow(() -> new BusinessException(ErrorCode.MEMBER_NOT_FOUND));

        // 가계부 멤버 확인
        if (!member.getLedgerId().equals(ledgerId)) {
            throw new BusinessException(ErrorCode.MEMBER_NOT_FOUND);
        }

        // 자신의 역할은 변경할 수 없음
        if (member.getAccountId().equals(userId)) {
            throw new BusinessException(ErrorCode.CANNOT_CHANGE_OWN_ROLE);
        }

        // 다른 OWNER의 역할은 변경할 수 없음
        if (member.getRole().equals(MemberRole.OWNER)) {
            throw new BusinessException(ErrorCode.CANNOT_CHANGE_OWNER_ROLE);
        }

        // 새로운 역할로 변경
        MemberRole role;
        try {
            role = MemberRole.valueOf(newRole);
        } catch (IllegalArgumentException e) {
            throw new BusinessException(ErrorCode.INVALID_ROLE);
        }

        member.setRole(role);
        LedgerMember savedMember = ledgerMemberRepository.save(member);

        log.info("Member role changed: ledgerMemberId={}, ledgerId={}, accountId={}, newRole={}",
                savedMember.getLedgerMemberId(), ledgerId, member.getAccountId(), role);

        // 역할 변경 이벤트 발행
        ledgerMemberEventProducer.publishLedgerMemberRoleChanged(savedMember);
    }

    /**
     * 멤버 제거
     *
     * <p>가계부 소유자가 멤버를 제거합니다.</p>
     *
     * @param userId 제거 요청자 ID (OWNER여야 함)
     * @param ledgerId 가계부 ID
     * @param memberId 제거할 멤버 ID
     */
    @Transactional
    public void removeMember(Long userId, Long ledgerId, Long memberId) {
        log.info("Removing member: userId={}, ledgerId={}, memberId={}", userId, ledgerId, memberId);

        // 요청자가 OWNER인지 확인
        validateOwnerAccess(userId, ledgerId);

        LedgerMember member = ledgerMemberRepository.findById(memberId)
                .orElseThrow(() -> new BusinessException(ErrorCode.MEMBER_NOT_FOUND));

        // 가계부 멤버 확인
        if (!member.getLedgerId().equals(ledgerId)) {
            throw new BusinessException(ErrorCode.MEMBER_NOT_FOUND);
        }

        // OWNER는 제거할 수 없음
        if (member.getRole().equals(MemberRole.OWNER)) {
            throw new BusinessException(ErrorCode.CANNOT_REMOVE_OWNER);
        }

        // Soft delete
        member.delete();
        LedgerMember deletedMember = ledgerMemberRepository.save(member);

        log.info("Member removed: ledgerMemberId={}, ledgerId={}, accountId={}",
                deletedMember.getLedgerMemberId(), ledgerId, member.getAccountId());

        // 멤버 제거 이벤트 발행
        ledgerMemberEventProducer.publishLedgerMemberRemoved(deletedMember);
    }

    /**
     * 가계부 떠나기
     *
     * <p>멤버가 가계부를 떠납니다. OWNER는 가계부를 떠날 수 없습니다.</p>
     *
     * @param userId 떠나려는 사용자 ID
     * @param ledgerId 가계부 ID
     */
    @Transactional
    public void leaveLedger(Long userId, Long ledgerId) {
        log.info("User leaving ledger: userId={}, ledgerId={}", userId, ledgerId);

        LedgerMember member = ledgerMemberRepository.findByLedgerIdAndUserIdAndStatusAndIsDeletedFalse(
                ledgerId, userId, MemberStatus.ACCEPTED)
                .orElseThrow(() -> new BusinessException(ErrorCode.MEMBER_NOT_FOUND));

        // OWNER는 가계부를 떠날 수 없음
        if (member.getRole().equals(MemberRole.OWNER)) {
            throw new BusinessException(ErrorCode.OWNER_CANNOT_LEAVE);
        }

        // Soft delete
        member.delete();
        LedgerMember deletedMember = ledgerMemberRepository.save(member);

        log.info("User left ledger: ledgerMemberId={}, ledgerId={}, userId={}",
                deletedMember.getLedgerMemberId(), ledgerId, userId);

        // 멤버 제거 이벤트 발행
        ledgerMemberEventProducer.publishLedgerMemberRemoved(deletedMember);
    }

    /**
     * 가계부 멤버 접근 권한 확인
     *
     * <p>사용자가 가계부의 멤버인지 확인합니다.</p>
     */
    protected void validateMemberAccess(Long userId, Long ledgerId) {
        // 소유자인 경우
        boolean isOwner = ledgerRepository.findByLedgerIdAndUserIdAndIsDeletedFalse(ledgerId, userId)
                .isPresent();
        if (isOwner) {
            return;
        }

        // 멤버인 경우
        boolean isMember = ledgerMemberRepository.existsByLedgerIdAndUserIdAndStatusAndIsDeletedFalse(
                ledgerId, userId, MemberStatus.ACCEPTED);
        if (isMember) {
            return;
        }

        throw new BusinessException(ErrorCode.FORBIDDEN);
    }

    /**
     * 가계부 OWNER 권한 확인
     *
     * <p>사용자가 가계부의 소유자인지 확인합니다.</p>
     */
    protected void validateOwnerAccess(Long userId, Long ledgerId) {
        ledgerRepository.findByLedgerIdAndUserIdAndIsDeletedFalse(ledgerId, userId)
                .orElseThrow(() -> new BusinessException(ErrorCode.FORBIDDEN));
    }
}
