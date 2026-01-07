package com.hamkkebu.ledgerservice.kafka.producer;

import com.hamkkebu.boilerplate.common.ledger.event.LedgerCreatedEvent;
import com.hamkkebu.boilerplate.common.ledger.event.LedgerDeletedEvent;
import com.hamkkebu.boilerplate.common.ledger.event.LedgerUpdatedEvent;
import com.hamkkebu.boilerplate.common.publisher.OutboxEventPublisher;
import com.hamkkebu.ledgerservice.data.entity.Ledger;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

/**
 * 가계부 이벤트 Producer (Transactional Outbox 패턴)
 *
 * <p>가계부 생성/수정/삭제 시 Outbox 테이블에 이벤트를 저장합니다.</p>
 * <p>실제 Kafka 발행은 OutboxEventScheduler가 비동기로 처리합니다.</p>
 *
 * <p>다른 서비스(transaction-service 등)에서 가계부 정보를 동기화할 수 있습니다.</p>
 */
@Slf4j
@Component
@RequiredArgsConstructor
public class LedgerEventProducer {

    private final OutboxEventPublisher outboxEventPublisher;

    @Value("${kafka.topics.ledger-events:ledger.events}")
    private String ledgerEventsTopic;

    /**
     * 가계부 생성 이벤트 발행 (Outbox 테이블에 저장)
     *
     * <p>반드시 @Transactional 메서드 내에서 호출해야 합니다.</p>
     */
    public void publishLedgerCreated(Ledger ledger) {
        LedgerCreatedEvent event = LedgerCreatedEvent.builder()
                .ledgerId(ledger.getLedgerId())
                .userId(ledger.getUserId())
                .name(ledger.getName())
                .description(ledger.getDescription())
                .currency(ledger.getCurrency())
                .isDefault(ledger.getIsDefault())
                .build();

        outboxEventPublisher.publish(ledgerEventsTopic, event);

        log.info("[Outbox] Ledger created event saved: eventId={}, ledgerId={}, userId={}",
                event.getEventId(), ledger.getLedgerId(), ledger.getUserId());
    }

    /**
     * 가계부 수정 이벤트 발행 (Outbox 테이블에 저장)
     *
     * <p>반드시 @Transactional 메서드 내에서 호출해야 합니다.</p>
     */
    public void publishLedgerUpdated(Ledger ledger) {
        LedgerUpdatedEvent event = LedgerUpdatedEvent.builder()
                .ledgerId(ledger.getLedgerId())
                .userId(ledger.getUserId())
                .name(ledger.getName())
                .description(ledger.getDescription())
                .currency(ledger.getCurrency())
                .isDefault(ledger.getIsDefault())
                .build();

        outboxEventPublisher.publish(ledgerEventsTopic, event);

        log.info("[Outbox] Ledger updated event saved: eventId={}, ledgerId={}, userId={}",
                event.getEventId(), ledger.getLedgerId(), ledger.getUserId());
    }

    /**
     * 가계부 삭제 이벤트 발행 (Outbox 테이블에 저장)
     *
     * <p>반드시 @Transactional 메서드 내에서 호출해야 합니다.</p>
     */
    public void publishLedgerDeleted(Ledger ledger) {
        LedgerDeletedEvent event = LedgerDeletedEvent.builder()
                .ledgerId(ledger.getLedgerId())
                .userId(ledger.getUserId())
                .build();

        outboxEventPublisher.publish(ledgerEventsTopic, event);

        log.info("[Outbox] Ledger deleted event saved: eventId={}, ledgerId={}, userId={}",
                event.getEventId(), ledger.getLedgerId(), ledger.getUserId());
    }
}
