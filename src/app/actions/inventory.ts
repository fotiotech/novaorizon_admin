"use server";

import Product from "@/models/Product";
import { connection } from "@/utils/connection";
import { revalidatePath } from "next/cache";

export async function getInventory() {
  await connection();
  try {
    const inventoryData = await Product.find(
      {},
      {
        _id: 1,
        title: 1,
        sku: 1,
        stock_quantity: 1,
        low_stock_threshold: 1,
        stock_status: 1,
        last_inventory_update: 1,
      }
    ).lean();

    return inventoryData.map((item:any) => ({
      product_id: item?._id?.toString(),
      productName: item.title,
      sku: item.sku,
      stockQuantity: item.stock_quantity || 0,
      lowStockThreshold: item.low_stock_threshold || 10,
      stockStatus: item.stock_status || "out_of_stock",
      lastUpdated: item.last_inventory_update || new Date(),
    }));
  } catch (error) {
    console.error("Error fetching inventory:", error);
    throw error;
  }
}

export async function updateInventory(
  productId: string,
  updates: {
    quantity: number;
    lowStockThreshold?: number;
  }
) {
  await connection();
  try {
    const product = await Product.findById(productId);
    if (!product) {
      throw new Error("Product not found");
    }

    // Update stock quantity
    product.stockQuantity = updates.quantity;

    // Update low stock threshold if provided
    if (updates.lowStockThreshold !== undefined) {
      product.lowStockThreshold = updates.lowStockThreshold;
    }

    // Update stock status based on quantity
    if (updates.quantity <= 0) {
      product.stockStatus = "out_of_stock";
    } else if (updates.quantity <= (product.lowStockThreshold || 10)) {
      product.stockStatus = "low_stock";
    } else {
      product.stockStatus = "in_stock";
    }

    // Update last inventory update timestamp
    product.lastInventoryUpdate = new Date();

    await product.save();

    // Revalidate the inventory page
    revalidatePath("/inventory");

    return {
      message: "Success",
      stockStatus: product.stockStatus,
      lastUpdated: product.lastInventoryUpdate,
    };
  } catch (error) {
    console.error("Error updating inventory:", error);
    throw error;
  }
}

export async function getInventoryStats() {
  await connection();
  try {
    const stats = await Product.aggregate([
      {
        $group: {
          _id: "$stockStatus",
          count: { $sum: 1 },
          totalStock: { $sum: "$stockQuantity" },
        },
      },
    ]);

    const lowStockProducts = await Product.find(
      {
        stockStatus: "low_stock",
      },
      {
        productName: 1,
        sku: 1,
        stockQuantity: 1,
        lowStockThreshold: 1,
      }
    )
      .limit(5)
      .lean();

    return {
      stats: stats.reduce((acc: any, curr:any) => {
        acc[curr._id] = {
          count: curr.count,
          totalStock: curr.totalStock,
        };
        return acc;
      }, {}),
      lowStockAlerts: lowStockProducts,
    };
  } catch (error) {
    console.error("Error fetching inventory stats:", error);
    throw error;
  }
}
