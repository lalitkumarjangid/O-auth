import express from "express";
import {
  googleAuth,
  googleCallback,
  googleCallbackRedirect,
  logout,
  getUser,
  refreshAccessToken,
} from "../controllers/authController.js";
import { authMiddleware } from "../middleware/authMiddleware.js";



const authRouter = express.Router();

authRouter.get("/google", googleAuth);
authRouter.get("/google/callback", googleCallback, googleCallbackRedirect);
authRouter.get("/logout", logout);
authRouter.get("/user", getUser);
authRouter.get("/refresh-token", authMiddleware, refreshAccessToken); // Protected route

export default authRouter;
