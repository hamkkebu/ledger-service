package com.hamkkebu.ledgerservice.grpc.client;

import com.hamkkebu.ledgerservice.grpc.user.*;
import io.github.resilience4j.circuitbreaker.annotation.CircuitBreaker;
import io.grpc.StatusRuntimeException;
import lombok.extern.slf4j.Slf4j;
import net.devh.boot.grpc.client.inject.GrpcClient;
import org.springframework.stereotype.Service;

import java.util.Optional;

/**
 * Auth Service gRPC 클라이언트
 *
 * <p>auth-service의 gRPC API를 호출하여 사용자 정보를 조회합니다.</p>
 */
@Slf4j
@Service
public class AuthServiceGrpcClient {

    @GrpcClient("auth-service")
    private UserServiceGrpc.UserServiceBlockingStub userServiceStub;

    /**
     * 사용자 ID로 사용자 정보 조회
     */
    @CircuitBreaker(name = "authService", fallbackMethod = "getUserFallback")
    public Optional<User> getUser(Long userId) {
        log.info("[gRPC Client] GetUser request: userId={}", userId);

        try {
            GetUserRequest request = GetUserRequest.newBuilder()
                    .setUserId(userId)
                    .build();

            GetUserResponse response = userServiceStub.getUser(request);

            if (response.hasUser() && response.getUser().getUserId() > 0) {
                log.info("[gRPC Client] GetUser success: userId={}", userId);
                return Optional.of(response.getUser());
            }

            if (!response.getErrorMessage().isEmpty()) {
                log.warn("[gRPC Client] GetUser error: {}", response.getErrorMessage());
            }

            return Optional.empty();

        } catch (StatusRuntimeException e) {
            log.error("[gRPC Client] GetUser failed: userId={}, status={}", userId, e.getStatus(), e);
            throw e;
        }
    }

    /**
     * 사용자 존재 여부 확인
     */
    @CircuitBreaker(name = "authService", fallbackMethod = "userExistsFallback")
    public boolean userExists(Long userId) {
        log.debug("[gRPC Client] UserExists request: userId={}", userId);

        try {
            UserExistsRequest request = UserExistsRequest.newBuilder()
                    .setUserId(userId)
                    .build();

            UserExistsResponse response = userServiceStub.userExists(request);
            return response.getExists();

        } catch (StatusRuntimeException e) {
            log.error("[gRPC Client] UserExists failed: userId={}, status={}", userId, e.getStatus(), e);
            throw e;
        }
    }

    // ==================== Fallback Methods ====================

    /**
     * Circuit Breaker 발동 시 fallback
     */
    @SuppressWarnings("unused")
    private Optional<User> getUserFallback(Long userId, Throwable t) {
        log.warn("[gRPC Client] GetUser fallback triggered: userId={}, error={}", userId, t.getMessage());
        return Optional.empty();
    }

    @SuppressWarnings("unused")
    private boolean userExistsFallback(Long userId, Throwable t) {
        log.warn("[gRPC Client] UserExists fallback triggered: userId={}, error={}", userId, t.getMessage());
        return false;
    }
}
