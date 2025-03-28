import { useState, useEffect } from "react";
import axios from "axios";
import { toast } from "react-toastify";

// Get environment variables based on current environment
const isProduction = import.meta.env.PROD || window.location.hostname !== 'localhost';

// Use environment variables or fallback to appropriate values
const API_BASE_URL = isProduction
  ? import.meta.env.VITE_API_BASE_URL || 'https://o-auth-weld.vercel.app'
  : import.meta.env.VITE_LOCAL_API_URL || 'https://o-auth-weld.vercel.app';

export const useContent = () => {
  const [contents, setContents] = useState([]);
  const [currentContent, setCurrentContent] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [lettersFolderId, setLettersFolderId] = useState(null);

  // Configure axios defaults
  useEffect(() => {
    axios.defaults.withCredentials = true;
  }, []);

  const fetchContents = async () => {
    setLoading(true);
    setError(null);
    
    try {
      const res = await axios.get(`${API_BASE_URL}/drive/files`, { 
        withCredentials: true 
      });
      
      setContents(res.data.content || []);
      
      // Extract letters folder ID if available
      if (res.data.lettersFolderId) {
        setLettersFolderId(res.data.lettersFolderId);
      }
    } catch (error) {
      setError(error.response?.data?.message || "Failed to load content");
      
      if (error.response?.status === 401) {
        toast.error("Please login to access your content");
      } else {
        toast.error("Failed to load your letters and files");
      }
    } finally {
      setLoading(false);
    }
  };

  /**
   * Create new content - handles both text letters and file uploads
   * @param {Object|FormData} contentData - Data for the new content
   */
  const createContent = async (contentData) => {
    setLoading(true);
    try {
      let res;
      
      // Check if we're dealing with FormData (file upload) or JSON (letter)
      if (contentData instanceof FormData) {
        // Log the form data for debugging
        console.log("FormData being sent:"), 
        console.log("FormData being sent:");
        for (let [key, value] of contentData.entries()) {
          console.log(`${key}: ${value instanceof File ? value.name : value}`);
        }
        
        res = await axios.post(`${API_BASE_URL}/drive/upload`, contentData, {
          withCredentials: true,
          headers: {
            // Remove Content-Type to let the browser set it with the boundary parameter
            // This is crucial for multipart/form-data uploads
          },
        });
      } else {
        console.log("JSON content being sent:", contentData);
        res = await axios.post(`${API_BASE_URL}/drive/upload`, contentData, {
          withCredentials: true,
          headers: {
            "Content-Type": "application/json",
          },
        });
      }
      
      const successMsg = contentData instanceof FormData 
        ? "File uploaded to Google Drive successfully"
        : "Letter saved to Google Drive successfully";
      
      toast.success(successMsg);
      
      // Refresh content list after successful creation
      await fetchContents();
      
      return res.data.content;
    } catch (error) {
      console.error("Upload error details:", error.response?.data || error.message);
      
      if (error.response?.status === 401) {
        toast.error("Session expired. Please login again");
      } else if (error.response?.status === 413) {
        toast.error("File is too large. Maximum size is 10MB");
      } else {
        const errorMsg = error.response?.data?.message || "Failed to save to Google Drive";
        toast.error(errorMsg);
        throw new Error(errorMsg);
      }
    } finally {
      setLoading(false);
    }
  };

  /**
   * Fetch a specific content item by ID
   * @param {string} contentId - The ID of the content to fetch
   */
  const getContentById = async (contentId) => {
    setLoading(true);
    try {
      const res = await axios.get(`${API_BASE_URL}/drive/${contentId}`, {
        withCredentials: true
      });
      
      setCurrentContent(res.data.content);
      return res.data.content;
    } catch (error) {
      if (error.response?.status === 401) {
        toast.error("Session expired. Please login again");
      } else if (error.response?.status === 404) {
        toast.error("Letter or file not found");
      } else {
        toast.error("Failed to load content");
      }
      throw error;
    } finally {
      setLoading(false);
    }
  };

  /**
   * Update existing content
   * @param {string} contentId - The ID of the content to update
   * @param {Object} updateData - The data to update
   */
  const updateContent = async (contentId, updateData) => {
    setLoading(true);
    try {
      const res = await axios.put(`${API_BASE_URL}/drive/${contentId}`, updateData, {
        withCredentials: true,
        headers: {
          "Content-Type": "application/json",
        },
      });
      
      toast.success("Letter updated successfully");
      
      // Update the local content state
      setContents(prevContents => 
        prevContents.map(content => 
          content._id === contentId ? res.data.content : content
        )
      );
      
      if (currentContent && currentContent._id === contentId) {
        setCurrentContent(res.data.content);
      }
      
      return res.data.content;
    } catch (error) {
      if (error.response?.status === 401) {
        toast.error("Session expired. Please login again");
      } else {
        toast.error("Failed to update letter");
        throw new Error("Update failed");
      }
    } finally {
      setLoading(false);
    }
  };

  /**
   * Update content details using the new API endpoint
   * @param {string} contentId - The ID of the content to update
   * @param {Object} updateData - The data to update
   */
  const updateContentDetails = async (contentId, updateData) => {
    setLoading(true);
    try {
      const res = await axios.put(`${API_BASE_URL}/drive/content/${contentId}`, updateData, {
        withCredentials: true,
        headers: {
          "Content-Type": "application/json",
        },
      });
      
      toast.success("Content details updated successfully");
      
      // Update the local content state
      setContents(prevContents => 
        prevContents.map(content => 
          content._id === contentId ? res.data.content : content
        )
      );
      
      if (currentContent && currentContent._id === contentId) {
        setCurrentContent(res.data.content);
      }
      
      return res.data.content;
    } catch (error) {
      console.error("Content update error:", error.response?.data || error.message);
      
      if (error.response?.status === 401) {
        toast.error("Session expired. Please login again");
      } else if (error.response?.status === 404) {
        toast.error("Content not found");
      } else {
        toast.error("Failed to update content details");
        throw new Error("Content update failed");
      }
    } finally {
      setLoading(false);
    }
  };

  /**
   * Delete content by ID
   * @param {string} contentId - The ID of the content to delete
   */
  const deleteContent = async (contentId) => {
    try {
      await axios.delete(`${API_BASE_URL}/drive/${contentId}`, {
        withCredentials: true,
      });
      
      toast.success("Content deleted successfully");
      
      // Update local state after successful deletion
      setContents(prevContents => 
        prevContents.filter(content => content._id !== contentId)
      );
      
      // Clear current content if it was deleted
      if (currentContent && currentContent._id === contentId) {
        setCurrentContent(null);
      }
    } catch (error) {
      if (error.response?.status === 401) {
        toast.error("Session expired. Please login again");
      } else {
        toast.error("Failed to delete content");
        throw new Error("Delete failed");
      }
    }
  };

  /**
   * Sync content with Google Drive
   */
  const syncWithGoogleDrive = async () => {
    setLoading(true);
    try {
      const res = await axios.post(`${API_BASE_URL}/drive/sync-drive`, {}, {
        withCredentials: true,
      });
      
      const syncedCount = res.data.syncedCount || 0;
      
      if (syncedCount > 0) {
        toast.success(`Synced ${syncedCount} new items from Google Drive`);
      } else {
        toast.info("Your content is already in sync with Google Drive");
      }
      
      // Update content list after sync
      if (res.data.content) {
        setContents(res.data.content);
      } else {
        await fetchContents();
      }
      
      // Update letters folder ID if available
      if (res.data.lettersFolderId) {
        setLettersFolderId(res.data.lettersFolderId);
      }
      
      return res.data;
    } catch (error) {
      if (error.response?.status === 401) {
        toast.error("Session expired. Please login again");
      } else {
        toast.error("Failed to sync with Google Drive");
      }
    } finally {
      setLoading(false);
    }
  };

  /**
   * Share content with other users
   * @param {string} contentId - The ID of the content to share
   * @param {string} email - The email to share with
   * @param {string} permission - The permission level ('view' or 'edit')
   */
  const shareContent = async (contentId, email, permission = 'view') => {
    try {
      const res = await axios.post(`${API_BASE_URL}/drive/${contentId}/share`, {
        email,
        permission
      }, {
        withCredentials: true
      });
      
      toast.success(`Letter shared with ${email} successfully`);
      
      // Update the content if it's the current one being viewed
      if (currentContent && currentContent._id === contentId) {
        setCurrentContent(res.data.content);
      }
      
      return res.data;
    } catch (error) {
      if (error.response?.status === 401) {
        toast.error("Session expired. Please login again");
      } else if (error.response?.status === 404) {
        toast.error("Letter not found");
      } else {
        toast.error(error.response?.data?.message || "Failed to share letter");
      }
    }
  };

  /**
   * Get a download link for a specific file
   * @param {string} contentId - The ID of the content to download
   */
  const getDownloadLink = async (contentId) => {
    try {
      const res = await axios.get(`${API_BASE_URL}/drive/${contentId}/download`, {
        withCredentials: true
      });
      
      return res.data.downloadUrl;
    } catch (error) {
      toast.error("Failed to generate download link");
      throw error;
    }
  };

  // Filter functions for easier content management
  const getLetters = () => contents.filter(content => content.uploadType === 'text');
  const getFiles = () => contents.filter(content => content.uploadType === 'file');

  // Load content on component mount
  useEffect(() => {
    fetchContents();
  }, []);

  return { 
    contents, 
    currentContent,
    loading,
    error,
    lettersFolderId,
    createContent,
    getContentById,
    updateContent,
    updateContentDetails, // Added the new function to the return object
    deleteContent, 
    fetchContents,
    syncWithGoogleDrive,
    shareContent,
    getDownloadLink,
    getLetters,
    getFiles
  };
};

export default useContent;