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
  paymentStatus:
    | "pending"
    | "cod_pending"
    | "paid"
    | "failed"
    | "cancelled"
    | "refunded";
  refundAmount?: number;
  returnReason?: string;
  returnRequestedAt?: Date;
  refundedAt?: Date;
  paymentMethod: string;
  transaction_id?: string;
  billingAddressId?: mongoose.Types.ObjectId;
  paymentMethodId?: mongoose.Types.ObjectId;
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
    carrier?: string; // kept for display/history, but now we also store carrierId
  };
  carrierId?: mongoose.Types.ObjectId; // 👈 new field referencing Carrier model
  shippingStatus: "pending" | "shipped" | "delivered";
  shippingDate?: Date;
  deliveryDate?: Date;
  orderStatus:
    | "pending"
    | "processing"
    | "shipped"
    | "in transit"
    | "completed"
    | "return_requested"
    | "cancelled"
    | "returned";
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
      enum: [
        "pending",
        "cod_pending",
        "paid",
        "failed",
        "cancelled",
        "refunded",
      ],
      default: "pending",
    },
    paymentMethod: { type: String, required: true },
    billingAddressId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Address",
      required: false,
    },
    paymentMethodId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "PaymentMethod",
      required: false,
    },
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
      carrier: { type: String }, // display name or ID (kept for compatibility)
      country: { type: String, required: true },
    },
    carrierId: {
      // 👈 new field
      type: mongoose.Schema.Types.ObjectId,
      ref: "Carrier",
      required: false,
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
      enum: [
        "pending",
        "processing",
        "shipped",
        "in transit",
        "completed",
        "return_requested",
        "returned",
        "cancelled",
      ],
      default: "processing",
    },
    refundAmount: { type: Number, default: 0 },
    returnReason: { type: String },
    returnRequestedAt: { type: Date },
    refundedAt: { type: Date },
    notes: { type: String },
    couponCode: { type: String },
    discount: { type: Number, default: 0 },
  },
  { timestamps: true },
);

const Order: Model<OrderDocument> =
  mongoose.models.Order || mongoose.model<OrderDocument>("Order", OrderSchema);

export default Order;
