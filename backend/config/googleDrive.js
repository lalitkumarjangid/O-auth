import { google } from "googleapis";
import dotenv from "dotenv";
dotenv.config();

/**
 * Creates an OAuth2 client for Google Drive API
 * @param {string} refreshToken - User's refresh token
 * @returns {google.auth.OAuth2} - Configured OAuth2 client
 */
export const createOAuth2Client = (refreshToken) => {
  const oauth2Client = new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    process.env.GOOGLE_REDIRECT_URI
  );
  
  oauth2Client.setCredentials({
    refresh_token: refreshToken
  });
  
  return oauth2Client;
};

/**
 * Create a Google Drive API instance with user's auth
 * @param {string} refreshToken - User's refresh token
 * @returns {google.drive} - Google Drive API instance
 */
export const createDriveClient = (refreshToken) => {
  const oauth2Client = createOAuth2Client(refreshToken);
  return google.drive({ version: "v3", auth: oauth2Client });
};

/**
 * Save text content to Google Drive
 * @param {string} refreshToken - User's refresh token
 * @param {string} title - Document title
 * @param {string} content - Document content
 * @returns {Promise<Object>} - Google Drive file object
 */
export const saveTextToGoogleDrive = async (refreshToken, title, content) => {
  try {
    const drive = createDriveClient(refreshToken);
    
    // Create file metadata
    const fileMetadata = {
      name: title,
      mimeType: 'application/vnd.google-apps.document'
    };

    // Create the document with content
    const response = await drive.files.create({
      resource: fileMetadata,
      media: {
        mimeType: 'text/plain',
        body: content
      },
      fields: 'id,name,webViewLink'
    });

    return response.data;
  } catch (error) {
    console.error("Error saving to Google Drive:", error);
    throw error;
  }
};

/**
 * Get a list of documents from Google Drive
 * @param {string} refreshToken - User's refresh token
 * @returns {Promise<Array>} - List of Google Drive files
 */
export const getFilesFromGoogleDrive = async (refreshToken) => {
  try {
    const drive = createDriveClient(refreshToken);
    
    const response = await drive.files.list({
      q: "mimeType='application/vnd.google-apps.document'",
      fields: 'files(id, name, webViewLink, modifiedTime)',
      orderBy: 'modifiedTime desc'
    });
    
    return response.data.files;
  } catch (error) {
    console.error("Error fetching files from Google Drive:", error);
    throw error;
  }
};

/**
 * Delete a file from Google Drive
 * @param {string} refreshToken - User's refresh token
 * @param {string} fileId - Google Drive file ID
 * @returns {Promise<void>}
 */
export const deleteFileFromGoogleDrive = async (refreshToken, fileId) => {
  try {
    const drive = createDriveClient(refreshToken);
    await drive.files.delete({ fileId });
    return true;
  } catch (error) {
    console.error("Error deleting file from Google Drive:", error);
    throw error;
  }
};