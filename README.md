
# OAuth Project

This project consists of a full-stack application with OAuth authentication using Google's API. It features a React frontend and an Express backend with MongoDB integration and Google Drive API connectivity.

## Tech Stack

### Frontend
- React 18
- Vite
- React Router DOM
- Axios for API requests
- React Toastify for notifications
- React Quill for rich text editing
- TailwindCSS for styling

### Backend
- Node.js with Express
- MongoDB with Mongoose
- Passport.js with Google OAuth 2.0
- Google Drive API integration
- Express Session with cookies
- Multer for file uploads
- Marked for Markdown parsing

## Running Locally

### Prerequisites
- Node.js (latest LTS version recommended)
- MongoDB instance (local or Atlas)
- Google OAuth credentials (Client ID and Secret)
- Google Drive API access configured

### Backend Setup
1. Navigate to the backend directory:
   ```sh
   cd backend
   ```
2. Install dependencies:
   ```sh
   npm install
   ```
3. Create a `.env` file with the following variables:
   ```env
   PORT=5000
   MONGO_URI=your_mongodb_uri
   GOOGLE_CLIENT_ID=your_google_client_id
   GOOGLE_CLIENT_SECRET=your_google_client_secret
   SESSION_SECRET=your_session_secret
   ```
4. Start the server:
   ```sh
   npm run dev
   ```

### Frontend Setup
1. Navigate to the frontend directory:
   ```sh
   cd frontend
   ```
2. Install dependencies:
   ```sh
   npm install
   ```
3. Create a `.env` file with the following variables:
   ```env
   VITE_API_BASE_URL=http://localhost:3000
   ```
4. Start the development server:
   ```sh
   npm run dev
   ```
5. Access the application at [http://localhost:5173](http://localhost:5173)

## Features
- Google OAuth authentication
- Document creation and management
- Google Drive integration for file storage
- File upload capability
- Markdown to HTML conversion
- Responsive design with Tailwind CSS

## Project Structure

### Frontend
- `src/`: Source code
  - `hooks/`: Custom React hooks for authentication and content management
  - `components/`: UI components
  - `App.jsx`: Main application component

### Backend
- `config/`: Configuration files for database and authentication
- `controllers/`: Request handlers
- `middleware/`: Custom middleware functions
- `models/`: Mongoose data models
- `routes/`: API route definitions
- `server.js`: Main server file

