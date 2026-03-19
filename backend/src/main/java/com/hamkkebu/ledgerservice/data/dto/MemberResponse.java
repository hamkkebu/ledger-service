package com.hamkkebu.ledgerservice.data.dto;

import com.hamkkebu.ledgerservice.data.entity.LedgerMember;
import lombok.*;

import java.time.LocalDateTime;

@Getter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class MemberResponse {
    private Long ledgerMemberId;
    private Long ledgerId;
    private Long accountId;
    private String username;
    private String email;
    private String role;
    private LocalDateTime joinedAt;

    public static MemberResponse from(LedgerMember member) {
        return MemberResponse.builder()
                .ledgerMemberId(member.getLedgerMemberId())
                .ledgerId(member.getLedgerId())
                .accountId(member.getAccountId())
                .username(member.getUser() != null ? member.getUser().getUsername() : null)
                .email(member.getUser() != null ? member.getUser().getEmail() : null)
                .role(member.getRole().name())
                .joinedAt(member.getJoinedAt())
                .build();
    }
}
