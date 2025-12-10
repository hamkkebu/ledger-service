<template>
  <div class="category-management">
    <div class="page-header">
      <div class="header-content">
        <button class="back-button" @click="goBack">
          <span class="back-icon">&larr;</span>
          돌아가기
        </button>
        <h1 class="page-title">카테고리 관리</h1>
        <p class="page-subtitle">{{ ledgerName }}</p>
      </div>
    </div>

    <div class="content-wrapper">
      <!-- 카테고리 추가 버튼 -->
      <div class="action-bar">
        <button class="btn-add" @click="openCreateModal">
          + 카테고리 추가
        </button>
        <button class="btn-default" @click="createDefaultCategories" v-if="categories.length === 0">
          기본 카테고리 생성
        </button>
      </div>

      <!-- 탭: 수입/지출 -->
      <div class="tabs">
        <button
          :class="['tab', { active: activeTab === 'INCOME' }]"
          @click="activeTab = 'INCOME'"
        >
          수입 카테고리
        </button>
        <button
          :class="['tab', { active: activeTab === 'EXPENSE' }]"
          @click="activeTab = 'EXPENSE'"
        >
          지출 카테고리
        </button>
      </div>

      <!-- 카테고리 목록 -->
      <div class="categories-grid" v-if="filteredCategories.length > 0">
        <div
          v-for="category in filteredCategories"
          :key="category.categoryId"
          class="category-card glass"
        >
          <div class="category-icon" :style="{ backgroundColor: category.color || '#667eea' }">
            {{ category.icon || '📁' }}
          </div>
          <div class="category-info">
            <h3 class="category-name">{{ category.name }}</h3>
            <span class="category-type" :class="category.type.toLowerCase()">
              {{ category.type === 'INCOME' ? '수입' : '지출' }}
            </span>
          </div>
          <div class="category-actions">
            <button class="btn-edit" @click="openEditModal(category)">수정</button>
            <button class="btn-delete" @click="confirmDelete(category)">삭제</button>
          </div>
        </div>
      </div>

      <!-- 빈 상태 -->
      <div v-else class="empty-state glass">
        <div class="empty-icon">📂</div>
        <p class="empty-text">
          {{ activeTab === 'INCOME' ? '수입' : '지출' }} 카테고리가 없습니다
        </p>
        <button class="btn-add-empty" @click="openCreateModal">
          첫 카테고리 추가하기
        </button>
      </div>
    </div>

    <!-- 생성/수정 모달 -->
    <div v-if="showModal" class="modal-overlay" @click.self="closeModal">
      <div class="modal glass">
        <h2 class="modal-title">{{ isEdit ? '카테고리 수정' : '카테고리 추가' }}</h2>

        <form @submit.prevent="saveCategory">
          <div class="form-group">
            <label>카테고리 이름</label>
            <input
              v-model="formData.name"
              type="text"
              placeholder="카테고리 이름을 입력하세요"
              required
              maxlength="50"
            />
          </div>

          <div class="form-group">
            <label>유형</label>
            <div class="type-selector">
              <button
                type="button"
                :class="['type-btn', { active: formData.type === 'INCOME' }]"
                @click="formData.type = 'INCOME'"
                :disabled="isEdit"
              >
                수입
              </button>
              <button
                type="button"
                :class="['type-btn', { active: formData.type === 'EXPENSE' }]"
                @click="formData.type = 'EXPENSE'"
                :disabled="isEdit"
              >
                지출
              </button>
            </div>
          </div>

          <div class="form-group">
            <label>아이콘</label>
            <div class="icon-selector">
              <button
                type="button"
                v-for="icon in availableIcons"
                :key="icon"
                :class="['icon-btn', { active: formData.icon === icon }]"
                @click="formData.icon = icon"
              >
                {{ icon }}
              </button>
            </div>
          </div>

          <div class="form-group">
            <label>색상</label>
            <div class="color-selector">
              <button
                type="button"
                v-for="color in availableColors"
                :key="color"
                :class="['color-btn', { active: formData.color === color }]"
                :style="{ backgroundColor: color }"
                @click="formData.color = color"
              ></button>
            </div>
          </div>

          <div class="modal-actions">
            <button type="button" class="btn-cancel" @click="closeModal">취소</button>
            <button type="submit" class="btn-save" :disabled="!formData.name">
              {{ isEdit ? '수정' : '추가' }}
            </button>
          </div>
        </form>
      </div>
    </div>
  </div>
</template>

<script lang="ts">
import { defineComponent, ref, computed, onMounted } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { categoryApi } from '@/api/categoryApi';
import { ledgerApi } from '@/api/ledgerApi';
import type { Category, CategoryRequest, TransactionType } from '@/types/category.types';

