import React, { useState, useEffect } from 'react';
import { 
  getGitHubStatus, 
  getGitHubAuthUrl, 
  disconnectGitHub,
  getGitHubRepos,
  pushToGitHub,
  getCurrentUser
} from '../services/api';
import '../styles/GitHub.css';

function GitHubConnect({ code, language, fileName, onClose, onMessage }) {
  const [loading, setLoading] = useState(true);
  const [githubStatus, setGithubStatus] = useState({ connected: false, username: null });
  const [repos, setRepos] = useState([]);
  const [selectedRepo, setSelectedRepo] = useState('');
  const [commitMessage, setCommitMessage] = useState('Update from Online IDE');
  const [pushing, setPushing] = useState(false);
  const [step, setStep] = useState('status'); // status, repos, push

  useEffect(() => {
    checkGitHubStatus();
  }, []);

  const checkGitHubStatus = async () => {
    try {
      setLoading(true);
      const status = await getGitHubStatus();
      setGithubStatus(status);
      
      if (status.connected) {
        setStep('repos');
        await loadRepos();
      } else {
        setStep('status');
      }
    } catch (error) {
      console.error('Error checking GitHub status:', error);
      onMessage('Error checking GitHub status: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const loadRepos = async () => {
    try {
      const data = await getGitHubRepos();
      setRepos(data.repos || []);
    } catch (error) {
      console.error('Error loading repos:', error);
      onMessage('Error loading repositories: ' + error.message);
    }
  };

  const handleConnectGitHub = async () => {
    try {
      setLoading(true);
      const data = await getGitHubAuthUrl();
      // Redirect to GitHub OAuth
      window.location.href = data.authUrl;
    } catch (error) {
      console.error('Error getting auth URL:', error);
      onMessage('Error connecting to GitHub: ' + error.message);
      setLoading(false);
    }
  };

  const handleDisconnect = async () => {
    try {
      setLoading(true);
      await disconnectGitHub();
      setGithubStatus({ connected: false, username: null });
      setStep('status');
      onMessage('GitHub disconnected successfully');
    } catch (error) {
      console.error('Error disconnecting:', error);
      onMessage('Error disconnecting: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const handlePush = async () => {
    if (!selectedRepo) {
      onMessage('Please select a repository');
      return;
    }

    try {
      setPushing(true);
      const [owner, repo] = selectedRepo.split('/');
      
      const extension = {
        python: 'py',
        cpp: 'cpp',
        nodejs: 'js'
      }[language] || 'txt';
      
      const filePath = fileName || `main.${extension}`;

      const result = await pushToGitHub({
        owner,
        repo,
        filePath,
        content: code,
        commitMessage: commitMessage || 'Update from Online IDE',
        branch: 'main'
      });

      onMessage(`Successfully pushed to GitHub! View commit: ${result.commitUrl}`);
      onClose();
    } catch (error) {
      console.error('Error pushing to GitHub:', error);
      onMessage('Error pushing to GitHub: ' + error.message);
    } finally {
      setPushing(false);
    }
  };

  if (loading) {
    return (
      <div className="github-modal-overlay">
        <div className="github-modal">
          <div className="github-modal-header">
            <h3>GitHub</h3>
            <button className="close-btn" onClick={onClose}>&times;</button>
          </div>
          <div className="github-modal-content">
            <div className="loading">Loading...</div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="github-modal-overlay">
      <div className="github-modal">
        <div className="github-modal-header">
          <h3>
            <svg height="24" width="24" viewBox="0 0 16 16" fill="currentColor">
              <path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.013 8.013 0 0016 8c0-4.42-3.58-8-8-8z"/>
            </svg>
            Push to GitHub
          </h3>
          <button className="close-btn" onClick={onClose}>&times;</button>
        </div>

        <div className="github-modal-content">
          {!githubStatus.connected ? (
            <div className="github-connect-section">
              <p>Connect your GitHub account to push code to repositories.</p>
              <button className="btn btn-github" onClick={handleConnectGitHub}>
                <svg height="20" width="20" viewBox="0 0 16 16" fill="currentColor">
                  <path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.013 8.013 0 0016 8c0-4.42-3.58-8-8-8z"/>
                </svg>
                Connect GitHub
              </button>
            </div>
          ) : (
            <div className="github-push-section">
              <div className="github-user-info">
                <span className="connected-badge">Connected as @{githubStatus.username}</span>
                <button className="btn btn-link" onClick={handleDisconnect}>Disconnect</button>
              </div>

              <div className="form-group">
                <label>Select Repository:</label>
                <select 
                  value={selectedRepo} 
                  onChange={(e) => setSelectedRepo(e.target.value)}
                  className="repo-select"
                >
                  <option value="">-- Select a repository --</option>
                  {repos.map(repo => (
                    <option key={repo.id} value={repo.fullName}>
                      {repo.fullName} {repo.private ? '(Private)' : ''}
                    </option>
                  ))}
                </select>
              </div>

              <div className="form-group">
                <label>Commit Message:</label>
                <input
                  type="text"
                  value={commitMessage}
                  onChange={(e) => setCommitMessage(e.target.value)}
                  placeholder="Enter commit message..."
                  className="commit-input"
                />
              </div>

              <div className="form-group">
                <label>File to push:</label>
                <span className="file-preview">{fileName || `main.${language === 'nodejs' ? 'js' : language === 'cpp' ? 'cpp' : 'py'}`}</span>
              </div>

              <button 
                className="btn btn-primary btn-push" 
                onClick={handlePush}
                disabled={pushing || !selectedRepo}
              >
                {pushing ? 'Pushing...' : 'Push to GitHub'}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default GitHubConnect;
