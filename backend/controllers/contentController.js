import User from "../models/User.js";
import Content from "../models/ContentData.js"; 
import { google } from "googleapis";
import fs from "fs";
import path from "path";
import os from "os";
import multer from "multer";
import { marked } from "marked";

// Configure multer for temporary file storage
const upload = multer({ 
  dest: os.tmpdir(),
  limits: { fileSize: 10 * 1024 * 1024 } // 10MB limit
});

// Helper to handle user authentication with cookie fallback
const getAuthenticatedUser = async (req) => {
  // First try via session
  if (req.isAuthenticated() && req.user) {
    return req.user;
  }

  // Then try via cookie
  const authToken = req.cookies?.auth_token;
  if (authToken) {
    try {
      const user = await User.findById(authToken);
      if (user) {
        // Re-establish session if possible
        req.login(user, (err) => {
          if (err) {
            console.error("Session login error:", err);
          }
        });
        return user;
      }
    } catch (err) {
      console.error("Auth token lookup error:", err);
    }
  }

  return null;
};

// Get Google Drive client for a user
const getDriveClient = async (user) => {
  if (!user || !user.refreshToken) {
    throw new Error("No refresh token available");
  }

  const oauth2Client = new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    process.env.GOOGLE_REDIRECT_URI
  );

  oauth2Client.setCredentials({
    refresh_token: user.refreshToken,
  });

  // Refresh the token if needed
  await oauth2Client.getAccessToken();

  return google.drive({ version: "v3", auth: oauth2Client });
};

// Create or get a "Letters" folder in Google Drive
const getLettersFolderId = async (drive) => {
  try {
    // Check if Letters folder already exists
    const response = await drive.files.list({
      q: "name='Letters' and mimeType='application/vnd.google-apps.folder' and trashed=false",
      fields: 'files(id, name)',
      spaces: 'drive'
    });

    if (response.data.files && response.data.files.length > 0) {
      return response.data.files[0].id;
    }

    // Create the folder if it doesn't exist
    const fileMetadata = {
      name: 'Letters',
      mimeType: 'application/vnd.google-apps.folder'
    };

    const folder = await drive.files.create({
      resource: fileMetadata,
      fields: 'id'
    });

    return folder.data.id;
  } catch (error) {
    console.error("Error managing Letters folder:", error);
    return null;
  }
};

// Convert Markdown to Google Docs compatible HTML
const convertMarkdownToHtml = (markdown) => {
  if (!markdown) return '';
  return marked(markdown);
};

