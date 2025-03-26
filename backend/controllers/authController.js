import passport from 'passport';
import dotenv from "dotenv"
dotenv.config();

export const googleAuth = (req, res, next) => {
    return passport.authenticate('google', {
      scope: ['profile', 'email']
    })(req, res, next);
  };

  export const googleCallback = (req, res, next) => {
    passport.authenticate('google', {
      failureRedirect: `${process.env.FRONTEND_URL}/login`
    }, (err, user) => {
      if (err) return next(err);
      if (!user) return res.redirect(`${process.env.FRONTEND_URL}/login`);
      
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
        console.error('Logout error:', err);
        return res.status(500).json({ message: 'Logout failed', error: err.message });
      }
      res.status(200).json({ message: 'Logged out successfully' });
    });
  };

export const getUser = (req, res) => {
  if (req.user) {
    res.json({
      user: {
        id: req.user._id,
        displayName: req.user.displayName,
        email: req.user.email
      }
    });
  } else {
    res.status(401).json({ message: 'Not authenticated' });
  }
};