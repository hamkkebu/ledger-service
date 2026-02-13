package com.hamkkebu.ledgerservice.data.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.util.List;

/**
 * 사용자의 전체 가계부 현황 요약
 */
@Getter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class LedgerSummaryResponse {

    private Long userId;
    private String username;

    // 전체 통계
    private Integer totalLedgerCount;
    private BigDecimal totalIncome;
    private BigDecimal totalExpense;
    private BigDecimal totalBalance;

    // 내 가계부 목록
    private List<LedgerResponse> ledgers;

    // 공유받은 가계부 통계
    private Integer sharedLedgerCount;
    private BigDecimal sharedTotalIncome;
    private BigDecimal sharedTotalExpense;
    private BigDecimal sharedTotalBalance;

    // 공유받은 가계부 목록
    private List<LedgerResponse> sharedLedgers;
}
