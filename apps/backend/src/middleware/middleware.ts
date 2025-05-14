import { NextFunction, Request, Response } from "express";
import jwt from "jsonwebtoken";
import { client } from "database/client";
import { JWT_SECRET } from "../config/config";
import { User } from "../types/express/index";

// Add proper type for decoded token
interface DecodedToken {
  _id: string;
  role: "ADMIN" | "USER";
  email?: string;
  googleToken?: string;
  [key: string]: any;
}

/**
 * Decodes and verifies the JWT token
 */
export const decodeJwtToken = (token: string): DecodedToken => {
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    if (decoded && typeof decoded === "object") {
      return decoded as DecodedToken;
    }
    throw new Error("Invalid token");
  } catch (err) {
    throw new Error("Invalid token");
  }
};

/**
 * Checks if a user with the given _id exists in the database
 */
export const databaseCheck = async (_id: string) => {
  try {
    const user = await client.User.findOne({ _id });
    if (!user) {
      return false;
    }
    return user;
  } catch (err) {
    throw new Error("Database error while verifying user");
  }
};

/**
 * Common authentication middleware that verifies token and fetches user data
 */
export const authenticate = async (req: Request, res: Response, next: NextFunction) => {
  const authHeader = req.header("Authorization");
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).json({ message: "Access denied. No token provided." });
  }

  const token = authHeader.split(" ")[1];
  try {
    const decoded = decodeJwtToken(token);

    // Perform database check
    const userData = await databaseCheck(decoded._id);
    if (!userData) {
      return res.status(404).json({ message: "User not found or inactive" });
    }

    // Add both decoded token and user data to request
    req.user = {
      id: decoded._id,
      email: decoded.email,
      role: decoded.role,
      googleToken: decoded.googleToken,
      name: decoded.name, 
    };

    next();
  } catch (err: any) {
    return res.status(401).json({ message: err.message });
  }
};

/**
 * Middleware for ADMIN role verification
 */
export const adminCheck = async (req: Request, res: Response, next: NextFunction) => {
  try {
    await authenticate(req, res, () => {
      if (req.user && req.user.role === "ADMIN") {
      next();
      } else {
        return res.status(403).json({ message: "Access denied. Admin privileges required." });
      }
    });
  } catch (err) {
    return res.status(401).json({ message: "Authentication failed." });
  }
};

/**
 * Middleware for USER role verification
 */
export const userCheck = async (req: Request, res: Response, next: NextFunction) => {
  try {
    await authenticate(req, res, () => {
      if (req.user && req.user.role === "USER") {
        next(); 
      } else {
        res.status(403).json({ message: "Access denied. User privileges required." });
      }
    });
  } catch (err) {
    res.status(401).json({ message: "Authentication failed." });
  }
};

/**
 * Middleware that allows access to both ADMIN and USER roles
 */
export const anyAuthenticatedUser = async (req: Request, res: Response, next: NextFunction) => {
  try {
    await authenticate(req, res, () => {
      if (req.user && (req.user.role === "ADMIN" || req.user.role === "USER")) {
       return next();
      } else {
        return res.status(403).json({ message: "Access denied. Authentication required." });
      }
    });
  } catch (err) {
    return res.status(401).json({ message: "Authentication failed." });
  }
};