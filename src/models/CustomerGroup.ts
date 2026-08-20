import mongoose, { Document, model, models, Schema } from 'mongoose';

const customerGroupSchema = new Schema(
  {
    name: {
      type: String,
      required: true,
      unique: true,
      trim: true,
    },
    description: {
      type: String,
      trim: true,
    },
    customers: [{ type: Schema.Types.ObjectId, ref: 'User' }], // ✅ Fixed
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true,
  }
);

export const CustomerGroup =
  models.CustomerGroup || model('CustomerGroup', customerGroupSchema);

export default CustomerGroup;