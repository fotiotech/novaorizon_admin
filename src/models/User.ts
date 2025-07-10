import mongoose, { Document, Schema, Model } from "mongoose";
import bcrypt from "bcryptjs";

const UserSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
    },
    email: {
      type: String,
      required: true,
      unique: true,
    },
    password: {
      type: String,
      required: true,
    },
    emailVerified: {
      type: Date,
    },
    role: {
      type: String,
    },
    image: {
      type: String,
    },
    accounts: [],
    sessions: [],
    status: {
      type: String,
      enum: ["active", "inactive"],
      default: "active",
    },
    created_at: {
      type: Date,
      default: Date.now,
    },
    updated_at: {
      type: Date,
      default: Date.now,
    },
  },
  { timestamps: true }
);

// Hash the password before saving the user model
UserSchema.pre("save", async function (next) {
  if (this.isModified("password")) {
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
  }
  next();
});

// Add a method to compare passwords
UserSchema.methods.matchPassword = async function (enteredPassword: string) {
  return await bcrypt.compare(enteredPassword, this.password);
};

// Export the model
const User = mongoose.models.User || mongoose.model("User", UserSchema);

export default User;
