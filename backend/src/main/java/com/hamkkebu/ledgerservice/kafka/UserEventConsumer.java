package com.hamkkebu.ledgerservice.kafka;

import com.hamkkebu.boilerplate.common.enums.Role;
import com.hamkkebu.ledgerservice.data.entity.User;
import com.hamkkebu.ledgerservice.data.event.UserDeletedEvent;
import com.hamkkebu.ledgerservice.data.event.UserRegisteredEvent;
import com.hamkkebu.ledgerservice.grpc.client.AuthServiceGrpcClient;
import com.hamkkebu.ledgerservice.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.kafka.annotation.KafkaListener;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.util.Map;

/**
 * 사용자 이벤트 Kafka Consumer
 *
 * <p>auth-service에서 발행한 사용자 관련 이벤트를 수신합니다.</p>
 * <ul>
 *   <li>USER_REGISTERED: 신규 사용자 동기화</li>
 *   <li>USER_DELETED: 사용자 삭제 (soft delete)</li>
 * </ul>
 * <p>Zero-Payload 패턴에 따라 이벤트 수신 후 gRPC로 상세 정보를 조회합니다.</p>
 */
@Slf4j
@Component
@RequiredArgsConstructor
public class UserEventConsumer {

    private final UserRepository userRepository;
    private final AuthServiceGrpcClient authServiceGrpcClient;

    /**
     * 사용자 이벤트 처리 (USER_REGISTERED, USER_DELETED)
     */
    @KafkaListener(
            topics = "${kafka.topics.user-events:user.events}",
            groupId = "ledger-service-group",
            containerFactory = "ledgerKafkaListenerContainerFactory"
    )
    @Transactional
    public void handleUserEvent(Map<String, Object> eventData) {
        String eventType = (String) eventData.get("eventType");
        String eventId = (String) eventData.get("eventId");

        log.info("[Kafka Consumer] Received event: eventType={}, eventId={}", eventType, eventId);

        try {
            if (UserRegisteredEvent.EVENT_TYPE.equals(eventType)) {
                handleUserRegistered(eventData);
            } else if (UserDeletedEvent.EVENT_TYPE.equals(eventType)) {
                handleUserDeleted(eventData);
            } else {
                log.warn("[Kafka Consumer] Unknown event type: {}", eventType);
            }
        } catch (Exception e) {
            log.error("[Kafka Consumer] Failed to process event: eventType={}, eventId={}, error={}",
                    eventType, eventId, e.getMessage(), e);
            throw e;
        }
    }

    /**
     * USER_REGISTERED 이벤트 처리
     *
     * <p>신규 사용자가 회원가입하면:</p>
     * <ol>
     *   <li>Kafka 이벤트로 userId를 수신</li>
     *   <li>gRPC로 auth-service에서 사용자 상세 정보 조회</li>
     *   <li>ledger-service DB에 사용자 정보 저장</li>
     * </ol>
     */
    private void handleUserRegistered(Map<String, Object> eventData) {
        Long userId = extractUserPk(eventData);
        log.info("[Kafka Consumer] Processing USER_REGISTERED: userId={}", userId);

        // 이미 존재하는 사용자인지 확인
        if (userRepository.existsByUserIdAndIsDeletedFalse(userId)) {
            log.info("[Kafka Consumer] User already exists: userId={}", userId);
            return;
        }

        // gRPC로 auth-service에서 사용자 정보 조회
        authServiceGrpcClient.getUser(userId).ifPresentOrElse(
                grpcUser -> {
                    // User 엔티티 생성 및 저장
                    User user = User.builder()
                            .userId(grpcUser.getUserId())
                            .username(grpcUser.getUsername())
                            .email(grpcUser.getEmail())
                            .firstName(grpcUser.getFirstName().isEmpty() ? null : grpcUser.getFirstName())
                            .lastName(grpcUser.getLastName().isEmpty() ? null : grpcUser.getLastName())
                            .isActive(grpcUser.getIsActive())
                            .role(Role.fromString(grpcUser.getRole()))
                            .build();

                    userRepository.save(user);
                    log.info("[Kafka Consumer] User synced successfully: userId={}, username={}",
                            user.getUserId(), user.getUsername());
                },
                () -> log.warn("[Kafka Consumer] User not found in auth-service: userId={}", userId)
        );
    }

    /**
     * USER_DELETED 이벤트 처리
     *
     * <p>사용자가 탈퇴하면:</p>
     * <ol>
     *   <li>Kafka 이벤트로 userId를 수신</li>
     *   <li>ledger-service DB에서 해당 사용자 soft delete</li>
     * </ol>
     */
    private void handleUserDeleted(Map<String, Object> eventData) {
        Long userId = extractUserPk(eventData);
        log.info("[Kafka Consumer] Processing USER_DELETED: userId={}", userId);

        // 사용자 조회 및 삭제 처리
        userRepository.findByUserIdAndIsDeletedFalse(userId).ifPresentOrElse(
                user -> {
                    user.delete();
                    userRepository.save(user);
                    log.info("[Kafka Consumer] User deleted successfully: userId={}, username={}",
                            user.getUserId(), user.getUsername());
                },
                () -> log.warn("[Kafka Consumer] User not found for deletion: userId={}", userId)
        );
    }

    /**
     * 이벤트 데이터에서 userPk 추출
     */
    private Long extractUserPk(Map<String, Object> eventData) {
        Object userPk = eventData.get("userPk");
        if (userPk instanceof Number) {
            return ((Number) userPk).longValue();
        }
        if (userPk instanceof String) {
            return Long.parseLong((String) userPk);
        }
        throw new IllegalArgumentException("Invalid userPk format: " + userPk);
    }
}
