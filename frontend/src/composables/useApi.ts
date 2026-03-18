import { useState, useCallback } from 'react';
import type { AxiosError } from 'axios';
import type { ApiResponse } from '@/types/api.types';

/**
 * API 호출 상태 관리 Hook
 */
export function useApi<T = any>() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<T | null>(null);

  /**
   * API 호출 실행
   */
  const execute = useCallback(
    async <R = T>(
      apiCall: () => Promise<any>,
      options?: {
        onSuccess?: (data: R) => void;
        onError?: (error: string) => void;
        showError?: boolean;
      }
    ): Promise<R | null> => {
      setLoading(true);
      setError(null);

      try {
        const response = await apiCall();
        const result = response.data as ApiResponse<R>;

        if (result.success) {
          // 성공 응답 처리 (data가 없어도 성공으로 처리)
          setData(result.data as any);
          options?.onSuccess?.(result.data as R);
          return result.data || null;
        } else {
          // 실패 응답 처리
          const errorMsg = result.error?.message || '알 수 없는 오류가 발생했습니다.';
          setError(errorMsg);
          options?.onError?.(errorMsg);
          return null;
        }
      } catch (err) {
        const axiosError = err as AxiosError<ApiResponse<any>>;
        const errorMsg =
          axiosError.response?.data?.error?.message ||
          axiosError.message ||
          '요청 처리 중 오류가 발생했습니다.';

        setError(errorMsg);

        if (options?.showError !== false) {
          console.error('[API Error]', errorMsg);
        }

        options?.onError?.(errorMsg);
        return null;
      } finally {
        setLoading(false);
      }
    },
    []
  );

  /**
   * 상태 초기화
   */
  const reset = useCallback(() => {
    setLoading(false);
    setError(null);
    setData(null);
  }, []);

  return {
    loading,
    error,
    data,
    execute,
    reset,
  };
}
