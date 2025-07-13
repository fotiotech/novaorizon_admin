"use client";

import React, { useEffect, useState } from "react";
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
} from "@mui/material";
import MoreHorizIcon from "@mui/icons-material/MoreHoriz";

const ProductList = () => {
  const dispatch = useAppDispatch();
  const products = useAppSelector((state: RootState) => state.product);
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  useEffect(() => {
    dispatch(fetchProducts());
  }, [dispatch]);

  const handleMenuOpen = (event: React.MouseEvent<HTMLElement>, id: string) => {
    setAnchorEl(event.currentTarget);
    setSelectedId(id);
  };

  const handleMenuClose = () => {
    setAnchorEl(null);
    setSelectedId(null);
  };

  if (!products.allIds.length) {
    return (
      <Typography className="text-center text-gray-500">
        No products found. Please add some products.
      </Typography>
    );
  }

  return (
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
        <TableBody component={Paper} sx={{ backgroundColor: "#d0d0d0" }}>
          {products.allIds.map((id) => {
            const p = products.byId[id];
            if (!p) return null;

            const { name } = p.identification_branding || {};
            const media = p.media_visuals || {};
            const imageUrl = media.main_image || media.gallery?.[0] || null;
            const pricing = p.pricing_availability || {};
            const salePrice = pricing.price;
            const currency = pricing.currency || "";
            const quantity = pricing.quantity;
            const stockStatus = pricing.stock_status || "";
            const descriptions = p.descriptions || {};
            const shortDesc = descriptions.short || "";

            return (
              <TableRow key={id} hover>
                <TableCell>
                  {imageUrl ? (
                    <Avatar src={imageUrl} alt={name || "Product Image"} />
                  ) : (
                    <Avatar>{name?.charAt(0) || "P"}</Avatar>
                  )}
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
                      {name || "Untitled Product"}
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
                    <Typography variant="body2">{shortDesc}</Typography>
                  </Box>
                </TableCell>
                <TableCell>
                  {salePrice != null ? (
                    <Typography fontWeight={600}>
                      {currency} {salePrice}
                    </Typography>
                  ) : (
                    "—"
                  )}
                </TableCell>
                <TableCell>
                  {stockStatus} ({quantity})
                </TableCell>
                <TableCell>
                  <IconButton
                    onClick={(e) => handleMenuOpen(e, id)}
                    aria-controls="menu"
                    aria-haspopup="true"
                  >
                    <MoreHorizIcon />
                  </IconButton>
                  <Menu
                    id="menu"
                    anchorEl={anchorEl}
                    keepMounted
                    open={Boolean(anchorEl) && selectedId === id}
                    onClose={handleMenuClose}
                  >
                    <MenuItem
                      component={Link}
                      href={`/products/list_product?id=${id}`}
                    >
                      Edit
                    </MenuItem>
                    <MenuItem
                      component={Link}
                      href={`/products/delete?id=${id}`}
                    >
                      Delete
                    </MenuItem>
                  </Menu>
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </TableContainer>
  );
};

export default ProductList;
