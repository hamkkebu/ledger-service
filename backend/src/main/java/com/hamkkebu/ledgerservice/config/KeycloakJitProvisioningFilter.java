package com.hamkkebu.ledgerservice.config;

import com.hamkkebu.boilerplate.common.enums.Role;
import com.hamkkebu.boilerplate.common.user.filter.AbstractKeycloakJitProvisioningFilter;
import com.hamkkebu.ledgerservice.data.entity.User;
import com.hamkkebu.ledgerservice.repository.UserRepository;
import org.springframework.stereotype.Component;

/**
 * Ledger Service Keycloak JIT (Just-in-Time) Provisioning 필터
 *
 * <p>AbstractKeycloakJitProvisioningFilter를 상속받아 공통 로직을 재사용합니다.</p>
 * <p>JWT 인증 후 사용자 정보를 ledger-service DB에 동기화합니다.</p>
 */
@Component
public class KeycloakJitProvisioningFilter extends AbstractKeycloakJitProvisioningFilter<User> {

    public KeycloakJitProvisioningFilter(UserRepository userRepository) {
        super(userRepository);
    }

    @Override
    protected User createNewUser(Long userId, String username, String email,
                                 String firstName, String lastName, Role role) {
        return User.builder()
                .userId(userId)
                .username(username)
                .email(email)
                .firstName(firstName)
                .lastName(lastName)
                .isActive(true)
                .role(role)
                .build();
    }
}
