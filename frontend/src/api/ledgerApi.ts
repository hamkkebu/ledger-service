import apiClient from './client';
import type { ApiResponse, Ledger, LedgerSummary, LedgerRequest } from '@/types/ledger.types';

const BASE_URL = '/api/v1/ledgers';

export const ledgerApi = {
  /**
   * 가계부 현황 조회
   */
  async getSummary(): Promise<LedgerSummary> {
    const response = await apiClient.get<ApiResponse<LedgerSummary>>(`${BASE_URL}/summary`);
    return response.data.data;
  },

  /**
   * 가계부 목록 조회
   */
  async getLedgers(): Promise<Ledger[]> {
    const response = await apiClient.get<ApiResponse<Ledger[]>>(BASE_URL);
    return response.data.data;
  },

  /**
   * 가계부 상세 조회
   */
  async getLedger(ledgerId: number): Promise<Ledger> {
    const response = await apiClient.get<ApiResponse<Ledger>>(`${BASE_URL}/${ledgerId}`);
    return response.data.data;
  },

  /**
   * 가계부 생성
   */
  async createLedger(request: LedgerRequest): Promise<Ledger> {
    const response = await apiClient.post<ApiResponse<Ledger>>(BASE_URL, request);
    return response.data.data;
  },

  /**
   * 가계부 수정
   */
  async updateLedger(ledgerId: number, request: LedgerRequest): Promise<Ledger> {
    const response = await apiClient.put<ApiResponse<Ledger>>(`${BASE_URL}/${ledgerId}`, request);
    return response.data.data;
  },

  /**
   * 가계부 삭제
   */
  async deleteLedger(ledgerId: number): Promise<void> {
    await apiClient.delete(`${BASE_URL}/${ledgerId}`);
  },
};

export default ledgerApi;
