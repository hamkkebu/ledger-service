package com.hamkkebu.ledgerservice.service;

import com.hamkkebu.boilerplate.common.enums.MemberRole;
import com.hamkkebu.boilerplate.common.exception.BusinessException;
import com.hamkkebu.boilerplate.common.exception.ErrorCode;
import com.hamkkebu.boilerplate.common.publisher.OutboxEventPublisher;
import com.hamkkebu.ledgerservice.data.dto.InvitationRequest;
import com.hamkkebu.ledgerservice.data.dto.InvitationResponse;
import com.hamkkebu.ledgerservice.data.entity.Ledger;
import com.hamkkebu.ledgerservice.data.entity.LedgerInvitation;
import com.hamkkebu.ledgerservice.data.entity.LedgerMember;
import com.hamkkebu.ledgerservice.data.entity.User;
import com.hamkkebu.ledgerservice.data.enums.InvitationStatus;
import com.hamkkebu.ledgerservice.kafka.producer.LedgerMemberEventProducer;
import com.hamkkebu.ledgerservice.repository.LedgerInvitationRepository;
import com.hamkkebu.ledgerservice.repository.LedgerMemberRepository;
import com.hamkkebu.ledgerservice.repository.LedgerRepository;
import com.hamkkebu.ledgerservice.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;

