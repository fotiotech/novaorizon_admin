'use client'
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
      // map redux state shape to component rows
      const rows: ProductRow[] = productState.allIds.map((id) => {
        const raw = productState.byId[id];
        const attrs = raw.attributes;
        const quantity = attrs.Stock?.Quantity ?? 0;
        const threshold = attrs.Stock?.LowStockThreshold ?? 10;
        const status: "in_stock" | "low_stock" | "out_of_stock" =
          quantity <= 0
            ? "out_of_stock"
            : quantity <= threshold
            ? "low_stock"
            : "in_stock";
        
        const title = attrs["Identification & Branding"]?.Title ?? "";
        const codeField = attrs["Identification & Branding"]["Product Code"];
        const sku = codeField?.value || codeField?.text || raw.sku || "";
        return {
          _id: raw._id,
          productName: title,
          sku,
          stockQuantity: quantity,
          lowStockThreshold: threshold,
          stockStatus: status,
          lastUpdated: raw.updatedAt || raw.createdAt || new Date().toISOString(),
        };
      });

      // calculate stats
      const statsObj: InventoryStats = {
        in_stock: { count: 0, totalStock: 0 },
        low_stock: { count: 0, totalStock: 0 },
        out_of_stock: { count: 0, totalStock: 0 },
        lowStockProducts: [],
      };

      rows.forEach((p) => {
        statsObj[p?.stockStatus].count++;
        statsObj[p.stockStatus].totalStock += p.stockQuantity;
        if (p.stockStatus === "low_stock") statsObj.lowStockProducts.push(p);
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
    // try {
    //   await dispatch(
    //     updateProduct(id, {
    //       stockQuantity: editValues.quantity,
    //       lowStockThreshold: editValues.lowStockThreshold,
    //     })
    //   );
    //   setSnackbar({ open: true, message: "Updated successfully", severity: "success" });
    //   setEditingProduct(null);
    // } catch (err: any) {
    //   setSnackbar({ open: true, message: err.message || "Update failed", severity: "error" });
    // }
  };

  const getStockStatus = (q: number, t: number) => {
    if (q <= 0) return "text-red-500";
    if (q <= t) return "text-yellow-500";
    return "text-green-500";
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
    <div className=" w-full space-y-6">
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

      {/* Inventory Stats Cards */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <Card>
            <CardContent>
              <Typography variant="h6" component="div">
                In Stock
              </Typography>
              <Typography variant="h4">{stats.in_stock?.count}</Typography>
              <Typography color="textSecondary">
                Total Items: {stats.in_stock?.totalStock}
              </Typography>
            </CardContent>
          </Card>
          <Card>
            <CardContent>
              <Typography
                variant="h6"
                component="div"
                className="flex items-center"
              >
                Low Stock
                <Warning className="ml-2 text-yellow-500" />
              </Typography>
              <Typography variant="h4">{stats.low_stock?.count}</Typography>
              <Typography color="textSecondary">
                Items Need Attention
              </Typography>
            </CardContent>
          </Card>
          <Card>
            <CardContent>
              <Typography
                variant="h6"
                component="div"
                className="flex items-center"
              >
                Out of Stock
                <Warning className="ml-2 text-red-500" />
              </Typography>
              <Typography variant="h4">{stats.out_of_stock?.count}</Typography>
              <Typography color="textSecondary">Need Replenishment</Typography>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Low Stock Alerts */}
      {stats && stats.lowStockProducts.length > 0 && (
        <Alert severity="warning" className="mb-6">
          <Typography
            variant="subtitle1"
            component="div"
            className="font-bold mb-2"
          >
            Low Stock Alerts
          </Typography>
          <div className="space-y-2">
            {stats.lowStockProducts.map((product) => (
              <div
                key={product._id}
                className="flex justify-between items-center"
              >
                <Typography variant="body2">{product.productName}</Typography>
                <Typography variant="body2">
                  Stock: {product.stockQuantity} / {product.lowStockThreshold}
                </Typography>
              </div>
            ))}
          </div>
        </Alert>
      )}

      {/* Main Inventory Table */}
      <div className="bg-white dark:bg-gray-800 shadow rounded-lg overflow-auto">
        <div className="">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50 dark:bg-gray-700">
              <tr>
                <th
                  scope="col"
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider"
                >
                  Product
                </th>
                <th
                  scope="col"
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider"
                >
                  SKU
                </th>
                <th
                  scope="col"
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider"
                >
                  Stock Level
                </th>
                <th
                  scope="col"
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider"
                >
                  Low Stock Threshold
                </th>
                <th
                  scope="col"
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider"
                >
                  Status
                </th>
                <th
                  scope="col"
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider"
                >
                  Last Updated
                </th>
                <th
                  scope="col"
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider"
                >
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
              {products.map((product) => {
                const stockLevel = product.stockQuantity;
                const threshold = product.lowStockThreshold;

                return (
                  <tr key={product._id}>
                    <td className="flex-1 min-h-0 bg-white dark:bg-gray-800 shadow rounded-lg overflow-auto">
                      <Typography
                        variant="body2"
                        className="font-medium text-gray-900 dark:text-gray-100"
                      >
                        {product.productName}
                      </Typography>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <Typography
                        variant="body2"
                        className="text-gray-500 dark:text-gray-400"
                      >
                        {product.sku}
                      </Typography>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {editingProduct === product._id ? (
                        <TextField
                          type="number"
                          value={editValues.quantity}
                          onChange={(e) =>
                            setEditValues({
                              ...editValues,
                              quantity: Math.max(
                                0,
                                parseInt(e.target.value) || 0
                              ),
                            })
                          }
                          size="small"
                          label="Stock Level"
                          InputProps={{ inputProps: { min: 0 } }}
                        />
                      ) : (
                        <Typography
                          variant="body2"
                          className={getStockStatus(stockLevel, threshold)}
                        >
                          {stockLevel}
                        </Typography>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {editingProduct === product._id ? (
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
                          label="Low Stock Threshold"
                          InputProps={{ inputProps: { min: 0 } }}
                        />
                      ) : (
                        <Typography
                          variant="body2"
                          className="text-gray-500 dark:text-gray-400"
                        >
                          {threshold}
                        </Typography>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <Typography
                        variant="body2"
                        className={`${
                          stockLevel <= 0
                            ? "text-red-500"
                            : stockLevel <= threshold
                            ? "text-yellow-500"
                            : "text-green-500"
                        }`}
                      >
                        {stockLevel <= 0
                          ? "Out of Stock"
                          : stockLevel <= threshold
                          ? "Low Stock"
                          : "In Stock"}
                      </Typography>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <Typography
                        variant="body2"
                        className="text-gray-500 dark:text-gray-400"
                      >
                        {new Date(product.lastUpdated).toLocaleString()}
                      </Typography>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      {editingProduct === product._id ? (
                        <div className="flex space-x-2">
                          <Tooltip title="Save changes">
                            <span>
                              <IconButton
                                onClick={() => handleSave(product._id)}
                                color="primary"
                                size="small"
                                aria-label="Save changes"
                              >
                                <Typography variant="button">Save</Typography>
                              </IconButton>
                            </span>
                          </Tooltip>
                          <Tooltip title="Cancel editing">
                            <span>
                              <IconButton
                                onClick={() => setEditingProduct(null)}
                                color="default"
                                size="small"
                                aria-label="Cancel editing"
                              >
                                <Typography variant="button">Cancel</Typography>
                              </IconButton>
                            </span>
                          </Tooltip>
                        </div>
                      ) : (
                        <Tooltip title="Edit inventory">
                          <span>
                            <IconButton
                              onClick={() =>
                                handleEdit(product)
                              }
                              color="primary"
                              size="small"
                              aria-label="Edit inventory"
                            >
                              <Edit fontSize="small" />
                            </IconButton>
                          </span>
                        </Tooltip>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
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
