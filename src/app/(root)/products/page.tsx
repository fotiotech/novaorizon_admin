"use client";

import React, { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useAppDispatch, useAppSelector } from "@/app/hooks";
import { RootState } from "@/app/store/store";
import { fetchProducts } from "@/fetch/fetchProducts";
import {
  IconButton,
  Typography,
  Box,
  CircularProgress,
  Button,
  Card,
  CardContent,
  Grid,
  Menu,
  MenuItem,
  Avatar,
} from "@mui/material";
import MoreHorizIcon from "@mui/icons-material/MoreHoriz";

const Product: React.FC = () => {
  const dispatch = useAppDispatch();
  const products = useAppSelector((state: RootState) => state.product);
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadProducts = async () => {
      setLoading(true);
      try {
        await dispatch(fetchProducts());
      } catch (error) {
        console.error("Failed to fetch products:", error);
      } finally {
        setLoading(false);
      }
    };
    loadProducts();
  }, [dispatch]);

  const handleMenuOpen = useCallback(
    (event: React.MouseEvent<HTMLElement>, id: string) => {
      setAnchorEl(event.currentTarget);
      setSelectedId(id);
    },
    []
  );

  const handleMenuClose = useCallback(() => {
    setAnchorEl(null);
  }, []);

  const handleMenuAction = useCallback(
    (_?: React.MouseEvent<HTMLElement>, action?: "edit" | "delete") => {
      setAnchorEl(null);
      if (action === "edit" && selectedId) {
        window.location.href = `/products/category?id=${selectedId}`;
      } else if (action === "delete" && selectedId) {
        window.location.href = `/products/delete?id=${selectedId}`;
      }
    },
    [selectedId]
  );

  if (loading) {
    return (
      <Box className="flex justify-center py-16">
        <CircularProgress size={48} />
      </Box>
    );
  }

  if (!products.allIds.length) {
    return (
      <Box className="text-center py-20 px-4">
        <Typography color="textSecondary" variant="h6" gutterBottom>
          No products found
        </Typography>
        <Typography variant="body2" color="textSecondary">
          Start by creating your first product.
        </Typography>
        <Link href="/products/category" passHref>
          <Button
            variant="contained"
            sx={{ mt: 4, borderRadius: 3, textTransform: "none", px: 4 }}
          >
            Add Product
          </Button>
        </Link>
      </Box>
    );
  }

  return (
    <Box>
      <Box className="flex flex-col sm:flex-row items-center justify-between py-6 gap-4">
        <Typography variant="h5" fontWeight="700">
          Products
        </Typography>
        <Link href="/products/category" passHref>
          <Button
            variant="contained"
            color="primary"
            sx={{ borderRadius: 3, textTransform: "none", px: 3 }}
          >
            + New Product
          </Button>
        </Link>
      </Box>

      <Grid container spacing={3}>
        {products.allIds.map((id) => {
          const product = products.byId[id] as any;
          if (!product) return null;

          return (
            <Grid item xs={12} sm={6} md={4} key={product._id}>
              <Card sx={{ borderRadius: 4, boxShadow: 3, height: "100%" }}>
                <CardContent className="flex flex-col gap-4">
                  <Box className="flex items-center justify-between">
                    <Typography variant="h6" noWrap>
                      {product.title || "Untitled Product"}
                    </Typography>
                    <IconButton onClick={(e) => handleMenuOpen(e, product._id)}>
                      <MoreHorizIcon />
                    </IconButton>
                  </Box>

                  <Box className="flex items-center gap-3">
                    <Avatar
                      src={product.main_image || "/placeholder.png"}
                      alt={product.title || "Product Image"}
                      sx={{ width: 56, height: 56, borderRadius: 2 }}
                      variant="square"
                    />
                    <Box>
                      <Typography variant="body1" fontWeight="600">
                        {product.model}
                      </Typography>
                      <Typography variant="body2" color="textSecondary">
                        SKU: {product.sku}
                      </Typography>
                    </Box>
                  </Box>

                  <Box className="flex flex-col gap-1 mt-2">
                    <Typography variant="body2" color="textSecondary">
                      Price: {product.sale_price || product.list_price}
                    </Typography>
                    <Typography variant="body2" color="textSecondary">
                      Stock: {product.stock_status?.join(", ") || "N/A"}
                    </Typography>
                  </Box>
                </CardContent>
              </Card>
            </Grid>
          );
        })}
      </Grid>

      <Menu
        anchorEl={anchorEl}
        open={Boolean(anchorEl)}
        onClose={handleMenuClose}
      >
        <MenuItem onClick={(e) => handleMenuAction(e, "edit")}>Edit</MenuItem>
        <MenuItem onClick={(e) => handleMenuAction(e, "delete")}>
          Delete
        </MenuItem>
      </Menu>
    </Box>
  );
};

export default Product;
