import mongoose from 'mongoose';

const contentSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  title: {
    type: String,
    required: true,
    trim: true
  },
  content: {
    type: String,
    required: true
  },
  uploadType: {
    type: String,
    enum: ['text', 'file'],
    default: 'text'
  },
  fileType: {
    type: String,
    default: 'text/plain'
  },
  fileName: {
    type: String
  },
  fileSize: {
    type: Number
  },
  format: {
    type: String,
    enum: ['plain', 'markdown', 'html'],
    default: 'plain'
  },
  googleFileId: {
    type: String
  },
  googleFileUrl: {
    type: String
  },
  googleFolderId: {
    type: String
  },
  mimeType: {
    type: String
  },
  lastSyncedAt: {
    type: Date
  },
  isPublic: {
    type: Boolean,
    default: false
  },
  shared: [{
    email: String,
    permission: {
      type: String,
      enum: ['view', 'edit'],
      default: 'view'
    }
  }],
  tags: [String],
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

// Update the updatedAt field on save
contentSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});

// Virtual for determining if this is a letter
contentSchema.virtual('isLetter').get(function() {
  return this.uploadType === 'text';
});

// Method to check if content needs syncing with Google Drive
contentSchema.methods.needsSync = function() {
  // If no Google file ID, it needs sync
  if (!this.googleFileId) return true;
  
  // If updated locally after last sync, it needs sync
  if (this.lastSyncedAt && this.updatedAt > this.lastSyncedAt) return true;
  
  return false;
};

// Convert content to HTML for Google Drive export
contentSchema.methods.toHtml = function() {
  if (this.format === 'markdown') {
    // This would use a markdown parser in your actual implementation
    // For example: return marked(this.content);
    return `<div>${this.content.replace(/\n/g, '<br>')}</div>`;
  } else if (this.format === 'html') {
    return this.content;
  } else {
    return `<div>${this.content.replace(/\n/g, '<br>')}</div>`;
  }
};

// Create text search index
contentSchema.index({ title: 'text', content: 'text' });

const Content = mongoose.model('Content', contentSchema);

export default Content;