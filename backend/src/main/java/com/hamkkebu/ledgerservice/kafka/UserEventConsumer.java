package com.hamkkebu.ledgerservice.kafka;

import com.hamkkebu.boilerplate.common.enums.Role;
import com.hamkkebu.boilerplate.common.user.consumer.AbstractUserEventConsumer;
import com.hamkkebu.ledgerservice.data.entity.User;
import com.hamkkebu.ledgerservice.grpc.client.AuthServiceGrpcClient;
import com.hamkkebu.ledgerservice.repository.UserRepository;
import lombok.extern.slf4j.Slf4j;
import org.springframework.kafka.annotation.KafkaListener;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.util.Map;
import java.util.Optional;

/**
 * Ledger Service 사용자 이벤트 Kafka Consumer
 *
 * <p>AbstractUserEventConsumer를 상속받아 공통 로직을 재사용합니다.</p>
 * <p>auth-service에서 발행한 사용자 관련 이벤트를 수신합니다.</p>
 */
@Slf4j
@Component
public class UserEventConsumer extends AbstractUserEventConsumer<User> {

    private final AuthServiceGrpcClient authServiceGrpcClient;

    public UserEventConsumer(UserRepository userRepository,
                             AuthServiceGrpcClient authServiceGrpcClient) {
        super(userRepository);
        this.authServiceGrpcClient = authServiceGrpcClient;
    }

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
        processUserEvent(eventData);
    }

    @Override
    protected Optional<User> fetchAndCreateUser(Long userId) {
        return authServiceGrpcClient.getUser(userId)
                .map(grpcUser -> User.builder()
                        .userId(grpcUser.getUserId())
                        .username(grpcUser.getUsername())
                        .email(grpcUser.getEmail())
                        .firstName(grpcUser.getFirstName().isEmpty() ? null : grpcUser.getFirstName())
                        .lastName(grpcUser.getLastName().isEmpty() ? null : grpcUser.getLastName())
                        .isActive(grpcUser.getIsActive())
                        .role(Role.fromString(grpcUser.getRole()))
                        .build());
    }
}
