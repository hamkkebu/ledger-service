package com.hamkkebu.ledgerservice.security;

import com.hamkkebu.boilerplate.common.user.resolver.AbstractCurrentUserArgumentResolver;
import com.hamkkebu.ledgerservice.data.entity.User;
import com.hamkkebu.ledgerservice.repository.UserRepository;
import org.springframework.stereotype.Component;

/**
 * Ledger Service @CurrentUser 어노테이션 ArgumentResolver
 *
 * <p>AbstractCurrentUserArgumentResolver를 상속받아 공통 로직을 재사용합니다.</p>
 */
@Component("ledgerCurrentUserArgumentResolver")
public class CurrentUserArgumentResolver extends AbstractCurrentUserArgumentResolver<User> {

    public CurrentUserArgumentResolver(UserRepository userRepository) {
        super(userRepository);
    }
}
