package com.hamkkebu.ledgerservice.data.entity;

import com.hamkkebu.boilerplate.common.user.entity.SyncedUser;
import jakarta.persistence.Entity;
import jakarta.persistence.Table;
import lombok.NoArgsConstructor;
import lombok.experimental.SuperBuilder;

/**
 * Ledger Service User 엔티티 (Auth Service에서 동기화)
 *
 * <p>auth-service에서 Kafka 이벤트를 통해 동기화된 사용자 정보를 저장합니다.</p>
 * <p>가계부 서비스에서 사용자 참조가 필요할 때 사용합니다.</p>
 *
 * <p>SyncedUser를 상속받아 공통 필드와 메서드를 재사용합니다.</p>
 */
@SuperBuilder
@NoArgsConstructor
@Entity
@Table(name = "tbl_users")
public class User extends SyncedUser {
    // 서비스별 추가 필드가 필요한 경우 여기에 정의
}
