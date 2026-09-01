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
        name: 1,
        sku: 1,
        quantity: 1,
        lowStockThreshold: 1,
        status: 1,
        updatedAt: 1,
      },
    ).lean();

    return inventoryData.map((item: any) => ({
      product_id: item?._id?.toString(),
      productName: item.name,
      sku: item.sku,
      stockQuantity: item.quantity || 0,
      lowStockThreshold: item.lowStockThreshold || 10,
      stockStatus:
        item.quantity <= 0
          ? "out_of_stock"
          : item.quantity <= (item.lowStockThreshold ?? 10)
            ? "low_stock"
            : "in_stock",
      lastUpdated: item.updatedAt || new Date(),
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
    product.lowStockThreshold = nextThreshold;
    product.updatedAt = new Date();

    await product.save();

    revalidatePath("/inventory");
    revalidatePath("/pos");

    return {
      message: "Success",
      stockStatus:
        nextQuantity <= 0
          ? "out_of_stock"
          : nextQuantity <= nextThreshold
            ? "low_stock"
            : "in_stock",
      lastUpdated: product.updatedAt,
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
          _id: {
            $cond: [
              { $lte: ["$quantity", 0] },
              "out_of_stock",
              {
                $cond: [
                  { $lte: ["$quantity", "$lowStockThreshold"] },
                  "low_stock",
                  "in_stock",
                ],
              },
            ],
          },
          count: { $sum: 1 },
          totalStock: { $sum: "$quantity" },
        },
      },
    ]);

    const lowStockProducts = await Product.find(
      {
        $expr: { $lte: ["$quantity", "$lowStockThreshold"] },
      },
      {
        name: 1,
        sku: 1,
        quantity: 1,
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
