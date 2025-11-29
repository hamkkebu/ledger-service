package com.hamkkebu.ledgerservice.security;

import java.lang.annotation.*;

/**
 * 현재 인증된 사용자의 ID를 주입받기 위한 어노테이션
 *
 * <p>사용 예시:</p>
 * <pre>
 * @GetMapping("/me")
 * public ResponseEntity<?> getMyInfo(@CurrentUser Long userId) {
 *     // userId는 JWT 토큰에서 추출된 사용자 ID
 * }
 * </pre>
 */
@Target(ElementType.PARAMETER)
@Retention(RetentionPolicy.RUNTIME)
@Documented
public @interface CurrentUser {
}
