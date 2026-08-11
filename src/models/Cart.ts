import mongoose, { Schema, Document } from "mongoose";

export interface ICartItem {
  productId: mongoose.Types.ObjectId;
  variant?: string; // optional variant/sku
  quantity: number;
  price: number; // snapshot at add time
  taxRate?: number;
  discount?: number; // per-item discount
}

export interface ICart extends Document {
  userId?: mongoose.Types.ObjectId; // null for guest carts
  sessionId?: string; // for guest identification (cookie)
  items: ICartItem[];
  subtotal: number;
  tax: number;
  discount: number; // cart-level discount
  shippingCost: number;
  total: number;
  currency: string;
  appliedCoupon?: string;
  expiresAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const CartItemSchema = new Schema<ICartItem>({
  productId: { type: Schema.Types.ObjectId, ref: "Product", required: true },
  variant: { type: String },
  quantity: { type: Number, required: true, min: 1 },
  price: { type: Number, required: true },
  taxRate: { type: Number, default: 0 },
  discount: { type: Number, default: 0 },
});

const CartSchema = new Schema<ICart>(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", index: true },
    sessionId: { type: String, index: true },
    items: [CartItemSchema],
    subtotal: { type: Number, default: 0 },
    tax: { type: Number, default: 0 },
    discount: { type: Number, default: 0 },
    shippingCost: { type: Number, default: 0 },
    total: { type: Number, default: 0 },
    currency: { type: String, default: "USD" },
    appliedCoupon: { type: String },
    expiresAt: {
      type: Date,
      default: () => new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    }, // 7 days
  },
  { timestamps: true },
);

// Ensure at least one identifier (userId or sessionId)
CartSchema.pre("validate", function (next) {
  if (!this.userId && !this.sessionId) {
    next(new Error("Either userId or sessionId is required"));
  } else {
    next();
  }
});

export default mongoose.models.Cart ||
  mongoose.model<ICart>("Cart", CartSchema);
