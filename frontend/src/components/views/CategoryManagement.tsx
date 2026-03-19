import React, { useState, useEffect, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { categoryApi } from '@/api/categoryApi';
import { ledgerApi } from '@/api/ledgerApi';
import type { Category, CategoryRequest, TransactionType } from '@/types/category.types';
import styles from './CategoryManagement.module.css';

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

export default function CategoryManagement() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const ledgerId = parseInt(id || '0', 10);

  const [ledgerName, setLedgerName] = useState('');
  const [categories, setCategories] = useState<Category[]>([]);
  const [activeTab, setActiveTab] = useState<TransactionType>('EXPENSE');
  const [showModal, setShowModal] = useState(false);
  const [isEdit, setIsEdit] = useState(false);
  const [editingCategoryId, setEditingCategoryId] = useState<number | null>(null);

  const [formData, setFormData] = useState<CategoryRequest>({
    name: '',
    type: 'EXPENSE',
    icon: '📁',
    color: '#667eea',
  });

  const filteredCategories = useMemo(() => {
    return categories.filter((c) => c.type === activeTab);
  }, [categories, activeTab]);

  const loadLedger = async () => {
    try {
      const ledger = await ledgerApi.getLedger(ledgerId);
      setLedgerName(ledger.name);
    } catch (error) {
      console.error('Failed to load ledger:', error);
    }
  };

  const loadCategories = async () => {
    try {
      const allCategories = await categoryApi.getCategories(ledgerId);
      setCategories(allCategories);
    } catch (error) {
      console.error('Failed to load categories:', error);
    }
  };

  const openCreateModal = () => {
    setIsEdit(false);
    setEditingCategoryId(null);
    setFormData({
      name: '',
      type: activeTab,
      icon: '📁',
      color: '#667eea',
    });
    setShowModal(true);
  };

  const openEditModal = (category: Category) => {
    setIsEdit(true);
    setEditingCategoryId(category.categoryId);
    setFormData({
      name: category.name,
      type: category.type,
      icon: category.icon || '📁',
      color: category.color || '#667eea',
    });
    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
    setEditingCategoryId(null);
  };

  const saveCategory = async () => {
    try {
      if (isEdit && editingCategoryId) {
        await categoryApi.updateCategory(ledgerId, editingCategoryId, formData);
      } else {
        await categoryApi.createCategory(ledgerId, formData);
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
        await categoryApi.deleteCategory(ledgerId, category.categoryId);
        await loadCategories();
      } catch (error) {
        console.error('Failed to delete category:', error);
      }
    }
  };

  const createDefaultCategories = async () => {
    try {
      await categoryApi.createDefaultCategories(ledgerId);
      await loadCategories();
    } catch (error) {
      console.error('Failed to create default categories:', error);
    }
  };

  const goBack = () => {
    navigate('..');
  };

  useEffect(() => {
    loadLedger();
    loadCategories();
  }, [ledgerId]);

  return (
    <div className={styles['category-management']}>
      {/* Page Header */}
      <div className={styles['page-header']}>
        <div className={styles['header-content']}>
          <button className={styles['back-button']} onClick={goBack}>
            <span className={styles['back-icon']}>←</span>
            돌아가기
          </button>
          <h1 className={styles['page-title']}>카테고리 관리</h1>
          <p className={styles['page-subtitle']}>{ledgerName}</p>
        </div>
      </div>

      <div className={styles['content-wrapper']}>
        {/* Action Bar */}
        <div className={styles['action-bar']}>
          <button className={styles['btn-add']} onClick={openCreateModal}>
            + 카테고리 추가
          </button>
          {categories.length === 0 && (
            <button className={styles['btn-default']} onClick={createDefaultCategories}>
              기본 카테고리 생성
            </button>
          )}
        </div>

        {/* Tabs */}
        <div className={styles.tabs}>
          <button
            className={`${styles.tab} ${activeTab === 'INCOME' ? styles.active : ''}`}
            onClick={() => setActiveTab('INCOME')}
          >
            수입 카테고리
          </button>
          <button
            className={`${styles.tab} ${activeTab === 'EXPENSE' ? styles.active : ''}`}
            onClick={() => setActiveTab('EXPENSE')}
          >
            지출 카테고리
          </button>
        </div>

        {/* Categories Grid */}
        {filteredCategories.length > 0 ? (
          <div className={styles['categories-grid']}>
            {filteredCategories.map((category) => (
              <div key={category.categoryId} className={`${styles['category-card']} glass`}>
                <div
                  className={styles['category-icon']}
                  style={{ backgroundColor: category.color || '#667eea' }}
                >
                  {category.icon || '📁'}
                </div>
                <div className={styles['category-info']}>
                  <h3 className={styles['category-name']}>{category.name}</h3>
                  <span
                    className={`${styles['category-type']} ${
                      category.type.toLowerCase()
                    }`}
                  >
                    {category.type === 'INCOME' ? '수입' : '지출'}
                  </span>
                </div>
                <div className={styles['category-actions']}>
                  <button
                    className={styles['btn-edit']}
                    onClick={() => openEditModal(category)}
                  >
                    수정
                  </button>
                  <button
                    className={styles['btn-delete']}
                    onClick={() => confirmDelete(category)}
                  >
                    삭제
                  </button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className={`${styles['empty-state']} glass`}>
            <div className={styles['empty-icon']}>📂</div>
            <p className={styles['empty-text']}>
              {activeTab === 'INCOME' ? '수입' : '지출'} 카테고리가 없습니다
            </p>
            <button className={styles['btn-add-empty']} onClick={openCreateModal}>
              첫 카테고리 추가하기
            </button>
          </div>
        )}
      </div>

      {/* Modal */}
      {showModal && (
        <div
          className={styles['modal-overlay']}
        >
          <div className={`${styles.modal} glass`}>
            <h2 className={styles['modal-title']}>
              {isEdit ? '카테고리 수정' : '카테고리 추가'}
            </h2>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                saveCategory();
              }}
            >
              <div className={styles['form-group']}>
                <label htmlFor="cat-name">카테고리 이름</label>
                <input
                  id="cat-name"
                  type="text"
                  placeholder="카테고리 이름을 입력하세요"
                  required
                  maxLength={50}
                  value={formData.name}
                  onChange={(e) =>
                    setFormData({ ...formData, name: e.target.value })
                  }
                />
              </div>

              <div className={styles['form-group']}>
                <label>유형</label>
                <div className={styles['type-selector']}>
                  <button
                    type="button"
                    className={`${styles['type-btn']} ${
                      formData.type === 'INCOME' ? styles.active : ''
                    }`}
                    onClick={() => setFormData({ ...formData, type: 'INCOME' })}
                    disabled={isEdit}
                  >
                    수입
                  </button>
                  <button
                    type="button"
                    className={`${styles['type-btn']} ${
                      formData.type === 'EXPENSE' ? styles.active : ''
                    }`}
                    onClick={() => setFormData({ ...formData, type: 'EXPENSE' })}
                    disabled={isEdit}
                  >
                    지출
                  </button>
                </div>
              </div>

              <div className={styles['form-group']}>
                <label>아이콘</label>
                <div className={styles['icon-selector']}>
                  {availableIcons.map((icon) => (
                    <button
                      key={icon}
                      type="button"
                      className={`${styles['icon-btn']} ${
                        formData.icon === icon ? styles.active : ''
                      }`}
                      onClick={() => setFormData({ ...formData, icon })}
                    >
                      {icon}
                    </button>
                  ))}
                </div>
              </div>

              <div className={styles['form-group']}>
                <label>색상</label>
                <div className={styles['color-selector']}>
                  {availableColors.map((color) => (
                    <button
                      key={color}
                      type="button"
                      className={`${styles['color-btn']} ${
                        formData.color === color ? styles.active : ''
                      }`}
                      style={{ backgroundColor: color }}
                      onClick={() => setFormData({ ...formData, color })}
                    ></button>
                  ))}
                </div>
              </div>

              <div className={styles['modal-actions']}>
                <button
                  type="button"
                  className={styles['btn-cancel']}
                  onClick={closeModal}
                >
                  취소
                </button>
                <button
                  type="submit"
                  className={styles['btn-save']}
                  disabled={!formData.name}
                >
                  {isEdit ? '수정' : '추가'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
