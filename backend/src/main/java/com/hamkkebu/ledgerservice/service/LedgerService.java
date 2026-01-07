package com.hamkkebu.ledgerservice.service;

import com.hamkkebu.boilerplate.common.constant.CommonConstants;
import com.hamkkebu.boilerplate.common.exception.BusinessException;
import com.hamkkebu.boilerplate.common.exception.ErrorCode;
import com.hamkkebu.boilerplate.common.util.BigDecimalUtils;
import com.hamkkebu.ledgerservice.data.dto.LedgerRequest;
import com.hamkkebu.ledgerservice.data.dto.LedgerResponse;
import com.hamkkebu.ledgerservice.data.dto.LedgerSummaryResponse;
import com.hamkkebu.ledgerservice.data.entity.Ledger;
import com.hamkkebu.ledgerservice.data.entity.User;
import com.hamkkebu.ledgerservice.data.enums.TransactionType;
import com.hamkkebu.ledgerservice.data.entity.Category;
import com.hamkkebu.ledgerservice.repository.CategoryRepository;
import com.hamkkebu.ledgerservice.repository.LedgerRepository;
import com.hamkkebu.ledgerservice.repository.TransactionRepository;
import com.hamkkebu.ledgerservice.repository.UserRepository;
import com.hamkkebu.ledgerservice.kafka.producer.LedgerEventProducer;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.util.List;

@Slf4j
@Service
@RequiredArgsConstructor
public class LedgerService {

    private final LedgerRepository ledgerRepository;
    private final TransactionRepository transactionRepository;
    private final UserRepository userRepository;
    private final CategoryRepository categoryRepository;
    private final LedgerEventProducer ledgerEventProducer;

    /**
     * 사용자의 가계부 현황 조회
     */
    @Transactional(readOnly = true)
    public LedgerSummaryResponse getLedgerSummary(Long userId) {
        log.debug("Getting ledger summary for user: {}", userId);

        User user = userRepository.findByUserIdAndIsDeletedFalse(userId)
                .orElseThrow(() -> new BusinessException(ErrorCode.USER_NOT_FOUND));

        List<Ledger> ledgers = ledgerRepository.findByUserIdAndIsDeletedFalseOrderByCreatedAtDesc(userId);

        BigDecimal totalIncome = BigDecimal.ZERO;
        BigDecimal totalExpense = BigDecimal.ZERO;

        List<LedgerResponse> ledgerResponses = ledgers.stream()
                .map(ledger -> {
                    BigDecimal income = BigDecimalUtils.nullToZero(
                            transactionRepository.sumAmountByLedgerIdAndType(
                                    ledger.getLedgerId(), TransactionType.INCOME));
                    BigDecimal expense = BigDecimalUtils.nullToZero(
                            transactionRepository.sumAmountByLedgerIdAndType(
                                    ledger.getLedgerId(), TransactionType.EXPENSE));
                    long txCount = ledger.getTransactions().stream()
                            .filter(t -> !t.isDeleted())
                            .count();
                    return LedgerResponse.from(ledger, income, expense, txCount);
                })
                .toList();

        for (LedgerResponse ledger : ledgerResponses) {
            totalIncome = BigDecimalUtils.add(totalIncome, ledger.getTotalIncome());
            totalExpense = BigDecimalUtils.add(totalExpense, ledger.getTotalExpense());
        }

        return LedgerSummaryResponse.builder()
                .userId(userId)
                .username(user.getUsername())
                .totalLedgerCount(ledgers.size())
                .totalIncome(totalIncome)
                .totalExpense(totalExpense)
                .totalBalance(totalIncome.subtract(totalExpense))
                .ledgers(ledgerResponses)
                .build();
    }

    /**
     * 가계부 목록 조회
     */
    @Transactional(readOnly = true)
    public List<LedgerResponse> getLedgers(Long userId) {
        log.debug("Getting ledgers for user: {}", userId);

        return ledgerRepository.findByUserIdAndIsDeletedFalseOrderByCreatedAtDesc(userId)
                .stream()
                .map(LedgerResponse::from)
                .toList();
    }

    /**
     * 가계부 상세 조회
     */
    @Transactional(readOnly = true)
    public LedgerResponse getLedger(Long userId, Long ledgerId) {
        log.debug("Getting ledger: userId={}, ledgerId={}", userId, ledgerId);

        Ledger ledger = ledgerRepository.findByLedgerIdAndUserIdAndIsDeletedFalse(ledgerId, userId)
                .orElseThrow(() -> new BusinessException(ErrorCode.LEDGER_NOT_FOUND));

        BigDecimal income = BigDecimalUtils.nullToZero(
                transactionRepository.sumAmountByLedgerIdAndType(ledgerId, TransactionType.INCOME));
        BigDecimal expense = BigDecimalUtils.nullToZero(
                transactionRepository.sumAmountByLedgerIdAndType(ledgerId, TransactionType.EXPENSE));
        long txCount = ledger.getTransactions().stream()
                .filter(t -> !t.isDeleted())
                .count();

        return LedgerResponse.from(ledger, income, expense, txCount);
    }

