import React, { useState, useRef, useEffect } from "react";
import { toast } from "react-toastify";

/**
 * Letter Editor component for WarrantyMe assignment
 * 
 * Features:
 * - Create and edit text-based letters
 * - Format text with Markdown
 * - Save letters to Google Drive
 * - Upload files as an alternative option
 * - Save and load drafts
 */
const FileUpload = ({ onCreate }) => {
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [file, setFile] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [uploadType, setUploadType] = useState("text"); // "text" or "file"
  const fileInputRef = useRef(null);
  const [isSaving, setIsSaving] = useState(false);
  const [hasDraft, setHasDraft] = useState(false);
  const [textFormat, setTextFormat] = useState("markdown"); // Default to markdown for better formatting
  const [showPreview, setShowPreview] = useState(false);
  const [autoSaveEnabled, setAutoSaveEnabled] = useState(true);
  const [titleError, setTitleError] = useState(""); // Add state for title validation error
  
  // Auto-save timer reference
  const autoSaveTimerRef = useRef(null);

  // Check for existing drafts on component mount
  useEffect(() => {
    const savedDraft = localStorage.getItem('letterDraft');
    setHasDraft(!!savedDraft);
    
    // Check if auto-save was previously disabled
    const savedAutoSavePref = localStorage.getItem('autoSaveEnabled');
    if (savedAutoSavePref !== null) {
      setAutoSaveEnabled(savedAutoSavePref === 'true');
    }
    
    return () => {
      if (autoSaveTimerRef.current) {
        clearTimeout(autoSaveTimerRef.current);
      }
    };
  }, []);

  // Set up auto-save
  useEffect(() => {
    if (!autoSaveEnabled || !title.trim() || !content.trim()) return;
    
    if (autoSaveTimerRef.current) {
      clearTimeout(autoSaveTimerRef.current);
    }
    
    autoSaveTimerRef.current = setTimeout(() => {
      saveDraft(false); // Silent save (no toast)
    }, 30000); // Auto-save every 30 seconds
    
    return () => {
      if (autoSaveTimerRef.current) {
        clearTimeout(autoSaveTimerRef.current);
      }
    };
  }, [title, content, autoSaveEnabled]);

  // Clear title error when title changes
  useEffect(() => {
    if (title.trim()) {
      setTitleError("");
    }
  }, [title]);

  // Get file size in human-readable format
  const formatFileSize = (bytes) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  // Get appropriate icon based on file type
  const getFileIcon = (fileType) => {
    if (!fileType) return "📄";
    
    if (fileType.includes("image")) return "🖼️";
    if (fileType.includes("pdf")) return "📕";
    if (fileType.includes("word") || fileType.includes("document")) return "📝";
    if (fileType.includes("excel") || fileType.includes("spreadsheet")) return "📊";
    if (fileType.includes("presentation") || fileType.includes("powerpoint")) return "📊";
    if (fileType.includes("text")) return "📄";
    if (fileType.includes("video")) return "🎬";
    if (fileType.includes("audio")) return "🎵";
    if (fileType.includes("zip") || fileType.includes("compressed")) return "🗂️";
    
    return "📄"; // Default
  };

  const handleFileChange = (e) => {
    const selectedFile = e.target.files[0];
    if (!selectedFile) return;

    // Check file size (limit to 10MB)
    if (selectedFile.size > 10 * 1024 * 1024) {
      toast.error("File size should not exceed 10MB");
      return;
    }

    setFile(selectedFile);
    
    // Auto-fill title with filename if title is empty
    if (!title.trim()) {
      const fileName = selectedFile.name.split('.')[0];
      setTitle(fileName);
    }
  };

  const saveDraft = (showToast = true) => {
    if (!title.trim()) {
      if (showToast) toast.error("Please enter a title to save draft");
      return;
    }

    try {
      if (showToast) setIsSaving(true);
      
      // Save draft to local storage
      const draft = {
        title,
        content,
        uploadType,
        textFormat,
        lastSaved: new Date().toISOString()
      };

      localStorage.setItem('letterDraft', JSON.stringify(draft));
      setHasDraft(true);
      if (showToast) toast.success("Draft saved successfully");
    } catch (error) {
      if (showToast) toast.error("Failed to save draft");
    } finally {
      if (showToast) setIsSaving(false);
    }
  };

  const handleSaveDraft = () => {
    saveDraft(true);
  };

  const handleLoadDraft = () => {
    try {
      const savedDraft = localStorage.getItem('letterDraft');
      if (!savedDraft) {
        toast.info("No draft found");
        return;
      }

      const draft = JSON.parse(savedDraft);
      setTitle(draft.title || "");
      setContent(draft.content || "");
      setUploadType(draft.uploadType || "text");
      setTextFormat(draft.textFormat || "markdown");
      
      toast.success("Draft loaded successfully");
    } catch (error) {
      toast.error("Failed to load draft");
    }
  };

  const handleClearDraft = () => {
    if (window.confirm("Are you sure you want to discard this draft?")) {
      localStorage.removeItem('letterDraft');
      setHasDraft(false);
      toast.info("Draft discarded");
    }
  };

  const handleTextFormatChange = (format) => {
    setTextFormat(format);
  };

  const toggleAutoSave = () => {
    const newState = !autoSaveEnabled;
    setAutoSaveEnabled(newState);
    localStorage.setItem('autoSaveEnabled', String(newState));
    
    toast.info(newState 
      ? "Auto-save enabled. Your letter will save automatically every 30 seconds." 
      : "Auto-save disabled."
    );
  };

  // Simple toolbar for basic text formatting
  const applyFormatting = (format) => {
    const textarea = document.getElementById('content-editor');
    if (!textarea) return;

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const selectedText = content.substring(start, end);
    let formattedText = '';
    let cursorOffset = 0;

    switch(format) {
      case 'bold':
        formattedText = `**${selectedText}**`;
        cursorOffset = 2;
        break;
      case 'italic':
        formattedText = `*${selectedText}*`;
        cursorOffset = 1;
        break;
      case 'heading':
        formattedText = `# ${selectedText}`;
        cursorOffset = 2;
        break;
      case 'list':
        formattedText = `- ${selectedText}`;
        cursorOffset = 2;
        break;
      default:
        return;
    }

    const newContent = content.substring(0, start) + formattedText + content.substring(end);
    setContent(newContent);
    
    // Set cursor position after formatting tags
    setTimeout(() => {
      textarea.focus();
      if (selectedText) {
        textarea.selectionStart = start + formattedText.length;
        textarea.selectionEnd = start + formattedText.length;
      } else {
        textarea.selectionStart = start + cursorOffset;
        textarea.selectionEnd = start + cursorOffset;
      }
    }, 0);
  };
  
  // Convert Markdown to HTML for preview
  const renderMarkdownPreview = () => {
    if (!content) return '<p class="text-gray-400">Nothing to preview</p>';
    
    let html = content;
    // Simple markdown parsing
    
    // Headers
    html = html.replace(/^# (.*$)/gm, '<h1 class="text-2xl font-bold mb-3">$1</h1>');
    html = html.replace(/^## (.*$)/gm, '<h2 class="text-xl font-bold mb-2">$1</h2>');
    html = html.replace(/^### (.*$)/gm, '<h3 class="text-lg font-bold mb-2">$1</h3>');
    
    // Bold and italic
    html = html.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
    html = html.replace(/\*(.*?)\*/g, '<em>$1</em>');
    
    // Lists
    html = html.replace(/^\- (.*$)/gm, '<li>$1</li>');
    html = html.replace(/<\/li>\n<li>/g, '</li><li>');
    html = html.replace(/<li>(.+)(?=\n<li>|$)/gs, '<ul class="list-disc pl-4 mb-2"><li>$1</li></ul>');
    
    // Line breaks
    html = html.replace(/\n/g, '<br>');
    
    return html;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Enhanced title validation with better feedback
    const trimmedTitle = title.trim();
    if (!trimmedTitle) {
      setTitleError("Title is required");
      toast.error("Please enter a title before uploading");
      return;
    } else if (trimmedTitle.length < 3) {
      setTitleError("Title must be at least 3 characters");
      toast.error("Title must be at least 3 characters");
      return;
    }
  
    if (uploadType === "text" && !content.trim()) {
      toast.error("Content is required for letter creation");
      return;
    }
  
    if (uploadType === "file" && !file) {
      toast.error("Please select a file to upload");
      return;
    }
  
    try {
      setIsSubmitting(true);
      setTitleError(""); // Clear any previous errors
      
      if (uploadType === "text") {
        // For text documents, we'll send a regular JSON object
        const contentData = {
          title: trimmedTitle,
          content,
          uploadType: "text",
          format: textFormat,
          saveToGoogleDrive: true
        };
        
        await onCreate(contentData);
      } else {
        // For file uploads, create a FormData object
        const formData = new FormData();
        formData.append("title", trimmedTitle);
        formData.append("file", file);
        formData.append("uploadType", "file");
        formData.append("fileType", file.type);
        formData.append("saveToGoogleDrive", "true");
        
        // Add optional content as description
        if (content.trim()) {
          formData.append("content", content.trim());
        }
        
        // Debug what's being sent
        for (let [key, value] of formData.entries()) {
          console.log(`${key}: ${value instanceof File ? value.name : value}`);
        }
        
        await onCreate(formData);
      }
      
      // Clear draft from localStorage after successful upload
      localStorage.removeItem('letterDraft');
      setHasDraft(false);
      
      // Reset form after successful creation
      setTitle("");
      setContent("");
      setFile(null);
      if (fileInputRef.current) {
        fileInputRef.current.value = null;
      }
      toast.success(`Your ${uploadType === "text" ? "letter" : "file"} has been uploaded successfully`);
    } catch (error) {
      console.error("Upload failed:", error);
      // Don't duplicate toast messages - the useContent hook will show them
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="bg-white p-6 rounded-lg shadow">
      <h2 className="text-lg font-medium mb-4">Letter Editor</h2>
      
      {/* Upload Type Toggle */}
      <div className="mb-4">
        <div className="flex rounded-md shadow-sm">
          <button
            type="button"
            onClick={() => setUploadType("text")}
            className={`px-4 py-2 text-sm font-medium rounded-l-md ${
              uploadType === "text"
                ? "bg-blue-600 text-white"
                : "bg-gray-100 text-gray-700 hover:bg-gray-200"
            }`}
          >
            Create Letter
          </button>
          <button
            type="button"
            onClick={() => setUploadType("file")}
            className={`px-4 py-2 text-sm font-medium rounded-r-md ${
              uploadType === "file"
                ? "bg-blue-600 text-white"
                : "bg-gray-100 text-gray-700 hover:bg-gray-200"
            }`}
          >
            Upload Document
          </button>
        </div>
      </div>
      
      {/* Draft notification */}
      {hasDraft && (
        <div className="mb-4 p-3 bg-yellow-50 text-yellow-800 rounded-md flex justify-between items-center">
          <div>
            <span className="font-medium">You have a saved draft.</span> 
            <button 
              onClick={handleLoadDraft}
              className="ml-2 underline text-yellow-900 hover:text-yellow-700"
            >
              Load it?
            </button>
          </div>
          <button 
            onClick={handleClearDraft}
            className="text-yellow-800 hover:text-yellow-900"
          >
            ×
          </button>
        </div>
      )}
      
      <form onSubmit={handleSubmit}>
        <div className="mb-4">
          <label htmlFor="title" className="block text-sm font-medium text-gray-700 mb-1">
            Title*
          </label>
          <input
            id="title"
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className={`w-full px-3 py-2 border ${titleError ? 'border-red-500' : 'border-gray-300'} rounded-md`}
            disabled={isSubmitting}
            placeholder={uploadType === "text" ? "Enter letter title" : "Enter document title"}
            required
          />
          {titleError && (
            <p className="mt-1 text-sm text-red-600">{titleError}</p>
          )}
        </div>
        
        {uploadType === "text" ? (
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Letter Content*
            </label>
            
            {/* Text format toggle */}
            <div className="flex items-center justify-between mb-2">
              <div className="flex space-x-2">
                <button
                  type="button"
                  onClick={() => handleTextFormatChange("plain")}
                  className={`px-3 py-1 text-xs rounded ${
                    textFormat === "plain" 
                    ? "bg-blue-600 text-white" 
                    : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                  }`}
                >
                  Plain Text
                </button>
                <button
                  type="button"
                  onClick={() => handleTextFormatChange("markdown")}
                  className={`px-3 py-1 text-xs rounded ${
                    textFormat === "markdown" 
                    ? "bg-blue-600 text-white" 
                    : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                  }`}
                >
                  Markdown
                </button>
              </div>
              
              {textFormat === "markdown" && (
                <div>
                  <button
                    type="button"
                    onClick={() => setShowPreview(!showPreview)}
                    className="text-xs text-blue-600 hover:text-blue-800"
                  >
                    {showPreview ? "Hide Preview" : "Show Preview"}
                  </button>
                </div>
              )}
            </div>
            
            {/* Simple formatting toolbar */}
            {textFormat === "markdown" && (
              <div className="border-t border-l border-r border-gray-300 rounded-t-md bg-gray-50 p-1 flex justify-between">
                <div className="flex space-x-1">
                  <button
                    type="button"
                    onClick={() => applyFormatting('bold')}
                    className="p-1 hover:bg-gray-200 rounded"
                    title="Bold"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 16 16">
                      <path d="M8.21 13c2.106 0 3.412-1.087 3.412-2.823 0-1.306-.984-2.283-2.324-2.386v-.055a2.176 2.176 0 0 0 1.852-2.14c0-1.51-1.162-2.46-3.014-2.46H3.843V13H8.21zM5.908 4.674h1.696c.963 0 1.517.451 1.517 1.244 0 .834-.629 1.32-1.73 1.32H5.908V4.673zm0 6.788V8.598h1.73c1.217 0 1.88.492 1.88 1.415 0 .943-.643 1.449-1.832 1.449H5.907z"/>
                    </svg>
                  </button>
                  <button
                    type="button"
                    onClick={() => applyFormatting('italic')}
                    className="p-1 hover:bg-gray-200 rounded"
                    title="Italic"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 16 16">
                      <path d="M7.991 11.674 9.53 4.455c.123-.595.246-.71 1.347-.807l.11-.52H7.211l-.11.52c1.06.096 1.128.212 1.005.807L6.57 11.674c-.123.595-.246.71-1.346.806l-.11.52h3.774l.11-.52c-1.06-.095-1.129-.211-1.006-.806z"/>
                    </svg>
                  </button>
                  <button
                    type="button"
                    onClick={() => applyFormatting('heading')}
                    className="p-1 hover:bg-gray-200 rounded"
                    title="Heading"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 16 16">
                      <path d="M3.75 0a.75.75 0 0 1 .75.75V7h7V.75a.75.75 0 0 1 1.5 0v14.5a.75.75 0 0 1-1.5 0V8.5h-7v6.75a.75.75 0 0 1-1.5 0V.75A.75.75 0 0 1 3.75 0Z"/>
                    </svg>
                  </button>
                  <button
                    type="button"
                    onClick={() => applyFormatting('list')}
                    className="p-1 hover:bg-gray-200 rounded"
                    title="List"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 16 16">
                      <path fillRule="evenodd" d="M5 11.5a.5.5 0 0 1 .5-.5h9a.5.5 0 0 1 0 1h-9a.5.5 0 0 1-.5-.5zm0-4a.5.5 0 0 1 .5-.5h9a.5.5 0 0 1 0 1h-9a.5.5 0 0 1-.5-.5zm0-4a.5.5 0 0 1 .5-.5h9a.5.5 0 0 1 0 1h-9a.5.5 0 0 1-.5-.5zm-3 1a1 1 0 1 0 0-2 1 1 0 0 0 0 2zm0 4a1 1 0 1 0 0-2 1 1 0 0 0 0 2zm0 4a1 1 0 1 0 0-2 1 1 0 0 0 0 2z"/>
                    </svg>
                  </button>
                </div>
                
                <button
                  type="button" 
                  onClick={() => window.open('https://www.markdownguide.org/cheat-sheet/', '_blank')}
                  className="text-xs text-blue-600 hover:text-blue-800"
                  title="Open Markdown help in new tab"
                >
                  Markdown Help
                </button>
              </div>
            )}
            
            <div className={`${textFormat === "markdown" && !showPreview ? "border-l border-r border-b" : "border"} border-gray-300 rounded-${textFormat === "markdown" && !showPreview ? "b" : ""}md`}>
              {/* Main editor */}
              {(!showPreview || textFormat === "plain") && (
                <textarea
                  id="content-editor"
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  className={`w-full px-3 py-2 min-h-[300px] focus:outline-none focus:ring-1 focus:ring-blue-500 ${textFormat === "markdown" && !showPreview ? "rounded-none border-0" : "rounded-md border-0"}`}
                  disabled={isSubmitting}
                  placeholder={textFormat === "markdown" 
                    ? "Dear recipient,\n\nWrite your letter here. You can use formatting:\n\n# Main heading\n## Subheading\n\n**Bold text** or *italic text*\n\n- List item 1\n- List item 2\n\nSincerely,\nYour Name"
                    : "Dear recipient,\n\nWrite your letter content here.\n\nSincerely,\nYour Name"
                  }
                  required
                />
              )}
              
              {/* Preview mode */}
              {showPreview && textFormat === "markdown" && (
                <div className="p-4 min-h-[300px] bg-white">
                  <div className="text-xs text-gray-500 mb-2">Preview Mode</div>
                  <div 
                    className="prose max-w-none"
                    dangerouslySetInnerHTML={{ __html: renderMarkdownPreview() }}
                  />
                </div>
              )}
            </div>
            
            <div className="flex justify-between items-center mt-2 text-xs text-gray-500">
              <div>
                <span>Characters: {content.length}</span>
                <span className="mx-2">|</span>
                <span>Words: {content.trim() ? content.trim().split(/\s+/).length : 0}</span>
              </div>
              <span>This letter will be saved to your Google Drive.</span>
            </div>
            
            {/* Draft Actions */}
            <div className="mt-3 flex justify-between items-center">
              <div className="flex items-center">
                <label className="inline-flex items-center cursor-pointer">
                  <input 
                    type="checkbox" 
                    checked={autoSaveEnabled}
                    onChange={toggleAutoSave}
                    className="sr-only peer"
                  />
                  <div className="relative w-9 h-5 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-blue-600"></div>
                  <span className="ms-2 text-xs font-medium text-gray-500">Auto-save</span>
                </label>
              </div>
              <button
                type="button"
                onClick={handleSaveDraft}
                className="px-3 py-1 text-xs bg-gray-600 text-white rounded hover:bg-gray-700 flex items-center"
                disabled={isSaving}
              >
                {isSaving ? (
                  <>
                    <svg className="animate-spin h-3 w-3 mr-1" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Saving...
                  </>
                ) : "Save Draft"}
              </button>
            </div>
          </div>
        ) : (
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              File Upload*
            </label>
            <div className="mt-1 flex justify-center px-6 pt-5 pb-6 border-2 border-gray-300 border-dashed rounded-md">
              <div className="space-y-1 text-center">
                {!file ? (
                  <>
                    <svg
                      className="mx-auto h-12 w-12 text-gray-400"
                      stroke="currentColor"
                      fill="none"
                      viewBox="0 0 48 48"
                      aria-hidden="true"
                    >
                      <path
                        d="M28 8H12a4 4 0 00-4 4v20m32-12v8m0 0v8a4 4 0 01-4 4H12a4 4 0 01-4-4v-4m32-4l-3.172-3.172a4 4 0 00-5.656 0L28 28M8 32l9.172-9.172a4 4 0 015.656 0L28 28m0 0l4 4m4-24h8m-4-4v8m-12 4h.02"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                    <div className="flex text-sm text-gray-600">
                      <label
                        htmlFor="file-upload"
                        className="relative cursor-pointer bg-white rounded-md font-medium text-blue-600 hover:text-blue-500"
                      >
                        <span>Upload a file</span>
                        <input
                          id="file-upload"
                          name="file-upload"
                          type="file"
                          className="sr-only"
                          onChange={handleFileChange}
                          disabled={isSubmitting}
                          ref={fileInputRef}
                          accept=".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,.jpg,.jpeg,.png,.gif,.mp4,.mp3,.zip"
                        />
                      </label>
                      <p className="pl-1">or drag and drop</p>
                    </div>
                    <p className="text-xs text-gray-500">
                      Support for PDF, Office documents, images, and more (max 10MB)
                    </p>
                  </>
                ) : (
                  <div className="text-center">
                    <div className="text-4xl mb-2">{getFileIcon(file.type)}</div>
                    <p className="text-sm font-medium text-gray-900">{file.name}</p>
                    <p className="text-xs text-gray-500">{formatFileSize(file.size)}</p>
                    <button
                      type="button"
                      onClick={() => {
                        setFile(null);
                        if (fileInputRef.current) fileInputRef.current.value = null;
                      }}
                      className="mt-2 text-xs text-red-600 hover:text-red-800"
                    >
                      Remove file
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
        
        {/* Optional description for file uploads */}
        {uploadType === "file" && (
          <div className="mb-4">
            <label htmlFor="content" className="block text-sm font-medium text-gray-700 mb-1">
              Description (optional)
            </label>
            <textarea
              id="content"
              value={content}
              onChange={(e) => setContent(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md min-h-[100px]"
              disabled={isSubmitting}
              placeholder="Add a description for your file"
            />
          </div>
        )}

        <button
          type="submit"
          disabled={isSubmitting}
          className={`w-full px-4 py-2 rounded-md text-white ${isSubmitting ? 'bg-blue-400' : 'bg-blue-600 hover:bg-blue-700'}`}
        >
          {isSubmitting ? (
            <div className="flex items-center justify-center">
              <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              {uploadType === "text" ? "Saving to Google Drive..." : "Uploading..."}
            </div>
          ) : (
            uploadType === "text" ? "Save Letter to Google Drive" : "Upload to Google Drive"
          )}
        </button>
      </form>
    </div>
  );
};

export default FileUpload;