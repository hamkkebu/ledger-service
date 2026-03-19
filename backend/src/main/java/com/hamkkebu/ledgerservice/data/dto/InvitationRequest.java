package com.hamkkebu.ledgerservice.data.dto;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import lombok.*;

@Getter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class InvitationRequest {
    @NotBlank(message = "이메일은 필수입니다")
    @Email(message = "올바른 이메일 형식이 아닙니다")
    private String inviteeEmail;

    private String role; // ADMIN, MEMBER (default: MEMBER)
}
