"use server";
import { connection } from "@/utils/connection";

import { Review } from "@/models/Review";

export async function findReviews(productId?: string) {
  await connection();

  try {
    if (!productId) return null;
    const reviews = await Review.find({ productId }).populate("userId", "username");
    return reviews.map((review) => ({
      ...review.toObject(),
      _id: review._id?.toString(),
      productId: review.productId?.toString(),
      userId: review.userId?.toString(),
    }));
  } catch (error) {
    console.error("Failed to fetch reviews:", error);
  }
}

export async function createReview(data: {
  productId?: string;
  userId?: string;
  rating?: number;
  reviewText?: string;
  mediaUrl?: string[];
}) {
  await connection();

  try {
    const newReview = new Review(data);
    await newReview.save();
  } catch (error) {
    console.error("Something went wrong:", error);
  }
}
