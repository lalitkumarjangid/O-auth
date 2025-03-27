import express from "express";
import { 
  createContent, 
  getContent, 
  deleteContent, 
  syncWithGoogleDrive 
} from "../controllers/contentController.js";
import { authMiddleware} from "../middleware/authMiddleware.js";

const contentRouter = express.Router();

// Protected routes
contentRouter.post("/upload", authMiddleware, createContent);
contentRouter.get("/files", authMiddleware, getContent);
contentRouter.delete("/:id", authMiddleware, deleteContent);
contentRouter.post("/sync-drive", authMiddleware, syncWithGoogleDrive);

export default contentRouter;