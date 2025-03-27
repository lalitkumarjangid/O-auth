import User from "../models/User.js";
import Content from "../models/ContentData.js"; // Assuming you have a Content model
import { google } from "googleapis";

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
            console.error('[CONTENT] Error re-establishing session:', err);
          }
        });
        return user;
      }
    } catch (err) {
      console.error('[CONTENT] Error finding user by token:', err);
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
    refresh_token: user.refreshToken
  });
  
  // Refresh the token if needed
  await oauth2Client.getAccessToken();
  
  return google.drive({ version: 'v3', auth: oauth2Client });
};

export const getContent = async (req, res) => {
  try {
    console.log('[CONTENT] getContent called');
    
    const user = await getAuthenticatedUser(req);
    if (!user) {
      console.log('[CONTENT] No authenticated user found');
      return res.status(401).json({ message: "Not authenticated" });
    }
    
    console.log('[CONTENT] Fetching content for user:', user._id);
    
    // Get content from your database
    const content = await Content.find({ user: user._id }).sort({ updatedAt: -1 });
    
    res.json({ content });
  } catch (error) {
    console.error('[CONTENT] Error getting content:', error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

export const createContent = async (req, res) => {
  try {
    console.log('[CONTENT] createContent called');
    
    const user = await getAuthenticatedUser(req);
    if (!user) {
      console.log('[CONTENT] No authenticated user found');
      return res.status(401).json({ message: "Not authenticated" });
    }
    
    const { title, content } = req.body;
    
    if (!title || !content) {
      return res.status(400).json({ message: "Title and content are required" });
    }
    
    console.log('[CONTENT] Creating content for user:', user._id);
    
    // Create content in your database
    const newContent = await Content.create({
      user: user._id,
      title,
      content
    });
    
    // Upload to Google Drive if possible
    try {
      const drive = await getDriveClient(user);
      
      const fileMetadata = {
        name: title,
        mimeType: 'text/plain',
      };
      
      const media = {
        mimeType: 'text/plain',
        body: content
      };
      
      const driveResponse = await drive.files.create({
        resource: fileMetadata,
        media: media,
        fields: 'id,name,webViewLink'
      });
      
      console.log('[CONTENT] File created in Google Drive:', driveResponse.data.id);
      
      // Update with Google Drive info
      newContent.googleFileId = driveResponse.data.id;
      newContent.googleFileUrl = driveResponse.data.webViewLink;
      await newContent.save();
    } catch (driveError) {
      console.error('[CONTENT] Google Drive upload error:', driveError);
      // Continue with local storage only, Google Drive upload is optional
    }
    
    res.status(201).json({ message: "Content created", content: newContent });
  } catch (error) {
    console.error('[CONTENT] Error creating content:', error);
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
        console.log('[CONTENT] Deleted file from Google Drive:', content.googleFileId);
      } catch (driveError) {
        console.error('[CONTENT] Google Drive deletion error:', driveError);
        // Continue with local deletion, Google Drive deletion is optional
      }
    }
    
    // Delete from database
    await Content.deleteOne({ _id: contentId });
    
    res.json({ message: "Content deleted successfully" });
  } catch (error) {
    console.error('[CONTENT] Error deleting content:', error);
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
      pageSize: 50,
      fields: 'files(id, name, mimeType, webViewLink, createdTime)',
    });
    
    const files = response.data.files;
    console.log('[CONTENT] Files fetched from Google Drive:', files.length);
    
    // Process each file and create/update in our database
    let syncedCount = 0;
    for (const file of files) {
      // Skip folders and non-text files
      if (file.mimeType === 'application/vnd.google-apps.folder') {
        continue;
      }
      
      // Check if already exists in our DB
      let existingContent = await Content.findOne({ 
        user: user._id, 
        googleFileId: file.id 
      });
      
      if (!existingContent) {
        // Create new content entry
        await Content.create({
          user: user._id,
          title: file.name,
          content: `Content from Google Drive: ${file.name}`, // Placeholder
          googleFileId: file.id,
          googleFileUrl: file.webViewLink,
          createdAt: new Date(file.createdTime),
        });
        syncedCount++;
      }
    }
    
    res.json({ 
      message: `Successfully synced with Google Drive`, 
      syncedCount,
      totalFiles: files.length
    });
  } catch (error) {
    console.error('[CONTENT] Error syncing with Google Drive:', error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
};