export default defineComponent({
  name: 'CategoryManagement',
  setup() {
    const route = useRoute();
    const router = useRouter();

    const ledgerId = computed(() => Number(route.params.id));
    const ledgerName = ref('');
    const categories = ref<Category[]>([]);
    const activeTab = ref<TransactionType>('EXPENSE');
    const showModal = ref(false);
    const isEdit = ref(false);
    const editingCategoryId = ref<number | null>(null);

    const formData = ref<CategoryRequest>({
      name: '',
      type: 'EXPENSE',
      icon: '📁',
      color: '#667eea',
    });

    const availableIcons = [
      '💰', '💵', '💳', '🏦', '📈', '🎁', '💼', '🏠',
      '🚗', '🍔', '🛒', '📱', '💊', '🎬', '✈️', '📚',
      '👕', '💡', '🎮', '🏋️', '🐶', '👶', '🎂', '📁'
    ];

    const availableColors = [
      '#667eea', '#764ba2', '#f093fb', '#f5576c',
      '#11998e', '#38ef7d', '#f2994a', '#f2c94c',
      '#eb3349', '#2196F3', '#4CAF50', '#FF5722',
      '#9C27B0', '#795548', '#607D8B', '#E91E63'
    ];

    const filteredCategories = computed(() => {
      return categories.value.filter(c => c.type === activeTab.value);
    });

    const loadLedger = async () => {
      try {
        const ledger = await ledgerApi.getLedger(ledgerId.value);
        ledgerName.value = ledger.name;
      } catch (error) {
        console.error('Failed to load ledger:', error);
      }
    };

    const loadCategories = async () => {
      try {
        categories.value = await categoryApi.getCategories(ledgerId.value);
      } catch (error) {
        console.error('Failed to load categories:', error);
      }
    };

    const openCreateModal = () => {
      isEdit.value = false;
      editingCategoryId.value = null;
      formData.value = {
        name: '',
        type: activeTab.value,
        icon: '📁',
        color: '#667eea',
      };
      showModal.value = true;
    };

    const openEditModal = (category: Category) => {
      isEdit.value = true;
      editingCategoryId.value = category.categoryId;
      formData.value = {
        name: category.name,
        type: category.type,
        icon: category.icon || '📁',
        color: category.color || '#667eea',
      };
      showModal.value = true;
    };

    const closeModal = () => {
      showModal.value = false;
      editingCategoryId.value = null;
    };

    const saveCategory = async () => {
      try {
        if (isEdit.value && editingCategoryId.value) {
          await categoryApi.updateCategory(ledgerId.value, editingCategoryId.value, formData.value);
        } else {
          await categoryApi.createCategory(ledgerId.value, formData.value);
        }
        closeModal();
        await loadCategories();
      } catch (error) {
        console.error('Failed to save category:', error);
      }
    };

    const confirmDelete = async (category: Category) => {
      if (confirm(`"${category.name}" 카테고리를 삭제하시겠습니까?`)) {
        try {
          await categoryApi.deleteCategory(ledgerId.value, category.categoryId);
          await loadCategories();
        } catch (error) {
          console.error('Failed to delete category:', error);
        }
      }
    };

    const createDefaultCategories = async () => {
      try {
        await categoryApi.createDefaultCategories(ledgerId.value);
        await loadCategories();
      } catch (error) {
        console.error('Failed to create default categories:', error);
      }
    };

    const goBack = () => {
      router.push(`/ledger/${ledgerId.value}`);
    };

    onMounted(async () => {
      await loadLedger();
      await loadCategories();
    });

    return {
      ledgerName,
      categories,
      activeTab,
      filteredCategories,
      showModal,
      isEdit,
      formData,
      availableIcons,
      availableColors,
      openCreateModal,
      openEditModal,
      closeModal,
      saveCategory,
      confirmDelete,
      createDefaultCategories,
      goBack,
    };
  },
});
</script>

<style scoped>
.category-management {
  min-height: 100vh;
  padding: 2rem;
}

.page-header {
  margin-bottom: 2rem;
}

.header-content {
  max-width: 1200px;
  margin: 0 auto;
}

.back-button {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  background: none;
  border: none;
  color: var(--text-secondary);
  cursor: pointer;
  font-size: 0.875rem;
  margin-bottom: 1rem;
  font-family: inherit;
}

.back-button:hover {
  color: var(--text-primary);
}

.page-title {
  font-size: 2rem;
  margin-bottom: 0.5rem;
}

.page-subtitle {
  color: var(--text-secondary);
}

.content-wrapper {
  max-width: 1200px;
  margin: 0 auto;
}

.action-bar {
  display: flex;
  gap: 1rem;
  margin-bottom: 1.5rem;
}

.btn-add, .btn-default {
  padding: 0.75rem 1.5rem;
  border-radius: var(--radius-md);
  font-weight: 600;
  cursor: pointer;
  font-family: inherit;
  border: none;
}

.btn-add {
  background: var(--gradient-primary);
  color: white;
}

