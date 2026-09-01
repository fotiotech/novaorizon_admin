// app/inventory/page.tsx

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
import { fetchProducts, updateProductStock } from "@/fetch/fetchProducts";

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
  const [saving, setSaving] = useState(false);
  const [snackbar, setSnackbar] = useState({
    open: false,
    message: "",
    severity: "success" as "success" | "error",
  });

  useEffect(() => {
    setLoading(true);
    dispatch(fetchProducts())
      .then(() => setLoading(false))
      .catch((err) => {
        setError(err.message || "Failed to fetch products");
        setLoading(false);
      });
  }, [dispatch]);

  useEffect(() => {
    if (!productState.allIds.length) {
      setProducts([]);
      setStats(null);
      return;
    }

    try {
      const rows: ProductRow[] = productState.allIds.map((id) => {
        const p = productState.byId[id];
        const quantity = p.quantity ?? 0;
        const threshold = p.lowStockThreshold ?? 10;
        const status: ProductRow["stockStatus"] =
          quantity <= 0
            ? "out_of_stock"
            : quantity <= threshold
              ? "low_stock"
              : "in_stock";

        const productName = p.name || p.title || "";
        const sku = p.sku || "";

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
    setSaving(true);
    try {
      const result = await dispatch(
        updateProductStock(
          id,
          editValues.quantity,
          editValues.lowStockThreshold,
        ),
      );

      if (result.success) {
        setSnackbar({
          open: true,
          message: "Product updated successfully",
          severity: "success",
        });
        setEditingProduct(null);
      } else {
        throw new Error(result.error || "Update failed");
      }
    } catch (err: any) {
      setSnackbar({
        open: true,
        message: err.message || "Failed to update product",
        severity: "error",
      });
      await dispatch(fetchProducts());
    } finally {
      setSaving(false);
    }
  };

  // Theme-aware stock status helper
  const getStockStatusClass = (quantity: number, threshold: number) => {
    if (quantity <= 0) return "text-destructive font-medium";
    if (quantity <= threshold) return "text-accent font-medium";
    return "text-secondary font-medium";
  };

  const getStockLabel = (status: ProductRow["stockStatus"]) => {
    switch (status) {
      case "in_stock":
        return "In Stock";
      case "low_stock":
        return "Low Stock";
      case "out_of_stock":
        return "Out of Stock";
      default:
        return status;
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-[200px]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="w-full space-y-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-foreground">
          Inventory Management
        </h1>
      </div>

      <Snackbar
        open={snackbar.open}
        autoHideDuration={6000}
        onClose={handleCloseSnackbar}
      >
        <Alert
          onClose={handleCloseSnackbar}
          severity={snackbar.severity}
          className="w-full"
        >
          {snackbar.message}
        </Alert>
      </Snackbar>

      {error && (
        <div className="bg-destructive/10 border border-destructive/20 text-destructive px-4 py-3 rounded-lg">
          <strong>Error:</strong> {error}
        </div>
      )}

      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <Card className="bg-card text-card-foreground shadow-md border border-border">
            <CardContent>
              <Typography variant="h6" className="text-foreground">
                In Stock
              </Typography>
              <Typography variant="h4" className="text-foreground font-bold">
                {stats.in_stock.count}
              </Typography>
              <Typography variant="body2" className="text-muted-foreground">
                Total Items: {stats.in_stock.totalStock}
              </Typography>
            </CardContent>
          </Card>
          <Card className="bg-card text-card-foreground shadow-md border border-border">
            <CardContent>
              <Typography
                variant="h6"
                className="flex items-center text-foreground"
              >
                Low Stock <Warning className="ml-2 text-accent" />
              </Typography>
              <Typography variant="h4" className="text-foreground font-bold">
                {stats.low_stock.count}
              </Typography>
              <Typography variant="body2" className="text-muted-foreground">
                Items Need Attention
              </Typography>
            </CardContent>
          </Card>
          <Card className="bg-card text-card-foreground shadow-md border border-border">
            <CardContent>
              <Typography
                variant="h6"
                className="flex items-center text-foreground"
              >
                Out of Stock <Warning className="ml-2 text-destructive" />
              </Typography>
              <Typography variant="h4" className="text-foreground font-bold">
                {stats.out_of_stock.count}
              </Typography>
              <Typography variant="body2" className="text-muted-foreground">
                Need Replenishment
              </Typography>
            </CardContent>
          </Card>
        </div>
      )}

      {stats && stats.lowStockProducts.length > 0 && (
        <div className="bg-accent/10 border border-accent/20 text-accent px-4 py-3 rounded-lg mb-6">
          <Typography
            variant="subtitle1"
            className="font-bold mb-2 text-accent"
          >
            Low Stock Alerts
          </Typography>
          <div className="space-y-2">
            {stats.lowStockProducts.map((p) => (
              <div key={p._id} className="flex justify-between items-center">
                <Typography variant="body2" className="text-foreground">
                  {p.productName}
                </Typography>
                <Typography variant="body2" className="text-muted-foreground">
                  Stock: {p.stockQuantity} / {p.lowStockThreshold}
                </Typography>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="bg-card text-card-foreground shadow-md rounded-lg border border-border overflow-auto">
        <table className="min-w-full divide-y divide-border">
          <thead className="bg-muted">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                Product
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                SKU
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                Stock Level
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                Threshold
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                Status
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                Last Updated
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border bg-card">
            {products.map((prod) => (
              <tr key={prod._id}>
                <td className="px-6 py-4 whitespace-nowrap">
                  <Typography
                    variant="body2"
                    className="font-medium text-foreground"
                  >
                    {prod.productName}
                  </Typography>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <Typography variant="body2" className="text-muted-foreground">
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
                      disabled={saving}
                      className="w-20"
                      inputProps={{
                        className: "text-foreground bg-background",
                      }}
                    />
                  ) : (
                    <span
                      className={getStockStatusClass(
                        prod.stockQuantity,
                        prod.lowStockThreshold,
                      )}
                    >
                      {prod.stockQuantity}
                    </span>
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
                            parseInt(e.target.value) || 0,
                          ),
                        })
                      }
                      size="small"
                      disabled={saving}
                      className="w-20"
                      inputProps={{
                        className: "text-foreground bg-background",
                      }}
                    />
                  ) : (
                    <span className="text-muted-foreground">
                      {prod.lowStockThreshold}
                    </span>
                  )}
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span
                    className={getStockStatusClass(
                      prod.stockQuantity,
                      prod.lowStockThreshold,
                    )}
                  >
                    {getStockLabel(prod.stockStatus)}
                  </span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <Typography variant="body2" className="text-muted-foreground">
                    {new Date(prod.lastUpdated).toLocaleString()}
                  </Typography>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                  {editingProduct === prod._id ? (
                    <div className="flex space-x-2">
                      <button
                        onClick={() => handleSave(prod._id)}
                        disabled={saving}
                        className="px-2 py-1 text-xs font-medium bg-primary text-primary-foreground rounded hover:bg-primary/80 transition-colors disabled:opacity-50"
                      >
                        {saving ? "Saving..." : "Save"}
                      </button>
                      <button
                        onClick={() => setEditingProduct(null)}
                        disabled={saving}
                        className="px-2 py-1 text-xs font-medium bg-muted text-muted-foreground rounded hover:bg-muted/80 transition-colors disabled:opacity-50"
                      >
                        Cancel
                      </button>
                    </div>
                  ) : (
                    <Tooltip title="Edit inventory">
                      <IconButton onClick={() => handleEdit(prod)} size="small">
                        <Edit
                          fontSize="small"
                          className="text-primary hover:text-primary/80"
                        />
                      </IconButton>
                    </Tooltip>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default InventoryPage;
