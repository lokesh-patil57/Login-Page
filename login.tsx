import React, { useState, useEffect } from 'react';

const OAuthLoginPage = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [user, setUser] = useState(null);
  const [error, setError] = useState('');

  // OAuth configuration
  const oauthConfig = {
    google: {
      clientId: 'YOUR_GOOGLE_CLIENT_ID',
      redirectUri: 'http://localhost:3000/callback',
      authUrl: 'https://accounts.google.com/o/oauth2/auth',
      scope: 'email profile',
      responseType: 'code'
    },
    github: {
      clientId: 'YOUR_GITHUB_CLIENT_ID',
      redirectUri: 'http://localhost:3000/callback',
      authUrl: 'https://github.com/login/oauth/authorize',
      scope: 'user',
      responseType: 'code'
    }
  };

  // Check if the user is already logged in
  useEffect(() => {
    const token = localStorage.getItem('authToken');
    const userInfo = localStorage.getItem('userInfo');
    
    if (token && userInfo) {
      setUser(JSON.parse(userInfo));
    }
    
    // Handle OAuth callback
    const urlParams = new URLSearchParams(window.location.search);
    const code = urlParams.get('code');
    const provider = localStorage.getItem('oauthProvider');
    
    if (code && provider) {
      exchangeCodeForToken(code, provider);
    }
  }, []);

  // Exchange authorization code for access token
  const exchangeCodeForToken = async (code, provider) => {
    setIsLoading(true);
    setError('');
    
    try {
      // In a real application, this request should be sent to your backend
      // to securely exchange the code for a token
      console.log(`Exchanging code for token with ${provider}...`);
      
      // Mock successful authentication for demonstration
      setTimeout(() => {
        const mockUser = {
          id: '123456',
          name: 'John Doe',
          email: 'john.doe@example.com',
          provider
        };
        
        // Save auth info in local storage
        localStorage.setItem('authToken', 'mock-auth-token');
        localStorage.setItem('userInfo', JSON.stringify(mockUser));
        localStorage.removeItem('oauthProvider');
        
        setUser(mockUser);
        setIsLoading(false);
      }, 1000);
      
    } catch (err) {
      setError('Failed to authenticate. Please try again.');
      setIsLoading(false);
      localStorage.removeItem('oauthProvider');
    }
  };

  // Initiate OAuth login
  const handleOAuthLogin = (provider) => {
    localStorage.setItem('oauthProvider', provider);
    
    const config = oauthConfig[provider];
    const authUrl = new URL(config.authUrl);
    
    // Add query parameters
    authUrl.searchParams.append('client_id', config.clientId);
    authUrl.searchParams.append('redirect_uri', config.redirectUri);
    authUrl.searchParams.append('scope', config.scope);
    authUrl.searchParams.append('response_type', config.responseType);
    authUrl.searchParams.append('state', generateRandomState());
    
    // Redirect to the OAuth provider
    window.location.href = authUrl.toString();
  };

  // Generate a random state value for CSRF protection
  const generateRandomState = () => {
    return Math.random().toString(36).substring(2, 15);
  };

  // Handle logout
  const handleLogout = () => {
    localStorage.removeItem('authToken');
    localStorage.removeItem('userInfo');
    setUser(null);
  };

  // Display loading state
  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center bg-gray-100">
        <div className="p-8 bg-white rounded-lg shadow-md text-center">
          <p className="text-lg font-medium text-gray-700">Authenticating...</p>
          <div className="mt-4 w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto"></div>
        </div>
      </div>
    );
  }

  // User is logged in
  if (user) {
    return (
      <div className="flex h-screen items-center justify-center bg-gray-100">
        <div className="p-8 bg-white rounded-lg shadow-md w-full max-w-md">
          <h2 className="text-2xl font-bold text-center mb-6">Welcome!</h2>
          <div className="text-center mb-6">
            <p className="text-lg">You are logged in as:</p>
            <p className="font-medium text-gray-800">{user.name}</p>
            <p className="text-gray-600">{user.email}</p>
            <p className="text-sm text-gray-500 mt-2">via {user.provider}</p>
          </div>
          <button
            onClick={handleLogout}
            className="w-full bg-red-500 hover:bg-red-600 text-white py-2 px-4 rounded-md transition-colors"
          >
            Logout
          </button>
        </div>
      </div>
    );
  }

