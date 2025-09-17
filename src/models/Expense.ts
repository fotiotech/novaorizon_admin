import mongoose from "mongoose";

const ExpenseSchema = new mongoose.Schema({
  category: String,
  description: String,
  amount: Number,
  date: { type: Date, default: Date.now },
  receipt: String, // URL to receipt image
  status: { type: String, enum: ["pending", "approved", "rejected"] },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  createdAt: { type: Date, default: Date.now },
});

export default mongoose.models.Expense ||
  mongoose.model("Expense", ExpenseSchema);
