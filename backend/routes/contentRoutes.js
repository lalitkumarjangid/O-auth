import express from "express";
import {
  createContent,
  getContent,
  deleteContent,
  syncWithGoogleDrive,
} from "../controllers/contentController.js";

const contentRouter = express.Router();

// Improved auth middleware with better error handling
const authMiddleware = (req, res, next) => {
  console.log('[AUTH] Checking authentication for content route');
  console.log('[AUTH] isAuthenticated:', req.isAuthenticated());
  console.log('[AUTH] Session ID:', req.session?.id);
  console.log('[AUTH] Has user:', !!req.user);
  console.log('[AUTH] Cookies:', req.cookies);

  // Try session authentication first
  if (req.isAuthenticated()) {
    console.log('[AUTH] User authenticated via session:', req.user._id);
    return next();
  }

  // Then try cookie authentication if available
  const authToken = req.cookies?.auth_token;
  if (authToken) {
    console.log('[AUTH] Found auth token cookie. Proceeding to check user.');
    // The actual user verification will happen in controller
    // This allows the request to proceed for further handling
    return next();
  }

  console.log('[AUTH] No authentication found, returning 401');
  return res.status(401).json({ error: "Not authenticated" });
};

// Protected routes
contentRouter.post("/upload", authMiddleware, createContent);
contentRouter.get("/files", authMiddleware, getContent);
contentRouter.delete("/:id", authMiddleware, deleteContent);
contentRouter.post("/sync-drive", authMiddleware, syncWithGoogleDrive);

export default contentRouter;