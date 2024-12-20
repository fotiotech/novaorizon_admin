import { Users } from "@/constant/types";
import jwt from "jsonwebtoken";

export const generateToken = (user: Users): string => {
  const payload = {
    _id: user._id,
    username: user.username,
    email: user.email,
    role: user.role,
  };
  return jwt.sign(payload, process.env.JWT_SECRET as string, {
    expiresIn: "30d",
  });
};

export const verifyToken = (token: string) => {
  return jwt.verify(token, process.env.JWT_SECRET as string);
};
