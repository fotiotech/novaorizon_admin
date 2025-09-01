"use client";

import React, { useCallback, useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useAppDispatch, useAppSelector } from "@/app/hooks";
import { RootState } from "@/app/store/store";
import { fetchProducts } from "@/fetch/fetchProducts";
import {
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  IconButton,
  Paper,
  Menu,
  MenuItem,
  Typography,
  Box,
  CircularProgress,
  Avatar,
} from "@mui/material";
import MoreHorizIcon from "@mui/icons-material/MoreHoriz";

interface ProductAttribute {
  _id: string;
  main_image?: string;
  title?: string;
}

interface ProductGroup {
  _id: string;
  code: string;
  attributes?: ProductAttribute[];
}

interface Product {
  _id: string;
  rootGroup?: ProductGroup[];
}

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
    (event?: React.MouseEvent<HTMLElement>, action?: "edit" | "delete") => {
      setAnchorEl(null);
      if (action === "edit" && selectedId) {
        window.location.href = `/products/category?id=${selectedId}`;
      } else if (action === "delete" && selectedId) {
        // Implement delete functionality here
        window.location.href = `/products/delete?id=${selectedId}`;
      }
    },
    [selectedId]
  );

  const renderProductImage = (attribute: ProductAttribute) => {
    const { main_image } = attribute;

    return (
      main_image && (
        <Box key={main_image} className="p-2 bg-white rounded shadow m-1">
          <Avatar
            src={main_image}
            alt="Product Image"
            sx={{ width: 60, height: 60 }}
            variant="rounded"
          >
            {!main_image && (
              <Image src="/fallback-image.png" fill alt="Fallback" />
            )}
          </Avatar>
        </Box>
      )
    );
  };

  const renderProductInfo = (attribute: ProductAttribute) => {
    const { title } = attribute;
    return (
      title && (
        <Box key={title} className="p-2 m-1">
          <Typography variant="body2" className="font-medium">
            {title || "No Title"}
          </Typography>
        </Box>
      )
    );
  };

  if (loading) {
    return (
      <Box className="flex justify-center py-6">
        <CircularProgress />
      </Box>
    );
  }

  if (!products.allIds.length) {
    return (
      <Box className="text-center py-10">
        <Typography color="textSecondary">
          No products found. Please add some products.
        </Typography>
        <Link href="/products/category" className="btn mt-4 inline-block">
          Add Product
        </Link>
      </Box>
    );
  }

  return (
    <Box>
      <Box className="flex items-center justify-between py-4">
        <Typography variant="h6" component="h2" fontWeight="semibold">
          Products
        </Typography>
        <Link href="/products/category" className="btn">
          New
        </Link>
      </Box>

      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Images</TableCell>
              <TableCell>Product Information</TableCell>
              <TableCell align="right">Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {products.allIds.map((id) => {
              const product = products.byId[id] as Product | undefined;
              if (!product) return null;

              // Extract attributes based on group code
              const basicInfoAttrs =
                product.rootGroup?.flatMap((group) =>
                  group.code === "basic_informations"
                    ? group.attributes || []
                    : []
                ) || [];

              const mediaAttrs =
                product.rootGroup?.flatMap((group) =>
                  group.code === "media_visuals" ? group.attributes || [] : []
                ) || [];

              return (
                <TableRow key={product._id} hover className="text-black">
                  <TableCell>
                    <Box className="flex flex-col gap-2 overflow-x-auto">
                      {mediaAttrs
                        .filter((attr) => attr !== null && attr !== undefined)
                        .map((a) => renderProductImage(a))}
                    </Box>
                  </TableCell>
                  <TableCell>
                    <Box className="flex flex-col gap-2">
                      {basicInfoAttrs
                        .filter((attr) => attr !== null && attr !== undefined)
                        .map((a) => renderProductInfo(a))}
                    </Box>
                  </TableCell>

                  <TableCell align="right">
                    <IconButton
                      onClick={(e) => handleMenuOpen(e, product._id)}
                      size="large"
                    >
                      <MoreHorizIcon />
                    </IconButton>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </TableContainer>

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
