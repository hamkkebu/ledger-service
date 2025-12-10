import apiClient from './client';
import type { ApiResponse, Category, CategoryRequest, TransactionType } from '@/types/category.types';

const BASE_URL = '/api/v1/ledgers';

export const categoryApi = {
  /**
   * 카테고리 목록 조회
   */
  async getCategories(ledgerId: number, type?: TransactionType): Promise<Category[]> {
    const params = type ? { type } : {};
    const response = await apiClient.get<ApiResponse<Category[]>>(
      `${BASE_URL}/${ledgerId}/categories`,
      { params }
    );
    return response.data.data;
  },

  /**
   * 카테고리 상세 조회
   */
  async getCategory(ledgerId: number, categoryId: number): Promise<Category> {
    const response = await apiClient.get<ApiResponse<Category>>(
      `${BASE_URL}/${ledgerId}/categories/${categoryId}`
    );
    return response.data.data;
  },

  /**
   * 카테고리 생성
   */
  async createCategory(ledgerId: number, request: CategoryRequest): Promise<Category> {
    const response = await apiClient.post<ApiResponse<Category>>(
      `${BASE_URL}/${ledgerId}/categories`,
      request
    );
    return response.data.data;
  },

  /**
   * 카테고리 수정
   */
  async updateCategory(ledgerId: number, categoryId: number, request: CategoryRequest): Promise<Category> {
    const response = await apiClient.put<ApiResponse<Category>>(
      `${BASE_URL}/${ledgerId}/categories/${categoryId}`,
      request
    );
    return response.data.data;
  },

  /**
   * 카테고리 삭제
   */
  async deleteCategory(ledgerId: number, categoryId: number): Promise<void> {
    await apiClient.delete(`${BASE_URL}/${ledgerId}/categories/${categoryId}`);
  },

  /**
   * 기본 카테고리 생성
   */
  async createDefaultCategories(ledgerId: number): Promise<void> {
    await apiClient.post(`${BASE_URL}/${ledgerId}/categories/default`);
  },
};

export default categoryApi;
