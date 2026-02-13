package com.hamkkebu.ledgerservice.data.entity;

import com.hamkkebu.boilerplate.common.ledger.entity.SyncedLedgerShare;
import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.experimental.SuperBuilder;

/**
 * LedgerShare 엔티티 (가계부 공유)
 *
 * <p>가계부 소유자가 다른 사용자에게 가계부를 공유할 때 생성됩니다.</p>
 * <p>공유 수신자는 READ_ONLY 권한으로 가계부를 조회할 수 있습니다.</p>
 *
 * <p>상태 흐름:</p>
 * <pre>
 * PENDING → ACCEPTED (수신자 수락)
 * PENDING → REJECTED (수신자 거절)
 * </pre>
 */
@Getter
@SuperBuilder
@NoArgsConstructor
@AllArgsConstructor
@Entity
@Table(name = "tbl_ledger_shares")
public class LedgerShare extends SyncedLedgerShare {

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "ledger_id", insertable = false, updatable = false)
    private Ledger ledger;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "owner_id", insertable = false, updatable = false)
    private User owner;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "shared_user_id", insertable = false, updatable = false)
    private User sharedUser;
}