.btn-default {
  background: var(--glass-bg);
  color: var(--text-primary);
  border: 1px solid var(--glass-border);
}

.tabs {
  display: flex;
  gap: 0.5rem;
  margin-bottom: 1.5rem;
}

.tab {
  padding: 0.75rem 1.5rem;
  background: var(--glass-bg);
  border: 1px solid var(--glass-border);
  border-radius: var(--radius-md);
  color: var(--text-secondary);
  cursor: pointer;
  font-family: inherit;
  font-weight: 500;
}

.tab.active {
  background: var(--gradient-primary);
  color: white;
  border-color: transparent;
}

.categories-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
  gap: 1rem;
}

.category-card {
  display: flex;
  align-items: center;
  gap: 1rem;
  padding: 1.25rem;
  border-radius: var(--radius-lg);
}

.category-icon {
  width: 48px;
  height: 48px;
  border-radius: var(--radius-md);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 1.5rem;
}

.category-info {
  flex: 1;
}

.category-name {
  font-size: 1rem;
  font-weight: 600;
  margin-bottom: 0.25rem;
}

.category-type {
  font-size: 0.75rem;
  padding: 0.125rem 0.5rem;
  border-radius: 4px;
}

.category-type.income {
  background: rgba(16, 185, 129, 0.2);
  color: var(--accent-green);
}

.category-type.expense {
  background: rgba(239, 68, 68, 0.2);
  color: var(--accent-red);
}

.category-actions {
  display: flex;
  gap: 0.5rem;
}

.btn-edit, .btn-delete {
  padding: 0.5rem 1rem;
  border-radius: var(--radius-sm);
  font-size: 0.75rem;
  cursor: pointer;
  font-family: inherit;
  border: none;
}

.btn-edit {
  background: rgba(59, 130, 246, 0.2);
  color: var(--accent-blue);
}

.btn-delete {
  background: rgba(239, 68, 68, 0.2);
  color: var(--accent-red);
}

.empty-state {
  text-align: center;
  padding: 3rem;
  border-radius: var(--radius-xl);
}

.empty-icon {
  font-size: 3rem;
  margin-bottom: 1rem;
}

.empty-text {
  color: var(--text-secondary);
  margin-bottom: 1.5rem;
}

.btn-add-empty {
  padding: 0.75rem 1.5rem;
  background: var(--gradient-primary);
  color: white;
  border: none;
  border-radius: var(--radius-md);
  font-weight: 600;
  cursor: pointer;
  font-family: inherit;
}

/* Modal */
.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.7);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
}

.modal {
  width: 100%;
  max-width: 480px;
  padding: 2rem;
  border-radius: var(--radius-xl);
}

.modal-title {
  font-size: 1.5rem;
  margin-bottom: 1.5rem;
}

.form-group {
  margin-bottom: 1.5rem;
}

.form-group label {
  display: block;
  margin-bottom: 0.5rem;
  color: var(--text-secondary);
  font-size: 0.875rem;
}

.form-group input {
  width: 100%;
  padding: 0.75rem 1rem;
  background: var(--bg-secondary);
  border: 1px solid var(--glass-border);
  border-radius: var(--radius-md);
  color: var(--text-primary);
  font-size: 1rem;
  font-family: inherit;
}

.type-selector {
  display: flex;
  gap: 0.5rem;
}

.type-btn {
  flex: 1;
  padding: 0.75rem;
  background: var(--bg-secondary);
  border: 1px solid var(--glass-border);
  border-radius: var(--radius-md);
  color: var(--text-secondary);
  cursor: pointer;
  font-family: inherit;
}

.type-btn.active {
  background: var(--gradient-primary);
  color: white;
  border-color: transparent;
}

.type-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.icon-selector, .color-selector {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
}

.icon-btn {
  width: 40px;
  height: 40px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--bg-secondary);
  border: 1px solid var(--glass-border);
  border-radius: var(--radius-sm);
  cursor: pointer;
  font-size: 1.25rem;
}

.icon-btn.active {
  border-color: var(--accent-purple);
  background: rgba(168, 85, 247, 0.2);
}

.color-btn {
  width: 32px;
  height: 32px;
  border-radius: 50%;
  border: 2px solid transparent;
  cursor: pointer;
}

.color-btn.active {
  border-color: white;
  box-shadow: 0 0 0 2px var(--accent-purple);
}

.modal-actions {
  display: flex;
  gap: 1rem;
  margin-top: 2rem;
}

.btn-cancel, .btn-save {
  flex: 1;
  padding: 0.875rem;
  border-radius: var(--radius-md);
  font-weight: 600;
  cursor: pointer;
  font-family: inherit;
  border: none;
}

.btn-cancel {
  background: var(--bg-secondary);
  color: var(--text-primary);
}

.btn-save {
  background: var(--gradient-primary);
  color: white;
}

.btn-save:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}
</style>
