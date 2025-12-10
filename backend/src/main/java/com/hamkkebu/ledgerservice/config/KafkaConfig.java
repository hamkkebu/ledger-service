package com.hamkkebu.ledgerservice.config;

import com.hamkkebu.boilerplate.common.user.config.AbstractUserEventKafkaConfig;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.kafka.config.ConcurrentKafkaListenerContainerFactory;
import org.springframework.kafka.core.ConsumerFactory;

import java.util.Map;

/**
 * Ledger Service 전용 Kafka Consumer 설정
 *
 * <p>AbstractUserEventKafkaConfig를 상속받아 공통 로직을 재사용합니다.</p>
 * <p>사용자 이벤트(USER_REGISTERED, USER_DELETED)를 Map으로 수신하여
 * 이벤트 타입에 따라 처리합니다.</p>
 */
@Configuration("ledgerUserEventKafkaConfig")
public class KafkaConfig extends AbstractUserEventKafkaConfig {

    @Value("${spring.kafka.bootstrap-servers:localhost:9092}")
    private String bootstrapServers;

    @Value("${spring.kafka.consumer.group-id:ledger-service-group}")
    private String groupId;

    @Override
    protected String getBootstrapServers() {
        return bootstrapServers;
    }

    @Override
    protected String getGroupId() {
        return groupId;
    }

    @Bean
    public ConsumerFactory<String, Map<String, Object>> ledgerUserEventConsumerFactory() {
        return createConsumerFactory();
    }

    @Bean
    public ConcurrentKafkaListenerContainerFactory<String, Map<String, Object>> ledgerKafkaListenerContainerFactory() {
        return createContainerFactory();
    }
}
