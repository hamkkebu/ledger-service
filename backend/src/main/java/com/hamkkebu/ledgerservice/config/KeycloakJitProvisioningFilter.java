package com.hamkkebu.ledgerservice.config;

import com.hamkkebu.boilerplate.common.enums.Role;
import com.hamkkebu.ledgerservice.data.entity.User;
import com.hamkkebu.ledgerservice.repository.UserRepository;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.security.oauth2.server.resource.authentication.JwtAuthenticationToken;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;
import java.util.List;
import java.util.Map;
import java.util.Optional;

/**
 * Keycloak JIT (Just-in-Time) Provisioning 필터
 *
 * <p>JWT 인증 후 사용자 정보를 ledger-service DB에 동기화합니다.</p>
 */
@Slf4j
@Component
@RequiredArgsConstructor
public class KeycloakJitProvisioningFilter extends OncePerRequestFilter {

    private final UserRepository userRepository;

    private static final String REALM_ACCESS_CLAIM = "realm_access";
    private static final String ROLES_CLAIM = "roles";

    @Override
    protected void doFilterInternal(HttpServletRequest request,
                                    HttpServletResponse response,
                                    FilterChain filterChain) throws ServletException, IOException {

        try {
            Authentication authentication = SecurityContextHolder.getContext().getAuthentication();

            if (authentication instanceof JwtAuthenticationToken jwtAuth) {
                Jwt jwt = jwtAuth.getToken();
                syncUser(jwt);
            }
        } catch (Exception e) {
            log.warn("JIT Provisioning failed: {}", e.getMessage());
        }

        filterChain.doFilter(request, response);
    }

    /**
     * Keycloak JWT에서 사용자 정보를 추출하여 DB에 동기화
     */
    private void syncUser(Jwt jwt) {
        String username = jwt.getClaimAsString("preferred_username");

        if (username == null || username.isBlank()) {
            log.debug("No username in JWT, skipping sync");
            return;
        }

        // 이미 존재하는 사용자인지 확인
        Optional<User> existingUser = userRepository.findByUsernameAndIsDeletedFalse(username);
        if (existingUser.isPresent()) {
            log.debug("User already exists: {}", username);
            return;
        }

        // 다음 userId 생성 (최대 userId + 1)
        Long nextUserId = userRepository.findMaxUserId().orElse(0L) + 1;

        // 새 사용자 생성
        String email = jwt.getClaimAsString("email");
        String firstName = jwt.getClaimAsString("given_name");
        String lastName = jwt.getClaimAsString("family_name");
        Role role = extractRole(jwt);

        User newUser = User.builder()
                .userId(nextUserId)
                .username(username)
                .email(email != null ? email : username + "@keycloak.local")
                .firstName(firstName)
                .lastName(lastName)
                .isActive(true)
                .role(role)
                .build();

        User savedUser = userRepository.save(newUser);
        log.info("JIT Provisioning - New user created: userId={}, username={}",
                savedUser.getUserId(), savedUser.getUsername());
    }

    /**
     * Keycloak JWT에서 역할 추출
     */
    @SuppressWarnings("unchecked")
    private Role extractRole(Jwt jwt) {
        Map<String, Object> realmAccess = jwt.getClaim(REALM_ACCESS_CLAIM);
        if (realmAccess != null && realmAccess.containsKey(ROLES_CLAIM)) {
            List<String> roles = (List<String>) realmAccess.get(ROLES_CLAIM);

            if (roles.contains("ADMIN")) {
                return Role.ADMIN;
            }
            if (roles.contains("DEVELOPER")) {
                return Role.DEVELOPER;
            }
        }
        return Role.USER;
    }

    @Override
    protected boolean shouldNotFilter(HttpServletRequest request) {
        String path = request.getRequestURI();
        return path.startsWith("/actuator/health") ||
               path.startsWith("/swagger-ui") ||
               path.startsWith("/v3/api-docs");
    }
}
