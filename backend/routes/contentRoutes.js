import express from "express";
import {
  createContent,
  uploadFile,
  getContentById,
  updateContent,
  getContent,
  deleteContent,
  syncWithGoogleDrive,
} from "../controllers/contentController.js";

const contentRouter = express.Router();

// Improved auth middleware with better error handling
const authMiddleware = (req, res, next) => {
  // Try session authentication first
  if (req.isAuthenticated()) {
    return next();
  }

  // Then try cookie authentication if available
  const authToken = req.cookies?.auth_token;
  if (authToken) {
    return next();
  }

  return res.status(401).json({ error: "Not authenticated" });
};

// Protected routes
contentRouter.post("/content", uploadFile, authMiddleware, createContent);
contentRouter.get("/files/:id", authMiddleware, getContentById);
contentRouter.put("/content/:id", authMiddleware, updateContent);
contentRouter.post("/upload", authMiddleware, createContent);
contentRouter.get("/files", authMiddleware, getContent);
contentRouter.delete("/:id", authMiddleware, deleteContent);
contentRouter.post("/sync-drive", authMiddleware, syncWithGoogleDrive);
export default contentRouter;
