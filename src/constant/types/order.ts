export interface OrderAnalytics {
  totalOrders: number;
  totalRevenue: number;
  averageOrderValue: number;
  ordersByStatus: {
    [key: string]: number;
  };
  recentOrders: any[];
}