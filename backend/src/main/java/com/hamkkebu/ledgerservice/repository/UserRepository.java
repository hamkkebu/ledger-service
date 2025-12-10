package com.hamkkebu.ledgerservice.repository;

import com.hamkkebu.boilerplate.common.user.repository.SyncedUserRepository;
import com.hamkkebu.ledgerservice.data.entity.User;
import org.springframework.stereotype.Repository;

/**
 * Ledger Service User Repository
 *
 * <p>SyncedUserRepository를 상속받아 공통 메서드를 재사용합니다.</p>
 * <p>서비스별 추가 쿼리 메서드가 필요한 경우 여기에 정의합니다.</p>
 */
@Repository
public interface UserRepository extends SyncedUserRepository<User> {
    // 서비스별 추가 쿼리 메서드가 필요한 경우 여기에 정의
}
