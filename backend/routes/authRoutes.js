import express from 'express';
import {
  googleAuth,
  googleCallback,
  googleCallbackRedirect,
  logout,
  getUser
} from '../controllers/authController.js';

const router = express.Router();

router.get('/google', googleAuth);
router.get('/google/callback', googleCallback, googleCallbackRedirect);
router.get('/logout', logout);
router.get('/user', getUser);

export default router;