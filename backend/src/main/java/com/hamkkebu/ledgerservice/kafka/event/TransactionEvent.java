package com.hamkkebu.ledgerservice.kafka.event;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;

/**
 * 거래 이벤트 DTO
 *
 * <p>transaction-service에서 발행한 거래 관련 이벤트를 수신합니다.</p>
 */
@Getter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class TransactionEvent {

    public static final String EVENT_TYPE_CREATED = "TRANSACTION_CREATED";
    public static final String EVENT_TYPE_UPDATED = "TRANSACTION_UPDATED";
    public static final String EVENT_TYPE_DELETED = "TRANSACTION_DELETED";

    private String eventId;
    private String eventType;
    private LocalDateTime timestamp;

    // 거래 정보
    private Long transactionId;
    private Long ledgerId;
    private Long userId;
    private String type;  // INCOME, EXPENSE
    private BigDecimal amount;
    private String description;
    private String category;
    private LocalDate transactionDate;
    private String memo;
}
