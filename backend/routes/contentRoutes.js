import express from "express";
import {
  createContent,
  getContent,
  deleteContent,
  syncWithGoogleDrive,
} from "../controllers/contentController.js";

const contentRouter = express.Router();
// Inline auth middleware
const authMiddleware = (req, res, next) => {
    if (req.isAuthenticated()) {
      return next();
    }
    return res.status(401).json({ error: "Not authenticated" });
  };
  
// Protected routes
contentRouter.post("/upload", authMiddleware, createContent);
contentRouter.get("/files", authMiddleware, getContent);
contentRouter.delete("/:id", authMiddleware, deleteContent);
contentRouter.post("/sync-drive", authMiddleware, syncWithGoogleDrive);

export default contentRouter;
