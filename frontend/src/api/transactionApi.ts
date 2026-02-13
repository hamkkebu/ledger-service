import apiClient from './client';
import type { ApiResponse } from '@/types/ledger.types';
import type { Transaction, TransactionRequest, TransactionSummary, TransactionPage, PeriodTransactionSummary } from '@/types/transaction.types';

const BASE_URL = '/api/v1/transactions';

export const transactionApi = {
  /**
   * 거래 목록 조회 (전체)
   */
  async getTransactions(ledgerId: number): Promise<Transaction[]> {
    const response = await apiClient.get<ApiResponse<Transaction[]>>(`${BASE_URL}/all`, {
      params: { ledgerId },
    });
    return response.data.data;
  },

  /**
   * 거래 목록 조회 (페이징)
   */
  async getTransactionsPage(ledgerId: number, page = 0, size = 20): Promise<TransactionPage> {
    const response = await apiClient.get<ApiResponse<TransactionPage>>(BASE_URL, {
      params: { ledgerId, page, size },
    });
    return response.data.data;
  },

  /**
   * 거래 상세 조회
   */
  async getTransaction(id: number): Promise<Transaction> {
    const response = await apiClient.get<ApiResponse<Transaction>>(`${BASE_URL}/${id}`);
    return response.data.data;
  },

  /**
   * 거래 요약 조회
   */
  async getSummary(ledgerId: number): Promise<TransactionSummary> {
    const response = await apiClient.get<ApiResponse<TransactionSummary>>(`${BASE_URL}/summary`, {
      params: { ledgerId },
    });
    return response.data.data;
  },

  /**
   * 거래 생성
   */
  async createTransaction(request: TransactionRequest): Promise<Transaction> {
    const response = await apiClient.post<ApiResponse<Transaction>>(BASE_URL, request);
    return response.data.data;
  },

  /**
   * 거래 수정
   */
  async updateTransaction(id: number, request: TransactionRequest): Promise<Transaction> {
    const response = await apiClient.put<ApiResponse<Transaction>>(`${BASE_URL}/${id}`, request);
    return response.data.data;
  },

  /**
   * 거래 삭제
   */
  async deleteTransaction(id: number): Promise<void> {
    await apiClient.delete(`${BASE_URL}/${id}`);
  },

  // ==================== 기간별 조회 API ====================

  /**
   * 일별 거래 요약 조회
   */
  async getDailySummary(ledgerId: number, date: string): Promise<PeriodTransactionSummary> {
    const response = await apiClient.get<ApiResponse<PeriodTransactionSummary>>(`${BASE_URL}/daily`, {
      params: { ledgerId, date },
    });
    return response.data.data;
  },

  /**
   * 월별 거래 요약 조회
   */
  async getMonthlySummary(ledgerId: number, year: number, month: number): Promise<PeriodTransactionSummary> {
    const response = await apiClient.get<ApiResponse<PeriodTransactionSummary>>(`${BASE_URL}/monthly`, {
      params: { ledgerId, year, month },
    });
    return response.data.data;
  },

  /**
   * 년별 거래 요약 조회
   */
  async getYearlySummary(ledgerId: number, year: number): Promise<PeriodTransactionSummary> {
    const response = await apiClient.get<ApiResponse<PeriodTransactionSummary>>(`${BASE_URL}/yearly`, {
      params: { ledgerId, year },
    });
    return response.data.data;
  },

  /**
   * 기간별 거래 요약 조회
   */
  async getPeriodSummary(ledgerId: number, startDate: string, endDate: string): Promise<PeriodTransactionSummary> {
    const response = await apiClient.get<ApiResponse<PeriodTransactionSummary>>(`${BASE_URL}/period`, {
      params: { ledgerId, startDate, endDate },
    });
    return response.data.data;
  },
};

export default transactionApi;
