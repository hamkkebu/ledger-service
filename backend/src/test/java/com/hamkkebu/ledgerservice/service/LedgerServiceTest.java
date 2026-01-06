package com.hamkkebu.ledgerservice.service;

import com.hamkkebu.boilerplate.common.exception.BusinessException;
import com.hamkkebu.boilerplate.common.exception.ErrorCode;
import com.hamkkebu.ledgerservice.data.dto.LedgerRequest;
import com.hamkkebu.ledgerservice.data.dto.LedgerResponse;
import com.hamkkebu.ledgerservice.data.dto.LedgerSummaryResponse;
import com.hamkkebu.ledgerservice.data.entity.Ledger;
import com.hamkkebu.ledgerservice.data.entity.User;
import com.hamkkebu.ledgerservice.data.enums.TransactionType;
import com.hamkkebu.ledgerservice.repository.LedgerRepository;
import com.hamkkebu.ledgerservice.repository.TransactionRepository;
import com.hamkkebu.ledgerservice.repository.UserRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.test.util.ReflectionTestUtils;

import java.math.BigDecimal;
import java.util.ArrayList;
import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

/**
 * LedgerService 단위 테스트
 */
@ExtendWith(MockitoExtension.class)
@DisplayName("LedgerService 테스트")
class LedgerServiceTest {

    @Mock
    private LedgerRepository ledgerRepository;

    @Mock
    private TransactionRepository transactionRepository;

    @Mock
    private UserRepository userRepository;

    @InjectMocks
    private LedgerService ledgerService;

    private User testUser;
    private Ledger testLedger;
    private LedgerRequest validRequest;

    @BeforeEach
    void setUp() {
        testUser = User.builder()
                .username("testuser")
                .email("test@example.com")
                .build();
        ReflectionTestUtils.setField(testUser, "userId", 1L);

        testLedger = Ledger.builder()
                .userId(1L)
                .name("테스트 가계부")
                .description("테스트용 가계부입니다")
                .currency("KRW")
                .isDefault(true)
                .transactions(new ArrayList<>())
                .build();
        ReflectionTestUtils.setField(testLedger, "ledgerId", 1L);

        validRequest = LedgerRequest.builder()
                .name("새 가계부")
                .description("새로 생성한 가계부")
                .currency("KRW")
                .isDefault(false)
                .build();
    }

    @Test
    @DisplayName("가계부 목록 조회 성공")
    void getLedgers_Success() {
        // Given
        Long userId = 1L;
        List<Ledger> ledgers = List.of(testLedger);
        when(ledgerRepository.findByUserIdAndIsDeletedFalseOrderByCreatedAtDesc(userId))
                .thenReturn(ledgers);

        // When
        List<LedgerResponse> result = ledgerService.getLedgers(userId);

        // Then
        assertThat(result).isNotNull();
        assertThat(result).hasSize(1);
        assertThat(result.get(0).getName()).isEqualTo("테스트 가계부");

        verify(ledgerRepository).findByUserIdAndIsDeletedFalseOrderByCreatedAtDesc(userId);
    }

    @Test
    @DisplayName("가계부 상세 조회 성공")
    void getLedger_Success() {
        // Given
        Long userId = 1L;
        Long ledgerId = 1L;
        when(ledgerRepository.findByLedgerIdAndUserIdAndIsDeletedFalse(ledgerId, userId))
                .thenReturn(Optional.of(testLedger));
        when(transactionRepository.sumAmountByLedgerIdAndType(ledgerId, TransactionType.INCOME))
                .thenReturn(BigDecimal.valueOf(1000000));
        when(transactionRepository.sumAmountByLedgerIdAndType(ledgerId, TransactionType.EXPENSE))
                .thenReturn(BigDecimal.valueOf(500000));

        // When
        LedgerResponse result = ledgerService.getLedger(userId, ledgerId);

        // Then
        assertThat(result).isNotNull();
        assertThat(result.getLedgerId()).isEqualTo(ledgerId);
        assertThat(result.getName()).isEqualTo("테스트 가계부");
        assertThat(result.getTotalIncome()).isEqualTo(BigDecimal.valueOf(1000000));
        assertThat(result.getTotalExpense()).isEqualTo(BigDecimal.valueOf(500000));
        assertThat(result.getBalance()).isEqualTo(BigDecimal.valueOf(500000));

        verify(ledgerRepository).findByLedgerIdAndUserIdAndIsDeletedFalse(ledgerId, userId);
    }

    @Test
    @DisplayName("가계부 상세 조회 실패 - 존재하지 않는 가계부")
    void getLedger_NotFound() {
        // Given
        Long userId = 1L;
        Long ledgerId = 999L;
        when(ledgerRepository.findByLedgerIdAndUserIdAndIsDeletedFalse(ledgerId, userId))
                .thenReturn(Optional.empty());

        // When & Then
        assertThatThrownBy(() -> ledgerService.getLedger(userId, ledgerId))
                .isInstanceOf(BusinessException.class)
                .extracting(ex -> ((BusinessException) ex).getErrorCode())
                .isEqualTo(ErrorCode.LEDGER_NOT_FOUND);

        verify(ledgerRepository).findByLedgerIdAndUserIdAndIsDeletedFalse(ledgerId, userId);
    }

