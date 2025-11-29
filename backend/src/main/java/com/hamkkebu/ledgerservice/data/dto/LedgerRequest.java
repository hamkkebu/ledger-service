package com.hamkkebu.ledgerservice.data.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;

@Getter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class LedgerRequest {

    @NotBlank(message = "가계부 이름은 필수입니다")
    @Size(max = 100, message = "가계부 이름은 100자 이내로 입력해주세요")
    private String name;

    @Size(max = 500, message = "설명은 500자 이내로 입력해주세요")
    private String description;

    @Size(max = 10, message = "통화 코드는 10자 이내로 입력해주세요")
    private String currency;

    private Boolean isDefault;
}
