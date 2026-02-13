package com.hamkkebu.ledgerservice.service;

import com.hamkkebu.boilerplate.common.enums.SharePermission;
import com.hamkkebu.boilerplate.common.enums.ShareStatus;
import com.hamkkebu.boilerplate.common.exception.BusinessException;
import com.hamkkebu.boilerplate.common.exception.ErrorCode;
import com.hamkkebu.ledgerservice.data.dto.LedgerShareRequest;
import com.hamkkebu.ledgerservice.data.dto.LedgerShareResponse;
import com.hamkkebu.ledgerservice.data.entity.Ledger;
import com.hamkkebu.ledgerservice.data.entity.LedgerShare;
import com.hamkkebu.ledgerservice.kafka.producer.LedgerShareEventProducer;
import com.hamkkebu.ledgerservice.repository.LedgerRepository;
import com.hamkkebu.ledgerservice.repository.LedgerShareRepository;
import com.hamkkebu.ledgerservice.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

/**
 * 가계부 공유 Service
 *
 * <p>가계부 공유 요청, 수락, 거절, 삭제 등의 비즈니스 로직을 처리합니다.</p>
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class LedgerShareService {

    private final LedgerShareRepository ledgerShareRepository;
    private final LedgerRepository ledgerRepository;
    private final UserRepository userRepository;
    private final LedgerShareEventProducer ledgerShareEventProducer;

    /**
     * 가계부 공유 요청
     *
     * <p>소유자가 다른 사용자에게 가계부를 공유합니다.</p>
     * <p>PENDING 상태로 생성되며, 수신자의 수락을 기다립니다.</p>
     *
     * @param userId   요청자(소유자) ID
     * @param ledgerId 가계부 ID
     * @param request  공유 요청 정보
     * @return 생성된 공유 정보
     */
    @Transactional
    public LedgerShareResponse shareLedger(Long userId, Long ledgerId, LedgerShareRequest request) {
        log.info("Sharing ledger: userId={}, ledgerId={}, sharedUserId={}", userId, ledgerId, request.getSharedUserId());

        // 자기 자신에게 공유 불가
        if (userId.equals(request.getSharedUserId())) {
            throw new BusinessException(ErrorCode.CANNOT_SHARE_WITH_SELF);
        }

        // 가계부 소유자 확인
        Ledger ledger = ledgerRepository.findByLedgerIdAndUserIdAndIsDeletedFalse(ledgerId, userId)
                .orElseThrow(() -> new BusinessException(ErrorCode.LEDGER_NOT_FOUND));

        // 공유 대상 사용자 존재 확인
        if (!userRepository.existsByUserIdAndIsDeletedFalse(request.getSharedUserId())) {
            throw new BusinessException(ErrorCode.USER_NOT_FOUND);
        }

        // 이미 공유된 상태인지 확인 (PENDING 또는 ACCEPTED)
        boolean alreadyShared = ledgerShareRepository
                .existsByLedgerIdAndSharedUserIdAndStatusAndIsDeletedFalse(
                        ledgerId, request.getSharedUserId(), ShareStatus.PENDING)
                || ledgerShareRepository
                .existsByLedgerIdAndSharedUserIdAndStatusAndIsDeletedFalse(
                        ledgerId, request.getSharedUserId(), ShareStatus.ACCEPTED);

        if (alreadyShared) {
            throw new BusinessException(ErrorCode.LEDGER_SHARE_ALREADY_EXISTS);
        }

        // 권한 결정 (기본값: READ_ONLY)
        SharePermission permission = SharePermission.READ_ONLY;
        if (request.getPermission() != null) {
            try {
                permission = SharePermission.valueOf(request.getPermission());
            } catch (IllegalArgumentException e) {
                throw new BusinessException(ErrorCode.INVALID_SHARE_PERMISSION);
            }
        }

        // 공유 엔티티 생성
        LedgerShare share = LedgerShare.builder()
                .ledgerId(ledgerId)
                .ownerId(userId)
                .sharedUserId(request.getSharedUserId())
                .permission(permission)
                .build();

        LedgerShare saved = ledgerShareRepository.save(share);
        log.info("Ledger share created: ledgerShareId={}, ledgerId={}, ownerId={}, sharedUserId={}",
                saved.getLedgerShareId(), ledgerId, userId, request.getSharedUserId());

        // Kafka 이벤트 발행
        ledgerShareEventProducer.publishLedgerShareCreated(saved);

        return LedgerShareResponse.from(saved);
    }

    /**
     * 가계부 공유 수락
     *
     * <p>공유 수신자가 요청을 수락합니다.</p>
     *
     * @param userId        수신자 ID
     * @param ledgerShareId 공유 ID
     * @return 수락된 공유 정보
     */
    @Transactional
    public LedgerShareResponse acceptShare(Long userId, Long ledgerShareId) {
        log.info("Accepting ledger share: userId={}, ledgerShareId={}", userId, ledgerShareId);

        LedgerShare share = findShareByIdOrThrow(ledgerShareId);

        // 수신자 본인만 수락 가능
        if (!share.isSharedWith(userId)) {
            throw new BusinessException(ErrorCode.LEDGER_SHARE_PERMISSION_DENIED);
        }

        // 상태 변경 (PENDING → ACCEPTED)
        try {
            share.accept();
        } catch (IllegalStateException e) {
            throw new BusinessException(ErrorCode.LEDGER_SHARE_INVALID_STATUS);
        }
        log.info("Ledger share accepted: ledgerShareId={}, sharedUserId={}", ledgerShareId, userId);

        // Kafka 이벤트 발행
        ledgerShareEventProducer.publishLedgerShareAccepted(share);

        return LedgerShareResponse.from(share);
    }

    /**
     * 가계부 공유 거절
     *
     * <p>공유 수신자가 요청을 거절합니다.</p>
     *
     * @param userId        수신자 ID
     * @param ledgerShareId 공유 ID
     * @param reason        거절 사유
     * @return 거절된 공유 정보
     */
    @Transactional
    public LedgerShareResponse rejectShare(Long userId, Long ledgerShareId, String reason) {
        log.info("Rejecting ledger share: userId={}, ledgerShareId={}", userId, ledgerShareId);

        LedgerShare share = findShareByIdOrThrow(ledgerShareId);

        // 수신자 본인만 거절 가능
        if (!share.isSharedWith(userId)) {
            throw new BusinessException(ErrorCode.LEDGER_SHARE_PERMISSION_DENIED);
        }

        // 상태 변경 (PENDING → REJECTED)
        try {
            share.reject(reason);
        } catch (IllegalStateException e) {
            throw new BusinessException(ErrorCode.LEDGER_SHARE_INVALID_STATUS);
        }
        log.info("Ledger share rejected: ledgerShareId={}, sharedUserId={}, reason={}",
                ledgerShareId, userId, reason);

        // Kafka 이벤트 발행
        ledgerShareEventProducer.publishLedgerShareRejected(share);

        return LedgerShareResponse.from(share);
    }

    /**
     * 가계부 공유 삭제 (소유자 또는 수신자)
     *
     * <p>소유자는 어떤 공유든 삭제 가능, 수신자는 자신에게 공유된 것만 삭제 가능합니다.</p>
     *
     * @param userId        요청자 ID
     * @param ledgerShareId 공유 ID
     */
    @Transactional
    public void deleteShare(Long userId, Long ledgerShareId) {
        log.info("Deleting ledger share: userId={}, ledgerShareId={}", userId, ledgerShareId);

        LedgerShare share = findShareByIdOrThrow(ledgerShareId);

        // 소유자 또는 수신자만 삭제 가능
        if (!share.isOwnedBy(userId) && !share.isSharedWith(userId)) {
            throw new BusinessException(ErrorCode.LEDGER_SHARE_PERMISSION_DENIED);
        }

        // Soft Delete
        share.delete();
        log.info("Ledger share deleted: ledgerShareId={}, userId={}", ledgerShareId, userId);

        // Kafka 이벤트 발행
        ledgerShareEventProducer.publishLedgerShareDeleted(share, userId);
    }

    /**
     * 특정 가계부의 공유 목록 조회 (소유자용)
     *
     * <p>가계부 소유자가 해당 가계부에 공유된 사용자 목록을 조회합니다.</p>
     *
     * @param userId   소유자 ID
     * @param ledgerId 가계부 ID
     * @return 공유 목록
     */
    @Transactional(readOnly = true)
    public List<LedgerShareResponse> getSharesByLedger(Long userId, Long ledgerId) {
        log.debug("Getting shares for ledger: userId={}, ledgerId={}", userId, ledgerId);

        // 가계부 소유자 확인
        ledgerRepository.findByLedgerIdAndUserIdAndIsDeletedFalse(ledgerId, userId)
                .orElseThrow(() -> new BusinessException(ErrorCode.LEDGER_NOT_FOUND));

        return ledgerShareRepository.findByLedgerIdAndIsDeletedFalse(ledgerId)
                .stream()
                .map(LedgerShareResponse::from)
                .toList();
    }

    /**
     * 나에게 공유된 가계부 목록 조회 (수락된 것만)
     *
     * <p>현재 사용자에게 공유되어 수락된 가계부 목록을 조회합니다.</p>
     *
     * @param userId 수신자 ID
     * @return 공유된 가계부 목록
     */
    @Transactional(readOnly = true)
    public List<LedgerShareResponse> getSharedWithMe(Long userId) {
        log.debug("Getting shared ledgers for user: {}", userId);

        return ledgerShareRepository.findBySharedUserIdAndStatusAndIsDeletedFalse(userId, ShareStatus.ACCEPTED)
                .stream()
                .map(LedgerShareResponse::from)
                .toList();
    }

    /**
     * 대기 중인 공유 요청 조회 (수신자용)
     *
     * <p>현재 사용자에게 온 PENDING 상태의 공유 요청 목록을 조회합니다.</p>
     *
     * @param userId 수신자 ID
     * @return 대기 중인 공유 요청 목록
     */
    @Transactional(readOnly = true)
    public List<LedgerShareResponse> getPendingShares(Long userId) {
        log.debug("Getting pending shares for user: {}", userId);

        return ledgerShareRepository.findBySharedUserIdAndStatusAndIsDeletedFalse(userId, ShareStatus.PENDING)
                .stream()
                .map(LedgerShareResponse::from)
                .toList();
    }

    /**
     * 내가 보낸 공유 요청 조회 (소유자용)
     *
     * <p>현재 사용자가 보낸 모든 공유 요청 목록을 조회합니다.</p>
     *
     * @param userId 소유자 ID
     * @return 보낸 공유 요청 목록
     */
    @Transactional(readOnly = true)
    public List<LedgerShareResponse> getSentShares(Long userId) {
        log.debug("Getting sent shares for user: {}", userId);

        return ledgerShareRepository.findByOwnerIdAndIsDeletedFalse(userId)
                .stream()
                .map(LedgerShareResponse::from)
                .toList();
    }

    // ==================== Private Helper Methods ====================

    /**
     * 공유 ID로 엔티티 조회 (없으면 예외)
     */
    private LedgerShare findShareByIdOrThrow(Long ledgerShareId) {
        return ledgerShareRepository.findById(ledgerShareId)
                .filter(share -> !share.isDeleted())
                .orElseThrow(() -> new BusinessException(ErrorCode.LEDGER_SHARE_NOT_FOUND));
    }
}