    @Test
    @DisplayName("가계부 생성 성공 - 첫 번째 가계부 (자동 기본 설정)")
    void createLedger_Success_FirstLedger() {
        // Given
        Long userId = 1L;
        when(userRepository.existsByUserIdAndIsDeletedFalse(userId)).thenReturn(true);
        when(ledgerRepository.countByUserIdAndIsDeletedFalse(userId)).thenReturn(0L);
        when(ledgerRepository.save(any(Ledger.class))).thenAnswer(invocation -> {
            Ledger saved = invocation.getArgument(0);
            ReflectionTestUtils.setField(saved, "ledgerId", 1L);
            return saved;
        });

        // When
        LedgerResponse result = ledgerService.createLedger(userId, validRequest);

        // Then
        assertThat(result).isNotNull();
        assertThat(result.getName()).isEqualTo("새 가계부");
        assertThat(result.getIsDefault()).isTrue(); // 첫 번째 가계부는 자동으로 기본 가계부

        verify(userRepository).existsByUserIdAndIsDeletedFalse(userId);
        verify(ledgerRepository).countByUserIdAndIsDeletedFalse(userId);
        verify(ledgerRepository).save(any(Ledger.class));
    }

    @Test
    @DisplayName("가계부 생성 실패 - 존재하지 않는 사용자")
    void createLedger_UserNotFound() {
        // Given
        Long userId = 999L;
        when(userRepository.existsByUserIdAndIsDeletedFalse(userId)).thenReturn(false);

        // When & Then
        assertThatThrownBy(() -> ledgerService.createLedger(userId, validRequest))
                .isInstanceOf(BusinessException.class)
                .extracting(ex -> ((BusinessException) ex).getErrorCode())
                .isEqualTo(ErrorCode.USER_NOT_FOUND);

        verify(userRepository).existsByUserIdAndIsDeletedFalse(userId);
        verify(ledgerRepository, never()).save(any());
    }

    @Test
    @DisplayName("가계부 수정 성공")
    void updateLedger_Success() {
        // Given
        Long userId = 1L;
        Long ledgerId = 1L;
        LedgerRequest updateRequest = LedgerRequest.builder()
                .name("수정된 가계부")
                .description("수정된 설명")
                .currency("USD")
                .isDefault(false)
                .build();

        when(ledgerRepository.findByLedgerIdAndUserIdAndIsDeletedFalse(ledgerId, userId))
                .thenReturn(Optional.of(testLedger));

        // When
        LedgerResponse result = ledgerService.updateLedger(userId, ledgerId, updateRequest);

        // Then
        assertThat(result).isNotNull();
        assertThat(testLedger.getName()).isEqualTo("수정된 가계부");
        assertThat(testLedger.getDescription()).isEqualTo("수정된 설명");
        assertThat(testLedger.getCurrency()).isEqualTo("USD");

        verify(ledgerRepository).findByLedgerIdAndUserIdAndIsDeletedFalse(ledgerId, userId);
    }

    @Test
    @DisplayName("가계부 수정 실패 - 존재하지 않는 가계부")
    void updateLedger_NotFound() {
        // Given
        Long userId = 1L;
        Long ledgerId = 999L;
        when(ledgerRepository.findByLedgerIdAndUserIdAndIsDeletedFalse(ledgerId, userId))
                .thenReturn(Optional.empty());

        // When & Then
        assertThatThrownBy(() -> ledgerService.updateLedger(userId, ledgerId, validRequest))
                .isInstanceOf(BusinessException.class)
                .extracting(ex -> ((BusinessException) ex).getErrorCode())
                .isEqualTo(ErrorCode.LEDGER_NOT_FOUND);

        verify(ledgerRepository).findByLedgerIdAndUserIdAndIsDeletedFalse(ledgerId, userId);
    }

    @Test
    @DisplayName("가계부 삭제 성공")
    void deleteLedger_Success() {
        // Given
        Long userId = 1L;
        Long ledgerId = 1L;
        when(ledgerRepository.findByLedgerIdAndUserIdAndIsDeletedFalse(ledgerId, userId))
                .thenReturn(Optional.of(testLedger));

        // When
        ledgerService.deleteLedger(userId, ledgerId);

        // Then
        assertThat(testLedger.isDeleted()).isTrue();

        verify(ledgerRepository).findByLedgerIdAndUserIdAndIsDeletedFalse(ledgerId, userId);
    }

