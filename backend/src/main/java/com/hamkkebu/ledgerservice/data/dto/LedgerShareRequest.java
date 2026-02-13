package com.hamkkebu.ledgerservice.data.dto;

import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;

/**
 * 가계부 공유 요청 DTO
 */
@Getter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class LedgerShareRequest {

    @NotNull(message = "공유할 사용자 ID는 필수입니다")
    private Long sharedUserId;

    @Size(max = 20, message = "권한은 20자 이내로 입력해주세요")
    private String permission;
}
