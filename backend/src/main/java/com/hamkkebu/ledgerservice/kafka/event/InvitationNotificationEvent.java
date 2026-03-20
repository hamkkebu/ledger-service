package com.hamkkebu.ledgerservice.kafka.event;

import com.hamkkebu.boilerplate.data.event.BaseEvent;
import lombok.*;

/**
 * 초대 알림 이벤트
 *
 * <p>notification-service로 발행되는 초대 관련 알림 이벤트입니다.</p>
 */
@Getter
@Setter
@NoArgsConstructor
@ToString(callSuper = true)
public class InvitationNotificationEvent extends BaseEvent {

    private Long invitationId;
    private Long ledgerId;
    private String ledgerName;
    private Long inviterId;
    private String inviterName;
    private String inviteeEmail;
    private Long recipientId;
    private String role;

    @Override
    public String getResourceId() {
        return String.valueOf(invitationId);
    }

    @Builder
    public InvitationNotificationEvent(String eventType, Long invitationId, Long ledgerId,
                                        String ledgerName, Long inviterId, String inviterName,
                                        String inviteeEmail, Long recipientId, String role) {
        super(eventType, String.valueOf(invitationId), String.valueOf(inviterId));
        this.invitationId = invitationId;
        this.ledgerId = ledgerId;
        this.ledgerName = ledgerName;
        this.inviterId = inviterId;
        this.inviterName = inviterName;
        this.inviteeEmail = inviteeEmail;
        this.recipientId = recipientId;
        this.role = role;
    }
}
