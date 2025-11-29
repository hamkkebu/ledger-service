export interface Ledger {
  ledgerId: number;
  userId: number;
  name: string;
  description: string | null;
  currency: string;
  isDefault: boolean;
  createdAt: string;
  updatedAt: string;
  totalIncome: number;
  totalExpense: number;
  balance: number;
  transactionCount: number;
}

export interface LedgerSummary {
  userId: number;
  username: string;
  totalLedgerCount: number;
  totalIncome: number;
  totalExpense: number;
  totalBalance: number;
  ledgers: Ledger[];
}

export interface LedgerRequest {
  name: string;
  description?: string;
  currency?: string;
  isDefault?: boolean;
}

export interface ApiResponse<T> {
  success: boolean;
  data: T;
  error?: {
    code: string;
    message: string;
  };
}
