import axios, { AxiosInstance } from 'axios';
import type { ApiResponse } from '@/types/ledger.types';
import type { Transaction, TransactionRequest, TransactionSummary, TransactionPage } from '@/types/transaction.types';

/**
 * 토큰 제공자 (Keycloak에서 토큰 가져오기)
 */
let tokenProvider: (() => Promise<string | null>) | null = null;

/**
 * 토큰 제공자 설정 함수
 */
export function setTransactionTokenProvider(provider: () => Promise<string | null>): void {
  tokenProvider = provider;
}

/**
 * Transaction Service API 클라이언트
 * 별도의 transaction-service 서버로 요청을 보냄
 */
const transactionApiClient: AxiosInstance = axios.create({
  baseURL: process.env.VUE_APP_transactionApiURL || 'http://localhost:8083',
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
});

/**
 * 요청 인터셉터
 */
transactionApiClient.interceptors.request.use(
  async (config) => {
    let token: string | null = null;

    if (tokenProvider) {
      try {
        token = await tokenProvider();
      } catch (error) {
        console.debug('[Transaction API] Token not available');
      }
    }

    if (token && config.headers) {
      config.headers.Authorization = `Bearer ${token}`;
    }

    if (process.env.NODE_ENV === 'development') {
      console.log(`[Transaction API Request] ${config.method?.toUpperCase()} ${config.url}`, config.data);
    }

    return config;
  },
  (error) => {
    console.error('[Transaction API Request Error]', error);
    return Promise.reject(error);
  }
);

/**
 * 응답 인터셉터
 */
transactionApiClient.interceptors.response.use(
  (response) => {
    if (process.env.NODE_ENV === 'development') {
      console.log(`[Transaction API Response] ${response.config.url}`, response.data);
    }
    return response;
  },
  (error) => {
    console.error('[Transaction API Error]', error.response?.data || error.message);
    return Promise.reject(error);
  }
);

const BASE_URL = '/api/v1/transactions';

export const transactionApi = {
  /**
   * 거래 목록 조회 (전체)
   */
  async getTransactions(ledgerId: number): Promise<Transaction[]> {
    const response = await transactionApiClient.get<ApiResponse<Transaction[]>>(`${BASE_URL}/all`, {
      params: { ledgerId },
    });
    return response.data.data;
  },

  /**
   * 거래 목록 조회 (페이징)
   */
  async getTransactionsPage(ledgerId: number, page = 0, size = 20): Promise<TransactionPage> {
    const response = await transactionApiClient.get<ApiResponse<TransactionPage>>(BASE_URL, {
      params: { ledgerId, page, size },
    });
    return response.data.data;
  },

  /**
   * 거래 상세 조회
   */
  async getTransaction(id: number): Promise<Transaction> {
    const response = await transactionApiClient.get<ApiResponse<Transaction>>(`${BASE_URL}/${id}`);
    return response.data.data;
  },

  /**
   * 거래 요약 조회
   */
  async getSummary(ledgerId: number): Promise<TransactionSummary> {
    const response = await transactionApiClient.get<ApiResponse<TransactionSummary>>(`${BASE_URL}/summary`, {
      params: { ledgerId },
    });
    return response.data.data;
  },

  /**
   * 거래 생성
   */
  async createTransaction(request: TransactionRequest): Promise<Transaction> {
    const response = await transactionApiClient.post<ApiResponse<Transaction>>(BASE_URL, request);
    return response.data.data;
  },

  /**
   * 거래 수정
   */
  async updateTransaction(id: number, request: TransactionRequest): Promise<Transaction> {
    const response = await transactionApiClient.put<ApiResponse<Transaction>>(`${BASE_URL}/${id}`, request);
    return response.data.data;
  },

  /**
   * 거래 삭제
   */
  async deleteTransaction(id: number): Promise<void> {
    await transactionApiClient.delete(`${BASE_URL}/${id}`);
  },
};

export default transactionApi;
