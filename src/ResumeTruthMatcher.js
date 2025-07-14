import React, { useState } from 'react';
import {
  Upload, Search, FileText, Target, TrendingUp, Download, Copy,
  AlertCircle, CheckCircle
} from 'lucide-react';
import { pipeline } from '@xenova/transformers';
import { cosineSimilarity } from './cosine';

const ResumeTruthMatcher = () => {
  const [jobDescription, setJobDescription] = useState('');
  const [truths, setTruths] = useState([]);
  const [matches, setMatches] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [fitScore, setFitScore] = useState(0);
  const [uploadedFile, setUploadedFile] = useState('');

  const sampleTruths = [
    { type: "project", content: "Built a REST API in FastAPI for energy monitoring system" },
    { type: "experience", content: "Managed inventory using Excel macros" },
    { type: "skill", content: "Expert in Python and SQL" },
    { type: "project", content: "Developed React frontend with TypeScript" },
    { type: "experience", content: "Led cross-functional agile team" },
  ];

  const sampleJobDescription = `We're hiring a Python backend developer with FastAPI experience...`;

  const handleFileUpload = (e) => {
    const file = e.target.files[0];
    if (file?.type === 'application/json') {
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const json = JSON.parse(e.target.result);
          if (Array.isArray(json)) setTruths(json);
          else if (Array.isArray(json.truths)) setTruths(json.truths);
          else alert('Invalid JSON format.');
          setUploadedFile(file.name);
        } catch {
          alert('Error parsing file');
        }
      };
      reader.readAsText(file);
    } else {
      alert('Upload a valid .json file');
    }
  };

  const runMatch = async () => {
    if (!jobDescription || truths.length === 0) return alert('Add description and truths');
    setIsLoading(true);
    try {
      const embedder = await pipeline('feature-extraction', 'Xenova/all-MiniLM-L6-v2');
      const jobVec = await embedder(jobDescription, { pooling: 'mean', normalize: true });

      const scored = await Promise.all(truths.map(async (t) => {
        const truthVec = await embedder(t.content, { pooling: 'mean', normalize: true });
        const score = cosineSimilarity(jobVec.data, truthVec.data);
        return { ...t, score };
      }));

      const filtered = scored.filter(m => m.score >= 0.3).sort((a, b) => b.score - a.score);
      setMatches(filtered);
      setFitScore(Math.round((filtered.reduce((s, m) => s + m.score, 0) / (filtered.length || 1)) * 100));
    } catch (err) {
      alert('Matching failed: ' + err.message);
    } finally {
      setIsLoading(false);
    }
  };

  const exportResults = () => {
    const blob = new Blob([
      JSON.stringify({
        jobDescription,
        matches: matches.map(m => ({ ...m, score: Math.round(m.score * 100) / 100 })),
        fitScore,
        timestamp: new Date().toISOString()
      }, null, 2)
    ], { type: 'application/json' });

    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'resume-matches.json';
    a.click();
    URL.revokeObjectURL(a.href);
  };

  const copyToClipboard = (text) => navigator.clipboard.writeText(text);

  const getScoreColor = (s) => s > 0.6 ? 'bg-green-100 text-green-600' : s > 0.4 ? 'bg-yellow-100 text-yellow-600' : 'bg-red-100 text-red-600';
  const getTypeIcon = (type) => type === 'project' ? <Target className="w-4 h-4" /> :
                                  type === 'experience' ? <TrendingUp className="w-4 h-4" /> :
                                  <FileText className="w-4 h-4" />;

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-4xl mx-auto space-y-6">
        <h1 className="text-3xl font-bold text-center">Resume Truth Matcher</h1>

        <div className="grid gap-6 lg:grid-cols-2">
          <div className="space-y-4">
            <div className="bg-white p-4 rounded shadow">
              <h2 className="font-semibold mb-2 flex items-center"><Search className="mr-2" />Job Description</h2>
              <textarea
                value={jobDescription}
                onChange={e => setJobDescription(e.target.value)}
                placeholder="Paste job description here..."
                className="w-full h-40 p-2 border rounded"
              />
            </div>

            <div className="bg-white p-4 rounded shadow">
              <h2 className="font-semibold mb-2 flex items-center"><Upload className="mr-2" />Resume Truths</h2>
              <div className="flex gap-2 mb-2">
                <label className="bg-blue-600 text-white px-3 py-1 rounded cursor-pointer">
                  Upload JSON
                  <input type="file" accept=".json" onChange={handleFileUpload} className="hidden" />
                </label>
                <button onClick={() => { setTruths(sampleTruths); setJobDescription(sampleJobDescription); setUploadedFile('sample.json'); }}
                  className="bg-gray-600 text-white px-3 py-1 rounded">
                  Load Sample
                </button>
              </div>
              {uploadedFile && <p className="text-sm text-gray-600">{uploadedFile} ({truths.length} entries)</p>}
            </div>

            <button onClick={runMatch} disabled={isLoading} className="w-full py-3 bg-indigo-600 text-white rounded font-bold hover:bg-indigo-700">
              {isLoading ? 'Matching...' : 'Run AI Match'}
            </button>
          </div>

          <div className="space-y-4">
            {matches.length > 0 && (
              <div className="bg-white p-4 rounded shadow">
                <h2 className="font-semibold mb-2">Overall Fit Score</h2>
                <div className="flex items-center space-x-3">
                  <div className="flex-1 bg-gray-200 rounded-full h-4">
                    <div className="bg-indigo-600 h-4 rounded-full" style={{ width: `${fitScore}%` }}></div>
                  </div>
                  <span className="text-xl font-bold">{fitScore}%</span>
                </div>
              </div>
            )}

            <div className="bg-white p-4 rounded shadow">
              <div className="flex justify-between mb-2">
                <h2 className="font-semibold">Relevant Matches</h2>
                {matches.length > 0 && (
                  <button onClick={exportResults} className="flex items-center text-sm text-gray-600 hover:underline">
                    <Download className="w-4 h-4 mr-1" /> Export
                  </button>
                )}
              </div>
              <div className="space-y-3 max-h-96 overflow-y-auto">
                {matches.length === 0 ? (
                  <div className="text-center text-gray-400">
                    <AlertCircle className="w-10 h-10 mx-auto mb-2" />
                    No matches yet.
                  </div>
                ) : matches.map((match, i) => (
                  <div key={i} className="border p-3 rounded hover:shadow">
                    <div className="flex justify-between mb-1">
                      <div className="flex items-center space-x-2">
                        {getTypeIcon(match.type)}
                        <span className="capitalize text-sm text-gray-500">{match.type}</span>
                      </div>
                      <div className="flex items-center space-x-2">
                        <span className={`text-xs px-2 py-0.5 rounded ${getScoreColor(match.score)}`}>
                          {Math.round(match.score * 100)}%
                        </span>
                        <button onClick={() => copyToClipboard(match.content)}><Copy className="w-4 h-4 text-gray-400" /></button>
                      </div>
                    </div>
                    <p className="text-gray-800">{match.content}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ResumeTruthMatcher;
