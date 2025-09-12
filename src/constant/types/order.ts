import { OrderDocument } from "@/models/Order";

export interface OrderAnalytics {
  totalOrders: number;
  totalRevenue: number;
  averageOrderValue: number;
  ordersByStatus: {
    [key: string]: number;
  };
  recentOrders: OrderDocument[];
}