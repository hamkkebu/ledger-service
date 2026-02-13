package com.hamkkebu.ledgerservice.data.dto;

import jakarta.validation.constraints.Size;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;

/**
 * 가계부 공유 거절 요청 DTO
 */
@Getter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class LedgerShareRejectRequest {

    @Size(max = 500, message = "거절 사유는 500자 이내로 입력해주세요")
    private String reason;
}
