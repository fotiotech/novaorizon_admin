import mongoose, { Schema, Document } from 'mongoose';

// Define the Shipping Document Interface
export interface IShipping extends Document {
  orderId: mongoose.Types.ObjectId;
  userId: mongoose.Types.ObjectId;
  address: {
    street: string;
    city: string;
    state: string;
    postalCode: string;
    country: string;
  };
  trackingNumber?: string; 
  carrier: string;
  shippingMethod: 'standard' | 'express' | 'overnight';
  shippingCost: number;
  status: 'pending' | 'assigned' | 'in_transit' | 'delivered' | 'returned' | 'cancelled';
  returnReason?: string; // Optional field for returned shipments
  shippedAt?: Date;
  deliveredAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

// Define the Shipping Schema
const ShippingSchema = new Schema<IShipping>(
  {
    orderId: { type: Schema.Types.ObjectId, ref: 'Order', required: true },
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    address: {
      street: { type: String, required: true },
      city: { type: String, required: true },
      region: { type: String, required: true },
      postalCode: { type: String, required: true },
      country: { type: String, required: true },
    },
    trackingNumber: { type: String },
    carrier: { type: String, required: true },
    shippingMethod: {
      type: String,
      enum: ['standard', 'express', 'overnight'],
      required: true,
    },
    shippingCost: { type: Number, required: true, min: 0 },
    status: {
      type: String,
      enum: ['pending', 'assigned', 'in_transit', 'delivered', 'returned', 'cancelled'],
      default: 'pending',
    },
    returnReason: { type: String }, // Optional field for returned shipments
    shippedAt: { type: Date },
    deliveredAt: { type: Date },
  },
  { timestamps: true }
);

// Export the Shipping Model
const Shipping = mongoose.models.Shipping || mongoose.model<IShipping>('Shipping', ShippingSchema);

export default Shipping;
