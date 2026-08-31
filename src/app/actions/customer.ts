"use server";
import { connection } from "@/utils/connection";

import Customer from "@/models/Customer";
import { redirect } from "next/navigation";

export async function findCustomer(_id: string) {
  await connection();
  if (_id) {
    const data = await Customer.findOne({ userId: _id });
    return {
      ...data.toObject(),
      _id: data._id.toString(),
      userId: data.userId.toString(),
      timestamps: data.timestamps?.toISOString(),
    };
  }
}

export async function updateBillingAddresses(_id: string, formData: FormData) {
  if (!_id || !formData) {
    return { success: false, error: "Invalid data" };
  }

  const firstName = (formData.get("firstName") as string) || ""; // Fallback to empty string if null
  const lastName = (formData.get("lastName") as string) || "";
  const email = (formData.get("email") as string) || "";
  const phone = (formData.get("phone") as string) || "";
  const address = (formData.get("address") as string) || "";
  const city = (formData.get("city") as string) || "";
  const region = (formData.get("region") as string) || "";
  const country = (formData.get("country") as string) || "";
  const postalCode = (formData.get("postalCode") as string) || "";
  const preferences = formData.get("preferences")
    ? (formData.get("preferences") as string).split(",")
    : []; // Assuming preferences is a comma-separated string, adjust as needed

  try {
    await connection();

    // Check if the customer exists
    let customer = await Customer.findOne({ userId: _id });

    if (customer) {
      // If customer exists, update their billing address
      customer.billingAddress = {
        firstName,
        lastName,
        email,
        phone,
        address,
        city,
        region,
        country,
        postalCode,
        preferences,
      };

      // Save the updated customer
      customer = await customer.save();
    } else {
      // If customer doesn't exist, create a new customer
      customer = new Customer({
        userId: _id,
        billingAddress: {
          firstName,
          lastName,
          email,
          phone,
          address,
          city,
          region,
          country,
          postalCode,
          preferences,
        },
      });

      // Save the new customer
      customer = await customer.save();
    }
  } catch (error: any) {
    console.error("Error updating billing address:", error);
    return { success: false, error: error.message };
  }
}

export async function updateShippingInfos(
  userId: string,
  useBillingAsShipping: boolean,
  formData?: FormData,
) {
  if (!userId || !formData) {
    return null;
  }

  await connection();
  // If using billing address as shipping address, retrieve billing address fields
  let shippingAddress;
  if (useBillingAsShipping) {
    const customer = await Customer.findOne({ userId });
    if (!customer) {
      throw new Error("Customer not found");
    }

    shippingAddress = {
      region: customer.billingAddress.region,
      street: customer.billingAddress.address,
      city: customer.billingAddress.city,
      postalCode: customer.billingAddress.postalCode,
      country: customer.billingAddress.country,
      carrier: formData.get("carrier"),
      shippingMethod: formData.get("shippingMethod"),
    };
  } else {
    // Use values from formData for shipping address if not using billing address
    shippingAddress = {
      street: formData.get("street"),
      city: formData.get("city"),
      region: formData.get("region"),
      postalCode: formData.get("postalCode"),
      country: formData.get("country"),
      carrier: formData.get("carrier"),
      shippingMethod: formData.get("shippingMethod"),
    };
  }

  try {
    const response = await Customer.findOneAndUpdate(
      { userId },
      { $set: { shippingAddress } },
      { new: true, runValidators: true },
    );

    if (!response) {
      throw new Error("Customer not found");
    }
  } catch (error: any) {
    console.error("Error updating shipping address:", error);
    return { success: false, error: error.message };
  }
}

// ---------- Get all customers with pagination ----------
export async function getAllCustomers(options?: {
  page?: number;
  limit?: number;
  search?: string;
}) {
  try {
    await connection();
    const page = options?.page || 1;
    const limit = options?.limit || 10;
    const skip = (page - 1) * limit;

    let query: any = {};

    if (options?.search) {
      query = {
        $or: [
          {
            "billingAddress.firstName": {
              $regex: options.search,
              $options: "i",
            },
          },
          {
            "billingAddress.lastName": {
              $regex: options.search,
              $options: "i",
            },
          },
          { "billingAddress.email": { $regex: options.search, $options: "i" } },
        ],
      };
    }

    const total = await Customer.countDocuments(query);
    const customers = await Customer.find(query)
      .populate("userId", "email phone")
      .skip(skip)
      .limit(limit)
      .sort({ createdAt: -1 });

    return {
      success: true,
      customers: customers.map((c) => ({
        ...c.toObject(),
        _id: c._id.toString(),
        userId: c.userId?._id?.toString(),
      })),
      total,
      pages: Math.ceil(total / limit),
      currentPage: page,
    };
  } catch (error: any) {
    console.error("Error fetching customers:", error);
    return {
      success: false,
      error: error.message,
      customers: [],
      total: 0,
      pages: 0,
    };
  }
}

// ---------- Delete customer ----------
export async function deleteCustomer(customerId: string) {
  try {
    await connection();
    await Customer.findByIdAndDelete(customerId);
    return { success: true };
  } catch (error: any) {
    console.error("Error deleting customer:", error);
    return { success: false, error: error.message };
  }
}

// ---------- Get all reviews ----------
export async function getReviews(options?: {
  page?: number;
  limit?: number;
  rating?: number;
  status?: string;
}) {
  try {
    await connection();
    const page = options?.page || 1;
    const limit = options?.limit || 10;
    const skip = (page - 1) * limit;

    let query: any = {};
    if (options?.rating) query.rating = options.rating;

    const total =
      (await (global as any).mongoose?.models?.Review?.countDocuments(query)) ||
      0;

    // Import Review dynamically to avoid circular dependencies
    const Review = (global as any).mongoose?.models?.Review;
    if (!Review) {
      return { success: true, reviews: [], total: 0, pages: 0 };
    }

    const reviews = await Review.find(query)
      .populate("userId", "email firstName lastName")
      .populate("productId", "name")
      .skip(skip)
      .limit(limit)
      .sort({ createdAt: -1 });

    return {
      success: true,
      reviews: reviews.map((r: any) => ({
        ...r.toObject(),
        _id: r._id.toString(),
        userId: r.userId?._id?.toString(),
        productId: r.productId?._id?.toString(),
      })),
      total,
      pages: Math.ceil(total / limit),
      currentPage: page,
    };
  } catch (error: any) {
    console.error("Error fetching reviews:", error);
    return {
      success: false,
      error: error.message,
      reviews: [],
      total: 0,
      pages: 0,
    };
  }
}

// ---------- Delete review ----------
export async function deleteReview(reviewId: string) {
  try {
    await connection();
    const Review = (global as any).mongoose?.models?.Review;
    if (!Review) {
      return { success: false, error: "Review model not found" };
    }
    await Review.findByIdAndDelete(reviewId);
    return { success: true };
  } catch (error: any) {
    console.error("Error deleting review:", error);
    return { success: false, error: error.message };
  }
}
