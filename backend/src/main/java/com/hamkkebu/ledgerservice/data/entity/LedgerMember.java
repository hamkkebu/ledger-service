package com.hamkkebu.ledgerservice.data.entity;

import com.hamkkebu.boilerplate.common.ledger.entity.SyncedLedgerMember;
import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.experimental.SuperBuilder;

/**
 * LedgerMember 엔티티 (가계부 멤버)
 *
 * <p>가계부 소유자가 다른 사용자를 멤버로 추가할 때 생성됩니다.</p>
 * <p>멤버는 지정된 역할(ADMIN, MEMBER)에 따라 가계부에 접근할 수 있습니다.</p>
 *
 * <p>상태 흐름:</p>
 * <pre>
 * PENDING → ACCEPTED (멤버 수락)
 * PENDING → REJECTED (멤버 거절)
 * </pre>
 */
@Getter
@SuperBuilder
@NoArgsConstructor
@AllArgsConstructor
@Entity
@Table(name = "tbl_ledger_members")
public class LedgerMember extends SyncedLedgerMember {

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "ledger_id", insertable = false, updatable = false)
    private Ledger ledger;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "account_id", referencedColumnName = "user_id", insertable = false, updatable = false)
    private User user;
}
