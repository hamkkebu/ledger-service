package com.hamkkebu.ledgerservice.config;

import com.hamkkebu.ledgerservice.security.CurrentUserArgumentResolver;
import lombok.RequiredArgsConstructor;
import org.springframework.context.annotation.Configuration;
import org.springframework.web.method.support.HandlerMethodArgumentResolver;
import org.springframework.web.servlet.config.annotation.WebMvcConfigurer;

import java.util.List;

/**
 * Ledger Service Web MVC 설정
 *
 * <p>@CurrentUser 어노테이션을 위한 ArgumentResolver 등록</p>
 */
@Configuration("ledgerWebMvcConfig")
@RequiredArgsConstructor
public class LedgerWebMvcConfig implements WebMvcConfigurer {

    private final CurrentUserArgumentResolver currentUserArgumentResolver;

    @Override
    public void addArgumentResolvers(List<HandlerMethodArgumentResolver> resolvers) {
        resolvers.add(currentUserArgumentResolver);
    }
}