/**
 * 가계부 초대 Service
 *
 * <p>가계부 멤버 초대 생성, 수락, 거절, 취소 등의 비즈니스 로직을 처리합니다.</p>
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class LedgerInvitationService {

    private final LedgerInvitationRepository ledgerInvitationRepository;
    private final LedgerRepository ledgerRepository;
    private final LedgerMemberRepository ledgerMemberRepository;
    private final UserRepository userRepository;
    private final LedgerMemberEventProducer ledgerMemberEventProducer;
    private final OutboxEventPublisher outboxEventPublisher;

    /**
     * 초대 생성
     *
     * <p>가계부 소유자가 다른 사용자를 초대합니다.</p>
     *
     * @param userId 초대자 ID
     * @param ledgerId 가계부 ID
     * @param request 초대 요청 정보
     * @return 생성된 초대 정보
     */
    @Transactional
    public InvitationResponse createInvitation(Long userId, Long ledgerId, InvitationRequest request) {
        log.info("Creating invitation: userId={}, ledgerId={}, inviteeEmail={}", userId, ledgerId, request.getInviteeEmail());

        // 가계부 소유자 확인
        Ledger ledger = ledgerRepository.findByLedgerIdAndUserIdAndIsDeletedFalse(ledgerId, userId)
                .orElseThrow(() -> new BusinessException(ErrorCode.LEDGER_NOT_FOUND));

        // 초대 대상 사용자 조회 (존재해야 함)
        User invitee = userRepository.findByEmailAndIsDeletedFalse(request.getInviteeEmail())
                .orElseThrow(() -> new BusinessException(ErrorCode.USER_NOT_FOUND));

        // 초대 대상이 이미 멤버인지 확인
        boolean isMember = ledgerMemberRepository.existsByLedgerIdAndUserIdAndStatusAndIsDeletedFalse(
                ledgerId, invitee.getUserId(), com.hamkkebu.boilerplate.common.enums.MemberStatus.ACCEPTED);
        if (isMember) {
            throw new BusinessException(ErrorCode.USER_ALREADY_MEMBER);
        }

        // 대기 중인 초대가 있는지 확인
        boolean hasPendingInvitation = ledgerInvitationRepository.existsByLedgerIdAndInviteeEmailAndStatusAndIsDeletedFalse(
                ledgerId, request.getInviteeEmail(), InvitationStatus.PENDING);
        if (hasPendingInvitation) {
            throw new BusinessException(ErrorCode.INVITATION_ALREADY_EXISTS);
        }

        // 역할 결정 (기본값: MEMBER)
        MemberRole role = MemberRole.MEMBER;
        if (request.getRole() != null) {
            try {
                role = MemberRole.valueOf(request.getRole());
            } catch (IllegalArgumentException e) {
                throw new BusinessException(ErrorCode.INVALID_ROLE);
            }
        }

        // 초대 엔티티 생성
        LedgerInvitation invitation = LedgerInvitation.builder()
                .ledgerId(ledgerId)
                .inviterId(userId)
                .inviteeEmail(request.getInviteeEmail())
                .role(role)
                .status(InvitationStatus.PENDING)
                .inviteCode(UUID.randomUUID().toString())
                .expiresAt(LocalDateTime.now().plusDays(7))
                .build();

        LedgerInvitation saved = ledgerInvitationRepository.save(invitation);
        log.info("Invitation created: invitationId={}, ledgerId={}, inviterId={}, inviteeEmail={}",
                saved.getInvitationId(), ledgerId, userId, request.getInviteeEmail());

        // 초대 알림 이벤트 발행
        publishInvitationNotification(saved, ledger, "INVITATION_CREATED");

        return InvitationResponse.from(saved);
    }

    /**
     * 초대 수락
     *
     * <p>초대받은 사용자가 초대를 수락합니다.</p>
     *
     * @param userId 수락자 ID
     * @param invitationId 초대 ID
     * @return 업데이트된 초대 정보
     */
    @Transactional
    public InvitationResponse acceptInvitation(Long userId, Long invitationId) {
        log.info("Accepting invitation: userId={}, invitationId={}", userId, invitationId);

        LedgerInvitation invitation = ledgerInvitationRepository.findById(invitationId)
                .orElseThrow(() -> new BusinessException(ErrorCode.INVITATION_NOT_FOUND));

        // 초대 대상자 확인
        User user = userRepository.findByUserIdAndIsDeletedFalse(userId)
                .orElseThrow(() -> new BusinessException(ErrorCode.USER_NOT_FOUND));

        if (!invitation.getInviteeEmail().equals(user.getEmail())) {
            throw new BusinessException(ErrorCode.INVALID_INVITATION_RECIPIENT);
        }

        // 초대 상태 확인 (PENDING이어야 함)
        if (!invitation.isPending()) {
            throw new BusinessException(ErrorCode.INVALID_INVITATION_STATUS);
        }

        // 초대 만료 확인
        if (invitation.isExpired()) {
            invitation.expire();
            ledgerInvitationRepository.save(invitation);
            throw new BusinessException(ErrorCode.INVITATION_EXPIRED);
        }

        // 초대 수락
        invitation.accept();
        LedgerInvitation savedInvitation = ledgerInvitationRepository.save(invitation);

        // 멤버 추가
        LedgerMember member = LedgerMember.builder()
                .ledgerId(invitation.getLedgerId())
                .accountId(userId)
                .role(invitation.getRole())
                .joinedAt(LocalDateTime.now())
                .build();
        LedgerMember savedMember = ledgerMemberRepository.save(member);

        log.info("Member added from invitation: ledgerMemberId={}, ledgerId={}, accountId={}",
                savedMember.getLedgerMemberId(), invitation.getLedgerId(), userId);

        // 멤버 추가 이벤트 발행
        ledgerMemberEventProducer.publishLedgerMemberAdded(savedMember);

        // 초대자에게 수락 알림 발행
        Ledger ledger = ledgerRepository.findByLedgerIdAndIsDeletedFalse(invitation.getLedgerId())
                .orElse(null);
        publishInvitationNotification(savedInvitation, ledger, "INVITATION_ACCEPTED");

        return InvitationResponse.from(savedInvitation);
    }

    /**
     * 초대 거절
     *
     * <p>초대받은 사용자가 초대를 거절합니다.</p>
     *
     * @param userId 거절자 ID
     * @param invitationId 초대 ID
     * @return 업데이트된 초대 정보
     */
    @Transactional
    public InvitationResponse rejectInvitation(Long userId, Long invitationId) {
        log.info("Rejecting invitation: userId={}, invitationId={}", userId, invitationId);

        LedgerInvitation invitation = ledgerInvitationRepository.findById(invitationId)
                .orElseThrow(() -> new BusinessException(ErrorCode.INVITATION_NOT_FOUND));

        // 초대 대상자 확인
        User user = userRepository.findByUserIdAndIsDeletedFalse(userId)
                .orElseThrow(() -> new BusinessException(ErrorCode.USER_NOT_FOUND));

        if (!invitation.getInviteeEmail().equals(user.getEmail())) {
            throw new BusinessException(ErrorCode.INVALID_INVITATION_RECIPIENT);
        }

        // 초대 상태 확인 (PENDING이어야 함)
        if (!invitation.isPending()) {
            throw new BusinessException(ErrorCode.INVALID_INVITATION_STATUS);
        }

        // 초대 거절
        invitation.reject();
        LedgerInvitation savedInvitation = ledgerInvitationRepository.save(invitation);

        log.info("Invitation rejected: invitationId={}, ledgerId={}, inviteeEmail={}",
                invitationId, invitation.getLedgerId(), invitation.getInviteeEmail());

        // 초대자에게 거절 알림 발행
        Ledger ledger = ledgerRepository.findByLedgerIdAndIsDeletedFalse(invitation.getLedgerId())
                .orElse(null);
        publishInvitationNotification(savedInvitation, ledger, "INVITATION_REJECTED");

        return InvitationResponse.from(savedInvitation);
    }

    /**
     * 받은 초대 목록 조회
     *
     * <p>사용자에게 온 모든 PENDING 초대를 조회합니다. 만료된 초대는 자동으로 만료 처리됩니다.</p>
     *
     * @param userId 사용자 ID
     * @return 초대 정보 목록
     */
    @Transactional(readOnly = true)
    public List<InvitationResponse> getReceivedInvitations(Long userId) {
        log.debug("Getting received invitations for user: {}", userId);

        User user = userRepository.findByUserIdAndIsDeletedFalse(userId)
                .orElseThrow(() -> new BusinessException(ErrorCode.USER_NOT_FOUND));

        List<LedgerInvitation> invitations = ledgerInvitationRepository
                .findByInviteeEmailAndStatusAndIsDeletedFalse(user.getEmail(), InvitationStatus.PENDING);

        // 만료된 초대 처리 (별도 메서드 호출)
        expireOldInvitations(invitations);

        return invitations.stream()
                .filter(inv -> !inv.isExpired())
                .map(InvitationResponse::from)
                .toList();
    }

    /**
     * 보낸 초대 목록 조회
     *
     * <p>특정 가계부에 대해 사용자가 보낸 모든 초대를 조회합니다.</p>
     *
     * @param userId 사용자 ID
     * @param ledgerId 가계부 ID
     * @return 초대 정보 목록
     */
    @Transactional(readOnly = true)
    public List<InvitationResponse> getSentInvitations(Long userId, Long ledgerId) {
        log.debug("Getting sent invitations for user: userId={}, ledgerId={}", userId, ledgerId);

        // 가계부 소유자 확인
        ledgerRepository.findByLedgerIdAndUserIdAndIsDeletedFalse(ledgerId, userId)
                .orElseThrow(() -> new BusinessException(ErrorCode.LEDGER_NOT_FOUND));

        List<LedgerInvitation> invitations = ledgerInvitationRepository
                .findByLedgerIdAndIsDeletedFalse(ledgerId);

        return invitations.stream()
                .map(InvitationResponse::from)
                .toList();
    }

    /**
     * 초대 취소
     *
     * <p>초대자가 보낸 초대를 취소합니다.</p>
     *
     * @param userId 초대자 ID
     * @param invitationId 초대 ID
     */
    @Transactional
    public void cancelInvitation(Long userId, Long invitationId) {
        log.info("Canceling invitation: userId={}, invitationId={}", userId, invitationId);

        LedgerInvitation invitation = ledgerInvitationRepository.findById(invitationId)
                .orElseThrow(() -> new BusinessException(ErrorCode.INVITATION_NOT_FOUND));

        // 초대자 확인
        if (!invitation.getInviterId().equals(userId)) {
            throw new BusinessException(ErrorCode.FORBIDDEN);
        }

        // Soft delete
        invitation.delete();
        ledgerInvitationRepository.save(invitation);

        log.info("Invitation canceled: invitationId={}, ledgerId={}, inviteeEmail={}",
                invitationId, invitation.getLedgerId(), invitation.getInviteeEmail());
    }

    /**
     * 만료된 초대 처리
     *
     * <p>만료된 초대의 상태를 EXPIRED로 변경합니다.</p>
     */
    @Transactional
    protected void expireOldInvitations(List<LedgerInvitation> invitations) {
        for (LedgerInvitation invitation : invitations) {
            if (invitation.isExpired() && invitation.isPending()) {
                invitation.expire();
                ledgerInvitationRepository.save(invitation);
                log.info("Invitation expired: invitationId={}, ledgerId={}", invitation.getInvitationId(), invitation.getLedgerId());
            }
        }
    }

    /**
     * 초대 관련 알림 이벤트 발행
     *
     * <p>초대 생성, 수락, 거절 등의 알림을 notification-service로 발행합니다.</p>
     */
    private void publishInvitationNotification(LedgerInvitation invitation, Ledger ledger, String eventType) {
        try {
            var notificationPayload = createNotificationPayload(invitation, ledger, eventType);
            outboxEventPublisher.publish("notification.events", notificationPayload);
            log.info("[Outbox] Invitation notification event published: eventType={}, invitationId={}", eventType, invitation.getInvitationId());
        } catch (Exception e) {
            log.warn("Failed to publish invitation notification: eventType={}, invitationId={}, error={}",
                    eventType, invitation.getInvitationId(), e.getMessage());
            // 알림 발행 실패는 비즈니스 로직에 영향을 주지 않음
        }
    }

    /**
     * 알림 이벤트 페이로드 생성
     */
    private Object createNotificationPayload(LedgerInvitation invitation, Ledger ledger, String eventType) {
        return new Object() {
            public final String eventType_field = eventType;
            public final Long invitationId = invitation.getInvitationId();
            public final Long ledgerId = invitation.getLedgerId();
            public final String ledgerName = ledger != null ? ledger.getName() : null;
            public final Long inviterId = invitation.getInviterId();
            public final String inviterName = null; // 별도 쿼리 필요 시 추가
            public final String inviteeEmail = invitation.getInviteeEmail();
            public final String role = invitation.getRole().name();
        };
    }
}
