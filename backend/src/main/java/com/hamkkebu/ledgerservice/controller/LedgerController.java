package com.hamkkebu.ledgerservice.controller;

import com.hamkkebu.boilerplate.common.dto.ApiResponse;
import com.hamkkebu.ledgerservice.data.dto.LedgerRequest;
import com.hamkkebu.ledgerservice.data.dto.LedgerResponse;
import com.hamkkebu.ledgerservice.data.dto.LedgerSummaryResponse;
import com.hamkkebu.boilerplate.common.user.annotation.CurrentUser;
import com.hamkkebu.ledgerservice.service.LedgerService;
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
@RequestMapping("/api/v1/ledgers")
@RequiredArgsConstructor
@Tag(name = "Ledger", description = "가계부 관리 API")
public class LedgerController {

    private final LedgerService ledgerService;

    @GetMapping("/summary")
    @Operation(summary = "가계부 현황 조회", description = "사용자의 전체 가계부 현황을 조회합니다")
    public ResponseEntity<ApiResponse<LedgerSummaryResponse>> getLedgerSummary(
            @Parameter(hidden = true) @CurrentUser Long userId) {

        log.info("GET /api/v1/ledgers/summary - userId: {}", userId);
        LedgerSummaryResponse summary = ledgerService.getLedgerSummary(userId);
        return ResponseEntity.ok(ApiResponse.success(summary));
    }

    @GetMapping
    @Operation(summary = "가계부 목록 조회", description = "사용자의 가계부 목록을 조회합니다")
    public ResponseEntity<ApiResponse<List<LedgerResponse>>> getLedgers(
            @Parameter(hidden = true) @CurrentUser Long userId) {

        log.info("GET /api/v1/ledgers - userId: {}", userId);
        List<LedgerResponse> ledgers = ledgerService.getLedgers(userId);
        return ResponseEntity.ok(ApiResponse.success(ledgers));
    }

    @GetMapping("/{ledgerId}")
    @Operation(summary = "가계부 상세 조회", description = "특정 가계부의 상세 정보를 조회합니다")
    public ResponseEntity<ApiResponse<LedgerResponse>> getLedger(
            @Parameter(hidden = true) @CurrentUser Long userId,
            @PathVariable Long ledgerId) {

        log.info("GET /api/v1/ledgers/{} - userId: {}", ledgerId, userId);
        LedgerResponse ledger = ledgerService.getLedger(userId, ledgerId);
        return ResponseEntity.ok(ApiResponse.success(ledger));
    }

    @PostMapping
    @Operation(summary = "가계부 생성", description = "새로운 가계부를 생성합니다")
    public ResponseEntity<ApiResponse<LedgerResponse>> createLedger(
            @Parameter(hidden = true) @CurrentUser Long userId,
            @Valid @RequestBody LedgerRequest request) {

        log.info("POST /api/v1/ledgers - userId: {}, name: {}", userId, request.getName());
        LedgerResponse ledger = ledgerService.createLedger(userId, request);
        return ResponseEntity.status(HttpStatus.CREATED).body(ApiResponse.success(ledger));
    }

    @PutMapping("/{ledgerId}")
    @Operation(summary = "가계부 수정", description = "가계부 정보를 수정합니다")
    public ResponseEntity<ApiResponse<LedgerResponse>> updateLedger(
            @Parameter(hidden = true) @CurrentUser Long userId,
            @PathVariable Long ledgerId,
            @Valid @RequestBody LedgerRequest request) {

        log.info("PUT /api/v1/ledgers/{} - userId: {}", ledgerId, userId);
        LedgerResponse ledger = ledgerService.updateLedger(userId, ledgerId, request);
        return ResponseEntity.ok(ApiResponse.success(ledger));
    }

    @DeleteMapping("/{ledgerId}")
    @Operation(summary = "가계부 삭제", description = "가계부를 삭제합니다")
    public ResponseEntity<ApiResponse<Void>> deleteLedger(
            @Parameter(hidden = true) @CurrentUser Long userId,
            @PathVariable Long ledgerId) {

        log.info("DELETE /api/v1/ledgers/{} - userId: {}", ledgerId, userId);
        ledgerService.deleteLedger(userId, ledgerId);
        return ResponseEntity.ok(ApiResponse.success(null));
    }
}