    /**
     * 가계부 생성
     */
    @Transactional
    public LedgerResponse createLedger(Long userId, LedgerRequest request) {
        log.info("Creating ledger for user: {}", userId);

        // 사용자 존재 확인
        if (!userRepository.existsByUserIdAndIsDeletedFalse(userId)) {
            throw new BusinessException(ErrorCode.USER_NOT_FOUND);
        }

        // 첫 번째 가계부인 경우 기본 가계부로 설정
        boolean isFirst = ledgerRepository.countByUserIdAndIsDeletedFalse(userId) == 0;
        boolean isDefault = Boolean.TRUE.equals(request.getIsDefault()) || isFirst;

        // 기본 가계부로 설정하는 경우 기존 기본 가계부 해제
        if (isDefault) {
            ledgerRepository.findByUserIdAndIsDefaultTrueAndIsDeletedFalse(userId)
                    .ifPresent(Ledger::unsetDefault);
        }

        Ledger ledger = Ledger.builder()
                .userId(userId)
                .name(request.getName())
                .description(request.getDescription())
                .currency(request.getCurrency() != null ? request.getCurrency() : "KRW")
                .isDefault(isDefault)
                .build();

        Ledger saved = ledgerRepository.save(ledger);
        log.info("Ledger created: ledgerId={}", saved.getLedgerId());

        // 기본 카테고리 생성
        createDefaultCategories(saved.getLedgerId());

        // Kafka 이벤트 발행
        ledgerEventProducer.publishLedgerCreated(saved);

        return LedgerResponse.from(saved);
    }

    /**
     * 기본 카테고리 생성 (가계부 생성 시 호출)
     */
    private void createDefaultCategories(Long ledgerId) {
        log.debug("Creating default categories for ledger: {}", ledgerId);

        // 수입 카테고리
        for (String[] cat : CommonConstants.DEFAULT_INCOME_CATEGORIES) {
            categoryRepository.save(Category.builder()
                    .ledgerId(ledgerId)
                    .name(cat[0])
                    .type(TransactionType.INCOME)
                    .icon(cat[1])
                    .color(cat[2])
                    .build());
        }

        // 지출 카테고리
        for (String[] cat : CommonConstants.DEFAULT_EXPENSE_CATEGORIES) {
            categoryRepository.save(Category.builder()
                    .ledgerId(ledgerId)
                    .name(cat[0])
                    .type(TransactionType.EXPENSE)
                    .icon(cat[1])
                    .color(cat[2])
                    .build());
        }

        log.debug("Default categories created for ledger: {}", ledgerId);
    }

    /**
     * 가계부 수정
     */
    @Transactional
    public LedgerResponse updateLedger(Long userId, Long ledgerId, LedgerRequest request) {
        log.debug("Updating ledger: userId={}, ledgerId={}", userId, ledgerId);

        Ledger ledger = ledgerRepository.findByLedgerIdAndUserIdAndIsDeletedFalse(ledgerId, userId)
                .orElseThrow(() -> new BusinessException(ErrorCode.LEDGER_NOT_FOUND));

        ledger.update(
                request.getName(),
                request.getDescription(),
                request.getCurrency() != null ? request.getCurrency() : ledger.getCurrency()
        );

        // 기본 가계부 변경
        if (Boolean.TRUE.equals(request.getIsDefault()) && !ledger.getIsDefault()) {
            ledgerRepository.findByUserIdAndIsDefaultTrueAndIsDeletedFalse(userId)
                    .ifPresent(Ledger::unsetDefault);
            ledger.setAsDefault();
        }

        log.info("Ledger updated: ledgerId={}", ledgerId);

        // Kafka 이벤트 발행
        ledgerEventProducer.publishLedgerUpdated(ledger);

        return LedgerResponse.from(ledger);
    }

    /**
     * 가계부 삭제 (Soft Delete)
     */
    @Transactional
    public void deleteLedger(Long userId, Long ledgerId) {
        log.debug("Deleting ledger: userId={}, ledgerId={}", userId, ledgerId);

        Ledger ledger = ledgerRepository.findByLedgerIdAndUserIdAndIsDeletedFalse(ledgerId, userId)
                .orElseThrow(() -> new BusinessException(ErrorCode.LEDGER_NOT_FOUND));

        ledger.delete();
        log.info("Ledger deleted: ledgerId={}", ledgerId);

        // Kafka 이벤트 발행
        ledgerEventProducer.publishLedgerDeleted(ledger);
    }
}
