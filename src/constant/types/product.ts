// types/product.ts
export interface Product {
  _id: string;
  title: string;
  model: string;
  sku: string;
  sale_price: number;
  list_price: number;
  stock_status: string[];
  main_image: string;
  status: string;
  category: string;
  brand: string;
  createdAt: string;
}

export interface ProductAnalytics {
  totalProducts: number;
  activeProducts: number;
  outOfStock: number;
  lowStock: number;
  productsByStatus: Record<string, number>;
  productsByCategory: Record<string, number>;
  monthlyAdditions: number[];
  recentProducts: Product[];
}