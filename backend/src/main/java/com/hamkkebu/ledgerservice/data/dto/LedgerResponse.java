package com.hamkkebu.ledgerservice.data.dto;

import com.hamkkebu.ledgerservice.data.entity.Ledger;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.time.LocalDateTime;

@Getter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class LedgerResponse {

    private Long ledgerId;
    private Long userId;
    private String name;
    private String description;
    private String currency;
    private Boolean isDefault;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;

    // 통계 정보
    private BigDecimal totalIncome;
    private BigDecimal totalExpense;
    private BigDecimal balance;
    private Long transactionCount;

    public static LedgerResponse from(Ledger ledger) {
        return LedgerResponse.builder()
                .ledgerId(ledger.getLedgerId())
                .userId(ledger.getUserId())
                .name(ledger.getName())
                .description(ledger.getDescription())
                .currency(ledger.getCurrency())
                .isDefault(ledger.getIsDefault())
                .createdAt(ledger.getCreatedAt())
                .updatedAt(ledger.getUpdatedAt())
                .build();
    }

    public static LedgerResponse from(Ledger ledger, BigDecimal totalIncome, BigDecimal totalExpense, Long transactionCount) {
        return LedgerResponse.builder()
                .ledgerId(ledger.getLedgerId())
                .userId(ledger.getUserId())
                .name(ledger.getName())
                .description(ledger.getDescription())
                .currency(ledger.getCurrency())
                .isDefault(ledger.getIsDefault())
                .createdAt(ledger.getCreatedAt())
                .updatedAt(ledger.getUpdatedAt())
                .totalIncome(totalIncome)
                .totalExpense(totalExpense)
                .balance(totalIncome.subtract(totalExpense))
                .transactionCount(transactionCount)
                .build();
    }
}
