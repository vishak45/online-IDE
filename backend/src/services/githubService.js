const axios = require('axios');

const GITHUB_CLIENT_ID = process.env.GITHUB_CLIENT_ID;
const GITHUB_CLIENT_SECRET = process.env.GITHUB_CLIENT_SECRET;
const GITHUB_REDIRECT_URI = process.env.GITHUB_REDIRECT_URI || 'http://localhost:5000/api/github/callback';

// Get GitHub OAuth URL
const getAuthUrl = () => {
    const scope = 'repo user';
    return `https://github.com/login/oauth/authorize?client_id=${GITHUB_CLIENT_ID}&redirect_uri=${GITHUB_REDIRECT_URI}&scope=${scope}`;
};

// Exchange code for access token
const getAccessToken = async (code) => {
    try {
        const response = await axios.post(
            'https://github.com/login/oauth/access_token',
            {
                client_id: GITHUB_CLIENT_ID,
                client_secret: GITHUB_CLIENT_SECRET,
                code,
                redirect_uri: GITHUB_REDIRECT_URI
            },
            {
                headers: {
                    Accept: 'application/json'
                }
            }
        );
        return response.data.access_token;
    } catch (error) {
        console.error('Error getting access token:', error);
        throw new Error('Failed to get GitHub access token');
    }
};

// Get GitHub user info
const getGitHubUser = async (accessToken) => {
    try {
        const response = await axios.get('https://api.github.com/user', {
            headers: {
                Authorization: `Bearer ${accessToken}`,
                Accept: 'application/vnd.github.v3+json'
            }
        });
        return response.data;
    } catch (error) {
        console.error('Error getting GitHub user:', error);
        throw new Error('Failed to get GitHub user info');
    }
};

// List user repositories
const listRepositories = async (accessToken) => {
    try {
        const response = await axios.get('https://api.github.com/user/repos', {
            headers: {
                Authorization: `Bearer ${accessToken}`,
                Accept: 'application/vnd.github.v3+json'
            },
            params: {
                sort: 'updated',
                per_page: 100
            }
        });
        return response.data.map(repo => ({
            id: repo.id,
            name: repo.name,
            fullName: repo.full_name,
            private: repo.private,
            defaultBranch: repo.default_branch,
            url: repo.html_url
        }));
    } catch (error) {
        console.error('Error listing repositories:', error);
        throw new Error('Failed to list repositories');
    }
};

// Create a new repository
const createRepository = async (accessToken, name, isPrivate = false, description = '') => {
    try {
        const response = await axios.post(
            'https://api.github.com/user/repos',
            {
                name,
                private: isPrivate,
                description,
                auto_init: true
            },
            {
                headers: {
                    Authorization: `Bearer ${accessToken}`,
                    Accept: 'application/vnd.github.v3+json'
                }
            }
        );
        return {
            id: response.data.id,
            name: response.data.name,
            fullName: response.data.full_name,
            url: response.data.html_url,
            defaultBranch: response.data.default_branch
        };
    } catch (error) {
        console.error('Error creating repository:', error);
        throw new Error('Failed to create repository');
    }
};

// Push file to repository
const pushFile = async (accessToken, owner, repo, filePath, content, commitMessage, branch = 'main') => {
    try {
        // Check if file exists (to get SHA for update)
        let sha = null;
        try {
            const existingFile = await axios.get(
                `https://api.github.com/repos/${owner}/${repo}/contents/${filePath}`,
                {
                    headers: {
                        Authorization: `Bearer ${accessToken}`,
                        Accept: 'application/vnd.github.v3+json'
                    },
                    params: { ref: branch }
                }
            );
            sha = existingFile.data.sha;
        } catch (e) {
            // File doesn't exist, that's okay
        }

        // Create or update file
        const response = await axios.put(
            `https://api.github.com/repos/${owner}/${repo}/contents/${filePath}`,
            {
                message: commitMessage,
                content: Buffer.from(content).toString('base64'),
                branch,
                ...(sha && { sha })
            },
            {
                headers: {
                    Authorization: `Bearer ${accessToken}`,
                    Accept: 'application/vnd.github.v3+json'
                }
            }
        );

        return {
            success: true,
            commitUrl: response.data.commit.html_url,
            fileUrl: response.data.content.html_url
        };
    } catch (error) {
        console.error('Error pushing file:', error.response?.data || error);
        throw new Error('Failed to push file to GitHub');
    }
};

module.exports = {
    getAuthUrl,
    getAccessToken,
    getGitHubUser,
    listRepositories,
    createRepository,
    pushFile
};
