package com.hamkkebu.ledgerservice.kafka.producer;

import com.hamkkebu.boilerplate.common.ledger.event.LedgerShareAcceptedEvent;
import com.hamkkebu.boilerplate.common.ledger.event.LedgerShareCreatedEvent;
import com.hamkkebu.boilerplate.common.ledger.event.LedgerShareDeletedEvent;
import com.hamkkebu.boilerplate.common.ledger.event.LedgerShareRejectedEvent;
import com.hamkkebu.boilerplate.common.publisher.OutboxEventPublisher;
import com.hamkkebu.ledgerservice.data.entity.LedgerShare;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

/**
 * 가계부 공유 이벤트 Producer (Transactional Outbox 패턴)
 *
 * <p>가계부 공유 생성/수락/거절/삭제 시 Outbox 테이블에 이벤트를 저장합니다.</p>
 * <p>실제 Kafka 발행은 OutboxEventScheduler가 비동기로 처리합니다.</p>
 *
 * <p>다른 서비스(transaction-service 등)에서 공유 정보를 동기화할 수 있습니다.</p>
 */
@Slf4j
@Component
@RequiredArgsConstructor
public class LedgerShareEventProducer {

    private final OutboxEventPublisher outboxEventPublisher;

    @Value("${kafka.topics.ledger-share-events:ledger-share.events}")
    private String ledgerShareEventsTopic;

    /**
     * 가계부 공유 생성 이벤트 발행 (Outbox 테이블에 저장)
     *
     * <p>반드시 @Transactional 메서드 내에서 호출해야 합니다.</p>
     */
    public void publishLedgerShareCreated(LedgerShare share) {
        LedgerShareCreatedEvent event = LedgerShareCreatedEvent.builder()
                .ledgerShareId(share.getLedgerShareId())
                .ledgerId(share.getLedgerId())
                .ownerId(share.getOwnerId())
                .sharedUserId(share.getSharedUserId())
                .permission(share.getPermission().name())
                .build();

        outboxEventPublisher.publish(ledgerShareEventsTopic, event);

        log.info("[Outbox] Ledger share created event saved: eventId={}, ledgerShareId={}, ledgerId={}, ownerId={}, sharedUserId={}",
                event.getEventId(), share.getLedgerShareId(), share.getLedgerId(),
                share.getOwnerId(), share.getSharedUserId());
    }

    /**
     * 가계부 공유 수락 이벤트 발행 (Outbox 테이블에 저장)
     *
     * <p>반드시 @Transactional 메서드 내에서 호출해야 합니다.</p>
     */
    public void publishLedgerShareAccepted(LedgerShare share) {
        LedgerShareAcceptedEvent event = LedgerShareAcceptedEvent.builder()
                .ledgerShareId(share.getLedgerShareId())
                .ledgerId(share.getLedgerId())
                .sharedUserId(share.getSharedUserId())
                .build();

        outboxEventPublisher.publish(ledgerShareEventsTopic, event);

        log.info("[Outbox] Ledger share accepted event saved: eventId={}, ledgerShareId={}, sharedUserId={}",
                event.getEventId(), share.getLedgerShareId(), share.getSharedUserId());
    }

    /**
     * 가계부 공유 거절 이벤트 발행 (Outbox 테이블에 저장)
     *
     * <p>반드시 @Transactional 메서드 내에서 호출해야 합니다.</p>
     */
    public void publishLedgerShareRejected(LedgerShare share) {
        LedgerShareRejectedEvent event = LedgerShareRejectedEvent.builder()
                .ledgerShareId(share.getLedgerShareId())
                .ledgerId(share.getLedgerId())
                .sharedUserId(share.getSharedUserId())
                .reason(share.getRejectionReason())
                .build();

        outboxEventPublisher.publish(ledgerShareEventsTopic, event);

        log.info("[Outbox] Ledger share rejected event saved: eventId={}, ledgerShareId={}, sharedUserId={}",
                event.getEventId(), share.getLedgerShareId(), share.getSharedUserId());
    }

    /**
     * 가계부 공유 삭제 이벤트 발행 (Outbox 테이블에 저장)
     *
     * <p>반드시 @Transactional 메서드 내에서 호출해야 합니다.</p>
     */
    public void publishLedgerShareDeleted(LedgerShare share, Long userId) {
        LedgerShareDeletedEvent event = LedgerShareDeletedEvent.builder()
                .ledgerShareId(share.getLedgerShareId())
                .ledgerId(share.getLedgerId())
                .userId(userId)
                .build();

        outboxEventPublisher.publish(ledgerShareEventsTopic, event);

        log.info("[Outbox] Ledger share deleted event saved: eventId={}, ledgerShareId={}, userId={}",
                event.getEventId(), share.getLedgerShareId(), userId);
    }
}
