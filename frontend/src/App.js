import React, { useState, useCallback, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import CodeEditor from './components/CodeEditor';
import OutputTerminal from './components/OutputTerminal';
import FileManager from './components/FileManager';
import LanguageSelector from './components/LanguageSelector';
import Login from './components/Login';
import Register from './components/Register';
import GitHubConnect from './components/GitHubConnect';
import PaymentModal from './components/PaymentModal';
import { executeCode, saveFile, getFile, getCurrentUser, logout, getUserPlan, updateStoredUser, verifyPayment } from './services/api';
import './styles/App.css';

const DEFAULT_CODE = {
  python: `# Python Example
def greet(name):
    return f"Hello, {name}!"

print(greet("World"))
print("Welcome to Online IDE!")
`,
  cpp: `// C++ Example
#include <iostream>
#include <string>

std::string greet(const std::string& name) {
    return "Hello, " + name + "!";
}

int main() {
    std::cout << greet("World") << std::endl;
    std::cout << "Welcome to Online IDE!" << std::endl;
    return 0;
}
`,
  nodejs: `// Node.js Example
function greet(name) {
    return \`Hello, \${name}!\`;
}

console.log(greet("World"));
console.log("Welcome to Online IDE!");
`
};

function IDE() {
  const [code, setCode] = useState(DEFAULT_CODE.python);
  const [language, setLanguage] = useState('python');
  const [output, setOutput] = useState('');
  const [stdin, setStdin] = useState('');
  const [isRunning, setIsRunning] = useState(false);
  const [currentFile, setCurrentFile] = useState(null);
  const [showFileManager, setShowFileManager] = useState(false);
  const [showGitHub, setShowGitHub] = useState(false);
  const [showPayment, setShowPayment] = useState(false);
  const [userPlan, setUserPlan] = useState('free');
  const user = getCurrentUser();

  // Check for GitHub OAuth callback and Payment callback
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const githubConnected = urlParams.get('github_connected');
    const githubUser = urlParams.get('github_user');
    const githubError = urlParams.get('github_error');
    const paymentSuccess = urlParams.get('payment');

    // Handle GitHub OAuth callback
    if (githubConnected === 'true' && githubUser) {
      setOutput(`GitHub connected successfully as @${githubUser}!`);
      // Clean URL
      window.history.replaceState({}, document.title, window.location.pathname);
      // Open GitHub modal to push
      setShowGitHub(true);
    }

    if (githubError) {
      setOutput(`GitHub connection failed: ${githubError}`);
      window.history.replaceState({}, document.title, window.location.pathname);
    }

    // Handle Payment callback from Lemon Squeezy
    if (paymentSuccess === 'success') {
      // Clean URL first
      window.history.replaceState({}, document.title, window.location.pathname);
      
      // Verify and upgrade
      verifyPayment({})
        .then((result) => {
          if (result.status) {
            updateStoredUser(result.user);
            if (result.token) {
              localStorage.setItem('token', result.token);
            }
            setUserPlan('premium');
            setOutput('Payment successful! You are now a premium user. Click GitHub to connect your repo!');
          }
        })
        .catch((err) => {
          setOutput('Payment verification failed: ' + err.message);
        });
    }
  }, []);

  // Fetch user plan on mount
  useEffect(() => {
    const fetchPlan = async () => {
      if (user) {
        try {
          const planData = await getUserPlan();
          setUserPlan(planData.plan);
          // Update stored user with plan
          const currentUser = getCurrentUser();
          if (currentUser) {
            updateStoredUser({ ...currentUser, plan: planData.plan });
          }
        } catch (error) {
          console.error('Error fetching plan:', error);
        }
      }
    };
    fetchPlan();
  }, [user]);

  const handleLogout = () => {
    logout();
    window.location.reload();
  };

  const handleGitHubClick = () => {
    if (!token) {
      alert('Please login first to use GitHub integration');
      window.location.href = '/login';
      return;
    }

    if (userPlan !== 'premium') {
      setShowPayment(true);
      return;
    }

    setShowGitHub(true);
  };

  const handlePaymentSuccess = () => {
    setShowPayment(false);
    setUserPlan('premium');
    // Now open GitHub modal
    setShowGitHub(true);
  };

  const handleLanguageChange = useCallback((newLanguage) => {
    setLanguage(newLanguage);
    if (!currentFile) {
      setCode(DEFAULT_CODE[newLanguage]);
    }
  }, [currentFile]);

  const handleRun = useCallback(async () => {
    setIsRunning(true);
    setOutput('Running...\n');

    try {
      const result = await executeCode(code, language, stdin);
      
      let outputText = '';
      if (result.output) {
        outputText += result.output;
      }
      if (result.error) {
        outputText += '\n[Error]\n' + result.error;
      }
      if (!result.success && result.exitCode !== undefined) {
        outputText += `\n[Exit Code: ${result.exitCode}]`;
      }
      
      setOutput(outputText || 'Program completed with no output.');
    } catch (error) {
      setOutput(`[Error] ${error.message}`);
    } finally {
      setIsRunning(false);
    }
  }, [code, language, stdin]);

  const handleSave = useCallback(async () => {
    const fileName = prompt('Enter file name:', currentFile?.name || `main.${getExtension(language)}`);
    if (!fileName) return;

    try {
      const savedFile = await saveFile({
        id: currentFile?._id,
        name: fileName,
        content: code,
        language
      });
      setCurrentFile(savedFile);
      setOutput(`File saved: ${fileName}`);
    } catch (error) {
      setOutput(`[Error] Failed to save: ${error.message}`);
    }
  }, [code, language, currentFile]);

  const handleFileSelect = useCallback(async (file) => {
    try {
      const loadedFile = await getFile(file._id);
      setCode(loadedFile.content);
      setLanguage(loadedFile.language);
      setCurrentFile(loadedFile);
      setShowFileManager(false);
    } catch (error) {
      setOutput(`[Error] Failed to load file: ${error.message}`);
    }
  }, []);

  const handleNewFile = useCallback(() => {
    setCurrentFile(null);
    setCode(DEFAULT_CODE[language]);
    setOutput('');
  }, [language]);
  const [token, setToken] = useState(localStorage.getItem('token'));
  const [userDetails, setUserDetails] = useState(localStorage.getItem('user'));
  return (
    <div className="app">
      <header className="header">
        <div className="header-left">
          <h1 className="logo">CodeAnywhere</h1>
          
          <span className="file-name">
            {currentFile ? currentFile.name : 'Untitled'}
          </span>
        </div>
       
        <div className="header-center">
          <LanguageSelector 
            language={language} 
            onChange={handleLanguageChange} 
          />
        </div>
        <div className="header-right">
          <button 
            className="btn btn-github-header"
            onClick={handleGitHubClick}
            title="Push to GitHub"
          >
            <svg height="16" width="16" viewBox="0 0 16 16" fill="currentColor">
              <path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.013 8.013 0 0016 8c0-4.42-3.58-8-8-8z"/>
            </svg>
            {userPlan === 'premium' ? 'GitHub' : 'GitHub ★'}
          </button>
          <button 
            className="btn btn-secondary"
            onClick={() => {
              if(!token) {
                alert('Please login first');
                window.location.href = '/login';
              } else {
                setShowFileManager(true);
              }
            }}
          >
            Files
          </button>
          <button 
            className="btn btn-secondary"
            onClick={handleNewFile}
          >
            New
          </button>
          <button 
            className="btn btn-secondary"
            onClick={()=>{
              if(!token) {
                alert('Please login first');
                window.location.href = '/login';
              } else {
                handleSave();
              }
            }}
          >
            Save
          </button>
          <button 
            className="btn btn-primary"
            onClick={handleRun}
            disabled={isRunning}
          >
            {isRunning ? 'Running...' : '▶ Run'}
          </button>
          {user ? (
            <button className="btn btn-secondary" onClick={handleLogout}>
              Logout
            </button>
          ):(
            <button className="btn btn-secondary" onClick={() => window.location.href = '/login'}>
              Login
            </button>
          )}
        </div>
      </header>
<div style={{
  margin:'auto',
  padding:'10px',
  fontWeight:'bold',
}}>
  <p>Yet another online code editor</p>
  </div>
  
      <main className="main">
        {showFileManager && (
          <FileManager 
            onSelect={handleFileSelect}
            onClose={() => setShowFileManager(false)}
          />
        )}
        <div className="editor-container">
          <CodeEditor 
            code={code} 
            language={language} 
            onChange={setCode} 
          />
        </div>
        <div className="output-container">
          <div className="stdin-section">
            <div className="stdin-header">Input (stdin)</div>
            <textarea
              className="stdin-input"
              value={stdin}
              onChange={(e) => setStdin(e.target.value)}
              placeholder="Enter input values here (one per line)..."
            />
          </div>
          <OutputTerminal output={output} />
        </div>
      </main>

      {/* GitHub Modal */}
      {showGitHub && (
        <GitHubConnect 
          code={code}
          language={language}
          fileName={currentFile?.name}
          onClose={() => setShowGitHub(false)}
          onMessage={(msg) => setOutput(msg)}
        />
      )}

      {/* Payment Modal */}
      {showPayment && (
        <PaymentModal 
          onClose={() => setShowPayment(false)}
          onSuccess={handlePaymentSuccess}
        />
      )}
    </div>
  );
}

function getExtension(language) {
  const extensions = {
    python: 'py',
    cpp: 'cpp',
    nodejs: 'js'
  };
  return extensions[language] || 'txt';
}

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/" element={<IDE />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Router>
  );
}

export default App;
