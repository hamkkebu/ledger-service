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
