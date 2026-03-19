package com.hamkkebu.ledgerservice.controller;

import com.hamkkebu.boilerplate.common.dto.ApiResponse;
import com.hamkkebu.boilerplate.common.user.annotation.CurrentUser;
import com.hamkkebu.ledgerservice.data.dto.InvitationRequest;
import com.hamkkebu.ledgerservice.data.dto.InvitationResponse;
import com.hamkkebu.ledgerservice.service.LedgerInvitationService;
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
 * 가계부 초대 Controller
 *
 * <p>가계부 멤버 초대 관련 REST API를 제공합니다.</p>
 */
@Slf4j
@RestController
@RequestMapping("/api/v1/ledgers")
@RequiredArgsConstructor
@Tag(name = "Ledger Invitation", description = "가계부 초대 관리 API")
public class LedgerInvitationController {

    private final LedgerInvitationService ledgerInvitationService;

    // ==================== 초대 생성/조회 (소유자) ====================

    @PostMapping("/{ledgerId}/invitations")
    @Operation(summary = "가계부 초대 생성", description = "다른 사용자를 가계부로 초대합니다")
    public ResponseEntity<ApiResponse<InvitationResponse>> createInvitation(
            @Parameter(hidden = true) @CurrentUser Long userId,
            @PathVariable Long ledgerId,
            @Valid @RequestBody InvitationRequest request) {

        log.info("POST /api/v1/ledgers/{}/invitations - userId: {}, inviteeEmail: {}",
                ledgerId, userId, request.getInviteeEmail());
        InvitationResponse invitation = ledgerInvitationService.createInvitation(userId, ledgerId, request);
        return ResponseEntity.status(HttpStatus.CREATED).body(ApiResponse.success(invitation));
    }

    @GetMapping("/{ledgerId}/invitations")
    @Operation(summary = "보낸 초대 목록 조회", description = "특정 가계부에 보낸 초대 목록을 조회합니다")
    public ResponseEntity<ApiResponse<List<InvitationResponse>>> getSentInvitations(
            @Parameter(hidden = true) @CurrentUser Long userId,
            @PathVariable Long ledgerId) {

        log.info("GET /api/v1/ledgers/{}/invitations - userId: {}", ledgerId, userId);
        List<InvitationResponse> invitations = ledgerInvitationService.getSentInvitations(userId, ledgerId);
        return ResponseEntity.ok(ApiResponse.success(invitations));
    }

    // ==================== 초대 수락/거절 (수신자) ====================

    @GetMapping("/invitations/received")
    @Operation(summary = "받은 초대 목록 조회", description = "나에게 온 대기 중인 초대 목록을 조회합니다")
    public ResponseEntity<ApiResponse<List<InvitationResponse>>> getReceivedInvitations(
            @Parameter(hidden = true) @CurrentUser Long userId) {

        log.info("GET /api/v1/ledgers/invitations/received - userId: {}", userId);
        List<InvitationResponse> invitations = ledgerInvitationService.getReceivedInvitations(userId);
        return ResponseEntity.ok(ApiResponse.success(invitations));
    }

    @PostMapping("/invitations/{invitationId}/accept")
    @Operation(summary = "초대 수락", description = "받은 초대를 수락합니다")
    public ResponseEntity<ApiResponse<InvitationResponse>> acceptInvitation(
            @Parameter(hidden = true) @CurrentUser Long userId,
            @PathVariable Long invitationId) {

        log.info("POST /api/v1/ledgers/invitations/{}/accept - userId: {}", invitationId, userId);
        InvitationResponse invitation = ledgerInvitationService.acceptInvitation(userId, invitationId);
        return ResponseEntity.ok(ApiResponse.success(invitation));
    }

    @PostMapping("/invitations/{invitationId}/reject")
    @Operation(summary = "초대 거절", description = "받은 초대를 거절합니다")
    public ResponseEntity<ApiResponse<InvitationResponse>> rejectInvitation(
            @Parameter(hidden = true) @CurrentUser Long userId,
            @PathVariable Long invitationId) {

        log.info("POST /api/v1/ledgers/invitations/{}/reject - userId: {}", invitationId, userId);
        InvitationResponse invitation = ledgerInvitationService.rejectInvitation(userId, invitationId);
        return ResponseEntity.ok(ApiResponse.success(invitation));
    }

    // ==================== 초대 취소 ====================

    @DeleteMapping("/invitations/{invitationId}")
    @Operation(summary = "초대 취소", description = "보낸 초대를 취소합니다")
    public ResponseEntity<ApiResponse<Void>> cancelInvitation(
            @Parameter(hidden = true) @CurrentUser Long userId,
            @PathVariable Long invitationId) {

        log.info("DELETE /api/v1/ledgers/invitations/{} - userId: {}", invitationId, userId);
        ledgerInvitationService.cancelInvitation(userId, invitationId);
        return ResponseEntity.ok(ApiResponse.success(null));
    }
}
