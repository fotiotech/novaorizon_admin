"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
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
  Avatar,
  Box,
  CircularProgress,
  Tooltip,
} from "@mui/material";
import MoreHorizIcon from "@mui/icons-material/MoreHoriz";

// Define types for better type safety
type AttributeRow = {
  rowId: string;
  parentId: string;
  _id?: string;
  title?: string;
  main_image?: string;
  price?: number;
  currency?: string;
  quantity?: number;
  stock_status?: string;
  short?: string;
  old?: {
    imageUrl?: string;
    name?: string;
    price?: number;
    currency?: string;
    quantity?: number;
    stockStatus?: string;
    short?: string;
  };
};

const Product: React.FC = () => {
  const dispatch = useAppDispatch();
  const products = useAppSelector((state: RootState) => state.product);
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      await dispatch(fetchProducts());
      setLoading(false);
    };
    load();
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
    setSelectedId(null);
  }, []);

  const flattenedProducts: AttributeRow[] = useMemo(() => {
    return products.allIds.flatMap((id) => {
      const product = products.byId[id];
      if (!product) return [];
      const p = product as any;
      const name =
        p.identification_branding?.name || p.basic_informations?.name || "Untitled";
      const media = p?.media_visuals || {};
      const imageUrl = media?.main_image || "";
      const pricing = p.pricing_availability || {};
      const salePrice = pricing.price ?? 0;
      const currency = pricing.currency || "CFA";
      const quantity = pricing.quantity ?? 0;
      const stockStatus = pricing.stock_status || "Unknown";
      const descriptions = p.descriptions || {};
      const shortDesc = descriptions.short || "";

      const attributeRows = product.rootGroup?.flatMap(
        (group: any, gIdx: number) =>
          group.attributes.map((attribute: any, aIdx: number) => ({
            rowId: `${id}-${gIdx}-${aIdx}`,
            parentId: id,
            old: {
              imageUrl,
              name,
              price: salePrice,
              currency,
              quantity,
              stockStatus,
              short: shortDesc,
            },
            ...attribute,
          }))
      );

      return attributeRows || [];
    });
  }, [products]);

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
        <Link href="/products/category" className="btn mt-4">
          Add Product
        </Link>
      </Box>
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between py-4">
        <h2 className="text-lg font-semibold">Products</h2>
        <Link href={"/products/category"} className="btn">
          New
        </Link>
      </div>

      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Image</TableCell>
              <TableCell>Name</TableCell>
              <TableCell>Description</TableCell>
              <TableCell>Price</TableCell>
              <TableCell>Stock</TableCell>
              <TableCell>Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody sx={{ backgroundColor: "#f5f5f5" }}>
            {flattenedProducts?.map(
              ({
                rowId,
                parentId,
                _id,
                title,
                main_image,
                price,
                currency,
                quantity,
                stock_status,
                short,
                old,
              }) => (
                <TableRow key={rowId} hover>
                  <TableCell>
                    <Tooltip title={title ?? old?.name ?? "Product"}>
                      <Avatar
                        src={main_image || old?.imageUrl || ""}
                        alt={title ?? old?.name ?? "Product Image"}
                        variant="rounded"
                      >
                        {((title ?? old?.name) || "P").charAt(0)}
                      </Avatar>
                    </Tooltip>
                  </TableCell>
                  <TableCell>
                    <Box
                      sx={{
                        maxWidth: 200,
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        whiteSpace: "nowrap",
                      }}
                    >
                      <Typography variant="body2">
                        {title ?? old?.name ?? "Untitled Product"}
                      </Typography>
                    </Box>
                  </TableCell>
                  <TableCell>
                    <Box
                      sx={{
                        maxWidth: 300,
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        whiteSpace: "nowrap",
                      }}
                    >
                      <Typography variant="body2">
                        {short ?? old?.short ?? ""}
                      </Typography>
                    </Box>
                  </TableCell>
                  <TableCell>
                    <Typography fontWeight={600}>
                      {price ?? old?.price ?? 0} {currency ?? old?.currency ?? "CFA"}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    {stock_status || old?.stockStatus || "Unknown"} (
                    {quantity ?? old?.quantity ?? 0})
                  </TableCell>
                  <TableCell>
                    <IconButton
                      onClick={(e) => handleMenuOpen(e, parentId)}
                      aria-controls="menu"
                      aria-haspopup="true"
                      aria-label="Product actions"
                      disabled={!parentId}
                    >
                      <MoreHorizIcon />
                    </IconButton>
                  </TableCell>
                </TableRow>
              )
            )}
          </TableBody>
        </Table>
      </TableContainer>

      <Menu
        id="menu"
        anchorEl={anchorEl}
        keepMounted
        open={Boolean(anchorEl)}
        onClose={handleMenuClose}
      >
        <MenuItem
          component={Link}
          href={`/products/category?id=${selectedId}`}
          onClick={handleMenuClose}
        >
          Edit
        </MenuItem>
        <MenuItem
          component={Link}
          href={`/products/delete?id=${selectedId}`}
          onClick={handleMenuClose}
        >
          Delete
        </MenuItem>
      </Menu>
    </div>
  );
};

export default Product;