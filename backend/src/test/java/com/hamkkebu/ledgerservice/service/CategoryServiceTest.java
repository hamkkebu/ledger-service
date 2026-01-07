package com.hamkkebu.ledgerservice.service;

import com.hamkkebu.boilerplate.common.exception.BusinessException;
import com.hamkkebu.boilerplate.common.exception.ErrorCode;
import com.hamkkebu.ledgerservice.data.dto.CategoryRequest;
import com.hamkkebu.ledgerservice.data.dto.CategoryResponse;
import com.hamkkebu.ledgerservice.data.entity.Category;
import com.hamkkebu.ledgerservice.data.enums.TransactionType;
import com.hamkkebu.ledgerservice.repository.CategoryRepository;
import com.hamkkebu.ledgerservice.repository.LedgerRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Nested;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.test.util.ReflectionTestUtils;

import java.util.ArrayList;
import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

/**
 * CategoryService 단위 테스트
 */
@ExtendWith(MockitoExtension.class)
@DisplayName("CategoryService 테스트")
class CategoryServiceTest {

    @Mock
    private CategoryRepository categoryRepository;

    @Mock
    private LedgerRepository ledgerRepository;

    @InjectMocks
    private CategoryService categoryService;

    private Category testCategory;
    private Category parentCategory;
    private CategoryRequest validRequest;

    private static final Long LEDGER_ID = 1L;
    private static final Long CATEGORY_ID = 1L;
    private static final Long PARENT_CATEGORY_ID = 2L;

    @BeforeEach
    void setUp() {
        testCategory = Category.builder()
                .ledgerId(LEDGER_ID)
                .name("식비")
                .type(TransactionType.EXPENSE)
                .icon("🍔")
                .color("#FF5722")
                .build();
        ReflectionTestUtils.setField(testCategory, "categoryId", CATEGORY_ID);
        ReflectionTestUtils.setField(testCategory, "children", new ArrayList<>());

        parentCategory = Category.builder()
                .ledgerId(LEDGER_ID)
                .name("지출")
                .type(TransactionType.EXPENSE)
                .icon("💸")
                .color("#000000")
                .build();
        ReflectionTestUtils.setField(parentCategory, "categoryId", PARENT_CATEGORY_ID);
        ReflectionTestUtils.setField(parentCategory, "children", new ArrayList<>());

        validRequest = CategoryRequest.builder()
                .name("교통비")
                .type(TransactionType.EXPENSE)
                .icon("🚗")
                .color("#2196F3")
                .build();
    }

    @Nested
    @DisplayName("카테고리 목록 조회")
    class GetCategories {

        @Test
        @DisplayName("가계부별 카테고리 목록 조회 성공")
        void getCategories_success() {
            // given
            List<Category> categories = List.of(testCategory);
            when(categoryRepository.findByLedgerIdAndIsDeletedFalseOrderByNameAsc(LEDGER_ID))
                    .thenReturn(categories);

            // when
            List<CategoryResponse> result = categoryService.getCategories(LEDGER_ID);

            // then
            assertThat(result).hasSize(1);
            assertThat(result.get(0).getName()).isEqualTo("식비");
            verify(categoryRepository).findByLedgerIdAndIsDeletedFalseOrderByNameAsc(LEDGER_ID);
        }

        @Test
        @DisplayName("유형별 카테고리 목록 조회 성공")
        void getCategoriesByType_success() {
            // given
            List<Category> categories = List.of(testCategory);
            when(categoryRepository.findByLedgerIdAndTypeAndIsDeletedFalse(LEDGER_ID, TransactionType.EXPENSE))
                    .thenReturn(categories);

            // when
            List<CategoryResponse> result = categoryService.getCategoriesByType(LEDGER_ID, TransactionType.EXPENSE);

            // then
            assertThat(result).hasSize(1);
            assertThat(result.get(0).getType()).isEqualTo(TransactionType.EXPENSE);
        }
    }

    @Nested
    @DisplayName("카테고리 상세 조회")
    class GetCategory {

        @Test
        @DisplayName("카테고리 상세 조회 성공")
        void getCategory_success() {
            // given
            when(categoryRepository.findByCategoryIdAndLedgerIdAndIsDeletedFalse(CATEGORY_ID, LEDGER_ID))
                    .thenReturn(Optional.of(testCategory));

            // when
            CategoryResponse result = categoryService.getCategory(LEDGER_ID, CATEGORY_ID);

            // then
            assertThat(result.getName()).isEqualTo("식비");
            assertThat(result.getType()).isEqualTo(TransactionType.EXPENSE);
        }

