export type TransactionType = 'INCOME' | 'EXPENSE';

export interface Transaction {
  id: number;
  ledgerId: number;
  userId: number;
  type: TransactionType;
  amount: number;
  description: string | null;
  category: string | null;
  transactionDate: string;
  memo: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface TransactionRequest {
  ledgerId: number;
  type: TransactionType;
  amount: number;
  description?: string;
  category?: string;
  transactionDate: string;
  memo?: string;
}

export interface TransactionSummary {
  ledgerId: number;
  totalIncome: number;
  totalExpense: number;
  balance: number;
  transactionCount: number;
}

export interface TransactionPage {
  content: Transaction[];
  totalElements: number;
  totalPages: number;
  number: number;
  size: number;
  first: boolean;
  last: boolean;
}

// 기간 유형
export type PeriodType = 'DAILY' | 'MONTHLY' | 'YEARLY';

// 기간 상세 요약
export interface PeriodDetail {
  periodLabel: string;
  startDate: string;
  endDate: string;
  income: number;
  expense: number;
  balance: number;
  transactionCount: number;
}

// 기간별 거래 요약
export interface PeriodTransactionSummary {
  ledgerId: number;
  periodType: PeriodType;
  startDate: string;
  endDate: string;
  totalIncome: number;
  totalExpense: number;
  balance: number;
  transactionCount: number;
  transactions: Transaction[];
  periodDetails: PeriodDetail[] | null;
}
