package com.hamkkebu.ledgerservice.config;

import io.swagger.v3.oas.models.Components;
import io.swagger.v3.oas.models.OpenAPI;
import io.swagger.v3.oas.models.info.Contact;
import io.swagger.v3.oas.models.info.Info;
import io.swagger.v3.oas.models.info.License;
import io.swagger.v3.oas.models.security.SecurityRequirement;
import io.swagger.v3.oas.models.security.SecurityScheme;
import io.swagger.v3.oas.models.servers.Server;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.context.annotation.Primary;

import java.util.Arrays;

/**
 * Ledger Service Swagger/OpenAPI 설정
 *
 * <p>접속 주소:</p>
 * <ul>
 *   <li>Swagger UI: http://localhost:8082/swagger-ui.html</li>
 *   <li>OpenAPI JSON: http://localhost:8082/v3/api-docs</li>
 *   <li>OpenAPI YAML: http://localhost:8082/v3/api-docs.yaml</li>
 * </ul>
 *
 * <p>JWT 인증 사용법:</p>
 * <ul>
 *   <li>1. Auth Service에서 로그인하여 accessToken을 받습니다</li>
 *   <li>2. Swagger UI 우측 상단 "Authorize" 버튼을 클릭합니다</li>
 *   <li>3. Value 필드에 받은 accessToken을 입력합니다 (Bearer 접두사 없이)</li>
 *   <li>4. "Authorize" 버튼을 클릭합니다</li>
 *   <li>5. 이제 인증이 필요한 API를 테스트할 수 있습니다</li>
 * </ul>
 */
@Configuration
public class LedgerServiceOpenApiConfig {

    private static final String SECURITY_SCHEME_NAME = "Bearer Authentication";

    @Value("${server.port:8082}")
    private String serverPort;

    @Bean
    @Primary
    public OpenAPI ledgerServiceOpenAPI() {
        return new OpenAPI()
                .info(new Info()
                        .title("Ledger Service API")
                        .description("Hamkkebu Ledger Service REST API 문서\n\n" +
                                "가계부 서비스는 수입/지출 관리, 가계부 생성 및 조회를 담당합니다.\n\n" +
                                "**인증 방법:**\n" +
                                "- Auth Service (http://localhost:8081)에서 로그인 후 토큰 획득\n" +
                                "- 획득한 accessToken을 Authorize에 입력")
                        .version("1.0.0")
                        .contact(new Contact()
                                .name("Hamkkebu Team")
                                .email("ledger@hamkkebu.com"))
                        .license(new License()
                                .name("MIT License")
                                .url("https://opensource.org/licenses/MIT")))
                .servers(Arrays.asList(
                        new Server()
                                .url("http://localhost:" + serverPort)
                                .description("Local Development Server (Ledger Service)"),
                        new Server()
                                .url("http://127.0.0.1:" + serverPort)
                                .description("Local Development Server (127.0.0.1)"),
                        new Server()
                                .url("http://host.docker.internal:" + serverPort)
                                .description("Docker Internal Host")
                ))
                // JWT Bearer Token 인증 설정
                .components(new Components()
                        .addSecuritySchemes(SECURITY_SCHEME_NAME, new SecurityScheme()
                                .name(SECURITY_SCHEME_NAME)
                                .type(SecurityScheme.Type.HTTP)
                                .scheme("bearer")
                                .bearerFormat("JWT")
                                .description("JWT 액세스 토큰을 입력하세요.\n\n" +
                                        "토큰 획득 방법:\n" +
                                        "1. Auth Service의 /api/v1/auth/login API를 사용하여 로그인\n" +
                                        "2. 응답에서 'accessToken' 값 복사\n" +
                                        "3. 이 필드에 토큰 붙여넣기 (Bearer 접두사 없이)\n\n" +
                                        "예시: eyJhbGciOiJIUzUxMiJ9.eyJzdWIi...")
                        )
                )
                // 모든 API에 보안 요구사항 적용
                .addSecurityItem(new SecurityRequirement().addList(SECURITY_SCHEME_NAME));
    }
}