        @Test
        @DisplayName("존재하지 않는 카테고리 조회 시 예외 발생")
        void getCategory_notFound() {
            // given
            when(categoryRepository.findByCategoryIdAndLedgerIdAndIsDeletedFalse(CATEGORY_ID, LEDGER_ID))
                    .thenReturn(Optional.empty());

            // when & then
            assertThatThrownBy(() -> categoryService.getCategory(LEDGER_ID, CATEGORY_ID))
                    .isInstanceOf(BusinessException.class)
                    .hasFieldOrPropertyWithValue("errorCode", ErrorCode.CATEGORY_NOT_FOUND);
        }
    }

    @Nested
    @DisplayName("카테고리 생성")
    class CreateCategory {

        @Test
        @DisplayName("카테고리 생성 성공")
        void createCategory_success() {
            // given
            when(ledgerRepository.existsByLedgerIdAndIsDeletedFalse(LEDGER_ID)).thenReturn(true);
            when(categoryRepository.save(any(Category.class))).thenAnswer(invocation -> {
                Category saved = invocation.getArgument(0);
                ReflectionTestUtils.setField(saved, "categoryId", 10L);
                return saved;
            });

            // when
            CategoryResponse result = categoryService.createCategory(LEDGER_ID, validRequest);

            // then
            assertThat(result.getName()).isEqualTo("교통비");
            assertThat(result.getType()).isEqualTo(TransactionType.EXPENSE);
            verify(categoryRepository).save(any(Category.class));
        }

        @Test
        @DisplayName("가계부가 존재하지 않으면 예외 발생")
        void createCategory_ledgerNotFound() {
            // given
            when(ledgerRepository.existsByLedgerIdAndIsDeletedFalse(LEDGER_ID)).thenReturn(false);

            // when & then
            assertThatThrownBy(() -> categoryService.createCategory(LEDGER_ID, validRequest))
                    .isInstanceOf(BusinessException.class)
                    .hasFieldOrPropertyWithValue("errorCode", ErrorCode.LEDGER_NOT_FOUND);
        }

        @Test
        @DisplayName("하위 카테고리 생성 시 부모가 존재하지 않으면 예외 발생")
        void createCategory_parentNotFound() {
            // given
            CategoryRequest requestWithParent = CategoryRequest.builder()
                    .name("점심")
                    .type(TransactionType.EXPENSE)
                    .parentId(999L)
                    .build();

            when(ledgerRepository.existsByLedgerIdAndIsDeletedFalse(LEDGER_ID)).thenReturn(true);
            when(categoryRepository.findByCategoryIdAndLedgerIdAndIsDeletedFalse(999L, LEDGER_ID))
                    .thenReturn(Optional.empty());

            // when & then
            assertThatThrownBy(() -> categoryService.createCategory(LEDGER_ID, requestWithParent))
                    .isInstanceOf(BusinessException.class)
                    .hasFieldOrPropertyWithValue("errorCode", ErrorCode.CATEGORY_NOT_FOUND);
        }

        @Test
        @DisplayName("하위 카테고리 생성 시 부모와 유형이 다르면 예외 발생")
        void createCategory_typeMismatch() {
            // given
            CategoryRequest requestWithParent = CategoryRequest.builder()
                    .name("용돈")
                    .type(TransactionType.INCOME)  // 부모는 EXPENSE인데 자식이 INCOME
                    .parentId(PARENT_CATEGORY_ID)
                    .build();

            when(ledgerRepository.existsByLedgerIdAndIsDeletedFalse(LEDGER_ID)).thenReturn(true);
            when(categoryRepository.findByCategoryIdAndLedgerIdAndIsDeletedFalse(PARENT_CATEGORY_ID, LEDGER_ID))
                    .thenReturn(Optional.of(parentCategory));

            // when & then
            assertThatThrownBy(() -> categoryService.createCategory(LEDGER_ID, requestWithParent))
                    .isInstanceOf(BusinessException.class)
                    .hasFieldOrPropertyWithValue("errorCode", ErrorCode.CATEGORY_TYPE_MISMATCH);
        }
    }

    @Nested
    @DisplayName("카테고리 수정")
    class UpdateCategory {

