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

  const exchangeCodeForToken = async (code, provider) => {
    setIsLoading(true);
    setError('');
    
    try {
      // Send code to your backend
      const response = await fetch('http://localhost:5000/api/auth/token', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ code, provider }),
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || 'Authentication failed');
      }
      
      // Save auth info in local storage
      localStorage.setItem('authToken', data.token);
      localStorage.setItem('userInfo', JSON.stringify(data.user));
      localStorage.removeItem('oauthProvider');
      
      setUser(data.user);
      setIsLoading(false);
      
    } catch (err) {
      console.error('Authentication error:', err);
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
  // Login page
  return (
    <div className="flex h-screen items-center justify-center bg-gray-100">
      <div className="p-8 bg-white rounded-lg shadow-md w-full max-w-md">
        <h2 className="text-2xl font-bold text-center mb-6">Login</h2>
        
        {error && (
          <div className="mb-4 p-3 bg-red-100 text-red-700 rounded-md">
            {error}
          </div>
        )}
        
        <div className="space-y-4">
          <button
            onClick={() => handleOAuthLogin('google')}
            className="w-full flex items-center justify-center bg-white hover:bg-gray-50 text-gray-800 border border-gray-300 py-2 px-4 rounded-md transition-colors"
          >
            <svg className="w-5 h-5 mr-2" viewBox="0 0 24 24">
              <path
                fill="currentColor"
                d="M12.545,10.239v3.821h5.445c-0.712,2.315-2.647,3.972-5.445,3.972c-3.332,0-6.033-2.701-6.033-6.032s2.701-6.032,6.033-6.032c1.498,0,2.866,0.549,3.921,1.453l2.814-2.814C17.503,2.988,15.139,2,12.545,2C7.021,2,2.543,6.477,2.543,12s4.478,10,10.002,10c8.396,0,10.249-7.85,9.426-11.748L12.545,10.239z"
              />
            </svg>
            Continue with Google
          </button>
          
          <button
            onClick={() => handleOAuthLogin('github')}
            className="w-full flex items-center justify-center bg-gray-800 hover:bg-gray-900 text-white py-2 px-4 rounded-md transition-colors"
          >
            <svg className="w-5 h-5 mr-2" viewBox="0 0 24 24">
              <path
                fill="currentColor"
                d="M12,2A10,10 0 0,0 2,12C2,16.42 4.87,20.17 8.84,21.5C9.34,21.58 9.5,21.27 9.5,21C9.5,20.77 9.5,20.14 9.5,19.31C6.73,19.91 6.14,17.97 6.14,17.97C5.68,16.81 5.03,16.5 5.03,16.5C4.12,15.88 5.1,15.9 5.1,15.9C6.1,15.97 6.63,16.93 6.63,16.93C7.5,18.45 8.97,18 9.54,17.76C9.63,17.11 9.89,16.67 10.17,16.42C7.95,16.17 5.62,15.31 5.62,11.5C5.62,10.39 6,9.5 6.65,8.79C6.55,8.54 6.2,7.5 6.75,6.15C6.75,6.15 7.59,5.88 9.5,7.17C10.29,6.95 11.15,6.84 12,6.84C12.85,6.84 13.71,6.95 14.5,7.17C16.41,5.88 17.25,6.15 17.25,6.15C17.8,7.5 17.45,8.54 17.35,8.79C18,9.5 18.38,10.39 18.38,11.5C18.38,15.32 16.04,16.16 13.81,16.41C14.17,16.72 14.5,17.33 14.5,18.26C14.5,19.6 14.5,20.68 14.5,21C14.5,21.27 14.66,21.59 15.17,21.5C19.14,20.16 22,16.42 22,12A10,10 0 0,0 12,2Z"
              />
            </svg>
            Continue with GitHub
          </button>
          
          <div className="relative flex items-center justify-center mt-6">
            <div className="border-t border-gray-300 absolute w-full"></div>
            <div className="bg-white px-4 text-sm text-gray-500 relative">or</div>
          </div>
          
          <form className="mt-4">
            <div className="mb-4">
              <label htmlFor="email" className="block text-gray-700 text-sm font-medium mb-1">
                Email Address
              </label>
              <input
                type="email"
                id="email"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="you@example.com"
              />
            </div>
            
            <div className="mb-6">
              <label htmlFor="password" className="block text-gray-700 text-sm font-medium mb-1">
                Password
              </label>
              <input
                type="password"
                id="password"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="••••••••"
              />
              <div className="flex justify-end mt-1">
                <a href="#" className="text-sm text-blue-600 hover:underline">
                  Forgot password?
                </a>
              </div>
            </div>
            
            <button
              type="submit"
              className="w-full bg-blue-600 hover:bg-blue-700 text-white py-2 px-4 rounded-md transition-colors"
            >
              Sign in
            </button>
          </form>
          
          <p className="text-center text-sm text-gray-600 mt-6">
            Don't have an account?{' '}
            <a href="#" className="text-blue-600 hover:underline">
              Sign up
            </a>
          </p>
        </div>
      </div>
    </div>
  );
};

export default OAuthLoginPage;
