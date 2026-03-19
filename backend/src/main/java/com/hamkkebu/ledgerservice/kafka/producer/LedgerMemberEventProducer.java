package com.hamkkebu.ledgerservice.kafka.producer;

import com.hamkkebu.boilerplate.common.ledger.event.LedgerMemberAddedEvent;
import com.hamkkebu.boilerplate.common.ledger.event.LedgerMemberRemoveEvent;
import com.hamkkebu.boilerplate.common.ledger.event.LedgerMemberRoleChangedEvent;
import com.hamkkebu.boilerplate.common.publisher.OutboxEventPublisher;
import com.hamkkebu.ledgerservice.data.entity.LedgerMember;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

/**
 * 가계부 멤버 이벤트 Producer (Transactional Outbox 패턴)
 *
 * <p>가계부 멤버 추가/제거/역할변경 시 Outbox 테이블에 이벤트를 저장합니다.</p>
 * <p>실제 Kafka 발행은 OutboxEventScheduler가 비동기로 처리합니다.</p>
 *
 * <p>다른 서비스(transaction-service 등)에서 멤버 정보를 동기화할 수 있습니다.</p>
 */
@Slf4j
@Component
@RequiredArgsConstructor
public class LedgerMemberEventProducer {

    private final OutboxEventPublisher outboxEventPublisher;

    @Value("${kafka.topics.ledger-member-events:ledger-member.events}")
    private String ledgerMemberEventsTopic;

    /**
     * 가계부 멤버 추가 이벤트 발행 (Outbox 테이블에 저장)
     *
     * <p>반드시 @Transactional 메서드 내에서 호출해야 합니다.</p>
     */
    public void publishLedgerMemberAdded(LedgerMember member) {
        LedgerMemberAddedEvent event = LedgerMemberAddedEvent.builder()
                .ledgerMemberId(member.getLedgerMemberId())
                .ledgerId(member.getLedgerId())
                .accountId(member.getAccountId())
                .role(member.getRole().name())
                .build();

        outboxEventPublisher.publish(ledgerMemberEventsTopic, event);

        log.info("[Outbox] Ledger member added event saved: eventId={}, ledgerMemberId={}, ledgerId={}, accountId={}",
                event.getEventId(), member.getLedgerMemberId(), member.getLedgerId(), member.getAccountId());
    }

    /**
     * 가계부 멤버 제거 이벤트 발행 (Outbox 테이블에 저장)
     *
     * <p>반드시 @Transactional 메서드 내에서 호출해야 합니다.</p>
     */
    public void publishLedgerMemberRemoved(LedgerMember member) {
        LedgerMemberRemoveEvent event = LedgerMemberRemoveEvent.builder()
                .ledgerMemberId(member.getLedgerMemberId())
                .ledgerId(member.getLedgerId())
                .accountId(member.getAccountId())
                .build();

        outboxEventPublisher.publish(ledgerMemberEventsTopic, event);

        log.info("[Outbox] Ledger member removed event saved: eventId={}, ledgerMemberId={}, ledgerId={}, accountId={}",
                event.getEventId(), member.getLedgerMemberId(), member.getLedgerId(), member.getAccountId());
    }

    /**
     * 가계부 멤버 역할 변경 이벤트 발행 (Outbox 테이블에 저장)
     *
     * <p>반드시 @Transactional 메서드 내에서 호출해야 합니다.</p>
     */
    public void publishLedgerMemberRoleChanged(LedgerMember member) {
        LedgerMemberRoleChangedEvent event = LedgerMemberRoleChangedEvent.builder()
                .ledgerMemberId(member.getLedgerMemberId())
                .ledgerId(member.getLedgerId())
                .accountId(member.getAccountId())
                .role(member.getRole().name())
                .build();

        outboxEventPublisher.publish(ledgerMemberEventsTopic, event);

        log.info("[Outbox] Ledger member role changed event saved: eventId={}, ledgerMemberId={}, ledgerId={}, accountId={}, role={}",
                event.getEventId(), member.getLedgerMemberId(), member.getLedgerId(), member.getAccountId(), member.getRole().name());
    }
}
