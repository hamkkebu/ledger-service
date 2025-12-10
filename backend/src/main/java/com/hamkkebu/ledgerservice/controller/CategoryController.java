package com.hamkkebu.ledgerservice.controller;

import com.hamkkebu.boilerplate.common.dto.ApiResponse;
import com.hamkkebu.boilerplate.common.user.annotation.CurrentUser;
import com.hamkkebu.ledgerservice.data.dto.CategoryRequest;
import com.hamkkebu.ledgerservice.data.dto.CategoryResponse;
import com.hamkkebu.ledgerservice.data.enums.TransactionType;
import com.hamkkebu.ledgerservice.service.CategoryService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@Slf4j
@RestController
@RequestMapping("/api/v1/ledgers/{ledgerId}/categories")
@RequiredArgsConstructor
@Tag(name = "Category", description = "카테고리 관리 API")
public class CategoryController {

    private final CategoryService categoryService;

    @GetMapping
    @Operation(summary = "카테고리 목록 조회", description = "가계부의 카테고리 목록을 조회합니다")
    public ResponseEntity<ApiResponse<List<CategoryResponse>>> getCategories(
            @Parameter(hidden = true) @CurrentUser Long userId,
            @PathVariable Long ledgerId,
            @RequestParam(required = false) TransactionType type) {

        log.info("GET /api/v1/ledgers/{}/categories - userId: {}, type: {}", ledgerId, userId, type);

        List<CategoryResponse> categories;
        if (type != null) {
            categories = categoryService.getCategoriesByType(ledgerId, type);
        } else {
            categories = categoryService.getCategories(ledgerId);
        }

        return ResponseEntity.ok(ApiResponse.success(categories));
    }

    @GetMapping("/{categoryId}")
    @Operation(summary = "카테고리 상세 조회", description = "특정 카테고리의 상세 정보를 조회합니다")
    public ResponseEntity<ApiResponse<CategoryResponse>> getCategory(
            @Parameter(hidden = true) @CurrentUser Long userId,
            @PathVariable Long ledgerId,
            @PathVariable Long categoryId) {

        log.info("GET /api/v1/ledgers/{}/categories/{} - userId: {}", ledgerId, categoryId, userId);
        CategoryResponse category = categoryService.getCategory(ledgerId, categoryId);
        return ResponseEntity.ok(ApiResponse.success(category));
    }

    @PostMapping
    @Operation(summary = "카테고리 생성", description = "새로운 카테고리를 생성합니다")
    public ResponseEntity<ApiResponse<CategoryResponse>> createCategory(
            @Parameter(hidden = true) @CurrentUser Long userId,
            @PathVariable Long ledgerId,
            @Valid @RequestBody CategoryRequest request) {

        log.info("POST /api/v1/ledgers/{}/categories - userId: {}, name: {}", ledgerId, userId, request.getName());
        CategoryResponse category = categoryService.createCategory(ledgerId, request);
        return ResponseEntity.status(HttpStatus.CREATED).body(ApiResponse.success(category));
    }

    @PutMapping("/{categoryId}")
    @Operation(summary = "카테고리 수정", description = "카테고리 정보를 수정합니다")
    public ResponseEntity<ApiResponse<CategoryResponse>> updateCategory(
            @Parameter(hidden = true) @CurrentUser Long userId,
            @PathVariable Long ledgerId,
            @PathVariable Long categoryId,
            @Valid @RequestBody CategoryRequest request) {

        log.info("PUT /api/v1/ledgers/{}/categories/{} - userId: {}", ledgerId, categoryId, userId);
        CategoryResponse category = categoryService.updateCategory(ledgerId, categoryId, request);
        return ResponseEntity.ok(ApiResponse.success(category));
    }

    @DeleteMapping("/{categoryId}")
    @Operation(summary = "카테고리 삭제", description = "카테고리를 삭제합니다")
    public ResponseEntity<ApiResponse<Void>> deleteCategory(
            @Parameter(hidden = true) @CurrentUser Long userId,
            @PathVariable Long ledgerId,
            @PathVariable Long categoryId) {

        log.info("DELETE /api/v1/ledgers/{}/categories/{} - userId: {}", ledgerId, categoryId, userId);
        categoryService.deleteCategory(ledgerId, categoryId);
        return ResponseEntity.ok(ApiResponse.success(null));
    }

    @PostMapping("/default")
    @Operation(summary = "기본 카테고리 생성", description = "기본 카테고리를 생성합니다 (관리자용)")
    public ResponseEntity<ApiResponse<Void>> createDefaultCategories(
            @Parameter(hidden = true) @CurrentUser Long userId,
            @PathVariable Long ledgerId) {

        log.info("POST /api/v1/ledgers/{}/categories/default - userId: {}", ledgerId, userId);
        categoryService.createDefaultCategories(ledgerId);
        return ResponseEntity.status(HttpStatus.CREATED).body(ApiResponse.success(null));
    }
}
