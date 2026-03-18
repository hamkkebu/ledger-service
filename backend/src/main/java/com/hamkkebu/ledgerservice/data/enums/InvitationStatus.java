package com.hamkkebu.ledgerservice.data.enums;

/**
 * 가계부 초대 상태 Enum
 */
public enum InvitationStatus {
    /**
     * 대기 중 (초대가 발송되었으나 아직 응답되지 않음)
     */
    PENDING,

    /**
     * 수락됨
     */
    ACCEPTED,

    /**
     * 거절됨
     */
    REJECTED,

    /**
     * 만료됨
     */
    EXPIRED
}
