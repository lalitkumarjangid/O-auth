import mongoose from 'mongoose';

const userSchema = new mongoose.Schema({
  googleId: {
    type: String,
   
  },
  displayName: {
    type: String,
     
  },
  email: {
    type: String,
     
  },
  photoURL: {
    type: String,
    default: null
  },
  role: {
    type: String,
    default: 'user',
    enum: ['user', 'admin'] 
  },
  refreshToken: { type: String },
  lastLogin: {
    type: Date,
    default: Date.now
  }
}, { timestamps: true });

export default mongoose.model('User', userSchema);