export const getContent = async (req, res) => {
  try {
    const user = await getAuthenticatedUser(req);
    if (!user) {
      return res.status(401).json({ message: "Not authenticated" });
    }

    // Get content from your database
    const content = await Content.find({ user: user._id }).sort({
      updatedAt: -1,
    });

    res.json({ content });
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

export const createContent = async (req, res) => {
  try {
    const user = await getAuthenticatedUser(req);
    if (!user) {
      return res.status(401).json({ message: "Not authenticated" });
    }

    // Handle different content types (text document vs file upload)
    let newContent;
    let googleFileId, googleFileUrl;

    if (req.body.uploadType === 'text') {
      // Text document creation
      const { title, content, format } = req.body;

      if (!title || !content) {
        return res.status(400).json({ message: "Title and content are required" });
      }

      // Create content in database first
      newContent = await Content.create({
        user: user._id,
        title,
        content,
        fileType: format === 'markdown' ? 'text/markdown' : 'text/plain',
        uploadType: 'text'
      });

      // Upload to Google Drive
      try {
        const drive = await getDriveClient(user);
        
        // Get or create Letters folder
        const folderId = await getLettersFolderId(drive);
        
        // Determine if we should convert to Google Docs
        const isMarkdown = format === 'markdown';
        const convertToGoogleDoc = true; // Always convert to Google Doc for better viewing
        
        let fileMetadata = {
          name: title,
          mimeType: convertToGoogleDoc ? 'application/vnd.google-apps.document' : 'text/plain',
        };
        
        // Add to Letters folder if available
        if (folderId) {
          fileMetadata.parents = [folderId];
        }

        let media;
        
        if (isMarkdown && convertToGoogleDoc) {
          // Convert markdown to HTML for better Google Docs import
          const html = convertMarkdownToHtml(content);
          media = {
            mimeType: 'text/html',
            body: html
          };
        } else {
          // Plain text
          media = {
            mimeType: 'text/plain',
            body: content
          };
        }

        const driveResponse = await drive.files.create({
          resource: fileMetadata,
          media: media,
          fields: "id,name,webViewLink,mimeType",
        });

        // Update with Google Drive info
        googleFileId = driveResponse.data.id;
        googleFileUrl = driveResponse.data.webViewLink;
        
        newContent.googleFileId = googleFileId;
        newContent.googleFileUrl = googleFileUrl;
        newContent.mimeType = driveResponse.data.mimeType;
        await newContent.save();
      } catch (driveError) {
        console.error("Google Drive upload error:", driveError);
        // Continue - we'll still save the content to our DB even if Drive fails
      }
    } else if (req.file || (req.files && req.files.length > 0)) {
      // File upload handling
      const file = req.file || req.files[0];
      const { title } = req.body;
      const content = req.body.content || ''; // Optional description
      
      if (!file) {
        return res.status(400).json({ message: "No file provided" });
      }

      // Create content entry in database
      newContent = await Content.create({
        user: user._id,
        title: title || file.originalname,
        content: content,
        fileType: file.mimetype,
        fileName: file.originalname,
        fileSize: file.size,
        uploadType: 'file'
      });

      // Upload to Google Drive
      try {
        const drive = await getDriveClient(user);
        
        // Get or create Letters folder
        const folderId = await getLettersFolderId(drive);
        
        const fileMetadata = {
          name: title || file.originalname,
          mimeType: file.mimetype,
        };
        
        // Add to Letters folder if available
        if (folderId) {
          fileMetadata.parents = [folderId];
        }

        const media = {
          mimeType: file.mimetype,
          body: fs.createReadStream(file.path)
        };

        const driveResponse = await drive.files.create({
          resource: fileMetadata,
          media: media,
          fields: "id,name,webViewLink",
        });

        // Update with Google Drive info
        googleFileId = driveResponse.data.id;
        googleFileUrl = driveResponse.data.webViewLink;
        
        newContent.googleFileId = googleFileId;
        newContent.googleFileUrl = googleFileUrl;
        await newContent.save();
        
        // Clean up the temporary file
        fs.unlink(file.path, (err) => {
          if (err) console.error("Error deleting temp file:", err);
        });
      } catch (driveError) {
        console.error("Google Drive upload error:", driveError);
        // Continue - we'll still save the content to our DB even if Drive fails
      }
    } else {
      // Handle FormData with file included
      if (!req.body.title) {
        return res.status(400).json({ message: "Title is required" });
      }

      // Create content in database
      const { title, content, uploadType, fileType } = req.body;
      
      newContent = await Content.create({
        user: user._id,
        title,
        content: content || '',
        fileType: fileType || 'text/plain',
        uploadType: uploadType || 'text'
      });

      // For text uploads to Google Drive
      try {
        const drive = await getDriveClient(user);
        
        // Get or create Letters folder
        const folderId = await getLettersFolderId(drive);
        
        // Determine if we should convert to Google Docs
        const convertToGoogleDoc = true;
        
        let fileMetadata = {
          name: title,
          mimeType: convertToGoogleDoc ? 'application/vnd.google-apps.document' : 'text/plain',
        };
        
        // Add to Letters folder if available
        if (folderId) {
          fileMetadata.parents = [folderId];
        }

        const media = {
          mimeType: 'text/plain',
          body: content || ''
        };

        const driveResponse = await drive.files.create({
          resource: fileMetadata,
          media: media,
          fields: "id,name,webViewLink,mimeType",
        });

        // Update with Google Drive info
        googleFileId = driveResponse.data.id;
        googleFileUrl = driveResponse.data.webViewLink;
        
        newContent.googleFileId = googleFileId;
        newContent.googleFileUrl = googleFileUrl;
        newContent.mimeType = driveResponse.data.mimeType;
        await newContent.save();
      } catch (driveError) {
        console.error("Google Drive upload error:", driveError);
      }
    }

    res.status(201).json({ 
      message: "Content created successfully", 
      content: newContent,
      googleFileId,
      googleFileUrl
    });
  } catch (error) {
    console.error("Create content error:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

export const updateContent = async (req, res) => {
  try {
    const user = await getAuthenticatedUser(req);
    if (!user) {
      return res.status(401).json({ message: "Not authenticated" });
    }

    const contentId = req.params.id;
    const { title, content } = req.body;

    // Find the content and ensure it belongs to this user
    const existingContent = await Content.findOne({ _id: contentId, user: user._id });

    if (!existingContent) {
      return res.status(404).json({ message: "Content not found or not authorized" });
    }

    // Update the content in database
    existingContent.title = title || existingContent.title;
    existingContent.content = content || existingContent.content;
    existingContent.updatedAt = new Date();
    await existingContent.save();

    // Update in Google Drive if possible
    if (existingContent.googleFileId) {
      try {
        const drive = await getDriveClient(user);
        
        // Update file metadata if needed
        if (title && title !== existingContent.title) {
          await drive.files.update({
            fileId: existingContent.googleFileId,
            resource: { name: title }
          });
        }
        
        // Update file content if it's a text document
        if (content && existingContent.uploadType === 'text') {
          // Determine if we should convert to HTML (for markdown)
          const isMarkdown = existingContent.fileType === 'text/markdown';
          const contentToUpload = isMarkdown ? convertMarkdownToHtml(content) : content;
          
          await drive.files.update({
            fileId: existingContent.googleFileId,
            media: {
              mimeType: isMarkdown ? 'text/html' : 'text/plain',
              body: contentToUpload
            }
          });
        }
      } catch (driveError) {
        console.error("Google Drive update error:", driveError);
      }
    }

    res.json({
      message: "Content updated successfully",
      content: existingContent
    });
  } catch (error) {
    console.error("Update content error:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

export const deleteContent = async (req, res) => {
  try {
    const user = await getAuthenticatedUser(req);
    if (!user) {
      return res.status(401).json({ message: "Not authenticated" });
    }

    const contentId = req.params.id;

    // Find the content and ensure it belongs to this user
    const content = await Content.findOne({ _id: contentId, user: user._id });

    if (!content) {
      return res.status(404).json({ message: "Content not found or not authorized" });
    }

    // Delete from Google Drive if possible
    if (content.googleFileId) {
      try {
        const drive = await getDriveClient(user);
        await drive.files.delete({ fileId: content.googleFileId });
      } catch (driveError) {
        console.error("Google Drive deletion error:", driveError);
      }
    }

    // Delete from database
    await Content.deleteOne({ _id: contentId });

    res.json({ message: "Content deleted successfully" });
  } catch (error) {
    console.error("Delete content error:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

export const getContentById = async (req, res) => {
  try {
    const user = await getAuthenticatedUser(req);
    if (!user) {
      return res.status(401).json({ message: "Not authenticated" });
    }

    const contentId = req.params.id;
    
    // Find the content and ensure it belongs to this user
    const content = await Content.findOne({ _id: contentId, user: user._id });

    if (!content) {
      return res.status(404).json({ message: "Content not found or not authorized" });
    }

    // If content has a Google Drive ID but no content, try to fetch it
    if (content.googleFileId && (!content.content || content.content === `Content from Google Drive: ${content.title}`)) {
      try {
        const drive = await getDriveClient(user);
        
        // Check the mime type to determine export format
        const file = await drive.files.get({
          fileId: content.googleFileId,
          fields: 'mimeType'
        });
        
        let exportMimeType = 'text/plain';
        let exportContent;
        
        if (file.data.mimeType === 'application/vnd.google-apps.document') {
          // This is a Google Doc, need to export it
          const exportResponse = await drive.files.export({
            fileId: content.googleFileId,
            mimeType: 'text/plain'
          });
          
          exportContent = exportResponse.data;
        } else {
          // Regular file, download content
          const downloadResponse = await drive.files.get({
            fileId: content.googleFileId,
            alt: 'media'
          });
          
          exportContent = downloadResponse.data;
        }
        
        // Update our content with the latest from Google Drive
        content.content = exportContent;
        await content.save();
      } catch (driveError) {
        console.error("Error fetching content from Google Drive:", driveError);
      }
    }

    res.json({ content });
  } catch (error) {
    console.error("Get content by ID error:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

export const syncWithGoogleDrive = async (req, res) => {
  try {
    const user = await getAuthenticatedUser(req);
    if (!user) {
      return res.status(401).json({ message: "Not authenticated" });
    }

    if (!user.refreshToken) {
      return res.status(400).json({ message: "No Google refresh token available" });
    }

    const drive = await getDriveClient(user);

    // Get files from Google Drive
    const response = await drive.files.list({
      pageSize: 100,
      fields: "files(id, name, mimeType, webViewLink, createdTime, description)",
      orderBy: "modifiedTime desc"
    });

    const files = response.data.files;

    // Process each file and create/update in our database
    let syncedCount = 0;
    for (const file of files) {
      // Skip folders and Google system files
      if (file.mimeType === "application/vnd.google-apps.folder" || 
          file.name.startsWith('.') || 
          file.trashed === true) {
        continue;
      }

      // Check if already exists in our DB
      let existingContent = await Content.findOne({
        user: user._id,
        googleFileId: file.id,
      });

      if (!existingContent) {
        // Create new content entry
        let contentType = 'file';
        
        // Identify if it's a document type
        if (file.mimeType === 'application/vnd.google-apps.document' || 
            file.mimeType.includes('text/') || 
            file.mimeType.includes('document')) {
          contentType = 'text';
        }
        
        await Content.create({
          user: user._id,
          title: file.name,
          content: file.description || `Content from Google Drive: ${file.name}`, // Placeholder
          googleFileId: file.id,
          googleFileUrl: file.webViewLink,
          mimeType: file.mimeType,
          uploadType: contentType,
          createdAt: new Date(file.createdTime),
          updatedAt: new Date()
        });
        syncedCount++;
      }
    }

    // Get updated content list
    const updatedContent = await Content.find({ user: user._id }).sort({
      updatedAt: -1,
    });

    res.json({
      message: `Successfully synced with Google Drive`,
      syncedCount,
      totalFiles: files.length,
      content: updatedContent
    });
  } catch (error) {
    console.error("Sync with Google Drive error:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

// Middleware for file uploads
export const uploadFile = upload.single('file');
export const uploadMultipleFiles = upload.array('files', 5); // Allow up to 5 files