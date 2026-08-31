"use server";
import { connection } from "@/utils/connection";

import Product from "@/models/Product";
import { revalidatePath } from "next/cache";

function getProductQuantity(product: any) {
  return Number(
    product?.quantity ?? product?.stock_quantity ?? product?.stockQuantity ?? 0,
  );
}

function getLowStockThreshold(product: any) {
  return Number(
    product?.lowStockThreshold ?? product?.low_stock_threshold ?? 10,
  );
}

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
      },
    ).lean();

    return inventoryData.map((item: any) => ({
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
  },
) {
  await connection();
  try {
    const product = await Product.findById(productId);
    if (!product) {
      throw new Error("Product not found");
    }

    const nextQuantity = Number(updates.quantity);
    const nextThreshold =
      updates.lowStockThreshold !== undefined
        ? Number(updates.lowStockThreshold)
        : getLowStockThreshold(product);

    product.quantity = nextQuantity;
    product.stock_quantity = nextQuantity;
    product.stockQuantity = nextQuantity;

    product.lowStockThreshold = nextThreshold;
    product.low_stock_threshold = nextThreshold;

    if (nextQuantity <= 0) {
      product.stockStatus = "out_of_stock";
      product.stock_status = "out_of_stock";
    } else if (nextQuantity <= nextThreshold) {
      product.stockStatus = "low_stock";
      product.stock_status = "low_stock";
    } else {
      product.stockStatus = "in_stock";
      product.stock_status = "in_stock";
    }

    product.lastInventoryUpdate = new Date();
    product.last_inventory_update = product.lastInventoryUpdate;

    await product.save();

    revalidatePath("/inventory");
    revalidatePath("/pos");

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
      },
    )
      .limit(5)
      .lean();

    return {
      stats: stats.reduce((acc: any, curr: any) => {
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
