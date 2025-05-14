import jwt from "jsonwebtoken";
import { JWT_SECRET } from "../config/config";

export const generateJwtToken = async (payload: object): Promise<string> => {
  return jwt.sign(payload, JWT_SECRET, {
    expiresIn: "7d",
  });
};
