"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { getProductAnalytics } from "@/app/actions/analytic";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  ArcElement,
  Title,
  Tooltip,
  Legend,
  PointElement,
  LineElement,
} from "chart.js";
import { Bar, Doughnut, Line } from "react-chartjs-2";
import { useAppDispatch } from "@/app/hooks";
import { clearProduct, resetProduct } from "@/app/store/slices/productSlice";
import { v4 as uuidv4 } from "uuid";
import { persistor } from "@/app/store/store";

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  ArcElement,
  Title,
  Tooltip,
  Legend,
  PointElement,
  LineElement,
);

interface Product {
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

interface ProductAnalytics {
  totalProducts: number;
  activeProducts: number;
  outOfStock: number;
  lowStock: number;
  productsByStatus: Record<string, number>;
  productsByCategory: Record<string, number>;
  monthlyAdditions: number[];
  recentProducts: Product[];
}

export default function CatalogPage() {
  const dispatch = useAppDispatch();
  const [productData, setProductData] = useState<ProductAnalytics | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const clearStore = async () => {
    try {
      await persistor.purge();
      dispatch(clearProduct());
      dispatch(resetProduct(`temp-${uuidv4()}`));
    } catch (err) {
      console.error("Error during cleanup:", err);
      setError("Failed to redirect. Please try again.");
    }
  };

  useEffect(() => {
    async function fetchProductData() {
      try {
        const data = await getProductAnalytics();
        setProductData(data);
      } catch (err) {
        console.error("Failed to fetch product data:", err);
        setError("Failed to fetch product data");
      } finally {
        setIsLoading(false);
      }
    }
    fetchProductData();
  }, []);

  const statusChartData = {
    labels: productData ? Object.keys(productData.productsByStatus) : [],
    datasets: [
      {
        label: "Products by Status",
        data: productData ? Object.values(productData.productsByStatus) : [],
        backgroundColor: [
          "rgba(75, 192, 192, 0.7)",
          "rgba(255, 99, 132, 0.7)",
          "rgba(255, 206, 86, 0.7)",
        ],
        borderColor: [
          "rgba(75, 192, 192, 1)",
          "rgba(255, 99, 132, 1)",
          "rgba(255, 206, 86, 1)",
        ],
        borderWidth: 1,
      },
    ],
  };

  const monthlyAdditionsData = {
    labels: [
      "Jan",
      "Feb",
      "Mar",
      "Apr",
      "May",
      "Jun",
      "Jul",
      "Aug",
      "Sep",
      "Oct",
      "Nov",
      "Dec",
    ],
    datasets: [
      {
        label: "Monthly Product Additions",
        data: productData?.monthlyAdditions || [],
        fill: false,
        backgroundColor: "rgba(153, 102, 255, 0.2)",
        borderColor: "rgba(153, 102, 255, 1)",
        tension: 0.1,
      },
    ],
  };

  const chartOptions = {
    responsive: true,
    plugins: {
      legend: {
        position: "top" as const,
      },
    },
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-pri-500 mx-auto"></div>
          <p className="mt-4 text-muted-foreground">Loading product data...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <div className="bg-destructive/10 text-destructive p-4 rounded-lg">
            <p className="font-semibold">Error</p>
            <p>{error}</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto">
      <div className="flex flex-col sm:flex-row items-center justify-between py-6 gap-4">
        <h1 className="text-3xl font-bold text-foreground">Catalog Overview</h1>
        <div onClick={clearStore}>
          <Link
            href="/catalog/products/new"
            className="bg-pri-500 hover:bg-pri-600 text-white px-4 py-2 rounded-lg transition-colors"
          >
            + New Product
          </Link>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <div className="bg-card text-card-foreground p-6 rounded-lg shadow-md">
          <div className="flex items-center">
            <div className="rounded-full bg-pri-500/10 text-pri-500 p-3">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
              </svg>
            </div>
            <div className="ml-4">
              <h2 className="text-lg font-semibold text-muted-foreground">Total Products</h2>
              <p className="text-2xl font-bold">{productData?.totalProducts || 0}</p>
            </div>
          </div>
        </div>

        <div className="bg-card text-card-foreground p-6 rounded-lg shadow-md">
          <div className="flex items-center">
            <div className="rounded-full bg-thir-500/10 text-thir-500 p-3">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <div className="ml-4">
              <h2 className="text-lg font-semibold text-muted-foreground">Active Products</h2>
              <p className="text-2xl font-bold">{productData?.activeProducts || 0}</p>
            </div>
          </div>
        </div>

        <div className="bg-card text-card-foreground p-6 rounded-lg shadow-md">
          <div className="flex items-center">
            <div className="rounded-full bg-destructive/10 text-destructive p-3">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </div>
            <div className="ml-4">
              <h2 className="text-lg font-semibold text-muted-foreground">Out of Stock</h2>
              <p className="text-2xl font-bold">{productData?.outOfStock || 0}</p>
            </div>
          </div>
        </div>

        <div className="bg-card text-card-foreground p-6 rounded-lg shadow-md">
          <div className="flex items-center">
            <div className="rounded-full bg-sec-500/10 text-sec-500 p-3">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            </div>
            <div className="ml-4">
              <h2 className="text-lg font-semibold text-muted-foreground">Low Stock</h2>
              <p className="text-2xl font-bold">{productData?.lowStock || 0}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        <div className="bg-card text-card-foreground p-6 rounded-lg shadow-md">
          <h2 className="text-xl font-semibold mb-4">Products by Status</h2>
          <div className="h-80">
            <Doughnut data={statusChartData} options={chartOptions} />
          </div>
        </div>
        <div className="bg-card text-card-foreground p-6 rounded-lg shadow-md">
          <h2 className="text-xl font-semibold mb-4">Monthly Product Additions</h2>
          <div className="h-80">
            <Line data={monthlyAdditionsData} options={chartOptions} />
          </div>
        </div>
      </div>

      {/* Recent Products Table (no filter) */}
      <div className="bg-card text-card-foreground p-6 rounded-lg shadow-md">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-semibold">Recent Products</h2>
          <Link href="/catalog/products" className="text-sm text-primary hover:text-primary/80 transition-colors">
            View All Products
          </Link>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-border">
            <thead className="bg-muted/50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">Product</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">SKU</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">Price</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">Stock Status</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">Category</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="bg-card divide-y divide-border">
              {productData?.recentProducts?.length ? (
                productData.recentProducts.map((product:any) => (
                  <tr key={product._id}>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className="flex-shrink-0 h-10 w-10">
                          <div className="h-10 w-10 rounded-lg bg-pri-500/10 flex items-center justify-center overflow-hidden">
                            {product.main_image ? (
                              <img src={product.main_image} alt={product.title} className="h-full w-full object-cover" />
                            ) : (
                              <span className="font-medium text-pri-500">{product.title?.charAt(0).toUpperCase() || "P"}</span>
                            )}
                          </div>
                        </div>
                        <div className="ml-4">
                          <div className="text-sm font-medium text-foreground">{product.title || "Untitled Product"}</div>
                          <div className="text-sm text-muted-foreground">{product.model}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-foreground">{product.sku}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-foreground">
                      ${product.sale_price || product.list_price || 0}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full
                        ${product.stock_status?.includes("In Stock") ? "bg-thir-500/20 text-thir-700 dark:text-thir-400"
                        : product.stock_status?.includes("Low Stock") ? "bg-sec-500/20 text-sec-700 dark:text-sec-400"
                        : "bg-destructive/20 text-destructive"}`}>
                        {product.stock_status?.join(", ") || "N/A"}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-pri-500/20 text-pri-700 dark:text-pri-400">
                        {product.category}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <div className="flex space-x-2">
                        <Link href={`/catalog/products/edit?id=${product._id}`} className="text-pri-500 hover:text-pri-600">Edit</Link>
                        <Link href={`/catalog/products/delete?id=${product._id}`} className="text-destructive hover:text-destructive/80">Delete</Link>
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={6} className="px-6 py-4 text-center text-sm text-muted-foreground">No recent products</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}