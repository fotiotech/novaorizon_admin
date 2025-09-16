// models/UnitFamily.ts
import mongoose, { Schema, Document } from 'mongoose';

export interface IUnitFamily extends Document {
  name: string;
  description?: string;
  baseUnit: string;
  createdAt: Date;
  updatedAt: Date;
}

const UnitFamilySchema: Schema = new Schema({
  name: { type: String, required: true, unique: true },
  description: { type: String },
  baseUnit: { type: String, required: true }
}, {
  timestamps: true
});

export default mongoose.models.UnitFamily || mongoose.model<IUnitFamily>('UnitFamily', UnitFamilySchema);