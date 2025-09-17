// @/types/finance.ts

export interface Order {
  _id: string;
  orderNumber: string;
  userId: string;
  items: OrderItem[];
  totalAmount: number;
  tax: number;
  shippingCost: number;
  discount: number;
  paymentStatus: 'pending' | 'paid' | 'refunded' | 'failed';
  shippingStatus: 'pending' | 'processing' | 'shipped' | 'delivered' | 'cancelled';
  orderStatus: 'processing' | 'completed' | 'cancelled';
  paymentMethod: string;
  shippingAddress: ShippingAddress;
  paymentDate?: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface OrderItem {
  product: string;
  quantity: number;
  price: number;
  name?: string;
}

export interface ShippingAddress {
  street: string;
  city: string;
  region: string;
  address: string;
  country: string;
  carrier: string;
}

export interface Transaction {
  _id: string;
  orderId: string;
  userId?: {
    _id: string;
    name: string;
    email: string;
  };
  amount: number;
  type: 'income' | 'expense' | 'refund';
  description: string;
  status: 'completed' | 'pending' | 'failed' | 'refunded';
  paymentMethod: string;
  date: Date;
  createdAt: Date;
}

export interface Expense {
  _id: string;
  category: string;
  description: string;
  amount: number;
  date: Date;
  receipt: string;
  status: 'pending' | 'approved' | 'rejected';
  createdBy: string;
  createdAt: Date;
}

export interface FinancialStats {
  totalRevenue: number;
  totalOrders: number;
  avgOrderValue: number;
  refunds: number;
}

export interface ChartData {
  revenue: RevenueData[];
  expenses: ExpenseData[];
}

export interface RevenueData {
  name: string;
  revenue: number;
  count: number;
}

export interface ExpenseData {
  name: string;
  value: number;
}

export interface TransactionFilters {
  status?: string;
  search?: string;
}

export interface TimeRange {
  range: 'week' | 'month' | 'quarter' | 'year';
}

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
}