    @Test
    @DisplayName("가계부 삭제 실패 - 존재하지 않는 가계부")
    void deleteLedger_NotFound() {
        // Given
        Long userId = 1L;
        Long ledgerId = 999L;
        when(ledgerRepository.findByLedgerIdAndUserIdAndIsDeletedFalse(ledgerId, userId))
                .thenReturn(Optional.empty());

        // When & Then
        assertThatThrownBy(() -> ledgerService.deleteLedger(userId, ledgerId))
                .isInstanceOf(BusinessException.class)
                .extracting(ex -> ((BusinessException) ex).getErrorCode())
                .isEqualTo(ErrorCode.LEDGER_NOT_FOUND);

        verify(ledgerRepository).findByLedgerIdAndUserIdAndIsDeletedFalse(ledgerId, userId);
    }

    @Test
    @DisplayName("가계부 요약 조회 성공")
    void getLedgerSummary_Success() {
        // Given
        Long userId = 1L;
        List<Ledger> ledgers = List.of(testLedger);

        when(userRepository.findByUserIdAndIsDeletedFalse(userId))
                .thenReturn(Optional.of(testUser));
        when(ledgerRepository.findByUserIdAndIsDeletedFalseOrderByCreatedAtDesc(userId))
                .thenReturn(ledgers);
        when(transactionRepository.sumAmountByLedgerIdAndType(1L, TransactionType.INCOME))
                .thenReturn(BigDecimal.valueOf(1000000));
        when(transactionRepository.sumAmountByLedgerIdAndType(1L, TransactionType.EXPENSE))
                .thenReturn(BigDecimal.valueOf(500000));

        // When
        LedgerSummaryResponse result = ledgerService.getLedgerSummary(userId);

        // Then
        assertThat(result).isNotNull();
        assertThat(result.getUserId()).isEqualTo(userId);
        assertThat(result.getUsername()).isEqualTo("testuser");
        assertThat(result.getTotalLedgerCount()).isEqualTo(1);
        assertThat(result.getTotalIncome()).isEqualTo(BigDecimal.valueOf(1000000));
        assertThat(result.getTotalExpense()).isEqualTo(BigDecimal.valueOf(500000));
        assertThat(result.getTotalBalance()).isEqualTo(BigDecimal.valueOf(500000));

        verify(userRepository).findByUserIdAndIsDeletedFalse(userId);
        verify(ledgerRepository).findByUserIdAndIsDeletedFalseOrderByCreatedAtDesc(userId);
    }

    @Test
    @DisplayName("가계부 요약 조회 실패 - 존재하지 않는 사용자")
    void getLedgerSummary_UserNotFound() {
        // Given
        Long userId = 999L;
        when(userRepository.findByUserIdAndIsDeletedFalse(userId))
                .thenReturn(Optional.empty());

        // When & Then
        assertThatThrownBy(() -> ledgerService.getLedgerSummary(userId))
                .isInstanceOf(BusinessException.class)
                .extracting(ex -> ((BusinessException) ex).getErrorCode())
                .isEqualTo(ErrorCode.USER_NOT_FOUND);

        verify(userRepository).findByUserIdAndIsDeletedFalse(userId);
        verify(ledgerRepository, never()).findByUserIdAndIsDeletedFalseOrderByCreatedAtDesc(anyLong());
    }

    @Test
    @DisplayName("기본 가계부 변경 성공")
    void updateLedger_ChangeDefault_Success() {
        // Given
        Long userId = 1L;
        Long ledgerId = 2L;

        Ledger newDefaultLedger = Ledger.builder()
                .userId(1L)
                .name("두 번째 가계부")
                .description("두 번째 가계부입니다")
                .currency("KRW")
                .isDefault(false)
                .transactions(new ArrayList<>())
                .build();
        ReflectionTestUtils.setField(newDefaultLedger, "ledgerId", 2L);

        LedgerRequest updateRequest = LedgerRequest.builder()
                .name("두 번째 가계부")
                .description("두 번째 가계부입니다")
                .currency("KRW")
                .isDefault(true) // 기본 가계부로 설정
                .build();

        when(ledgerRepository.findByLedgerIdAndUserIdAndIsDeletedFalse(ledgerId, userId))
                .thenReturn(Optional.of(newDefaultLedger));
        when(ledgerRepository.findByUserIdAndIsDefaultTrueAndIsDeletedFalse(userId))
                .thenReturn(Optional.of(testLedger));

        // When
        LedgerResponse result = ledgerService.updateLedger(userId, ledgerId, updateRequest);

        // Then
        assertThat(result).isNotNull();
        assertThat(newDefaultLedger.getIsDefault()).isTrue();
        assertThat(testLedger.getIsDefault()).isFalse(); // 기존 기본 가계부 해제

        verify(ledgerRepository).findByLedgerIdAndUserIdAndIsDeletedFalse(ledgerId, userId);
        verify(ledgerRepository).findByUserIdAndIsDefaultTrueAndIsDeletedFalse(userId);
    }
}
