import React, { useState, useEffect } from 'react';
import { Upload, Search, FileText, Target, TrendingUp, Download, Copy, AlertCircle, CheckCircle, XCircle, Clock } from 'lucide-react';

const ResumeTruthMatcher = () => {
  const [jobDescription, setJobDescription] = useState('');
  const [truths, setTruths] = useState([]);
  const [matches, setMatches] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [fitScore, setFitScore] = useState(0);
  const [apiStatus, setApiStatus] = useState('checking');
  const [isApiConnected, setIsApiConnected] = useState(false);
  const [uploadedFile, setUploadedFile] = useState('');



  // Check API connection on component mount
  useEffect(() => {
    const checkApiConnection = async () => {
      try {
        const response = await fetch(`${API_BASE_URL}/health`, {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
          }
        });
        
        if (response.ok) {
          const data = await response.json();
          setIsApiConnected(data.model_loaded);
          setApiStatus(data.model_loaded ? 'connected' : 'model_loading');
        } else {
          setIsApiConnected(false);
          setApiStatus('disconnected');
        }
      } catch (error) {
        console.error('API connection check failed:', error);
        setIsApiConnected(false);
        setApiStatus('disconnected');
      }
    };

    checkApiConnection();
  }, []);

  // Sample truths for demo
  const sampleTruths = [
    { type: "project", content: "Built a REST API in FastAPI for energy monitoring system with 10k+ daily requests" },
    { type: "experience", content: "Managed inventory using Excel macros and automated reporting workflows" },
    { type: "skill", content: "Expert in Python, JavaScript, and SQL database optimization" },
    { type: "project", content: "Developed React frontend with TypeScript for healthcare dashboard" },
    { type: "experience", content: "Led cross-functional team of 5 developers in agile environment" },
    { type: "achievement", content: "Reduced API response time by 60% through caching and query optimization" },
    { type: "skill", content: "Proficient in Docker, Kubernetes, and AWS cloud infrastructure" },
    { type: "project", content: "Created machine learning model for customer churn prediction with 85% accuracy" },
    { type: "experience", content: "Mentored junior developers and conducted code reviews for quality assurance" },
    { type: "education", content: "Bachelor's degree in Computer Science with focus on algorithms and data structures" }
  ];

  const sampleJobDescription = `We are hiring a Senior Python Backend Developer with FastAPI experience to join our growing engineering team. 

Key Requirements:
- 3+ years of Python development experience
- Strong experience with FastAPI or similar web frameworks
- Database optimization and SQL expertise
- Experience with REST API design and development
- Knowledge of cloud platforms (AWS preferred)
- Agile development methodology experience
- Strong problem-solving and optimization skills

Nice to Have:
- Team leadership experience
- React/frontend development knowledge
- Docker and containerization experience
- Machine learning background`;

  // API Configuration - automatically detect environment
  const getApiUrl = () => {
    const hostname = window.location.hostname;
    
    // Development
    if (hostname === 'localhost' || hostname === '127.0.0.1') {
      return 'http://localhost:8000';
    }
    
    // Production - your backends
    if (hostname.includes('careercruisecontrol.com')) {
      return 'https://api.careercruisecontrol.com'; // Your production API
    }
    
    if (hostname.includes('hardhatoptional.github.io')) {
      return 'https://your-backend-url.com'; // Your deployed backend URL
    }
    
    // Default fallback
    return 'http://localhost:8000';
  };

  const API_BASE_URL = getApiUrl();

  const handleFileUpload = (event) => {
    const file = event.target.files[0];
    if (file && file.type === 'application/json') {
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const data = JSON.parse(e.target.result);
          if (Array.isArray(data)) {
            setTruths(data);
            setUploadedFile(file.name);
          } else if (data.truths && Array.isArray(data.truths)) {
            setTruths(data.truths);
            setUploadedFile(file.name);
          } else {
            alert('Invalid JSON format. Expected array of truths or object with truths property.');
          }
        } catch (error) {
          alert('Error parsing JSON file');
        }
      };
      reader.readAsText(file);
    } else {
      alert('Please upload a JSON file');
    }
  };

  const loadSampleData = () => {
    setTruths(sampleTruths);
    setJobDescription(sampleJobDescription);
    setUploadedFile('sample-resume.json');
  };

  const runMatch = async () => {
    if (!jobDescription.trim() || truths.length === 0) {
      alert('Please provide both job description and resume truths');
      return;
    }

    setIsLoading(true);
    
    try {
      // Call the FastAPI backend
      const response = await fetch(`${API_BASE_URL}/match`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          job_description: jobDescription,
          truths: truths,
          threshold: 0.3,
          max_results: 20
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || `HTTP error! status: ${response.status}`);
      }

      const results = await response.json();
      setMatches(results);
      
      // Calculate overall fit score
      const avgScore = results.length > 0 ? 
        results.reduce((sum, match) => sum + match.score, 0) / results.length : 0;
      setFitScore(Math.round(avgScore * 100));
      
    } catch (error) {
      console.error('Error calling API:', error);
      alert(`Error: ${error.message}. Please check if the backend is running.`);
    } finally {
      setIsLoading(false);
    }
  };

  const getScoreColor = (score) => {
    if (score > 0.3) return 'text-green-600 bg-green-100';
    if (score > 0.2) return 'text-yellow-600 bg-yellow-100';
    return 'text-red-600 bg-red-100';
  };

  const getTypeIcon = (type) => {
    switch (type) {
      case 'project': return <Target className="w-4 h-4" />;
      case 'experience': return <TrendingUp className="w-4 h-4" />;
      case 'skill': return <FileText className="w-4 h-4" />;
      default: return <FileText className="w-4 h-4" />;
    }
  };

  const exportResults = () => {
    const exportData = {
      jobDescription,
      matches: matches.map(match => ({
        type: match.type,
        content: match.content,
        score: Math.round(match.score * 100) / 100
      })),
      fitScore,
      timestamp: new Date().toISOString()
    };
    
    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'resume-matches.json';
    a.click();
    URL.revokeObjectURL(url);
  };

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text);
    // Could add toast notification here
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-2">Resume Truth Matcher</h1>
          <p className="text-lg text-gray-600">Discover your most relevant qualifications for any job</p>
          
          {/* API Status Indicator */}
          <div className="mt-4 flex justify-center">
            <div className={`flex items-center px-4 py-2 rounded-full text-sm font-medium ${
              apiStatus === 'connected' ? 'bg-green-100 text-green-800' :
              apiStatus === 'model_loading' ? 'bg-yellow-100 text-yellow-800' :
              apiStatus === 'checking' ? 'bg-blue-100 text-blue-800' :
              'bg-red-100 text-red-800'
            }`}>
              {apiStatus === 'connected' && <CheckCircle className="w-4 h-4 mr-2" />}
              {apiStatus === 'model_loading' && <Clock className="w-4 h-4 mr-2" />}
              {apiStatus === 'checking' && <Clock className="w-4 h-4 mr-2" />}
              {apiStatus === 'disconnected' && <XCircle className="w-4 h-4 mr-2" />}
              
              {apiStatus === 'connected' && 'AI Model Ready'}
              {apiStatus === 'model_loading' && 'AI Model Loading...'}
              {apiStatus === 'checking' && 'Checking Connection...'}
              {apiStatus === 'disconnected' && 'Backend Disconnected'}
            </div>
          </div>
        </div>

        {/* Main Content */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Input Section */}
          <div className="space-y-6">
            {/* Job Description */}
            <div className="bg-white rounded-xl shadow-lg p-6">
              <h2 className="text-xl font-semibold text-gray-800 mb-4 flex items-center">
                <Search className="w-5 h-5 mr-2" />
                Job Description
              </h2>
              <textarea
                value={jobDescription}
                onChange={(e) => setJobDescription(e.target.value)}
                placeholder="Paste the job description here..."
                className="w-full h-48 p-4 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
              />
            </div>

            {/* Resume Upload */}
            <div className="bg-white rounded-xl shadow-lg p-6">
              <h2 className="text-xl font-semibold text-gray-800 mb-4 flex items-center">
                <Upload className="w-5 h-5 mr-2" />
                Resume Truths
              </h2>
              
              <div className="space-y-4">
                <div className="flex items-center space-x-4">
                  <label className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 cursor-pointer transition-colors">
                    <Upload className="w-4 h-4 mr-2" />
                    Upload JSON
                    <input
                      type="file"
                      accept=".json"
                      onChange={handleFileUpload}
                      className="hidden"
                    />
                  </label>
                  
                  <button
                    onClick={loadSampleData}
                    className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
                  >
                    Load Sample Data
                  </button>
                </div>

                {uploadedFile && (
                  <div className="flex items-center text-sm text-gray-600">
                    <FileText className="w-4 h-4 mr-2" />
                    {uploadedFile} ({truths.length} entries)
                  </div>
                )}

                <div className="text-sm text-gray-500">
                  <p>Upload a JSON file with your resume truths in this format:</p>
                  <code className="text-xs bg-gray-100 p-2 rounded mt-2 block">
                    {`[{"type": "project", "content": "Built a REST API..."}]`}
                  </code>
                </div>
              </div>
            </div>

            {/* Run Match Button */}
            <button
              onClick={runMatch}
              disabled={isLoading || !jobDescription.trim() || truths.length === 0 || !isApiConnected}
              className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 text-white py-4 rounded-xl font-semibold text-lg hover:from-blue-700 hover:to-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all transform hover:scale-105"
            >
              {isLoading ? (
                <div className="flex items-center justify-center">
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
                  Analyzing with AI...
                </div>
              ) : !isApiConnected ? (
                <div className="flex items-center justify-center">
                  <XCircle className="w-5 h-5 mr-2" />
                  Backend Required
                </div>
              ) : (
                <div className="flex items-center justify-center">
                  <Target className="w-5 h-5 mr-2" />
                  Run AI Match
                </div>
              )}
            </button>
            
            {/* API Info */}
            {!isApiConnected && (
              <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-4 text-sm">
                <div className="flex items-start">
                  <AlertCircle className="w-5 h-5 text-yellow-600 mr-2 mt-0.5" />
                  <div>
                    <p className="font-medium text-yellow-800">Backend Required</p>
                    <p className="text-yellow-700 mt-1">
                      The AI matching requires a running FastAPI backend. 
                      {apiStatus === 'disconnected' ? ' Please start the backend server.' : ' Model is loading...'}
                    </p>
                    <p className="text-yellow-600 mt-2">
                      Expected API: <code className="bg-yellow-100 px-1 rounded">{API_BASE_URL}</code>
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Results Section */}
          <div className="space-y-6">
            {/* Fit Score */}
            {matches.length > 0 && (
              <div className="bg-white rounded-xl shadow-lg p-6">
                <h2 className="text-xl font-semibold text-gray-800 mb-4">Overall Fit Score</h2>
                <div className="flex items-center space-x-4">
                  <div className="flex-1">
                    <div className="w-full bg-gray-200 rounded-full h-4">
                      <div 
                        className="bg-gradient-to-r from-blue-600 to-indigo-600 h-4 rounded-full transition-all duration-1000"
                        style={{ width: `${fitScore}%` }}
                      ></div>
                    </div>
                  </div>
                  <span className="text-2xl font-bold text-gray-800">{fitScore}%</span>
                </div>
              </div>
            )}

            {/* Matches */}
            <div className="bg-white rounded-xl shadow-lg p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-semibold text-gray-800">Relevant Matches</h2>
                {matches.length > 0 && (
                  <button
                    onClick={exportResults}
                    className="flex items-center px-3 py-1 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
                  >
                    <Download className="w-4 h-4 mr-1" />
                    Export
                  </button>
                )}
              </div>

              <div className="space-y-4 max-h-96 overflow-y-auto">
                {matches.length === 0 ? (
                  <div className="text-center py-8 text-gray-500">
                    <AlertCircle className="w-12 h-12 mx-auto mb-4 text-gray-400" />
                    <p>No matches yet. {isApiConnected ? 'Upload your resume and run the analysis.' : 'Connect to backend first.'}</p>
                  </div>
                ) : (
                  matches.map((match, index) => (
                    <div key={index} className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow">
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex items-center space-x-2">
                          {getTypeIcon(match.type)}
                          <span className="text-sm font-medium text-gray-600 capitalize">{match.type}</span>
                        </div>
                        <div className="flex items-center space-x-2">
                          <span className={`px-2 py-1 rounded text-xs font-medium ${getScoreColor(match.score)}`}>
                            {Math.round(match.score * 100)}%
                          </span>
                          <button
                            onClick={() => copyToClipboard(match.content)}
                            className="p-1 hover:bg-gray-100 rounded"
                          >
                            <Copy className="w-4 h-4 text-gray-500" />
                          </button>
                        </div>
                      </div>
                      <p className="text-gray-800 leading-relaxed">{match.content}</p>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ResumeTruthMatcher;
