package com.hamkkebu.ledgerservice.data.dto;

import com.hamkkebu.ledgerservice.data.entity.LedgerInvitation;
import lombok.*;

import java.time.LocalDateTime;

@Getter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class InvitationResponse {
    private Long invitationId;
    private Long ledgerId;
    private String ledgerName;
    private Long inviterId;
    private String inviterName;
    private String inviteeEmail;
    private String role;
    private String status;
    private String inviteCode;
    private LocalDateTime expiresAt;
    private LocalDateTime createdAt;

    public static InvitationResponse from(LedgerInvitation invitation) {
        return InvitationResponse.builder()
                .invitationId(invitation.getInvitationId())
                .ledgerId(invitation.getLedgerId())
                .ledgerName(invitation.getLedger() != null ? invitation.getLedger().getName() : null)
                .inviterId(invitation.getInviterId())
                .inviterName(invitation.getInviter() != null ? invitation.getInviter().getUsername() : null)
                .inviteeEmail(invitation.getInviteeEmail())
                .role(invitation.getRole().name())
                .status(invitation.getStatus().name())
                .inviteCode(invitation.getInviteCode())
                .expiresAt(invitation.getExpiresAt())
                .createdAt(invitation.getCreatedAt())
                .build();
    }
}
