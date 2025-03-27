import passport from "passport";
import dotenv from "dotenv";
import { google } from "googleapis";

dotenv.config();

const oauth2Client = new google.auth.OAuth2(
  process.env.GOOGLE_CLIENT_ID,
  process.env.GOOGLE_CLIENT_SECRET,
  process.env.GOOGLE_REDIRECT_URI
);

// Store refresh tokens in memory (or a database)
const refreshTokens = {};

export const googleAuth = (req, res, next) => {
  return passport.authenticate("google", {
    scope: [
      "profile", 
      "email", 
      "https://www.googleapis.com/auth/drive.file" // Add Drive scope
    ],
    accessType: "offline",
    prompt: "consent", // Forces refresh token to be issued
  })(req, res, next);
};;

export const googleCallback = (req, res, next) => {
  passport.authenticate("google", { failureRedirect: `${process.env.FRONTEND_URL}/login` }, (err, user, info) => {
    if (err) return next(err);
    if (!user) return res.redirect(`${process.env.FRONTEND_URL}/login`);

    // Log refresh token
    console.log("Refresh Token:", user.refreshToken);

    // Store the refresh token
    if (user.refreshToken) {
      refreshTokens[user._id] = user.refreshToken;
    }

    req.login(user, (loginErr) => {
      if (loginErr) return next(loginErr);
      return res.redirect(`${process.env.FRONTEND_URL}/dashboard`);
    });
  })(req, res, next);
};


export const googleCallbackRedirect = (req, res, next) => {
  res.redirect(`${process.env.FRONTEND_URL}/dashboard`);
};

export const logout = (req, res) => {
  req.logout((err) => {
    if (err) {
      console.error("Logout error:", err);
      return res.status(500).json({ message: "Logout failed", error: err.message });
    }
    res.status(200).json({ message: "Logged out successfully" });
  });
};

export const getUser = (req, res) => {
  if (req.user) {
    res.json({
      user: {
        id: req.user._id,
        displayName: req.user.displayName,
        email: req.user.email,
        role: req.user.role,
      },
    });
  } else {
    res.status(401).json({ message: "Not authenticated" });
  }
};

/**
 * Get a new access token using a refresh token
 */
export const refreshAccessToken = async (req, res) => {
  try {
    const userId = req.user?._id; // Ensure user is authenticated
    if (!userId || !refreshTokens[userId]) {
      return res.status(403).json({ error: "No refresh token found" });
    }

    const { tokens } = await oauth2Client.refreshToken(refreshTokens[userId]);

    res.json({
      access_token: tokens.access_token,
      expires_in: tokens.expiry_date,
    });
  } catch (error) {
    console.error("Error refreshing access token:", error);
    res.status(500).json({ error: "Failed to refresh access token" });
  }
};
