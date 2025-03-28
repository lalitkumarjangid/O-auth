import { useState, useEffect } from 'react';
import axios from 'axios';

// Use environment variables for production URLs
const FRONTEND_URL = import.meta.env.VITE_FRONTEND_URL || window.location.origin;
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'https://o-auth-weld.vercel.app';

export const useAuth = () => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [logoutInProgress, setLogoutInProgress] = useState(false);

  // Configure axios defaults for cross-domain credentials
  useEffect(() => {
    axios.defaults.withCredentials = true;
  }, []);

  // Setup axios response interceptor to handle auth errors globally
  useEffect(() => {
    const interceptorId = axios.interceptors.response.use(
      response => response,
      error => {
        // Handle 401 errors globally - could indicate invalid/expired token
        if (error.response?.status === 401 && user) {
          console.log('Session expired or invalid. Clearing local state.');
          setUser(null);
        }
        return Promise.reject(error);
      }
    );

    return () => {
      // Clean up interceptor on component unmount
      axios.interceptors.response.eject(interceptorId);
    };
  }, [user]);

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
      if (error.response?.status !== 401) {
        setError(error.response?.data?.message || 'Failed to fetch user data');
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUser();
  }, []);

  const login = () => {
    window.location.href = `${API_BASE_URL}/auth/google`;
  };

  const logout = async () => {
    if (logoutInProgress) return; // Prevent multiple logout attempts
    
    setLogoutInProgress(true);
    setLoading(true);
    
    try {
      // First ensure we actually clear our local state
      setUser(null);
      
      // Use a more reliable approach to clear cookies
      const response = await axios.get(`${API_BASE_URL}/auth/logout`, { 
        withCredentials: true,
        // Add cache-busting parameter to prevent cached responses
        params: { _t: new Date().getTime() } 
      });
      
      console.log('Logout successful:', response.data);
      
      // Clear any localStorage items if you're using them
      localStorage.removeItem('lastAuthCheck');
      
      // Short timeout to ensure state changes have propagated
      setTimeout(() => {
        // Force redirect to login page with cache-busting parameter
        window.location.href = `${FRONTEND_URL}/login?logout=true&t=${new Date().getTime()}`;
      }, 100);
      
    } catch (error) {
      console.error('Logout error:', error);
      setError('Logout failed. Please try again.');
      setLoading(false);
      setLogoutInProgress(false);
      
      // Even if the server request fails, clear user state anyway
      // to prevent the user from being stuck in a logged-in state
      setUser(null);
      
      // Provide a way for the user to continue to logout page even if API fails
      if (confirm('Server logout failed. Continue to login page anyway?')) {
        window.location.href = `${FRONTEND_URL}/login?manual=true`;
      }
    }
  };

  // Check if session is still valid periodically
  useEffect(() => {
    if (!user) return;
    
    const checkInterval = 5 * 60 * 1000; // Check every 5 minutes
    const intervalId = setInterval(() => {
      // Store last check time to avoid excessive API calls
      const lastCheck = localStorage.getItem('lastAuthCheck');
      const now = new Date().getTime();
      
      if (!lastCheck || now - parseInt(lastCheck) > checkInterval) {
        localStorage.setItem('lastAuthCheck', now.toString());
        fetchUser().catch(err => {
          console.log('Session validation error:', err);
        });
      }
    }, checkInterval);
    
    return () => clearInterval(intervalId);
  }, [user]);

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
    refreshUser,
    logoutInProgress
  };
};

export default useAuth;