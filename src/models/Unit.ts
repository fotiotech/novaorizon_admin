// models/Unit.ts
import mongoose, { Schema, Document, Types } from 'mongoose';

export interface IUnit extends Document {
  name: string;
  symbol: string;
  unitFamily: Types.ObjectId;
  conversionFactor: number;
  isBaseUnit: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const UnitSchema: Schema = new Schema({
  name: { type: String, required: true },
  symbol: { type: String, required: true },
  unitFamily: { type: Schema.Types.ObjectId, ref: 'UnitFamily', required: true },
  conversionFactor: { type: Number, required: true, default: 1 },
  isBaseUnit: { type: Boolean, default: false }
}, {
  timestamps: true
});

// Compound index to ensure unique units within a family
UnitSchema.index({ name: 1, unitFamily: 1 }, { unique: true });
UnitSchema.index({ symbol: 1, unitFamily: 1 }, { unique: true });

export default mongoose.models.Unit || mongoose.model<IUnit>('Unit', UnitSchema);