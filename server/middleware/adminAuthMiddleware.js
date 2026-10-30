import jwt from "jsonwebtoken";
import Admin from "../models/Admin.js";

const JWT_SECRET = process.env.JWT_SECRET || "your-secret-key-change-in-production";

export const authenticateAdmin = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization || req.headers.Authorization;
    const token = authHeader?.startsWith("Bearer ")
      ? authHeader.slice(7)
      : authHeader;

    if (!token) {
      return res.status(401).json({
        success: false,
        message: "No authentication token, admin access denied",
      });
    }

    const decoded = jwt.verify(token, JWT_SECRET);

    if (!decoded?.id || !decoded?.role) {
      return res.status(401).json({
        success: false,
        message: "Invalid admin token",
      });
    }

    const admin = await Admin.findById(decoded.id);
    if (!admin) {
      return res.status(401).json({
        success: false,
        message: "Admin account not found. Please login again.",
      });
    }

    if (!admin.isActive) {
      return res.status(403).json({
        success: false,
        message: "Admin account is inactive.",
      });
    }

    req.admin = admin;
    next();
  } catch (error) {
    if (error.name === "TokenExpiredError") {
      return res.status(401).json({
        success: false,
        message: "Admin token has expired. Please login again.",
      });
    }

    if (error.name === "JsonWebTokenError") {
      return res.status(401).json({
        success: false,
        message: "Invalid admin token. Please login again.",
      });
    }

    console.error("Admin authentication error:", error);
    return res.status(500).json({
      success: false,
      message: "Admin authentication failed",
    });
  }
};

export const authorize = (...roles) => {
  return (req, res, next) => {
    try {
      if (!req.admin) {
        return res.status(401).json({
          success: false,
          message: "Not authenticated as admin",
        });
      }

      if (!roles.includes(req.admin.role)) {
        return res.status(403).json({
          success: false,
          message: `Role ${req.admin.role} is not authorized`,
        });
      }

      next();
    } catch (error) {
      return res.status(500).json({
        success: false,
        message: "Authorization error",
      });
    }
  };
};

export default authenticateAdmin;
