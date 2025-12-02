package com.hamkkebu.ledgerservice;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.context.annotation.ComponentScan;
import org.springframework.context.annotation.FilterType;
import org.springframework.scheduling.annotation.EnableScheduling;

@SpringBootApplication
@EnableScheduling
@ComponentScan(basePackages = {
	"com.hamkkebu.ledgerservice",
	"com.hamkkebu.boilerplate.common",
	"com.hamkkebu.boilerplate.config"
}, excludeFilters = {
	@ComponentScan.Filter(type = FilterType.ASSIGNABLE_TYPE, classes = {
		com.hamkkebu.boilerplate.common.scheduler.OutboxEventScheduler.class,
		com.hamkkebu.boilerplate.common.publisher.OutboxEventPublisher.class,
		com.hamkkebu.boilerplate.common.config.KafkaConfig.class
	})
})
public class LedgerServiceApplication {

	public static void main(String[] args) {
		SpringApplication.run(LedgerServiceApplication.class, args);
	}

}
