package com.hamkkebu.ledgerservice.data.dto;

import com.hamkkebu.ledgerservice.data.entity.Category;
import com.hamkkebu.ledgerservice.data.enums.TransactionType;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;
import java.util.List;

@Getter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class CategoryResponse {

    private Long categoryId;
    private Long ledgerId;
    private String name;
    private TransactionType type;
    private String icon;
    private String color;
    private Long parentId;
    private String parentName;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
    private List<CategoryResponse> children;

    public static CategoryResponse from(Category category) {
        return CategoryResponse.builder()
                .categoryId(category.getCategoryId())
                .ledgerId(category.getLedgerId())
                .name(category.getName())
                .type(category.getType())
                .icon(category.getIcon())
                .color(category.getColor())
                .parentId(category.getParentId())
                .parentName(category.getParent() != null ? category.getParent().getName() : null)
                .createdAt(category.getCreatedAt())
                .updatedAt(category.getUpdatedAt())
                .build();
    }

    public static CategoryResponse fromWithChildren(Category category) {
        List<CategoryResponse> childResponses = category.getChildren() != null
                ? category.getChildren().stream()
                    .filter(c -> !c.isDeleted())
                    .map(CategoryResponse::from)
                    .toList()
                : List.of();

        return CategoryResponse.builder()
                .categoryId(category.getCategoryId())
                .ledgerId(category.getLedgerId())
                .name(category.getName())
                .type(category.getType())
                .icon(category.getIcon())
                .color(category.getColor())
                .parentId(category.getParentId())
                .parentName(category.getParent() != null ? category.getParent().getName() : null)
                .createdAt(category.getCreatedAt())
                .updatedAt(category.getUpdatedAt())
                .children(childResponses)
                .build();
    }
}
