"use client";
import React, { useEffect, useState } from "react";
import { Edit, Warning } from "@mui/icons-material";
import {
  Card,
  CardContent,
  Typography,
  CircularProgress,
  Box,
  Alert,
  IconButton,
  TextField,
  Tooltip,
  Snackbar,
} from "@mui/material";
import { useAppDispatch, useAppSelector } from "@/app/hooks";
import { RootState } from "@/app/store/store";
import { fetchProducts } from "@/fetch/fetchProducts";

interface ProductRow {
  _id: string;
  productName: string;
  sku: string;
  stockQuantity: number;
  lowStockThreshold: number;
  stockStatus: "in_stock" | "low_stock" | "out_of_stock";
  lastUpdated: string;
}

interface StatsData {
  count: number;
  totalStock: number;
}

interface InventoryStats {
  in_stock: StatsData;
  low_stock: StatsData;
  out_of_stock: StatsData;
  lowStockProducts: ProductRow[];
}

const InventoryPage: React.FC = () => {
  const dispatch = useAppDispatch();
  const productState = useAppSelector((state: RootState) => state.product);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editingProduct, setEditingProduct] = useState<string | null>(null);
  const [editValues, setEditValues] = useState({
    quantity: 0,
    lowStockThreshold: 0,
  });
  const [products, setProducts] = useState<ProductRow[]>([]);
  const [stats, setStats] = useState<InventoryStats | null>(null);
  const [snackbar, setSnackbar] = useState({
    open: false,
    message: "",
    severity: "success" as "success" | "error",
  });

  useEffect(() => {
    dispatch(fetchProducts());
  }, [dispatch]);

  useEffect(() => {
    if (!productState.allIds.length) return;

    setLoading(true);
    try {
      const rows: ProductRow[] = productState.allIds.map((id) => {
        const p = productState.byId[id];
        console.log({ p });

        const quantity = p.quantity ?? 0;
        const threshold = 10; // default threshold, can be customized later

        const status: ProductRow["stockStatus"] =
          quantity <= 0
            ? "out_of_stock"
            : quantity <= threshold
            ? "low_stock"
            : "in_stock";

        const productName = p.title || "";
        const sku = p.sku || p.code_value || "";

        return {
          _id: p._id,
          productName,
          sku,
          stockQuantity: quantity,
          lowStockThreshold: threshold,
          stockStatus: status,
          lastUpdated:
            p.updatedAt?.toString() ||
            p.createdAt?.toString() ||
            new Date().toISOString(),
        };
      });

      const statsObj: InventoryStats = {
        in_stock: { count: 0, totalStock: 0 },
        low_stock: { count: 0, totalStock: 0 },
        out_of_stock: { count: 0, totalStock: 0 },
        lowStockProducts: [],
      };

      rows.forEach((prod) => {
        statsObj[prod.stockStatus].count++;
        statsObj[prod.stockStatus].totalStock += prod.stockQuantity;
        if (prod.stockStatus === "low_stock")
          statsObj.lowStockProducts.push(prod);
      });

      setProducts(rows);
      setStats(statsObj);
      setError(null);
    } catch (err: any) {
      setError(err.message || "Failed to map inventory");
    } finally {
      setLoading(false);
    }
  }, [productState]);

  const handleCloseSnackbar = () => {
    setSnackbar({ ...snackbar, open: false });
  };

  const handleEdit = (product: ProductRow) => {
    setEditingProduct(product._id);
    setEditValues({
      quantity: product.stockQuantity,
      lowStockThreshold: product.lowStockThreshold,
    });
  };

  const handleSave = async (id: string) => {
    // Implement update dispatch here
  };

  if (loading) {
    return (
      <Box
        display="flex"
        justifyContent="center"
        alignItems="center"
        minHeight="64px"
      >
        <CircularProgress />
      </Box>
    );
  }

  return (
    <div className="w-full space-y-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Inventory Management</h1>
      </div>

      <Snackbar
        open={snackbar.open}
        autoHideDuration={6000}
        onClose={handleCloseSnackbar}
      >
        <Alert
          onClose={handleCloseSnackbar}
          severity={snackbar.severity}
          sx={{ width: "100%" }}
        >
          {snackbar.message}
        </Alert>
      </Snackbar>

      {error && (
        <Alert severity="error" className="mb-4">
          {error}
        </Alert>
      )}

      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <Card>
            <CardContent>
              <Typography variant="h6">In Stock</Typography>
              <Typography variant="h4">{stats.in_stock.count}</Typography>
              <Typography color="textSecondary">
                Total Items: {stats.in_stock.totalStock}
              </Typography>
            </CardContent>
          </Card>
          <Card>
            <CardContent>
              <Typography variant="h6" className="flex items-center">
                Low Stock <Warning className="ml-2 text-yellow-500" />
              </Typography>
              <Typography variant="h4">{stats.low_stock.count}</Typography>
              <Typography color="textSecondary">
                Items Need Attention
              </Typography>
            </CardContent>
          </Card>
          <Card>
            <CardContent>
              <Typography variant="h6" className="flex items-center">
                Out of Stock <Warning className="ml-2 text-red-500" />
              </Typography>
              <Typography variant="h4">{stats.out_of_stock.count}</Typography>
              <Typography color="textSecondary">Need Replenishment</Typography>
            </CardContent>
          </Card>
        </div>
      )}

      {stats && stats.lowStockProducts.length > 0 && (
        <Alert severity="warning" className="mb-6">
          <Typography variant="subtitle1" className="font-bold mb-2">
            Low Stock Alerts
          </Typography>
          <div className="space-y-2">
            {stats.lowStockProducts.map((p) => (
              <div key={p._id} className="flex justify-between items-center">
                <Typography variant="body2">{p.productName}</Typography>
                <Typography variant="body2">
                  Stock: {p.stockQuantity} / {p.lowStockThreshold}
                </Typography>
              </div>
            ))}
          </div>
        </Alert>
      )}

      <div className="bg-white dark:bg-gray-800 shadow rounded-lg overflow-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50 dark:bg-gray-700">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Product
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                SKU
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Stock Level
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Low Stock Threshold
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Status
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Last Updated
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {products.map((prod) => (
              <tr key={prod._id}>
                <td className="px-6 py-4 whitespace-nowrap">
                  <Typography variant="body2" className="font-medium">
                    {prod.productName}
                  </Typography>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <Typography variant="body2" className="text-gray-500">
                    {prod.sku}
                  </Typography>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  {editingProduct === prod._id ? (
                    <TextField
                      type="number"
                      value={editValues.quantity}
                      onChange={(e) =>
                        setEditValues({
                          ...editValues,
                          quantity: Math.max(0, parseInt(e.target.value) || 0),
                        })
                      }
                      size="small"
                    />
                  ) : (
                    <Typography
                      variant="body2"
                      className={getStockStatus(
                        prod.stockQuantity,
                        prod.lowStockThreshold
                      )}
                    >
                      {prod.stockQuantity}
                    </Typography>
                  )}
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  {editingProduct === prod._id ? (
                    <TextField
                      type="number"
                      value={editValues.lowStockThreshold}
                      onChange={(e) =>
                        setEditValues({
                          ...editValues,
                          lowStockThreshold: Math.max(
                            0,
                            parseInt(e.target.value) || 0
                          ),
                        })
                      }
                      size="small"
                    />
                  ) : (
                    <Typography variant="body2" className="text-gray-500">
                      {prod.lowStockThreshold}
                    </Typography>
                  )}
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <Typography
                    variant="body2"
                    className={getStockStatus(
                      prod.stockQuantity,
                      prod.lowStockThreshold
                    )}
                  >
                    {prod.stockStatus === "out_of_stock"
                      ? "Out of Stock"
                      : prod.stockStatus === "low_stock"
                      ? "Low Stock"
                      : "In Stock"}
                  </Typography>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <Typography variant="body2" className="text-gray-500">
                    {new Date(prod.lastUpdated).toLocaleString()}
                  </Typography>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                  {editingProduct === prod._id ? (
                    <div className="flex space-x-2">
                      <Tooltip title="Save changes">
                        <IconButton
                          onClick={() => handleSave(prod._id)}
                          size="small"
                        >
                          <Typography variant="button">Save</Typography>
                        </IconButton>
                      </Tooltip>
                      <Tooltip title="Cancel editing">
                        <IconButton
                          onClick={() => setEditingProduct(null)}
                          size="small"
                        >
                          <Typography variant="button">Cancel</Typography>
                        </IconButton>
                      </Tooltip>
                    </div>
                  ) : (
                    <Tooltip title="Edit inventory">
                      <IconButton onClick={() => handleEdit(prod)} size="small">
                        <Edit fontSize="small" />
                      </IconButton>
                    </Tooltip>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <Snackbar
        open={snackbar.open}
        autoHideDuration={6000}
        onClose={handleCloseSnackbar}
        message={snackbar.message}
        anchorOrigin={{ vertical: "top", horizontal: "center" }}
      />
    </div>
  );
};

export default InventoryPage;

// Helper to color status text
function getStockStatus(q: number, t: number) {
  if (q <= 0) return "text-red-500";
  if (q <= t) return "text-yellow-500";
  return "text-green-500";
}
