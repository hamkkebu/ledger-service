package com.hamkkebu.ledgerservice;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.boot.autoconfigure.domain.EntityScan;
import org.springframework.context.annotation.ComponentScan;
import org.springframework.context.annotation.FilterType;
import org.springframework.data.jpa.repository.config.EnableJpaRepositories;
import org.springframework.scheduling.annotation.EnableScheduling;

@SpringBootApplication
@EnableScheduling
@ComponentScan(basePackages = {
	"com.hamkkebu.ledgerservice",
	"com.hamkkebu.boilerplate.common",
	"com.hamkkebu.boilerplate.config"
}, excludeFilters = {
	@ComponentScan.Filter(type = FilterType.ASSIGNABLE_TYPE, classes = {
		com.hamkkebu.boilerplate.common.config.KafkaConfig.class
	})
})
@EnableJpaRepositories(basePackages = {
	"com.hamkkebu.ledgerservice.repository",
	"com.hamkkebu.boilerplate.repository"
})
@EntityScan(basePackages = {
	"com.hamkkebu.ledgerservice.data.entity",
	"com.hamkkebu.boilerplate.data.entity"
})
public class LedgerServiceApplication {

	public static void main(String[] args) {
		SpringApplication.run(LedgerServiceApplication.class, args);
	}

}
