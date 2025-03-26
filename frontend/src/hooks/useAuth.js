import { useState, useEffect } from 'react';
import axios from 'axios';

// Frontend is likely on port 3000, backend should be different (e.g., 5000)
const FRONTEND_URL = 'http://localhost:5173';
const API_BASE_URL = 'http://localhost:3000'; // Change this to your backend URL

export const useAuth = () => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchUser = async () => {
    setLoading(true);
    try {
      const response = await axios.get(`${API_BASE_URL}/auth/user`, { 
        withCredentials: true 
      });
      setUser(response.data.user);
      setError(null);
    } catch (error) {
      setUser(null);
      setError(error.response?.data?.message || 'Failed to fetch user data');
      console.error('Auth error:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUser();
  }, []);

  const login = () => {
    // Redirect to backend auth endpoint
    window.location.href = `${API_BASE_URL}/auth/google`;
  };

  const logout = async () => {
    setLoading(true);
    try {
      await axios.get(`${API_BASE_URL}/auth/logout`, { withCredentials: true });
      setUser(null);
      setError(null);
      // Redirect to frontend login page after logout
      window.location.href = `${FRONTEND_URL}/login`;
    } catch (error) {
      setError('Logout failed');
      console.error('Logout failed:', error);
    } finally {
      setLoading(false);
    }
  };

  const refreshUser = () => {
    return fetchUser();
  };

  return { 
    user, 
    loading, 
    error,
    isAuthenticated: !!user,
    login, 
    logout,
    refreshUser
  };
};

export default useAuth;