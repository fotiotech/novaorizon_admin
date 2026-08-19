import mongoose, { Schema, Document, Model } from "mongoose";

export interface IAttributeGroup {
  _id: string;
  code: string;
  name: string;
  parent_id?: mongoose.Types.ObjectId;
  attributes?: { id: mongoose.Types.ObjectId; isRequired: boolean }[];
  createdAt?: Date;
  sort_order: number;
}

// Helper to detect cycles in the parent hierarchy
async function checkForCycle(
  model: Model<IAttributeGroup>,
  currentId: mongoose.Types.ObjectId | string,
  targetParentId: mongoose.Types.ObjectId | string | null | undefined,
): Promise<boolean> {
  if (!targetParentId) return false; // No parent → no cycle

  const visited = new Set<string>();
  let nextId = targetParentId.toString();

  while (nextId) {
    // If we've seen this ID before, it's a cycle
    if (visited.has(nextId)) return true;
    visited.add(nextId);

    // If we reach the current document's own ID, it's a cycle
    if (nextId === currentId.toString()) return true;

    // Fetch the parent document
    const parent = await model.findById(nextId).select("parent_id").lean();
    if (!parent) break; // Parent doesn't exist → no cycle

    nextId = parent.parent_id?.toString() || "";
  }
  return false;
}

const attributeGroupSchema = new Schema<IAttributeGroup>(
  {
    name: { type: String, required: true },
    code: { type: String, required: true, unique: true },
    parent_id: {
      type: Schema.Types.ObjectId,
      ref: "AttributeGroup",
    },
    attributes: [
      {
        id: { type: Schema.Types.ObjectId, ref: "Attribute" },
        isRequired: { type: Boolean, default: false },
      },
    ],
    sort_order: { type: Number, default: 0 },
  },
  {
    timestamps: true,
  },
);

// ----- Pre‑save hook -----
attributeGroupSchema.pre<IAttributeGroup>("save", async function (next) {
  if (!this.parent_id) return next();

  try {
    const cycleDetected = await checkForCycle(
      this.constructor as Model<IAttributeGroup>,
      this._id,
      this.parent_id,
    );
    if (cycleDetected) {
      return next(new Error("Cycle detected in parent_id hierarchy."));
    }
    next();
  } catch (error) {
    next(error as Error);
  }
});

// ----- Pre‑findOneAndUpdate hook -----
attributeGroupSchema.pre("findOneAndUpdate", async function (next) {
  const update = this.getUpdate() as mongoose.UpdateQuery<IAttributeGroup>;
  // Check if the update modifies parent_id
  if (!update || (update.parent_id === undefined && !update.$set?.parent_id)) {
    return next();
  }

  // Determine the new parent_id value
  const newParentId = update.$set?.parent_id ?? update.parent_id;
  if (!newParentId) return next(); // If clearing parent_id, no cycle risk

  // Get the document being updated
  const docId = this.getQuery()._id;
  if (!docId) return next(new Error("Document _id missing in query."));

  try {
    const model = this.model as Model<IAttributeGroup>;
    const cycleDetected = await checkForCycle(model, docId, newParentId);
    if (cycleDetected) {
      return next(new Error("Cycle detected in parent_id hierarchy."));
    }
    next();
  } catch (error) {
    next(error as Error);
  }
});

const AttributeGroup =
  mongoose.models.AttributeGroup ||
  mongoose.model<IAttributeGroup>("AttributeGroup", attributeGroupSchema);

export default AttributeGroup;
