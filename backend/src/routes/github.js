const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const User = require('../models/userModel');
const githubService = require('../services/githubService');

const JWT_SECRET = process.env.JWT_SECRET || 'qwertyuioplkjhgfdsazxcvbnm';
const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:3000';

// Middleware to verify JWT token
const authMiddleware = async (req, res, next) => {
    try {
        const token = req.headers.authorization?.split(' ')[1];
        if (!token) {
            return res.status(401).json({ message: 'No token provided', status: false });
        }

        const decoded = jwt.verify(token, JWT_SECRET);
        const user = await User.findById(decoded.userId);
        if (!user) {
            return res.status(401).json({ message: 'User not found', status: false });
        }

        req.user = user;
        next();
    } catch (error) {
        return res.status(401).json({ message: 'Invalid token', status: false });
    }
};

// Middleware to check premium plan
const premiumMiddleware = (req, res, next) => {
    if (req.user.plan !== 'premium') {
        return res.status(403).json({ 
            message: 'Premium plan required. Please upgrade to access GitHub features.', 
            status: false,
            requiresPremium: true 
        });
    }
    next();
};

// Get GitHub auth URL (requires premium)
router.get('/auth-url', authMiddleware, premiumMiddleware, (req, res) => {
    try {
        const authUrl = githubService.getAuthUrl();
        // Add state parameter with user ID for callback
        const state = Buffer.from(JSON.stringify({ userId: req.user._id })).toString('base64');
        res.json({ 
            authUrl: `${authUrl}&state=${state}`,
            status: true 
        });
    } catch (error) {
        res.status(500).json({ message: error.message, status: false });
    }
});

// GitHub OAuth callback
router.get('/callback', async (req, res) => {
    try {
        const { code, state } = req.query;

        if (!code) {
            return res.redirect(`${FRONTEND_URL}?github_error=no_code`);
        }

        // Decode state to get user ID
        let userId;
        try {
            const stateData = JSON.parse(Buffer.from(state, 'base64').toString());
            userId = stateData.userId;
        } catch (e) {
            return res.redirect(`${FRONTEND_URL}?github_error=invalid_state`);
        }

        // Exchange code for access token
        const accessToken = await githubService.getAccessToken(code);
        
        // Get GitHub user info
        const githubUser = await githubService.getGitHubUser(accessToken);

        // Update user with GitHub info
        await User.findByIdAndUpdate(userId, {
            githubAccessToken: accessToken,
            githubUsername: githubUser.login
        });

        // Redirect to frontend with success
        res.redirect(`${FRONTEND_URL}?github_connected=true&github_user=${githubUser.login}`);
    } catch (error) {
        console.error('GitHub callback error:', error);
        res.redirect(`${FRONTEND_URL}?github_error=auth_failed`);
    }
});

// Check GitHub connection status
router.get('/status', authMiddleware, async (req, res) => {
    try {
        res.json({
            connected: !!req.user.githubAccessToken,
            username: req.user.githubUsername,
            plan: req.user.plan,
            status: true
        });
    } catch (error) {
        res.status(500).json({ message: error.message, status: false });
    }
});

// Disconnect GitHub
router.post('/disconnect', authMiddleware, async (req, res) => {
    try {
        await User.findByIdAndUpdate(req.user._id, {
            githubAccessToken: null,
            githubUsername: null
        });
        res.json({ message: 'GitHub disconnected', status: true });
    } catch (error) {
        res.status(500).json({ message: error.message, status: false });
    }
});

// List repositories (requires premium + GitHub connected)
router.get('/repos', authMiddleware, premiumMiddleware, async (req, res) => {
    try {
        if (!req.user.githubAccessToken) {
            return res.status(400).json({ 
                message: 'GitHub account not connected', 
                status: false,
                requiresGitHub: true 
            });
        }

        const repos = await githubService.listRepositories(req.user.githubAccessToken);
        res.json({ repos, status: true });
    } catch (error) {
        res.status(500).json({ message: error.message, status: false });
    }
});

// Create repository
router.post('/repos', authMiddleware, premiumMiddleware, async (req, res) => {
    try {
        if (!req.user.githubAccessToken) {
            return res.status(400).json({ 
                message: 'GitHub account not connected', 
                status: false 
            });
        }

        const { name, isPrivate, description } = req.body;
        const repo = await githubService.createRepository(
            req.user.githubAccessToken, 
            name, 
            isPrivate, 
            description
        );
        res.json({ repo, status: true });
    } catch (error) {
        res.status(500).json({ message: error.message, status: false });
    }
});

// Push file to repository
router.post('/push', authMiddleware, premiumMiddleware, async (req, res) => {
    try {
        if (!req.user.githubAccessToken) {
            return res.status(400).json({ 
                message: 'GitHub account not connected', 
                status: false 
            });
        }

        const { owner, repo, filePath, content, commitMessage, branch } = req.body;

        if (!owner || !repo || !filePath || !content) {
            return res.status(400).json({ 
                message: 'Missing required fields: owner, repo, filePath, content', 
                status: false 
            });
        }

        const result = await githubService.pushFile(
            req.user.githubAccessToken,
            owner,
            repo,
            filePath,
            content,
            commitMessage || 'Update from Online IDE',
            branch || 'main'
        );

        res.json({ ...result, status: true });
    } catch (error) {
        res.status(500).json({ message: error.message, status: false });
    }
});

module.exports = router;
