// models/PromotionTypeProperty.ts
import { Schema, model, models } from 'mongoose';

export interface IPromotionTypeProperty {
  code: string;
  name: string;
  description?: string;
  type: 'text' | 'number' | 'select' | 'multi-select' | 'checkbox' | 'radio' | 'boolean' | 'date' | 'url';
  isRequired: boolean;
  isMultiple?: boolean;
  options?: string[]; // For select/multi-select/radio/checkbox
  defaultValue?: any;
  validation?: {
    min?: number;
    max?: number;
    pattern?: string;
    minLength?: number;
    maxLength?: number;
  };
  sortOrder: number;
}

const promotionTypePropertySchema = new Schema<IPromotionTypeProperty>(
  {
    code: {
      type: String,
      required: true,
      unique: true,
      trim: true,
    },
    name: {
      type: String,
      required: true,
      trim: true,
    },
    description: {
      type: String,
      trim: true,
    },
    type: {
      type: String,
      enum: ['text', 'number', 'select', 'multi-select', 'checkbox', 'radio', 'boolean', 'date', 'url'],
      required: true,
    },
    isRequired: {
      type: Boolean,
      default: false,
    },
    isMultiple: {
      type: Boolean,
      default: false,
    },
    options: [String],
    defaultValue: Schema.Types.Mixed,
    validation: {
      min: Number,
      max: Number,
      pattern: String,
      minLength: Number,
      maxLength: Number,
    },
    sortOrder: {
      type: Number,
      default: 0,
    },
  },
  {
    timestamps: true,
  }
);

export const PromotionTypeProperty =
  models.PromotionTypeProperty || model('PromotionTypeProperty', promotionTypePropertySchema);

export default PromotionTypeProperty;