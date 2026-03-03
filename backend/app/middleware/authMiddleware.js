const jwt = require("jsonwebtoken");

const authMiddleware = (req, res, next) => {
  try {
    const token = req.headers.authorization?.split(" ")[1];

    if (!token) {
      console.warn("❌ [AUTH] No token in Authorization header");
      return res.status(401).json({ message: "No token provided" });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    req.userId = decoded.userId;
    console.log(`✅ [AUTH] User authenticated: ${req.userId} | Route: ${req.method} ${req.path}`);

    next();
  } catch (error) {
    console.error("❌ [AUTH] Token verification failed:", error.message);
    res.status(401).json({ message: "Invalid or expired token" });
  }
};

module.exports = authMiddleware;