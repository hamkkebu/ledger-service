package com.hamkkebu.ledgerservice.data.entity;

import com.hamkkebu.boilerplate.common.entity.BaseEntity;
import com.hamkkebu.boilerplate.common.enums.MemberRole;
import com.hamkkebu.ledgerservice.data.enums.InvitationStatus;
import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.experimental.SuperBuilder;

import java.time.LocalDateTime;

/**
 * LedgerInvitation 엔티티 (가계부 초대)
 *
 * <p>가계부 멤버 초대를 관리합니다.</p>
 * <p>초대 코드를 통해 사용자가 가계부에 참여할 수 있습니다.</p>
 */
@Getter
@SuperBuilder
@NoArgsConstructor
@AllArgsConstructor
@Entity
@Table(name = "tbl_ledger_invitations")
public class LedgerInvitation extends BaseEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "invitation_id", nullable = false)
    private Long invitationId;

    @Column(name = "ledger_id", nullable = false)
    private Long ledgerId;

    @Column(name = "inviter_id", nullable = false)
    private Long inviterId;

    @Column(name = "invitee_email", nullable = false, length = 255)
    private String inviteeEmail;

    @Enumerated(EnumType.STRING)
    @Column(name = "role", nullable = false, length = 20)
    @Builder.Default
    private MemberRole role = MemberRole.MEMBER;

    @Enumerated(EnumType.STRING)
    @Column(name = "status", nullable = false, length = 20)
    @Builder.Default
    private InvitationStatus status = InvitationStatus.PENDING;

    @Column(name = "invite_code", unique = true, length = 36)
    private String inviteCode;

    @Column(name = "expires_at")
    private LocalDateTime expiresAt;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "ledger_id", insertable = false, updatable = false)
    private Ledger ledger;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "inviter_id", insertable = false, updatable = false)
    private User inviter;

    /**
     * 초대가 만료되었는지 확인
     */
    public boolean isExpired() {
        if (expiresAt == null) {
            return false;
        }
        return LocalDateTime.now().isAfter(expiresAt);
    }

    /**
     * 초대 상태가 대기 중인지 확인
     */
    public boolean isPending() {
        return status == InvitationStatus.PENDING;
    }

    /**
     * 초대 수락
     */
    public void accept() {
        this.status = InvitationStatus.ACCEPTED;
    }

    /**
     * 초대 거절
     */
    public void reject() {
        this.status = InvitationStatus.REJECTED;
    }

    /**
     * 초대 만료 처리
     */
    public void expire() {
        this.status = InvitationStatus.EXPIRED;
    }
}
