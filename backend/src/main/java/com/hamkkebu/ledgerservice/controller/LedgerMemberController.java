package com.hamkkebu.ledgerservice.controller;

import com.hamkkebu.boilerplate.common.dto.ApiResponse;
import com.hamkkebu.boilerplate.common.user.annotation.CurrentUser;
import com.hamkkebu.ledgerservice.data.dto.MemberResponse;
import com.hamkkebu.ledgerservice.service.LedgerMemberService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.constraints.NotBlank;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

/**
 * 가계부 멤버 Controller
 *
 * <p>가계부 멤버 관리 관련 REST API를 제공합니다.</p>
 */
@Slf4j
@RestController
@RequestMapping("/api/v1/ledgers")
@RequiredArgsConstructor
@Tag(name = "Ledger Member", description = "가계부 멤버 관리 API")
public class LedgerMemberController {

    private final LedgerMemberService ledgerMemberService;

    // ==================== 멤버 조회 ====================

    @GetMapping("/{ledgerId}/members")
    @Operation(summary = "멤버 목록 조회", description = "특정 가계부의 멤버 목록을 조회합니다")
    public ResponseEntity<ApiResponse<List<MemberResponse>>> getMembers(
            @Parameter(hidden = true) @CurrentUser Long userId,
            @PathVariable Long ledgerId) {

        log.info("GET /api/v1/ledgers/{}/members - userId: {}", ledgerId, userId);
        List<MemberResponse> members = ledgerMemberService.getMembers(userId, ledgerId);
        return ResponseEntity.ok(ApiResponse.success(members));
    }

    // ==================== 멤버 역할 변경 ====================

    @PutMapping("/{ledgerId}/members/{memberId}/role")
    @Operation(summary = "멤버 역할 변경", description = "멤버의 역할을 변경합니다")
    public ResponseEntity<ApiResponse<Void>> changeMemberRole(
            @Parameter(hidden = true) @CurrentUser Long userId,
            @PathVariable Long ledgerId,
            @PathVariable Long memberId,
            @RequestBody Map<String, String> request) {

        String newRole = request.get("role");
        if (newRole == null || newRole.isBlank()) {
            throw new IllegalArgumentException("역할은 필수입니다");
        }

        log.info("PUT /api/v1/ledgers/{}/members/{}/role - userId: {}, newRole: {}",
                ledgerId, memberId, userId, newRole);
        ledgerMemberService.changeMemberRole(userId, ledgerId, memberId, newRole);
        return ResponseEntity.ok(ApiResponse.success(null));
    }

    // ==================== 멤버 제거 ====================

    @DeleteMapping("/{ledgerId}/members/{memberId}")
    @Operation(summary = "멤버 제거", description = "가계부에서 멤버를 제거합니다")
    public ResponseEntity<ApiResponse<Void>> removeMember(
            @Parameter(hidden = true) @CurrentUser Long userId,
            @PathVariable Long ledgerId,
            @PathVariable Long memberId) {

        log.info("DELETE /api/v1/ledgers/{}/members/{} - userId: {}", ledgerId, memberId, userId);
        ledgerMemberService.removeMember(userId, ledgerId, memberId);
        return ResponseEntity.ok(ApiResponse.success(null));
    }

    // ==================== 가계부 나가기 ====================

    @PostMapping("/{ledgerId}/members/leave")
    @Operation(summary = "가계부 나가기", description = "가계부에서 나갑니다")
    public ResponseEntity<ApiResponse<Void>> leaveLedger(
            @Parameter(hidden = true) @CurrentUser Long userId,
            @PathVariable Long ledgerId) {

        log.info("POST /api/v1/ledgers/{}/members/leave - userId: {}", ledgerId, userId);
        ledgerMemberService.leaveLedger(userId, ledgerId);
        return ResponseEntity.ok(ApiResponse.success(null));
    }
}
