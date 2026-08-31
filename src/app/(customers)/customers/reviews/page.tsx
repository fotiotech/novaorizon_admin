"use client";

import React, { useEffect, useState } from "react";
import { getReviews, deleteReview } from "@/app/actions/customer";
import Spinner from "@/components/Spinner";
import { Trash2, Star, Filter } from "lucide-react";

interface Review {
  _id: string;
  userId: { _id: string; email: string; firstName: string; lastName: string };
  productId: { _id: string; name: string };
  rating: number;
  reviewText: string;
  helpfulCount: number;
  mediaUrl?: string[];
  createdAt: string;
}

export default function ReviewsPage() {
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalReviews, setTotalReviews] = useState(0);
  const [ratingFilter, setRatingFilter] = useState<number | null>(null);
  const [deleting, setDeleting] = useState<string | null>(null);

  const limit = 10;

  useEffect(() => {
    async function fetchReviews() {
      setLoading(true);
      const result = await getReviews({
        page,
        limit,
        rating: ratingFilter || undefined,
      });
      if (result.success) {
        setReviews(result.reviews);
        setTotalPages(result.pages);
        setTotalReviews(result.total);
      }
      setLoading(false);
    }

    fetchReviews();
  }, [page, ratingFilter]);

  const handleDelete = async (reviewId: string) => {
    if (!confirm("Are you sure you want to delete this review?")) return;

    setDeleting(reviewId);
    const result = await deleteReview(reviewId);
    if (result.success) {
      setReviews(reviews.filter((r) => r._id !== reviewId));
    } else {
      alert("Failed to delete review");
    }
    setDeleting(null);
  };

  const renderStars = (rating: number) => {
    return (
      <div className="flex gap-1">
        {Array.from({ length: 5 }).map((_, i) => (
          <Star
            key={i}
            className={`w-4 h-4 ${
              i < rating ? "fill-yellow-400 text-yellow-400" : "text-gray-300"
            }`}
          />
        ))}
      </div>
    );
  };

  if (loading && reviews.length === 0) {
    return (
      <div className="flex h-96 items-center justify-center">
        <Spinner />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold text-foreground">
          Reviews & Feedback
        </h1>
        <div className="text-sm text-muted-foreground">
          Total: {totalReviews} reviews
        </div>
      </div>

      {/* Filters */}
      <div className="bg-card border border-border rounded-lg p-4">
        <div className="flex items-center gap-4">
          <Filter className="w-5 h-5 text-muted-foreground" />
          <div className="flex gap-2">
            <button
              onClick={() => {
                setRatingFilter(null);
                setPage(1);
              }}
              className={`px-3 py-1 rounded text-sm font-medium transition-colors ${
                ratingFilter === null
                  ? "bg-primary text-primary-foreground"
                  : "border border-border hover:bg-muted"
              }`}
            >
              All
            </button>
            {[5, 4, 3, 2, 1].map((rating) => (
              <button
                key={rating}
                onClick={() => {
                  setRatingFilter(rating);
                  setPage(1);
                }}
                className={`px-3 py-1 rounded text-sm font-medium transition-colors flex items-center gap-1 ${
                  ratingFilter === rating
                    ? "bg-primary text-primary-foreground"
                    : "border border-border hover:bg-muted"
                }`}
              >
                <Star className="w-4 h-4" />
                {rating}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Reviews List */}
      <div className="space-y-4">
        {reviews.length === 0 ? (
          <div className="bg-card border border-border rounded-lg p-8 text-center text-muted-foreground">
            No reviews found
          </div>
        ) : (
          reviews.map((review) => (
            <div
              key={review._id}
              className="bg-card border border-border rounded-lg p-6 hover:shadow-md transition-shadow"
            >
              <div className="flex justify-between items-start mb-4">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <div>
                      <p className="font-medium text-foreground">
                        {review.userId?.firstName} {review.userId?.lastName}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {review.userId?.email}
                      </p>
                    </div>
                  </div>
                  <p className="text-sm text-muted-foreground mb-2">
                    Product:{" "}
                    <span className="text-foreground">
                      {review.productId?.name}
                    </span>
                  </p>
                  <div className="mb-3">{renderStars(review.rating)}</div>
                </div>
                <button
                  onClick={() => handleDelete(review._id)}
                  disabled={deleting === review._id}
                  className="p-2 rounded hover:bg-destructive/10 text-destructive transition-colors disabled:opacity-50"
                >
                  <Trash2 className="w-5 h-5" />
                </button>
              </div>

              <p className="text-sm text-foreground mb-3 leading-relaxed">
                {review.reviewText}
              </p>

              {review.mediaUrl && review.mediaUrl.length > 0 && (
                <div className="mb-3 flex gap-2">
                  {review.mediaUrl.map((url: string, i: number) => (
                    <img
                      key={i}
                      src={url}
                      alt={`Review media ${i + 1}`}
                      className="h-16 w-16 rounded object-cover"
                    />
                  ))}
                </div>
              )}

              <div className="flex justify-between items-center text-xs text-muted-foreground">
                <span>{new Date(review.createdAt).toLocaleDateString()}</span>
                <span className="flex items-center gap-1">
                  👍 {review.helpfulCount} found helpful
                </span>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex justify-center gap-2">
          <button
            onClick={() => setPage(Math.max(1, page - 1))}
            disabled={page === 1}
            className="px-4 py-2 rounded border border-border hover:bg-muted disabled:opacity-50 transition-colors text-sm"
          >
            Previous
          </button>
          <div className="flex items-center gap-1">
            {Array.from(
              { length: Math.min(totalPages, 5) },
              (_, i) => i + 1,
            ).map((p) => (
              <button
                key={p}
                onClick={() => setPage(p)}
                className={`w-10 h-10 rounded text-sm transition-colors ${
                  page === p
                    ? "bg-primary text-primary-foreground"
                    : "border border-border hover:bg-muted"
                }`}
              >
                {p}
              </button>
            ))}
          </div>
          <button
            onClick={() => setPage(Math.min(totalPages, page + 1))}
            disabled={page === totalPages}
            className="px-4 py-2 rounded border border-border hover:bg-muted disabled:opacity-50 transition-colors text-sm"
          >
            Next
          </button>
        </div>
      )}
    </div>
  );
}
