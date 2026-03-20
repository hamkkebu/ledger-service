import apiClient from './client';
import type { ApiResponse, Ledger, LedgerSummary, LedgerRequest, LedgerMember } from '@/types/ledger.types';

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

  /**
   * 멤버 초대
   */
  async createInvitation(ledgerId: number, data: { inviteeEmail: string; role?: string }): Promise<any> {
    const response = await apiClient.post<ApiResponse<any>>(`${BASE_URL}/${ledgerId}/invitations`, data);
    return response.data.data;
  },

  /**
   * 받은 초대 목록
   */
  async getReceivedInvitations(): Promise<any[]> {
    const response = await apiClient.get<ApiResponse<any[]>>(`${BASE_URL}/invitations/received`);
    return response.data.data;
  },

  /**
   * 초대 수락
   */
  async acceptInvitation(invitationId: number): Promise<any> {
    const response = await apiClient.post<ApiResponse<any>>(`${BASE_URL}/invitations/${invitationId}/accept`);
    return response.data.data;
  },

  /**
   * 초대 거절
   */
  async rejectInvitation(invitationId: number): Promise<any> {
    const response = await apiClient.post<ApiResponse<any>>(`${BASE_URL}/invitations/${invitationId}/reject`);
    return response.data.data;
  },

  /**
   * 보낸 초대 목록
   */
  async getSentInvitations(ledgerId: number): Promise<any[]> {
    const response = await apiClient.get<ApiResponse<any[]>>(`${BASE_URL}/${ledgerId}/invitations`);
    return response.data.data;
  },

  /**
   * 초대 취소
   */
  async cancelInvitation(invitationId: number): Promise<void> {
    await apiClient.delete(`${BASE_URL}/invitations/${invitationId}`);
  },

  /**
   * 가계부 멤버 목록
   */
  async getMembers(ledgerId: number): Promise<LedgerMember[]> {
    const response = await apiClient.get<ApiResponse<LedgerMember[]>>(`${BASE_URL}/${ledgerId}/members`);
    return response.data.data;
  },

  /**
   * 멤버 제거
   */
  async removeMember(ledgerId: number, memberId: number): Promise<void> {
    await apiClient.delete(`${BASE_URL}/${ledgerId}/members/${memberId}`);
  },
};

export default ledgerApi;
