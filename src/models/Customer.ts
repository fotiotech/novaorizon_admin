import mongoose, { Schema, Document } from "mongoose";

// Define the interface for the Customer document
interface ICustomer extends Document {
  userId: mongoose.Types.ObjectId; // Reference to the User (authenticated user)
  photo: string;
  language: string;
  billingAddress: {
    firstName: string;
    lastName: string;
    email: string;
    phone?: string;
    address?: string;
    city?: string;
    region?: string;
    country?: string;
    postalCode?: string;
    preferences?: string[]; // Array to store customer preferences
  };
  shippingAddress: {
    street: string;
    region: string;
    city: string;
    state: string;
    postalCode: string;
    country: string;
    carrier: string;
    shippingMethod: string;
  };
  billingMethod?: {
    methodType: string; // e.g., "Credit Card", "PayPal", etc.
    details?: {
      cardNumber?: string;
      expiryDate?: string;
      cardholderName?: string;
    };
  };
  createdAt: Date;
  updatedAt: Date;
}

// Define the schema for the Customer model
const CustomerSchema: Schema<ICustomer> = new Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      unique: true,
    },
    photo: { type: String },
    language: { type: String },
    billingAddress: {
      firstName: { type: String, required: true },
      lastName: { type: String, required: true },
      email: { type: String, required: true, unique: true },
      phone: { type: String },
      address: { type: String },
      city: { type: String },
      region: { type: String },
      country: { type: String },
      postalCode: { type: String },
      preferences: { type: [String] },
    },
    shippingAddress: {
      region: { type: String },
      street: { type: String },
      city: { type: String },
      state: { type: String },
      postalCode: { type: String },
      country: { type: String },
      carrier: { type: String },
      shippingMethod: { type: String },
    },
    billingMethod: {
      methodType: { type: String }, // Type of billing method
      details: {
        cardNumber: { type: String },
        expiryDate: { type: String },
        cardholderName: { type: String },
      },
    },
  },
  {
    timestamps: true, // Automatically manage createdAt and updatedAt
  }
);

// Avoid overwriting the model if it already exists
const Customer =
  mongoose.models.Customer ||
  mongoose.model<ICustomer>("Customer", CustomerSchema);

export default Customer;
