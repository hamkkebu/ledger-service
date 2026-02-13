package com.hamkkebu.ledgerservice.controller;

import com.hamkkebu.boilerplate.common.dto.ApiResponse;
import com.hamkkebu.boilerplate.common.user.annotation.CurrentUser;
import com.hamkkebu.ledgerservice.data.dto.LedgerShareRejectRequest;
import com.hamkkebu.ledgerservice.data.dto.LedgerShareRequest;
import com.hamkkebu.ledgerservice.data.dto.LedgerShareResponse;
import com.hamkkebu.ledgerservice.service.LedgerShareService;
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

/**
 * 가계부 공유 Controller
 *
 * <p>가계부 공유 관련 REST API를 제공합니다.</p>
 */
@Slf4j
@RestController
@RequestMapping("/api/v1/ledgers")
@RequiredArgsConstructor
@Tag(name = "Ledger Share", description = "가계부 공유 관리 API")
public class LedgerShareController {

    private final LedgerShareService ledgerShareService;

    // ==================== 공유 요청/관리 (소유자) ====================

    @PostMapping("/{ledgerId}/shares")
    @Operation(summary = "가계부 공유 요청", description = "다른 사용자에게 가계부를 공유합니다")
    public ResponseEntity<ApiResponse<LedgerShareResponse>> shareLedger(
            @Parameter(hidden = true) @CurrentUser Long userId,
            @PathVariable Long ledgerId,
            @Valid @RequestBody LedgerShareRequest request) {

        log.info("POST /api/v1/ledgers/{}/shares - userId: {}, sharedUserId: {}",
                ledgerId, userId, request.getSharedUserId());
        LedgerShareResponse share = ledgerShareService.shareLedger(userId, ledgerId, request);
        return ResponseEntity.status(HttpStatus.CREATED).body(ApiResponse.success(share));
    }

    @GetMapping("/{ledgerId}/shares")
    @Operation(summary = "가계부 공유 목록 조회", description = "특정 가계부에 공유된 사용자 목록을 조회합니다")
    public ResponseEntity<ApiResponse<List<LedgerShareResponse>>> getSharesByLedger(
            @Parameter(hidden = true) @CurrentUser Long userId,
            @PathVariable Long ledgerId) {

        log.info("GET /api/v1/ledgers/{}/shares - userId: {}", ledgerId, userId);
        List<LedgerShareResponse> shares = ledgerShareService.getSharesByLedger(userId, ledgerId);
        return ResponseEntity.ok(ApiResponse.success(shares));
    }

    // ==================== 공유 수락/거절 (수신자) ====================

    @PostMapping("/shares/{ledgerShareId}/accept")
    @Operation(summary = "가계부 공유 수락", description = "공유 요청을 수락합니다")
    public ResponseEntity<ApiResponse<LedgerShareResponse>> acceptShare(
            @Parameter(hidden = true) @CurrentUser Long userId,
            @PathVariable Long ledgerShareId) {

        log.info("POST /api/v1/ledgers/shares/{}/accept - userId: {}", ledgerShareId, userId);
        LedgerShareResponse share = ledgerShareService.acceptShare(userId, ledgerShareId);
        return ResponseEntity.ok(ApiResponse.success(share));
    }

    @PostMapping("/shares/{ledgerShareId}/reject")
    @Operation(summary = "가계부 공유 거절", description = "공유 요청을 거절합니다")
    public ResponseEntity<ApiResponse<LedgerShareResponse>> rejectShare(
            @Parameter(hidden = true) @CurrentUser Long userId,
            @PathVariable Long ledgerShareId,
            @RequestBody(required = false) LedgerShareRejectRequest request) {

        log.info("POST /api/v1/ledgers/shares/{}/reject - userId: {}", ledgerShareId, userId);
        String reason = request != null ? request.getReason() : null;
        LedgerShareResponse share = ledgerShareService.rejectShare(userId, ledgerShareId, reason);
        return ResponseEntity.ok(ApiResponse.success(share));
    }

    // ==================== 공유 삭제 ====================

    @DeleteMapping("/shares/{ledgerShareId}")
    @Operation(summary = "가계부 공유 삭제", description = "가계부 공유를 해제합니다 (소유자 또는 수신자)")
    public ResponseEntity<ApiResponse<Void>> deleteShare(
            @Parameter(hidden = true) @CurrentUser Long userId,
            @PathVariable Long ledgerShareId) {

        log.info("DELETE /api/v1/ledgers/shares/{} - userId: {}", ledgerShareId, userId);
        ledgerShareService.deleteShare(userId, ledgerShareId);
        return ResponseEntity.ok(ApiResponse.success(null));
    }

    // ==================== 공유 조회 (수신자/소유자) ====================

    @GetMapping("/shares/received")
    @Operation(summary = "공유받은 가계부 조회", description = "나에게 공유되어 수락된 가계부 목록을 조회합니다")
    public ResponseEntity<ApiResponse<List<LedgerShareResponse>>> getSharedWithMe(
            @Parameter(hidden = true) @CurrentUser Long userId) {

        log.info("GET /api/v1/ledgers/shares/received - userId: {}", userId);
        List<LedgerShareResponse> shares = ledgerShareService.getSharedWithMe(userId);
        return ResponseEntity.ok(ApiResponse.success(shares));
    }

    @GetMapping("/shares/pending")
    @Operation(summary = "대기 중인 공유 요청 조회", description = "나에게 온 PENDING 상태의 공유 요청을 조회합니다")
    public ResponseEntity<ApiResponse<List<LedgerShareResponse>>> getPendingShares(
            @Parameter(hidden = true) @CurrentUser Long userId) {

        log.info("GET /api/v1/ledgers/shares/pending - userId: {}", userId);
        List<LedgerShareResponse> shares = ledgerShareService.getPendingShares(userId);
        return ResponseEntity.ok(ApiResponse.success(shares));
    }

    @GetMapping("/shares/sent")
    @Operation(summary = "보낸 공유 요청 조회", description = "내가 보낸 모든 공유 요청을 조회합니다")
    public ResponseEntity<ApiResponse<List<LedgerShareResponse>>> getSentShares(
            @Parameter(hidden = true) @CurrentUser Long userId) {

        log.info("GET /api/v1/ledgers/shares/sent - userId: {}", userId);
        List<LedgerShareResponse> shares = ledgerShareService.getSentShares(userId);
        return ResponseEntity.ok(ApiResponse.success(shares));
    }
}
