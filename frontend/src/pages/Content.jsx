import React, { useState } from "react";
import { useContent } from "../hooks/useContent";
import FileUpload from "../components/FileUpload";
import { toast } from "react-toastify";

const Content = () => {
  const {
    contents,
    loading,
    createContent,
    deleteContent,
    syncWithGoogleDrive,
    getLetters,
    getFiles,
    updateContentDetails
  } = useContent();

  const [activeTab, setActiveTab] = useState('all'); // 'all', 'letters', 'files'
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [editingContent, setEditingContent] = useState(null);
  const [editFormData, setEditFormData] = useState({ title: '', description: '' });

  const handleCreate = async (contentData) => {
    try {
      // Check if contentData is FormData (file upload) or regular object (text)
      if (contentData instanceof FormData) {
        await createContent(contentData);
        toast.success("File uploaded successfully to Google Drive");
      } else {
        // This is a text document (letter)
        await createContent({
          title: contentData.title,
          content: contentData.content,
          uploadType: 'text',
          format: contentData.format || 'markdown',
          saveToGoogleDrive: true
        });
        toast.success("Letter saved to Google Drive successfully");
      }
      // Note: fetchContents is already called in createContent
    } catch (error) {
      toast.error(error.message || "Creation failed");
    }
  };

  const handleDelete = async (contentId, contentType = 'content') => {
    const confirmMessage = contentType === 'letter'
      ? "Are you sure you want to delete this letter? This action cannot be undone."
      : "Are you sure you want to delete this content?";

    if (!window.confirm(confirmMessage)) return;

    try {
      await deleteContent(contentId);
      toast.success(`${contentType === 'letter' ? 'Letter' : 'Content'} deleted successfully`);
    } catch (error) {
      toast.error(`Failed to delete ${contentType}`);
    }
  };

  const handleSync = async () => {
    try {
      await syncWithGoogleDrive();
    } catch (error) {
      toast.error("Failed to sync with Google Drive");
    }
  };

  // Handle edit content
  const handleEditClick = (content) => {
    setEditingContent(content);
    setEditFormData({
      title: content.title || content.name || '',
      description: content.description || ''
    });
    setEditModalOpen(true);
  };

  // Handle edit form submission
  const handleEditSubmit = async (e) => {
    e.preventDefault();
    if (!editingContent) return;

    try {
      await updateContentDetails(editingContent._id || editingContent.id, editFormData);
      setEditModalOpen(false);
      setEditingContent(null);
      toast.success("Content details updated successfully");
    } catch (err) {
      console.error("Error updating content:", err);
      toast.error("Failed to update content details");
    }
  };

  // Close modal when clicking outside
  React.useEffect(() => {
    const handleClickOutside = (event) => {
      if (editModalOpen && !event.target.closest('.edit-modal')) {
        setEditModalOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [editModalOpen]);

  // Filter and display content based on active tab
  const getFilteredContent = () => {
    if (!Array.isArray(contents)) return [];

    switch (activeTab) {
      case 'letters':
        return getLetters();
      case 'files':
        return getFiles();
      case 'all':
      default:
        return contents;
    }
  };

  const filteredContents = getFilteredContent();

  // Strip HTML tags from content for preview
  const stripHtml = (html) => {
    if (!html) return '';
    const temp = document.createElement('div');
    temp.innerHTML = html;
    return temp.textContent || temp.innerText || '';
  };

  // Get content type icon
  const getContentIcon = (content) => {
    const isLetter = content.uploadType === 'text';
    const fileType = content.mimeType || content.fileType || '';

    if (isLetter) return "📝";
    if (fileType.includes("image")) return "🖼️";
    if (fileType.includes("pdf")) return "📕";
    if (fileType.includes("word") || fileType.includes("document")) return "📄";
    if (fileType.includes("spreadsheet") || fileType.includes("excel")) return "📊";
    if (fileType.includes("presentation")) return "📺";
    return "📁";
  };

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-gray-800">Your Letters & Documents</h1>
        <button
          onClick={handleSync}
          className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 flex items-center"
        >
          <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
          Sync with Google Drive
        </button>
      </div>

      <div className="mb-8">
        <FileUpload onCreate={handleCreate} />
      </div>

      {/* Content tabs */}
      <div className="border-b border-gray-200 mb-4">
        <nav className="-mb-px flex space-x-8">
          <button
            onClick={() => setActiveTab('all')}
            className={`${activeTab === 'all'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              } whitespace-nowrap py-2 px-1 border-b-2 font-medium text-sm`}
          >
            All Items
          </button>
          <button
            onClick={() => setActiveTab('letters')}
            className={`${activeTab === 'letters'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              } whitespace-nowrap py-2 px-1 border-b-2 font-medium text-sm`}
          >
            Letters
          </button>
          <button
            onClick={() => setActiveTab('files')}
            className={`${activeTab === 'files'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              } whitespace-nowrap py-2 px-1 border-b-2 font-medium text-sm`}
          >
            Uploaded Files
          </button>
        </nav>
      </div>

      {loading ? (
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
        </div>
      ) : (
        <div className="bg-white rounded-lg shadow overflow-hidden">
          {filteredContents.length === 0 ? (
            <div className="text-center py-12">
              <div className="mx-auto h-12 w-12 text-gray-400">
                {activeTab === 'letters' ? '📝' : activeTab === 'files' ? '📁' : '📄'}
              </div>
              <h3 className="mt-2 text-lg font-medium text-gray-900">
                {activeTab === 'letters'
                  ? "No letters created yet"
                  : activeTab === 'files'
                    ? "No files uploaded yet"
                    : "No content created yet"}
              </h3>
              <p className="mt-1 text-sm text-gray-500">
                {activeTab === 'letters'
                  ? "Create your first letter using the editor above."
                  : activeTab === 'files'
                    ? "Upload your first file using the upload option above."
                    : "Get started by creating your first letter or uploading a file."}
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Title
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Preview
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Last Updated
                    </th>
                    <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Google Drive
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {filteredContents.map((content) => (
                    <tr key={content._id || content.id}>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <span className="mr-2">{getContentIcon(content)}</span>
                          <div>
                            <div className="text-sm font-medium text-gray-900">
                              {content.title || content.name}
                            </div>
                            <div className="text-xs text-gray-500">
                              {content.uploadType === 'text'
                                ? `Letter · ${content.format || 'plain'} format`
                                : content.mimeType || content.fileType || "File"}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-sm text-gray-500 truncate max-w-xs">
                          {/* Handle potential HTML content */}
                          {stripHtml(content.content || content.description)?.substring(0, 100)}
                          {(content.content || content.description)?.length > 100 ? '...' : ''}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-500">
                          {new Date(content.updatedAt || content.modifiedTime || content.createdTime || content.createdAt).toLocaleString()}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-center">
                        {/* Handle different field names from Google Drive API */}
                        {content.googleFileUrl || content.webViewLink ? (
                          <a
                            href={content.googleFileUrl || content.webViewLink}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-blue-600 hover:text-blue-900 flex items-center justify-center"
                          >
                            <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                            </svg>
                            Open
                          </a>
                        ) : (
                          <span className="text-gray-400">Not synced</span>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        <div className="flex justify-end space-x-2">
                          {/* Update Details button for all content types */}
                          <button
                            onClick={() => handleEditClick(content)}
                            className="text-green-600 hover:text-green-900 flex items-center"
                          >
                            <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                            </svg>
                            Update
                          </button>



                          <button
                            onClick={() => handleDelete(
                              content._id || content.id,
                              content.uploadType === 'text' ? 'letter' : 'file'
                            )}
                            className="text-red-600 hover:text-red-900 flex items-center"
                          >
                            <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
                            Delete
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Edit Content Modal */}
      {editModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4 edit-modal">
            <h3 className="text-xl font-semibold mb-4 text-gray-800">Update Content</h3>

            <form onSubmit={handleEditSubmit}>
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-1">Title</label>
                <input
                  type="text"
                  value={editFormData.title}
                  onChange={(e) => setEditFormData({ ...editFormData, title: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>

              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                <textarea
                  value={editFormData.description}
                  onChange={(e) => setEditFormData({ ...editFormData, description: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 h-24"
                />
              </div>

              <div className="flex justify-end space-x-3">
                <button
                  type="button"
                  onClick={() => setEditModalOpen(false)}
                  className="px-4 py-2 bg-gray-200 text-gray-800 rounded-md hover:bg-gray-300 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition"
                >
                  Update
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Content;