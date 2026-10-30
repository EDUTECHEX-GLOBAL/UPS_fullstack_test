// backend/middleware/processAdminAuth.js
import jwt from "jsonwebtoken";

export const protectProcessAdmin = (req, res, next) => {
  try {
    console.log("\n🔐 ===== PROCESS ADMIN AUTH CHECK =====");
    
    const authHeader = req.headers.authorization;
    console.log("Auth Header:", authHeader ? "Present" : "Missing");

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({
        success: false,
        message: "Not authorized. No token provided.",
      });
    }

    const token = authHeader.split(" ")[1];
    console.log("Token (first 20 chars):", token.substring(0, 20) + "...");

    const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-2026';
    console.log("Using JWT_SECRET from env:", !!process.env.JWT_SECRET);
    
    const decoded = jwt.verify(token, JWT_SECRET);
    console.log("✅ Token verified successfully!");
    console.log("Decoded:", decoded);

    // FOR NOW: Accept any role for testing
    req.processAdmin = {
      id: decoded.id,
      email: decoded.email,
      role: decoded.role || 'process-admin',
    };

    console.log("🎉 Process admin authenticated (role check bypassed)!");
    next();
  } catch (error) {
    console.error("❌ JWT Error:", error.message);
    console.error("Error name:", error.name);
    
    return res.status(401).json({
      success: false,
      message: `Authentication failed: ${error.message}`,
    });
  }
};