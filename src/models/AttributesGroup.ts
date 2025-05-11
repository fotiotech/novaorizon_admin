import mongoose, { Schema, model, Document, models } from "mongoose";

interface IAttributeGroup extends Document {
  _id: string;
  name: string;
  parent_id?: mongoose.Types.ObjectId;
  category_id: mongoose.Types.ObjectId;
}

const attributeGroupSchema = new Schema<IAttributeGroup>(
  {
    name: { type: String, required: true },
    parent_id: {
      type: Schema.Types.ObjectId,
      ref: "AttributeGroup",
    },
    category_id: {
      type: Schema.Types.ObjectId,
      ref: "Category",
      required: true,
    },
  },
  {
    timestamps: true,
  }
);

// Add compound index for efficient lookups
attributeGroupSchema.index({ category_id: 1, name: 1 }, { unique: true });

// Pre-save middleware to handle validation
attributeGroupSchema.pre("save", async function (next) {
  try {
    const exists = await mongoose.models.AttributeGroup.exists({
      category_id: this.category_id,
      name: this.name,
      _id: { $ne: this._id },
    });
    if (exists) {
      throw new Error("Group name must be unique within a category");
    }
    next();
  } catch (error) {
    next(error as Error);
  }
});

const AttributeGroup =
  models.AttributeGroup ||
  model<IAttributeGroup>("AttributeGroup", attributeGroupSchema);

export default AttributeGroup;
