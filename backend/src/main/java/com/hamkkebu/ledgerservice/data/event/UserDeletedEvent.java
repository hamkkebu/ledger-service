package com.hamkkebu.ledgerservice.data.event;

import com.hamkkebu.boilerplate.data.event.BaseEvent;
import lombok.*;

/**
 * 사용자 탈퇴 이벤트 (Kafka Consumer용)
 *
 * <p>auth-service에서 발행한 USER_DELETED 이벤트를 수신합니다.</p>
 * <p>Zero-Payload 패턴에 따라 userId만 포함됩니다.</p>
 */
@Getter
@Setter
@NoArgsConstructor
@ToString(callSuper = true)
public class UserDeletedEvent extends BaseEvent {

    public static final String EVENT_TYPE = "USER_DELETED";

    /**
     * 탈퇴한 사용자의 PK
     */
    private Long userPk;

    @Override
    public String getResourceId() {
        return String.valueOf(userPk);
    }

    @Builder
    public UserDeletedEvent(Long userPk) {
        super(EVENT_TYPE, String.valueOf(userPk), String.valueOf(userPk));
        this.userPk = userPk;
    }
}
