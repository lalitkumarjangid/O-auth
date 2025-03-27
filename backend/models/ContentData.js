import mongoose from 'mongoose';

const contentSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  title: {
    type: String,
    required: true
  },
  content: {
    type: String,
    required: true
  },
  googleFileId: {
    type: String
  },
  googleFileUrl: {
    type: String
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

// Update the updatedAt field on save
contentSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});

const Content = mongoose.model('Content', contentSchema);

export default Content;