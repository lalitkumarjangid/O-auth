import { useAuth } from '../hooks/useAuth';
import { Navigate, useNavigate } from 'react-router-dom';
import { useState, useEffect, useCallback, useMemo } from 'react';
import { useContent } from '../hooks/useContent';

const Dashboard = () => {
  const { user, loading: authLoading, logout, logoutInProgress } = useAuth();
  const {
    contents,
    loading: contentLoading,
    error,
    deleteContent,
    syncWithGoogleDrive,
    getLetters,
    updateContentDetails
  } = useContent();
  
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('content');
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  const [avatarError, setAvatarError] = useState(false);
  const [editModal, setEditModal] = useState({ isOpen: false, content: null });
  const [editFormData, setEditFormData] = useState({ title: '', description: '' });
  const [profileForm, setProfileForm] = useState({ displayName: '', email: '' });
  const [settings, setSettings] = useState({
    notifications: true,
    darkMode: false,
    emailUpdates: true
  });

  const letters = useMemo(() => getLetters ? getLetters() : [], [getLetters]);
  const combinedContent = useMemo(() => {
    const contentArray = Array.isArray(contents) ? contents : [];
    const result = [...contentArray];
    letters.forEach(letter => {
      if (!result.some(item => item._id === letter._id)) {
        result.push(letter);
      }
    });
    return result;
  }, [contents, letters]);

  useEffect(() => {
    if (user) {
      setAvatarError(false);
      setProfileForm({
        displayName: user.displayName || '',
        email: user.email || ''
      });
    }
  }, [user]);

  const handleNavigate = useCallback((path) => () => navigate(path), [navigate]);
  
  const handleDeleteContent = useCallback(async (contentId, contentType = 'content') => {
    const message = contentType === 'letter'
      ? "Are you sure you want to delete this letter? This action cannot be undone."
      : "Are you sure you want to delete this content?";
    
    if (!window.confirm(message)) return;
    try {
      await deleteContent(contentId);
    } catch (err) {
      console.error(`Error deleting ${contentType}:`, err);
    }
  }, [deleteContent]);

  const handleEditClick = useCallback((content) => {
    setEditModal({ isOpen: true, content });
    setEditFormData({
      title: content.title || content.name || '',
      description: content.description || ''
    });
  }, []);

  const handleEditSubmit = useCallback(async (e) => {
    e.preventDefault();
    if (!editModal.content) return;

    try {
      await updateContentDetails(editModal.content._id || editModal.content.id, editFormData);
      setEditModal({ isOpen: false, content: null });
    } catch (err) {
      console.error("Error updating content:", err);
    }
  }, [editModal.content, editFormData, updateContentDetails]);

  const handleLogoutClick = useCallback(() => setShowLogoutConfirm(true), []);
  const handleConfirmLogout = useCallback(async () => {
    try {
      await logout();
    } catch (error) {
      console.error("Logout failed:", error);
      setShowLogoutConfirm(false);
    }
  }, [logout]);

  const handleAvatarError = useCallback((e) => {
    setAvatarError(true);
    e.target.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(user?.displayName || 'User')}&background=0D8ABC&color=fff`;
  }, [user?.displayName]);

  const handleProfileSubmit = useCallback((e) => {
    e.preventDefault();
    // Here you would typically call an API to update user profile
    console.log('Profile updated:', profileForm);
  }, [profileForm]);

  const handleSettingsChange = useCallback((key) => (e) => {
    setSettings(prev => ({ ...prev, [key]: e.target.checked }));
  }, []);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (showLogoutConfirm && !event.target.closest('.logout-modal')) {
        setShowLogoutConfirm(false);
      }
      if (editModal.isOpen && !event.target.closest('.edit-modal')) {
        setEditModal(prev => ({ ...prev, isOpen: false }));
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showLogoutConfirm, editModal.isOpen]);

  const formatDate = useCallback((dateString) => {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    return `${date.toLocaleDateString()} at ${date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
  }, []);

  const getContentIcon = useCallback((content) => {
    const isLetter = content.uploadType === 'text';
    const fileType = content.mimeType || content.fileType || '';
    if (isLetter) return "📝";
    if (fileType.includes("image")) return "🖼️";
    if (fileType.includes("pdf")) return "📕";
    if (fileType.includes("word") || fileType.includes("document")) return "📄";
    if (fileType.includes("spreadsheet") || fileType.includes("excel")) return "📊";
    if (fileType.includes("presentation")) return "📺";
    return "📁";
  }, []);

  const renderTabButton = (tab, icon, label) => (
    <button
      onClick={() => setActiveTab(tab)}
      className={`w-full text-left px-4 py-2 rounded-md flex items-center ${activeTab === tab ? 'bg-blue-100 text-blue-600' : 'hover:bg-gray-100'}`}
    >
      {icon}
      {label}
    </button>
  );

  const renderContentTable = () => (
    <div className="bg-gray-50 rounded-lg p-4">
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-100">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Title</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Type</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Last Updated</th>
              <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Google Drive</th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {combinedContent.map((content) => (
              <tr key={content._id || content.id} className="hover:bg-gray-50">
                <td className="px-6 py-4">
                  <div className="flex items-center">
                    <span className="mr-2 text-xl">{getContentIcon(content)}</span>
                    <div>
                      <div className="text-sm font-medium text-gray-900">{content.title || content.name}</div>
                      <div className="text-xs text-gray-500">
                        {content.uploadType === 'text'
                          ? `Letter · ${content.format || 'plain'} format`
                          : content.mimeType || content.fileType || "File"}
                      </div>
                    </div>
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                    {content.uploadType === 'text' ? 'Letter' : 'File'}
                  </span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                  {formatDate(content.updatedAt || content.modifiedTime || content.createdTime || content.createdAt)}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-center">
                  {content.googleFileUrl || content.webViewLink ? (
                    <a
                      href={content.googleFileUrl || content.webViewLink}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-blue-600 hover:text-blue-900 flex items-center justify-center"
                    >
                      <svg className="h-5 w-5 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                      </svg>
                      Open
                    </a>
                  ) : (
                    <span className="text-gray-400">Not synced</span>
                  )}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                  <div className="flex justify-end space-x-2">
                    <button
                      onClick={() => handleEditClick(content)}
                      className={`${content.uploadType === 'text' ? 'text-green-600 hover:text-green-900' : 'text-blue-600 hover:text-blue-900'} flex items-center`}
                    >
                      <svg className="h-5 w-5 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                      </svg>
                      Update
                    </button>
                    <button
                      onClick={() => handleDeleteContent(content._id || content.id, content.uploadType === 'text' ? 'letter' : 'file')}
                      className="text-red-600 hover:text-red-900 flex items-center"
                    >
                      <svg className="h-5 w-5 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
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
    </div>
  );

  if (authLoading || logoutInProgress) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-gray-100">
        <div className="animate-spin rounded-full h-16 w-16 border-t-4 border-b-4 border-blue-600 mb-4"></div>
        <p className="text-lg font-medium text-gray-700">
          {logoutInProgress ? "Signing out..." : "Loading..."}
        </p>
      </div>
    );
  }

  if (!user) return <Navigate to="/" />;

  return (
    <div className="min-h-screen bg-gray-100 flex">
      <div className="fixed inset-y-0 left-0 w-64 bg-white shadow-md flex flex-col">
        <div className="p-4 border-b border-gray-200">
          <div className="flex items-center mb-3">
            <img
              src={user.photoURL}
              alt="User profile"
              className="w-10 h-10 rounded-full mr-3 border-2 border-blue-100"
              onError={handleAvatarError}
            />
            <div>
              <h1 className="text-xl font-bold text-gray-800">WarrantyMe</h1>
              <p className="text-sm text-gray-500">Welcome, {user.displayName || 'User'}</p>
            </div>
          </div>
        </div>
        <nav className="p-4 flex-1">
          <ul className="space-y-2">
            <li>{renderTabButton('content', 
              <svg className="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>, 'My Letters')}
            </li>
            <li>{renderTabButton('profile',
              <svg className="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
              </svg>, 'Profile')}
            </li>
            <li>{renderTabButton('settings',
              <svg className="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>, 'Settings')}
            </li>
          </ul>
        </nav>
        <div className="p-4 border-t border-gray-200">
          <button
            onClick={handleLogoutClick}
            className="w-full px-4 py-2 bg-red-100 text-red-600 rounded-md hover:bg-red-200 transition flex items-center justify-center"
          >
            <svg className="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
            </svg>
            Sign Out
          </button>
        </div>
      </div>

      <div className="flex-1 ml-64 p-8">
        <div className="bg-white rounded-lg shadow-md p-6">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-2xl font-bold text-gray-800">
              {activeTab === 'content' ? 'My Letters & Documents' : activeTab.charAt(0).toUpperCase() + activeTab.slice(1)}
            </h2>
            <div className="flex items-center space-x-2">
              <img
                src={user.photoURL}
                alt="User profile"
                className="w-8 h-8 rounded-full"
                onError={handleAvatarError}
              />
              <span className="text-sm font-medium">{user.displayName || 'User'}</span>
            </div>
          </div>

          {activeTab === 'content' && (
            <div>
              <div className="mb-6 flex items-center justify-between">
                <h3 className="text-lg font-semibold">Letters & Documents in Google Drive</h3>
                <div className="flex space-x-3">
                  <button
                    onClick={syncWithGoogleDrive}
                    className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 transition flex items-center"
                  >
                    <svg className="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                    </svg>
                    Sync with Drive
                  </button>
                  <button
                    onClick={handleNavigate('/content')}
                    className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition flex items-center"
                  >
                    <svg className="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                    </svg>
                    Create New Letter
                  </button>
                </div>
              </div>

              {error && (
                <div className="mb-4 bg-red-50 text-red-700 p-3 rounded-md border border-red-200">
                  {error}
                </div>
              )}

              {contentLoading ? (
                <div className="flex justify-center py-10">
                  <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-500"></div>
                </div>
              ) : combinedContent.length > 0 ? (
                renderContentTable()
              ) : (
                <div className="bg-gray-50 p-10 rounded-lg text-center">
                  <div className="text-7xl mb-4 mx-auto text-gray-400">📝</div>
                  <h4 className="text-lg font-medium text-gray-600 mb-2">No letters created yet</h4>
                  <p className="text-gray-500 mb-4">Create your first letter to get started</p>
                  <button
                    onClick={handleNavigate('/content')}
                    className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition"
                  >
                    Create New Letter
                  </button>
                </div>
              )}
            </div>
          )}

{activeTab === 'profile' && (
  <div className="space-y-6">
    <div className="flex items-center space-x-4">
      <img
        src={user.photoURL}
        alt="User profile"
        className="w-24 h-24 rounded-full border-2 border-blue-100"
        onError={handleAvatarError}
      />
      <div>
        <h3 className="text-xl font-semibold text-gray-800">{user.displayName || 'User'}</h3>
        <p className="text-gray-600">{user.email}</p>
      </div>
    </div>

    <div className="bg-gray-50 rounded-lg p-6">
      <h4 className="text-lg font-semibold mb-4">Account Information</h4>
      <div className="space-y-3 text-gray-700">
        <div className="flex items-center border-b border-gray-200 pb-3">
          <svg className="h-5 w-5 mr-3 text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
          </svg>
          <div>
            <span className="font-medium">Last Login:</span>
            <div className="text-sm mt-1">{formatDate(user.lastLogin || new Date())}</div>
          </div>
        </div>
        
        <div className="flex items-center border-b border-gray-200 py-3">
          <svg className="h-5 w-5 mr-3 text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <div>
            <span className="font-medium">Account Created:</span>
            <div className="text-sm mt-1">{formatDate(user.createdAt || new Date())}</div>
          </div>
        </div>
        
        <div className="flex items-center pt-3">
          <svg className="h-5 w-5 mr-3 text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
          <div>
            <span className="font-medium">Total Documents:</span>
            <div className="text-sm mt-1">{combinedContent.length}</div>
          </div>
        </div>
      </div>
    </div>
  </div>
)}

          {activeTab === 'settings' && (
            <div className="space-y-6">
              <div>
                <h3 className="text-lg font-semibold mb-4">Preferences</h3>
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="font-medium">Notifications</h4>
                      <p className="text-sm text-gray-600">Receive notifications about document updates</p>
                    </div>
                    <input
                      type="checkbox"
                      checked={settings.notifications}
                      onChange={handleSettingsChange('notifications')}
                      className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                    />
                  </div>
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="font-medium">Dark Mode</h4>
                      <p className="text-sm text-gray-600">Enable dark theme across the application</p>
                    </div>
                    <input
                      type="checkbox"
                      checked={settings.darkMode}
                      onChange={handleSettingsChange('darkMode')}
                      className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                    />
                  </div>
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="font-medium">Email Updates</h4>
                      <p className="text-sm text-gray-600">Receive email updates about your account</p>
                    </div>
                    <input
                      type="checkbox"
                      checked={settings.emailUpdates}
                      onChange={handleSettingsChange('emailUpdates')}
                      className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                    />
                  </div>
                </div>
              </div>

              <div className="border-t pt-4">
                <h3 className="text-lg font-semibold mb-4">Account Management</h3>
                <div className="space-y-4">
                  <button
                    className="w-full px-4 py-2 bg-yellow-600 text-white rounded-md hover:bg-yellow-700 transition flex items-center justify-center"
                  >
                    <svg className="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 11c0-1.104-.896-2-2-2s-2 .896-2 2c0 .738.402 1.376 1 1.723V15a1 1 0 001 1h2a1 1 0 001-1v-2.277c.598-.347 1-.985 1-1.723zm9-2v12a2 2 0 01-2 2H5a2 2 0 01-2-2V9a2 2 0 012-2h1V5a3 3 0 013-3h6a3 3 0 013 3v2h1a2 2 0 012 2z" />
                    </svg>
                    Change Password
                  </button>
                  <button
                    className="w-full px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 transition flex items-center justify-center"
                  >
                    <svg className="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                    Delete Account
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {showLogoutConfirm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4 logout-modal">
            <h3 className="text-xl font-semibold mb-4 text-gray-800">Sign Out</h3>
            <p className="mb-6 text-gray-600">Are you sure you want to sign out of your account?</p>
            <div className="flex justify-end space-x-3">
              <button
                onClick={() => setShowLogoutConfirm(false)}
                className="px-4 py-2 bg-gray-200 text-gray-800 rounded-md hover:bg-gray-300 transition"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmLogout}
                className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 transition"
              >
                Sign Out
              </button>
            </div>
          </div>
        </div>
      )}

      {editModal.isOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4 edit-modal">
            <h3 className="text-xl font-semibold mb-4 text-gray-800">Update Content</h3>
            <form onSubmit={handleEditSubmit}>
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-1">Title</label>
                <input
                  type="text"
                  value={editFormData.title}
                  onChange={(e) => setEditFormData(prev => ({ ...prev, title: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>
              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                <textarea
                  value={editFormData.description}
                  onChange={(e) => setEditFormData(prev => ({ ...prev, description: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 h-24"
                />
              </div>
              <div className="flex justify-end space-x-3">
                <button
                  type="button"
                  onClick={() => setEditModal(prev => ({ ...prev, isOpen: false }))}
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

export default Dashboard;