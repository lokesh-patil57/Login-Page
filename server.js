// server.js
const express = require('express');
const axios = require('axios');
const cors = require('cors');
const bodyParser = require('body-parser');
const jwt = require('jsonwebtoken');
const dotenv = require('dotenv');

// Load environment variables
dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(bodyParser.json());

// JWT secret for creating our own tokens
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';

// OAuth configuration
const oauthConfig = {
  google: {
    clientId: process.env.GOOGLE_CLIENT_ID,
    clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    redirectUri: process.env.GOOGLE_REDIRECT_URI || 'http://localhost:3000/callback',
    tokenUrl: 'https://oauth2.googleapis.com/token',
    userInfoUrl: 'https://www.googleapis.com/oauth2/v3/userinfo'
  },
  github: {
    clientId: process.env.GITHUB_CLIENT_ID,
    clientSecret: process.env.GITHUB_CLIENT_SECRET,
    redirectUri: process.env.GITHUB_REDIRECT_URI || 'http://localhost:3000/callback',
    tokenUrl: 'https://github.com/login/oauth/access_token',
    userInfoUrl: 'https://api.github.com/user'
  }
};

// Database mock (in-memory store) - Replace with your actual database
const users = {};

// ===== Auth Routes =====

// Route to exchange authorization code for access token
app.post('/api/auth/token', async (req, res) => {
  const { code, provider } = req.body;
  
  if (!code || !provider) {
    return res.status(400).json({ error: 'Missing code or provider' });
  }
  
  if (!oauthConfig[provider]) {
    return res.status(400).json({ error: 'Invalid provider' });
  }
  
  try {
    // Exchange code for access token
    const tokenResponse = await exchangeCodeForToken(code, provider);
    
    // Get user info with the access token
    const userInfo = await fetchUserInfo(tokenResponse.access_token, provider);
    
    // Create or update user in the database
    const user = await findOrCreateUser(userInfo, provider);
    
    // Create our own JWT token for the client
    const token = jwt.sign(
      { userId: user.id, email: user.email, provider },
      JWT_SECRET,
      { expiresIn: '7d' }
    );
    
    // Return user info and token to the client
    res.json({
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        provider
      },
      token
    });
    
  } catch (error) {
    console.error('Authentication error:', error);
    res.status(500).json({ error: 'Authentication failed' });
  }
});

// Route to verify token and get current user
app.get('/api/auth/me', authenticateToken, (req, res) => {
  // The user is attached to the request by the authenticateToken middleware
  res.json({ user: req.user });
});

// Route to logout (just for completeness, actual logout happens on client)
app.post('/api/auth/logout', (req, res) => {
  // In a real implementation, you might blacklist the token
  res.json({ success: true, message: 'Logged out successfully' });
});

// ===== Helper Functions =====

// Exchange authorization code for access token
async function exchangeCodeForToken(code, provider) {
  const config = oauthConfig[provider];
  
  // Prepare the request data based on the provider
  let requestData;
  let headers = {};
  
  if (provider === 'google') {
    requestData = {
      client_id: config.clientId,
      client_secret: config.clientSecret,
      redirect_uri: config.redirectUri,
      code,
      grant_type: 'authorization_code'
    };
  } else if (provider === 'github') {
    requestData = {
      client_id: config.clientId,
      client_secret: config.clientSecret,
      redirect_uri: config.redirectUri,
      code
    };
    headers['Accept'] = 'application/json';
  }
  
  // Make the request to the OAuth provider
  const response = await axios.post(config.tokenUrl, requestData, { headers });
  
  // Handle GitHub's JSON response
  if (provider === 'github') {
    return response.data;
  }
  
  // Handle Google's response
  return response.data;
}

// Fetch user info from the OAuth provider
async function fetchUserInfo(accessToken, provider) {
    const config = oauthConfig[provider];
    let headers = { Authorization: `Bearer ${accessToken}` };
    
    // GitHub uses a different authorization header
    if (provider === 'github') {
      headers = { Authorization: `token ${accessToken}` };
    }
    
    const response = await axios.get(config.userInfoUrl, { headers });
    return response.data;
  }
  
  // Find or create a user in the database
  async function findOrCreateUser(userInfo, provider) {
    // Extract user data based on provider
    let userData;
    
    if (provider === 'google') {
      userData = {
        id: userInfo.sub,
        name: userInfo.name,
        email: userInfo.email,
        picture: userInfo.picture,
        provider
      };
    } else if (provider === 'github') {
      userData = {
        id: userInfo.id.toString(),
        name: userInfo.name || userInfo.login,
        email: userInfo.email || `${userInfo.login}@github.com`,
        picture: userInfo.avatar_url,
        provider
      };
    }
    
    // In a real app, you would store this in your database
    // For this example, we'll use our in-memory store
    const userKey = `${provider}:${userData.id}`;
    
    if (!users[userKey]) {
      // Create new user
      users[userKey] = {
        ...userData,
        created_at: new Date(),
        updated_at: new Date()
      };
    } else {
      // Update existing user
      users[userKey] = {
        ...users[userKey],
        ...userData,
        updated_at: new Date()
      };
    }
    
    return users[userKey];
  }
  
  // Middleware to authenticate JWT token
  function authenticateToken(req, res, next) {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];
    
    if (!token) {
      return res.status(401).json({ error: 'Authorization token required' });
    }
    
    jwt.verify(token, JWT_SECRET, (err, user) => {
      if (err) {
        return res.status(403).json({ error: 'Invalid or expired token' });
      }
      
      const userKey = `${user.provider}:${user.userId}`;
      if (!users[userKey]) {
        return res.status(404).json({ error: 'User not found' });
      }
      
      req.user = users[userKey];
      next();
    });
  }
  
  // Start the server
  app.listen(PORT, () => {
    console.log(`OAuth backend server running on port ${PORT}`);
  });