import passport from "passport";
import { Strategy as GoogleStrategy } from "passport-google-oauth20";
import dotenv from "dotenv";
import User from "../models/User.js";

dotenv.config();

passport.use(
  new GoogleStrategy(
    {
      clientID: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
      callbackURL: process.env.GOOGLE_REDIRECT_URI,
      passReqToCallback: true,
    },
    async (req, accessToken, refreshToken, profile, done) => {
      try {
        // Get profile photo from profile data
        let photoURL = null;
        if (profile.photos && profile.photos.length > 0) {
          photoURL = profile.photos[0].value;
        }

        // Find or create user
        let user = await User.findOne({ googleId: profile.id });
        
        if (user) {
          // Update user info on each login
          user.lastLogin = new Date();
          user.displayName = profile.displayName;
          user.email = profile.emails[0].value;
          
          // Only update photoURL if we have one
          if (photoURL) {
            user.photoURL = photoURL;
          }
          
          // Update the refresh token if we got a new one
          if (refreshToken) {
            user.refreshToken = refreshToken;
          }
          
          await user.save();
        } else {
          // Create new user with all available information
          user = await User.create({
            googleId: profile.id,
            displayName: profile.displayName,
            email: profile.emails[0].value,
            photoURL: photoURL,
            refreshToken: refreshToken,
            lastLogin: new Date()
          });
        }
        
        return done(null, user);
      } catch (error) {
        console.error("Google authentication error:", error);
        return done(error, null);
      }
    }
  )
);

// Serialize just the user ID to the session
passport.serializeUser((user, done) => {
  done(null, user.id);
});

// When a request comes in, deserialize the ID into a full user object
passport.deserializeUser(async (id, done) => {
  try {
    const user = await User.findById(id);
    done(null, user);
  } catch (err) {
    console.error("Deserialization error:", err);
    done(err, null);
  }
});

export default passport;