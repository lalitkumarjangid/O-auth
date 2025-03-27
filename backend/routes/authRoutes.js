import express from "express";
import {
  googleAuth,
  googleCallback,
  googleCallbackRedirect,
  logout,
  getUser,
  refreshAccessToken,
} from "../controllers/authController.js";



const authRouter = express.Router();

const authMiddleware = (req, res, next) => {
  if (req.isAuthenticated()) {
    return next();
  }
  return res.status(401).json({ error: "Not authenticated" });
};

authRouter.get("/google", googleAuth);
authRouter.get("/google/callback", googleCallback, googleCallbackRedirect);
authRouter.get("/logout", logout);
authRouter.get("/user", getUser);
authRouter.get("/refresh-token", authMiddleware, refreshAccessToken); // Protected route

export default authRouter;
