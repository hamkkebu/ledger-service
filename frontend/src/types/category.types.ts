export type TransactionType = 'INCOME' | 'EXPENSE';

export interface Category {
  categoryId: number;
  ledgerId: number;
  name: string;
  type: TransactionType;
  icon: string | null;
  color: string | null;
  parentId: number | null;
  parentName: string | null;
  createdAt: string;
  updatedAt: string;
  children?: Category[];
}

export interface CategoryRequest {
  name: string;
  type: TransactionType;
  icon?: string;
  color?: string;
  parentId?: number;
}

export interface ApiResponse<T> {
  success: boolean;
  data: T;
  error?: {
    code: string;
    message: string;
  };
}
