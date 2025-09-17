import mongoose, { Schema, Document, Model } from "mongoose";

interface Product {
  productId: mongoose.Types.ObjectId;
  name: string;
  quantity: number;
  price: number;
}

export interface OrderDocument extends Document {
  _id: mongoose.Types.ObjectId;
  orderNumber: string;
  userId: mongoose.Types.ObjectId;
  email: string;
  firstName: string;
  lastName: string;
  products: Product[];
  subtotal: number;
  tax: number;
  shippingCost: number;
  total: number;
  paymentStatus: "pending" | "paid" | "failed" | "cancelled" | "refunded";
  paymentMethod: string;
  transaction_id?: string;
  billingAddress: {
    street: string;
    city: string;
    region: string;
    address: string;
    country: string;
  };
  shippingAddress: {
    street: string;
    city: string;
    region: string;
    address: string;
    country: string;
    carrier?: string;
  };
  shippingStatus: "pending" | "shipped" | "delivered";
  shippingDate?: Date;
  deliveryDate?: Date;
  orderStatus: "processing" | "completed" | "cancelled";
  createdAt?: Date;
  updatedAt?: Date;
  notes?: string;
  couponCode?: string;
  discount: number;
}

const OrderSchema = new mongoose.Schema<OrderDocument>(
  {
    orderNumber: { type: String, required: true, unique: true },
    transaction_id: { type: String },
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    email: { type: String, required: true },
    firstName: { type: String, required: true },
    lastName: { type: String, required: true },
    products: [
      {
        productId: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "Product",
          required: true,
        },
        name: { type: String, required: true },
        quantity: { type: Number, required: true },
        price: { type: Number, required: true },
      },
    ],
    subtotal: { type: Number, required: true },
    tax: { type: Number, default: 0 },
    shippingCost: { type: Number, default: 0 },
    total: { type: Number, required: true },
    paymentStatus: {
      type: String,
      enum: ["pending", "paid", "failed", "cancelled", "refunded"],
      default: "pending",
    },
    paymentMethod: { type: String, required: true },
    billingAddress: {
      street: { type: String, required: true },
      city: { type: String, required: true },
      region: { type: String, required: true },
      address: { type: String, required: true },
      country: { type: String, required: true },
    },
    shippingAddress: {
      street: { type: String, required: true },
      region: { type: String, required: true },
      city: { type: String, required: true },
      address: { type: String, required: true },
      carrier: { type: String },
      country: { type: String, required: true },
    },
    shippingStatus: {
      type: String,
      enum: ["pending", "shipped", "delivered"],
      default: "pending",
    },
    shippingDate: { type: Date },
    deliveryDate: { type: Date },
    orderStatus: {
      type: String,
      enum: ["processing", "completed", "cancelled"],
      default: "processing",
    },
    notes: { type: String },
    couponCode: { type: String },
    discount: { type: Number, default: 0 },
  },
  { timestamps: true }
);

// To catch findByIdAndDelete, findOneAndDelete, etc.
OrderSchema.pre("findOneAndDelete", async function (next) {
  try {
    const doc = await this.model.findOne(this.getFilter());
    if (doc) {
      await mongoose.model("Shipping").deleteMany({ author: doc._id });
    }
    next();
  } catch (err: any) {
    next(err);
  }
});

const Order: Model<OrderDocument> =
  mongoose.models.Order || mongoose.model<OrderDocument>("Order", OrderSchema);

export default Order;
