import { useState, useMemo, useCallback } from 'react';
import type { PageRequest, PageResponse } from '@/types/api.types';

/**
 * 페이지네이션 관리 Hook
 */
export function usePagination<T>(initialPageSize = 20) {
  const [currentPage, setCurrentPage] = useState(0);
  const [pageSize, setPageSize] = useState(initialPageSize);
  const [totalPages, setTotalPages] = useState(0);
  const [totalElements, setTotalElements] = useState(0);
  const [sortBy, setSortBy] = useState<string | undefined>(undefined);
  const [direction, setDirection] = useState<'asc' | 'desc'>('asc');

  /**
   * 페이지 요청 객체
   */
  const pageRequest = useMemo<PageRequest>(() => ({
    page: currentPage,
    size: pageSize,
    sortBy,
    direction,
  }), [currentPage, pageSize, sortBy, direction]);

  /**
   * 첫 페이지 여부
   */
  const isFirstPage = useMemo(() => currentPage === 0, [currentPage]);

  /**
   * 마지막 페이지 여부
   */
  const isLastPage = useMemo(() => currentPage >= totalPages - 1, [currentPage, totalPages]);

  /**
   * 페이지 범위 (페이지네이션 UI용)
   */
  const pageRange = useMemo(() => {
    const range: number[] = [];
    const maxPages = 5; // 표시할 최대 페이지 번호 개수
    let start = Math.max(0, currentPage - Math.floor(maxPages / 2));
    let end = Math.min(totalPages, start + maxPages);

    if (end - start < maxPages) {
      start = Math.max(0, end - maxPages);
    }

    for (let i = start; i < end; i++) {
      range.push(i);
    }

    return range;
  }, [currentPage, totalPages]);

  /**
   * 페이지 응답 업데이트
   */
  const updateFromResponse = useCallback((response: PageResponse<T>) => {
    setTotalPages(response.totalPages);
    setTotalElements(response.totalElements);
    setCurrentPage(response.page);  // ✅ number → page로 수정 (Backend와 일치)
  }, []);

  /**
   * 페이지 변경
   */
  const goToPage = useCallback((page: number) => {
    if (page >= 0 && page < totalPages) {
      setCurrentPage(page);
    }
  }, [totalPages]);

  /**
   * 다음 페이지
   */
  const nextPage = useCallback(() => {
    setCurrentPage(prev => {
      if (prev >= totalPages - 1) {
        return prev;
      }
      return prev + 1;
    });
  }, [totalPages]);

  /**
   * 이전 페이지
   */
  const previousPage = useCallback(() => {
    setCurrentPage(prev => {
      if (prev === 0) {
        return prev;
      }
      return prev - 1;
    });
  }, []);

  /**
   * 첫 페이지로
   */
  const firstPage = useCallback(() => {
    setCurrentPage(0);
  }, []);

  /**
   * 마지막 페이지로
   */
  const lastPage = useCallback(() => {
    setCurrentPage(totalPages - 1);
  }, [totalPages]);

  /**
   * 정렬 변경
   */
  const changeSort = useCallback((field: string, dir?: 'asc' | 'desc') => {
    setSortBy(field);
    setDirection(dir || (direction === 'asc' ? 'desc' : 'asc'));
    setCurrentPage(0); // 정렬 변경 시 첫 페이지로
  }, [direction]);

  /**
   * 페이지 크기 변경
   */
  const changePageSize = useCallback((size: number) => {
    setPageSize(size);
    setCurrentPage(0); // 페이지 크기 변경 시 첫 페이지로
  }, []);

  /**
   * 초기화
   */
  const reset = useCallback(() => {
    setCurrentPage(0);
    setTotalPages(0);
    setTotalElements(0);
    setSortBy(undefined);
    setDirection('asc');
  }, []);

  return {
    currentPage,
    pageSize,
    totalPages,
    totalElements,
    sortBy,
    direction,
    pageRequest,
    isFirstPage,
    isLastPage,
    pageRange,
    updateFromResponse,
    goToPage,
    nextPage,
    previousPage,
    firstPage,
    lastPage,
    changeSort,
    changePageSize,
    reset,
  };
}
