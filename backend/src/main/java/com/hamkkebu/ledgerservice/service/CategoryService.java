package com.hamkkebu.ledgerservice.service;

import com.hamkkebu.boilerplate.common.exception.BusinessException;
import com.hamkkebu.boilerplate.common.exception.ErrorCode;
import com.hamkkebu.ledgerservice.data.dto.CategoryRequest;
import com.hamkkebu.ledgerservice.data.dto.CategoryResponse;
import com.hamkkebu.ledgerservice.data.entity.Category;
import com.hamkkebu.ledgerservice.data.enums.TransactionType;
import com.hamkkebu.ledgerservice.repository.CategoryRepository;
import com.hamkkebu.ledgerservice.repository.LedgerRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Slf4j
@Service
@RequiredArgsConstructor
public class CategoryService {

    private final CategoryRepository categoryRepository;
    private final LedgerRepository ledgerRepository;

    /**
     * 가계부별 카테고리 목록 조회
     */
    @Transactional(readOnly = true)
    public List<CategoryResponse> getCategories(Long ledgerId) {
        log.info("Getting categories for ledger: {}", ledgerId);

        return categoryRepository.findByLedgerIdAndIsDeletedFalseOrderByNameAsc(ledgerId)
                .stream()
                .filter(c -> c.getParentId() == null) // 최상위 카테고리만
                .map(CategoryResponse::fromWithChildren)
                .toList();
    }

    /**
     * 가계부별 유형별 카테고리 목록 조회
     */
    @Transactional(readOnly = true)
    public List<CategoryResponse> getCategoriesByType(Long ledgerId, TransactionType type) {
        log.info("Getting categories for ledger: {}, type: {}", ledgerId, type);

        return categoryRepository.findByLedgerIdAndTypeAndIsDeletedFalse(ledgerId, type)
                .stream()
                .map(CategoryResponse::from)
                .toList();
    }

    /**
     * 카테고리 상세 조회
     */
    @Transactional(readOnly = true)
    public CategoryResponse getCategory(Long ledgerId, Long categoryId) {
        log.info("Getting category: ledgerId={}, categoryId={}", ledgerId, categoryId);

        Category category = categoryRepository.findByCategoryIdAndLedgerIdAndIsDeletedFalse(categoryId, ledgerId)
                .orElseThrow(() -> new BusinessException(ErrorCode.CATEGORY_NOT_FOUND));

        return CategoryResponse.fromWithChildren(category);
    }

    /**
     * 카테고리 생성
     */
    @Transactional
    public CategoryResponse createCategory(Long ledgerId, CategoryRequest request) {
        log.info("Creating category for ledger: {}", ledgerId);

        // 가계부 존재 확인
        if (!ledgerRepository.existsByLedgerIdAndIsDeletedFalse(ledgerId)) {
            throw new BusinessException(ErrorCode.LEDGER_NOT_FOUND);
        }

        // 부모 카테고리 검증
        if (request.getParentId() != null) {
            Category parent = categoryRepository.findByCategoryIdAndLedgerIdAndIsDeletedFalse(
                    request.getParentId(), ledgerId)
                    .orElseThrow(() -> new BusinessException(ErrorCode.CATEGORY_NOT_FOUND));

            // 부모 카테고리와 유형이 같아야 함
            if (parent.getType() != request.getType()) {
                throw new BusinessException(ErrorCode.CATEGORY_TYPE_MISMATCH);
            }
        }

        Category category = Category.builder()
                .ledgerId(ledgerId)
                .name(request.getName())
                .type(request.getType())
                .icon(request.getIcon())
                .color(request.getColor())
                .parentId(request.getParentId())
                .build();

        Category saved = categoryRepository.save(category);
        log.info("Category created: categoryId={}", saved.getCategoryId());

        return CategoryResponse.from(saved);
    }

    /**
     * 카테고리 수정
     */
    @Transactional
    public CategoryResponse updateCategory(Long ledgerId, Long categoryId, CategoryRequest request) {
        log.info("Updating category: ledgerId={}, categoryId={}", ledgerId, categoryId);

        Category category = categoryRepository.findByCategoryIdAndLedgerIdAndIsDeletedFalse(categoryId, ledgerId)
                .orElseThrow(() -> new BusinessException(ErrorCode.CATEGORY_NOT_FOUND));

        category.update(request.getName(), request.getIcon(), request.getColor());

        log.info("Category updated: categoryId={}", categoryId);
        return CategoryResponse.from(category);
    }

    /**
     * 카테고리 삭제 (Soft Delete)
     */
    @Transactional
    public void deleteCategory(Long ledgerId, Long categoryId) {
        log.info("Deleting category: ledgerId={}, categoryId={}", ledgerId, categoryId);

        Category category = categoryRepository.findByCategoryIdAndLedgerIdAndIsDeletedFalse(categoryId, ledgerId)
                .orElseThrow(() -> new BusinessException(ErrorCode.CATEGORY_NOT_FOUND));

        // 자식 카테고리도 함께 삭제
        category.getChildren().stream()
                .filter(c -> !c.isDeleted())
                .forEach(Category::delete);

        category.delete();
        log.info("Category deleted: categoryId={}", categoryId);
    }

    /**
     * 기본 카테고리 생성 (가계부 생성 시 호출)
     */
    @Transactional
    public void createDefaultCategories(Long ledgerId) {
        log.info("Creating default categories for ledger: {}", ledgerId);

        // 수입 카테고리
        String[][] incomeCategories = {
                {"급여", "💰", "#4CAF50"},
                {"부수입", "💼", "#8BC34A"},
                {"용돈", "🎁", "#CDDC39"},
                {"투자수익", "📈", "#00BCD4"},
                {"기타수입", "➕", "#9E9E9E"}
        };

        for (String[] cat : incomeCategories) {
            categoryRepository.save(Category.builder()
                    .ledgerId(ledgerId)
                    .name(cat[0])
                    .type(TransactionType.INCOME)
                    .icon(cat[1])
                    .color(cat[2])
                    .build());
        }

        // 지출 카테고리
        String[][] expenseCategories = {
                {"식비", "🍔", "#FF5722"},
                {"교통비", "🚗", "#2196F3"},
                {"주거비", "🏠", "#795548"},
                {"의료비", "💊", "#E91E63"},
                {"문화생활", "🎬", "#9C27B0"},
                {"쇼핑", "🛒", "#FF9800"},
                {"통신비", "📱", "#607D8B"},
                {"기타지출", "➖", "#9E9E9E"}
        };

        for (String[] cat : expenseCategories) {
            categoryRepository.save(Category.builder()
                    .ledgerId(ledgerId)
                    .name(cat[0])
                    .type(TransactionType.EXPENSE)
                    .icon(cat[1])
                    .color(cat[2])
                    .build());
        }

        log.info("Default categories created for ledger: {}", ledgerId);
    }
}
