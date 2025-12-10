package com.hamkkebu.ledgerservice.data.dto;

import com.hamkkebu.ledgerservice.data.enums.TransactionType;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;

@Getter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class CategoryRequest {

    @NotBlank(message = "카테고리 이름은 필수입니다")
    @Size(max = 50, message = "카테고리 이름은 50자 이내로 입력해주세요")
    private String name;

    @NotNull(message = "카테고리 유형은 필수입니다")
    private TransactionType type;

    @Size(max = 50, message = "아이콘은 50자 이내로 입력해주세요")
    private String icon;

    @Size(max = 20, message = "색상은 20자 이내로 입력해주세요")
    private String color;

    private Long parentId;
}
