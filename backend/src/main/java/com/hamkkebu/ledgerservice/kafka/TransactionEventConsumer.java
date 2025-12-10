package com.hamkkebu.ledgerservice.kafka;

import com.hamkkebu.ledgerservice.data.entity.Transaction;
import com.hamkkebu.ledgerservice.data.enums.TransactionType;
import com.hamkkebu.ledgerservice.kafka.event.TransactionEvent;
import com.hamkkebu.ledgerservice.repository.TransactionRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.kafka.annotation.KafkaListener;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.util.Map;
import java.util.Optional;

/**
 * Ledger Service 거래 이벤트 Kafka Consumer
 *
 * <p>transaction-service에서 발행한 거래 관련 이벤트를 수신하여
 * ledger-service DB에 동기화합니다.</p>
 */
@Slf4j
@Component
@RequiredArgsConstructor
public class TransactionEventConsumer {

    private final TransactionRepository transactionRepository;

    /**
     * 거래 이벤트 처리 (TRANSACTION_CREATED, TRANSACTION_UPDATED, TRANSACTION_DELETED)
     */
    @KafkaListener(
            topics = "${kafka.topics.transaction-events:transaction.events}",
            groupId = "ledger-service-transaction-group",
            containerFactory = "transactionEventKafkaListenerContainerFactory"
    )
    @Transactional
    public void handleTransactionEvent(Map<String, Object> eventData) {
        String eventType = (String) eventData.get("eventType");
        String eventId = (String) eventData.get("eventId");

        log.info("[Kafka Consumer] Received transaction event: eventType={}, eventId={}", eventType, eventId);

        try {
            switch (eventType) {
                case TransactionEvent.EVENT_TYPE_CREATED:
                    handleTransactionCreated(eventData);
                    break;
                case TransactionEvent.EVENT_TYPE_UPDATED:
                    handleTransactionUpdated(eventData);
                    break;
                case TransactionEvent.EVENT_TYPE_DELETED:
                    handleTransactionDeleted(eventData);
                    break;
                default:
                    log.warn("[Kafka Consumer] Unknown transaction event type: {}", eventType);
            }
        } catch (Exception e) {
            log.error("[Kafka Consumer] Failed to process transaction event: eventType={}, eventId={}, error={}",
                    eventType, eventId, e.getMessage(), e);
            throw e;
        }
    }

    /**
     * TRANSACTION_CREATED 이벤트 처리
     */
    private void handleTransactionCreated(Map<String, Object> eventData) {
        Long transactionId = extractLong(eventData.get("transactionId"));
        log.info("[Kafka Consumer] Processing TRANSACTION_CREATED: transactionId={}", transactionId);

        // 이미 존재하는 거래인지 확인
        if (transactionRepository.existsByTransactionIdAndIsDeletedFalse(transactionId)) {
            log.info("[Kafka Consumer] Transaction already exists: transactionId={}", transactionId);
            return;
        }

        Transaction transaction = createTransactionFromEvent(eventData);
        transactionRepository.save(transaction);

        log.info("[Kafka Consumer] Transaction synced successfully: transactionId={}", transactionId);
    }

    /**
     * TRANSACTION_UPDATED 이벤트 처리
     */
    private void handleTransactionUpdated(Map<String, Object> eventData) {
        Long transactionId = extractLong(eventData.get("transactionId"));
        log.info("[Kafka Consumer] Processing TRANSACTION_UPDATED: transactionId={}", transactionId);

        Optional<Transaction> existingTransaction = transactionRepository.findByTransactionIdAndIsDeletedFalse(transactionId);

        if (existingTransaction.isPresent()) {
            Transaction transaction = existingTransaction.get();
            updateTransactionFromEvent(transaction, eventData);
            transactionRepository.save(transaction);
            log.info("[Kafka Consumer] Transaction updated successfully: transactionId={}", transactionId);
        } else {
            // 없으면 새로 생성
            Transaction transaction = createTransactionFromEvent(eventData);
            transactionRepository.save(transaction);
            log.info("[Kafka Consumer] Transaction created (was missing): transactionId={}", transactionId);
        }
    }

    /**
     * TRANSACTION_DELETED 이벤트 처리
     */
    private void handleTransactionDeleted(Map<String, Object> eventData) {
        Long transactionId = extractLong(eventData.get("transactionId"));
        log.info("[Kafka Consumer] Processing TRANSACTION_DELETED: transactionId={}", transactionId);

        transactionRepository.findByTransactionIdAndIsDeletedFalse(transactionId).ifPresentOrElse(
                transaction -> {
                    transaction.delete();
                    transactionRepository.save(transaction);
                    log.info("[Kafka Consumer] Transaction deleted successfully: transactionId={}", transactionId);
                },
                () -> log.warn("[Kafka Consumer] Transaction not found for deletion: transactionId={}", transactionId)
        );
    }

    /**
     * 이벤트 데이터로부터 Transaction 엔티티 생성
     */
    private Transaction createTransactionFromEvent(Map<String, Object> eventData) {
        return Transaction.builder()
                .transactionId(extractLong(eventData.get("transactionId")))
                .ledgerId(extractLong(eventData.get("ledgerId")))
                .type(TransactionType.valueOf((String) eventData.get("type")))
                .amount(extractBigDecimal(eventData.get("amount")))
                .description((String) eventData.get("description"))
                .transactionDate(extractLocalDate(eventData.get("transactionDate")))
                .memo((String) eventData.get("memo"))
                .build();
    }

    /**
     * 이벤트 데이터로 Transaction 엔티티 업데이트
     */
    private void updateTransactionFromEvent(Transaction transaction, Map<String, Object> eventData) {
        transaction.update(
                transaction.getCategoryId(),  // 카테고리는 ledger-service에서 관리
                TransactionType.valueOf((String) eventData.get("type")),
                extractBigDecimal(eventData.get("amount")),
                (String) eventData.get("description"),
                extractLocalDate(eventData.get("transactionDate")),
                (String) eventData.get("memo")
        );
    }

    private Long extractLong(Object value) {
        if (value instanceof Number) {
            return ((Number) value).longValue();
        }
        if (value instanceof String) {
            return Long.parseLong((String) value);
        }
        throw new IllegalArgumentException("Invalid Long value: " + value);
    }

    private java.math.BigDecimal extractBigDecimal(Object value) {
        if (value == null) {
            return java.math.BigDecimal.ZERO;
        }
        if (value instanceof Number) {
            return new java.math.BigDecimal(value.toString());
        }
        if (value instanceof String) {
            return new java.math.BigDecimal((String) value);
        }
        throw new IllegalArgumentException("Invalid BigDecimal value: " + value);
    }

    private java.time.LocalDate extractLocalDate(Object value) {
        if (value == null) {
            return java.time.LocalDate.now();
        }
        if (value instanceof java.time.LocalDate) {
            return (java.time.LocalDate) value;
        }
        if (value instanceof String) {
            return java.time.LocalDate.parse((String) value);
        }
        if (value instanceof java.util.List) {
            // [2025, 12, 1] 형태로 올 수 있음
            java.util.List<?> list = (java.util.List<?>) value;
            int year = ((Number) list.get(0)).intValue();
            int month = ((Number) list.get(1)).intValue();
            int day = ((Number) list.get(2)).intValue();
            return java.time.LocalDate.of(year, month, day);
        }
        throw new IllegalArgumentException("Invalid LocalDate value: " + value);
    }
}
