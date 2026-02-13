package com.hamkkebu.ledgerservice.data.dto;

import com.hamkkebu.ledgerservice.data.entity.LedgerShare;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

/**
 * 가계부 공유 응답 DTO
 */
@Getter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class LedgerShareResponse {

    private Long ledgerShareId;
    private Long ledgerId;
    private String ledgerName;
    private Long ownerId;
    private String ownerUsername;
    private Long sharedUserId;
    private String sharedUserUsername;
    private String status;
    private String permission;
    private LocalDateTime sharedAt;
    private LocalDateTime acceptedAt;
    private String rejectionReason;
    private LocalDateTime createdAt;

    /**
     * LedgerShare 엔티티를 응답 DTO로 변환
     *
     * @param share LedgerShare 엔티티
     * @return LedgerShareResponse
     */
    public static LedgerShareResponse from(LedgerShare share) {
        return LedgerShareResponse.builder()
                .ledgerShareId(share.getLedgerShareId())
                .ledgerId(share.getLedgerId())
                .ledgerName(share.getLedger() != null ? share.getLedger().getName() : null)
                .ownerId(share.getOwnerId())
                .ownerUsername(share.getOwner() != null ? share.getOwner().getUsername() : null)
                .sharedUserId(share.getSharedUserId())
                .sharedUserUsername(share.getSharedUser() != null ? share.getSharedUser().getUsername() : null)
                .status(share.getStatus() != null ? share.getStatus().name() : null)
                .permission(share.getPermission() != null ? share.getPermission().name() : null)
                .sharedAt(share.getSharedAt())
                .acceptedAt(share.getAcceptedAt())
                .rejectionReason(share.getRejectionReason())
                .createdAt(share.getCreatedAt())
                .build();
    }
}
