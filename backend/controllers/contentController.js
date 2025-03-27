import Content from "../models/ContentData.js";
import User from "../models/User.js";
import { 
  saveTextToGoogleDrive, 
  getFilesFromGoogleDrive, 
  deleteFileFromGoogleDrive 
} from "../config/googleDrive.js";

export const createContent = async (req, res) => {
  try {
    if (!req.user) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    const { title, description } = req.body;

    if (!title || !description) {
      return res.status(400).json({ message: "Title and description are required" });
    }

    // Get user with refresh token
    const user = await User.findById(req.user._id);
    
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }
    
    // Check if user has refresh token
    if (!user.refreshToken) {
      // Fall back to local storage only if no refresh token
      console.warn(`User ${user._id} has no refresh token. Creating content locally only.`);
      
      const newContent = new Content({
        title,
        description,
        userId: req.user._id,
      });

      await newContent.save();

      return res.status(201).json({ 
        message: "Content created successfully (local only)", 
        content: newContent,
        googleDriveStatus: "not_saved" 
      });
    }

    try {
      // Save content to Google Drive
      const driveFile = await saveTextToGoogleDrive(
        user.refreshToken,
        title,
        description
      );

      // Create new content record with Google Drive file info
      const newContent = new Content({
        title,
        description,
        userId: req.user._id,
        googleDriveFileId: driveFile.id,
        googleDriveLink: driveFile.webViewLink
      });

      await newContent.save();

      res.status(201).json({ 
        message: "Content created and saved to Google Drive successfully", 
        content: newContent,
        googleDriveStatus: "saved" 
      });
    } catch (driveError) {
      console.error("Google Drive error:", driveError);
      
      // If Google Drive fails, still save content locally
      const newContent = new Content({
        title,
        description,
        userId: req.user._id,
      });

      await newContent.save();

      res.status(201).json({ 
        message: "Content created locally (Google Drive save failed)", 
        content: newContent,
        googleDriveStatus: "failed",
        googleDriveError: driveError.message 
      });
    }
  } catch (error) {
    console.error("Error creating content:", error);
    res.status(500).json({ message: "Internal server error", error: error.message });
  }
};

export const getContent = async (req, res) => {
  try {
    if (!req.user) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    // Get local content records for the current user only
    const content = await Content.find({ userId: req.user._id }).sort({ createdAt: -1 });
    
    // Get user with refresh token to possibly fetch from Drive too
    const user = await User.findById(req.user._id);

    // If user has refresh token, try to sync with Google Drive files
    if (user && user.refreshToken) {
      try {
        // Get files from Google Drive
        const driveFiles = await getFilesFromGoogleDrive(user.refreshToken);
        
        // Add a flag to indicate the content includes Google Drive data
        res.status(200).json({ 
          content,
          googleDriveFilesCount: driveFiles.length,
          syncStatus: "success"
        });
      } catch (driveError) {
        console.error("Error fetching from Google Drive:", driveError);
        // Return local content only if Drive fetch fails
        res.status(200).json({ 
          content,
          syncStatus: "failed",
          syncError: driveError.message
        });
      }
    } else {
      // Return local content only
      res.status(200).json({ 
        content,
        syncStatus: "no_auth"
      });
    }
  } catch (error) {
    console.error("Error fetching content:", error);
    res.status(500).json({ message: "Internal server error", error: error.message });
  }
};

export const deleteContent = async (req, res) => {
  try {
    if (!req.user) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    const { id } = req.params;
    
    // Only find content that belongs to the current user
    const content = await Content.findOne({ _id: id, userId: req.user._id });

    if (!content) {
      return res.status(404).json({ message: "Content not found or you don't have permission to delete it" });
    }

    // Get user with refresh token
    const user = await User.findById(req.user._id);
    
    let googleDriveStatus = "not_applicable";
    
    if (content.googleDriveFileId && user?.refreshToken) {
      // Delete from Google Drive
      try {
        await deleteFileFromGoogleDrive(user.refreshToken, content.googleDriveFileId);
        googleDriveStatus = "deleted";
      } catch (driveError) {
        console.error("Error deleting from Google Drive:", driveError);
        googleDriveStatus = "delete_failed";
        // Continue with local deletion even if Drive deletion fails
      }
    }

    // Delete from local database
    await Content.findByIdAndDelete(id);
    
    res.status(200).json({ 
      message: "Content deleted successfully", 
      googleDriveStatus 
    });
  } catch (error) {
    console.error("Error deleting content:", error);
    res.status(500).json({ message: "Internal server error", error: error.message });
  }
};

// New function to sync with Google Drive files
export const syncWithGoogleDrive = async (req, res) => {
  try {
    if (!req.user) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    const user = await User.findById(req.user._id);
    
    if (!user || !user.refreshToken) {
      return res.status(400).json({ 
        message: "Google Drive access not available. Please re-authenticate with Google." 
      });
    }

    // Get files from Google Drive
    const driveFiles = await getFilesFromGoogleDrive(user.refreshToken);
    
    // Process each Drive file
    let newFilesCount = 0;
    let existingFilesCount = 0;
    
    for (const file of driveFiles) {
      // Check if this file is already in our database
      const existingContent = await Content.findOne({ 
        googleDriveFileId: file.id,
        userId: user._id
      });
      
      if (!existingContent) {
        // Create new record for this Drive file
        await Content.create({
          title: file.name,
          description: `Imported from Google Drive (${file.id})`,
          userId: user._id,
          googleDriveFileId: file.id,
          googleDriveLink: file.webViewLink,
          createdAt: file.modifiedTime,
          updatedAt: file.modifiedTime
        });
        newFilesCount++;
      } else {
        existingFilesCount++;
      }
    }
    
    res.status(200).json({
      message: "Google Drive sync completed successfully",
      totalDriveFiles: driveFiles.length,
      newFilesImported: newFilesCount,
      existingFiles: existingFilesCount
    });
  } catch (error) {
    console.error("Error syncing with Google Drive:", error);
    res.status(500).json({ message: "Google Drive sync failed", error: error.message });
  }
};