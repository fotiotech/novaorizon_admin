import mongoose, { Schema, Document, Model } from "mongoose";

export interface InvoiceDocument extends Document {
  _id: mongoose.Types.ObjectId;
  invoiceNumber: string;
  orderNumber: string;
  orderId: mongoose.Types.ObjectId;
  userId: mongoose.Types.ObjectId;
  email: string;
  firstName: string;
  lastName: string;
  products: Array<{
    productId: mongoose.Types.ObjectId;
    name: string;
    quantity: number;
    price: number;
  }>;
  subtotal: number;
  tax: number;
  shippingCost: number;
  discount: number;
  total: number;
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
  };
  paymentMethod: string;
  notes?: string;
  status: "issued" | "paid" | "cancelled"; // invoice status, not order status
  issuedAt: Date;
  paidAt?: Date;
  dueAt?: Date;
  createdAt?: Date;
  updatedAt?: Date;
}

const InvoiceSchema = new Schema<InvoiceDocument>(
  {
    invoiceNumber: {
      type: String,
      required: true,
      unique: true,
    },
    orderNumber: {
      type: String,
      required: true,
      index: true,
    },
    orderId: {
      type: Schema.Types.ObjectId,
      ref: "Order",
      required: true,
    },
    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    email: { type: String, required: true },
    firstName: { type: String, required: true },
    lastName: { type: String, required: true },
    products: [
      {
        productId: {
          type: Schema.Types.ObjectId,
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
    discount: { type: Number, default: 0 },
    total: { type: Number, required: true },
    billingAddress: {
      street: { type: String, required: true },
      city: { type: String, required: true },
      region: { type: String, required: true },
      address: { type: String, required: true },
      country: { type: String, required: true },
    },
    shippingAddress: {
      street: { type: String, required: true },
      city: { type: String, required: true },
      region: { type: String, required: true },
      address: { type: String, required: true },
      country: { type: String, required: true },
    },
    paymentMethod: { type: String, required: true },
    notes: { type: String },
    status: {
      type: String,
      enum: ["issued", "paid", "cancelled"],
      default: "issued",
    },
    issuedAt: { type: Date, default: () => new Date() },
    paidAt: { type: Date },
    dueAt: { type: Date },
  },
  { timestamps: true },
);

const Invoice: Model<InvoiceDocument> =
  mongoose.models.Invoice ||
  mongoose.model<InvoiceDocument>("Invoice", InvoiceSchema);

export default Invoice;