        @Test
        @DisplayName("카테고리 수정 성공")
        void updateCategory_success() {
            // given
            CategoryRequest updateRequest = CategoryRequest.builder()
                    .name("외식비")
                    .icon("🍽️")
                    .color("#FF0000")
                    .build();

            when(categoryRepository.findByCategoryIdAndLedgerIdAndIsDeletedFalse(CATEGORY_ID, LEDGER_ID))
                    .thenReturn(Optional.of(testCategory));

            // when
            CategoryResponse result = categoryService.updateCategory(LEDGER_ID, CATEGORY_ID, updateRequest);

            // then
            assertThat(result.getName()).isEqualTo("외식비");
            assertThat(result.getIcon()).isEqualTo("🍽️");
            assertThat(result.getColor()).isEqualTo("#FF0000");
        }

        @Test
        @DisplayName("존재하지 않는 카테고리 수정 시 예외 발생")
        void updateCategory_notFound() {
            // given
            when(categoryRepository.findByCategoryIdAndLedgerIdAndIsDeletedFalse(CATEGORY_ID, LEDGER_ID))
                    .thenReturn(Optional.empty());

            // when & then
            assertThatThrownBy(() -> categoryService.updateCategory(LEDGER_ID, CATEGORY_ID, validRequest))
                    .isInstanceOf(BusinessException.class)
                    .hasFieldOrPropertyWithValue("errorCode", ErrorCode.CATEGORY_NOT_FOUND);
        }
    }

    @Nested
    @DisplayName("카테고리 삭제")
    class DeleteCategory {

        @Test
        @DisplayName("카테고리 삭제 성공")
        void deleteCategory_success() {
            // given
            when(categoryRepository.findByCategoryIdAndLedgerIdAndIsDeletedFalse(CATEGORY_ID, LEDGER_ID))
                    .thenReturn(Optional.of(testCategory));

            // when
            categoryService.deleteCategory(LEDGER_ID, CATEGORY_ID);

            // then
            assertThat(testCategory.isDeleted()).isTrue();
        }

        @Test
        @DisplayName("자식 카테고리도 함께 삭제")
        void deleteCategory_withChildren() {
            // given
            Category childCategory = Category.builder()
                    .ledgerId(LEDGER_ID)
                    .name("점심")
                    .type(TransactionType.EXPENSE)
                    .parentId(CATEGORY_ID)
                    .build();
            ReflectionTestUtils.setField(childCategory, "categoryId", 100L);
            ReflectionTestUtils.setField(childCategory, "children", new ArrayList<>());

            List<Category> children = new ArrayList<>();
            children.add(childCategory);
            ReflectionTestUtils.setField(testCategory, "children", children);

            when(categoryRepository.findByCategoryIdAndLedgerIdAndIsDeletedFalse(CATEGORY_ID, LEDGER_ID))
                    .thenReturn(Optional.of(testCategory));

            // when
            categoryService.deleteCategory(LEDGER_ID, CATEGORY_ID);

            // then
            assertThat(testCategory.isDeleted()).isTrue();
            assertThat(childCategory.isDeleted()).isTrue();
        }

        @Test
        @DisplayName("존재하지 않는 카테고리 삭제 시 예외 발생")
        void deleteCategory_notFound() {
            // given
            when(categoryRepository.findByCategoryIdAndLedgerIdAndIsDeletedFalse(CATEGORY_ID, LEDGER_ID))
                    .thenReturn(Optional.empty());

            // when & then
            assertThatThrownBy(() -> categoryService.deleteCategory(LEDGER_ID, CATEGORY_ID))
                    .isInstanceOf(BusinessException.class)
                    .hasFieldOrPropertyWithValue("errorCode", ErrorCode.CATEGORY_NOT_FOUND);
        }
    }

    @Nested
    @DisplayName("기본 카테고리 생성")
    class CreateDefaultCategories {

        @Test
        @DisplayName("기본 카테고리 생성 성공")
        void createDefaultCategories_success() {
            // given
            when(categoryRepository.save(any(Category.class))).thenAnswer(invocation -> {
                Category saved = invocation.getArgument(0);
                ReflectionTestUtils.setField(saved, "categoryId", System.nanoTime());
                return saved;
            });

            // when
            categoryService.createDefaultCategories(LEDGER_ID);

            // then
            // 수입 5개 + 지출 8개 = 13개
            verify(categoryRepository, times(13)).save(any(Category.class));
        }
    }
}
