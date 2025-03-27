import passport from "passport";
import dotenv from "dotenv";
import { google } from "googleapis";
import User from "../models/User.js"; 

dotenv.config();

const oauth2Client = new google.auth.OAuth2(
  process.env.GOOGLE_CLIENT_ID,
  process.env.GOOGLE_CLIENT_SECRET,
  process.env.GOOGLE_REDIRECT_URI
);

// Helper function to log info in development
const logInfo = (message, data) => {
  if (process.env.NODE_ENV !== 'production') {
  }
};

export const googleAuth = (req, res, next) => {
  logInfo('Starting Google auth flow');
  return passport.authenticate("google", {
    scope: ["profile", "email", "https://www.googleapis.com/auth/drive.file"],
    accessType: "offline",
    prompt: "consent",
  })(req, res, next);
};

export const googleCallback = (req, res, next) => {
  
  passport.authenticate(
    "google",
    { 
      failureRedirect: `${process.env.FRONTEND_URL}/login?error=authentication_failed`,
      session: true
    },
    (err, user, info) => {
      if (err) {
        return next(err);
      }
      
      if (!user) {
        return res.redirect(`${process.env.FRONTEND_URL}/login?error=no_user`);
      }

 
      
      req.login(user, (loginErr) => {
        if (loginErr) {
      
          return next(loginErr);
        }
        
        
        res.cookie('auth_token', user._id, {
          httpOnly: true,
          secure: true, 
          sameSite: 'none', 
          maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days
        });
        
        return res.redirect(`${process.env.FRONTEND_URL}/dashboard`);
      });
    }
  )(req, res, next);
};

export const getUser = async (req, res) => {
  
  try {
    // First try via session
    if (req.isAuthenticated() && req.user) {
      return res.json({
        user: {
          id: req.user._id,
          displayName: req.user.displayName,
          email: req.user.email,
          role: req.user.role,
        },
      });
    }
    
    // Then try via cookie
    const authToken = req.cookies?.auth_token;
    if (authToken) {
      const user = await User.findById(authToken);
      if (user) {
        // Re-establish session
        await new Promise((resolve, reject) => {
          req.login(user, (err) => {
            if (err) {
              reject(err);
            } else {
              resolve();
            }
          });
        });
        
        return res.json({
          user: {
            id: user._id,
            displayName: user.displayName,
            email: user.email,
            role: user.role,
          },
        });
      }
    }
    
    res.status(401).json({ message: "Not authenticated" });
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
};
export const googleCallbackRedirect = (req, res) => {
  logInfo('Redirect callback');
  res.redirect(`${process.env.FRONTEND_URL}/dashboard`);
};

export const logout = (req, res) => {
  logInfo('Logging out user');
  
  // Clear auth cookie
  res.clearCookie('auth_token');
  
  req.logout((err) => {
    if (err) {
      logInfo('Logout error:', err);
      return res
        .status(500)
        .json({ message: "Logout failed", error: err.message });
    }
    res.status(200).json({ message: "Logged out successfully" });
  });
};

// export const getUser = async (req, res) => {
//   logInfo('getUser called, is authenticated?', req.isAuthenticated());
  
//   // Try to authenticate using session
//   if (req.isAuthenticated() && req.user) {
//     logInfo('User authenticated via session:', req.user._id);
//     return res.json({
//       user: {
//         id: req.user._id,
//         displayName: req.user.displayName,
//         email: req.user.email,
//         role: req.user.role,
//       },
//     });
//   }
  
//   // If no session, try authentication via cookie
//   const authToken = req.cookies?.auth_token;
//   if (authToken) {
//     logInfo('Trying to authenticate via cookie token');
//     try {
//       const user = await User.findById(authToken);
//       if (user) {
//         logInfo('User authenticated via cookie:', user._id);
        
//         // Re-establish session
//         req.login(user, (err) => {
//           if (err) {
//             logInfo('Error re-establishing session:', err);
//           }
//         });
        
//         return res.json({
//           user: {
//             id: user._id,
//             displayName: user.displayName,
//             email: user.email,
//             role: user.role,
//           },
//         });
//       }
//     } catch (err) {
//       logInfo('Error finding user by token:', err);
//     }
//   }

//   logInfo('No authenticated user found');
//   res.status(401).json({ message: "Not authenticated" });
// };

export const refreshAccessToken = async (req, res) => {
  logInfo('Refreshing access token');
  
  try {
    // Try session auth
    let userId = req.user?._id;
    
    // If no session, try cookie auth
    if (!userId) {
      const authToken = req.cookies?.auth_token;
      if (authToken) {
        userId = authToken;
      }
    }
    
    if (!userId) {
      logInfo('No user ID found for token refresh');
      return res.status(401).json({ error: "Not authenticated" });
    }
    
    // Fetch user with refreshToken from database
    const user = await User.findById(userId);
    
    if (!user || !user.refreshToken) {
      logInfo('No refresh token found for user');
      return res.status(403).json({ error: "No refresh token found" });
    }

    logInfo('Refreshing token with Google');
    const { tokens } = await oauth2Client.refreshToken(user.refreshToken);

    res.json({
      access_token: tokens.access_token,
      expires_in: tokens.expiry_date,
    });
  } catch (error) {
    logInfo('Error refreshing access token:', error);
    res.status(500).json({ error: "Failed to refresh access token" });
  }
};