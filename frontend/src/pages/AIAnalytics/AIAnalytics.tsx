import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import {
  ArrowLeft,
  Brain,
  TrendingUp,
  CheckCircle,
  AlertCircle,
  Zap,
  FileText,
  BarChart3,
  Award,
  Target,
  Sparkles,
} from "lucide-react";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:3000";

interface Resume {
  _id: string;
  originalFile: string;
  uploadedAt: string;
  parsedData: {
    name: string;
    email: string;
    phone: string;
    skills: string[];
    education: string[];
    experience: string[];
    summary: string;
  };
  aiAnalysis?: {
    atsScore?: number;
    grammarScore?: number;
    readability?: number;
    structureScore?: number;
    overallScore?: number;
    keywordDensity?: number;
    suggestions?: string[];
    weaknesses?: string[];
  };
}

const AIAnalytics = () => {
  const [resumes, setResumes] = useState<Resume[]>([]);
  const [selectedResume, setSelectedResume] = useState<Resume | null>(null);
  const [loading, setLoading] = useState(true);
  const [analyzing, setAnalyzing] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    fetchResumes();
  }, []);

  const fetchResumes = async () => {
    try {
      const token = localStorage.getItem("token");
      const response = await axios.get(`${API_URL}/api/jobseeker/my-resumes`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (response.data.success) {
        const rawData = response.data.data;
        // Handle both { resumes: [...] } and direct array format
        const resumeList = Array.isArray(rawData) ? rawData : (rawData?.resumes || []);
        setResumes(resumeList);
        if (resumeList.length > 0) {
          setSelectedResume(resumeList[0]);
        }
      }
    } catch (error) {
      console.error("Error fetching resumes:", error);
    } finally {
      setLoading(false);
    }
  };

  const analyzeResume = async (resumeId: string) => {
    try {
      setAnalyzing(true);
      const token = localStorage.getItem("token");
      const response = await axios.post(
        `${API_URL}/api/jobseeker/analyze/${resumeId}`,
        {},
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      if (response.data.success) {
        // Refresh resumes to get updated analysis
        await fetchResumes();
        alert("✅ Resume analyzed successfully! Check the updated scores below.");
      }
    } catch (error: any) {
      console.error("Error analyzing resume:", error);
      const errorMessage = error.response?.data?.error || error.message || "Failed to analyze resume";
      alert(`❌ Analysis Failed: ${errorMessage}\n\nPlease make sure:\n1. The Python AI service is running\n2. OpenAI API key is configured\n3. Resume file exists on server`);
    } finally {
      setAnalyzing(false);
    }
  };

  const getScoreColor = (score: number) => {
    if (score >= 80) return "text-green-600";
    if (score >= 60) return "text-yellow-600";
    return "text-red-600";
  };

  const getScoreLabel = (score: number) => {
    if (score >= 80) return "Excellent";
    if (score >= 60) return "Good";
    if (score >= 40) return "Fair";
    return "Needs Improvement";
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-cyan-600 mx-auto mb-4"></div>
          <p className="text-slate-600">Loading analytics...</p>
        </div>
      </div>
    );
  }

  if (!selectedResume) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <div className="text-center max-w-md">
          <FileText className="mx-auto mb-4 text-slate-400" size={64} />
          <h2 className="text-2xl font-bold text-slate-900 mb-2">
            No Resume Found
          </h2>
          <p className="text-slate-600 mb-6">
            Upload a resume to view AI-powered analytics and insights.
          </p>
          <button
            onClick={() => navigate("/jobseeker/upload")}
            className="px-6 py-3 bg-gradient-to-r from-blue-600 to-cyan-600 text-white rounded-xl font-semibold hover:from-blue-700 hover:to-cyan-700 transition-all"
          >
            Upload Resume
          </button>
        </div>
      </div>
    );
  }

  const analysis = selectedResume.aiAnalysis;
  const hasAnalysis = analysis && (analysis.atsScore || 0) > 0;

  // Compute the true overall score: ATS×35% + Grammar×20% + Readability×20% + Structure×25%
  const computedOverall = analysis
    ? analysis.overallScore ||
      Math.round(
        (analysis.atsScore || 0) * 0.35 +
        (analysis.grammarScore || 0) * 0.20 +
        (analysis.readability || 0) * 0.20 +
        (analysis.structureScore || 0) * 0.25
      )
    : 0;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50">
      {/* Header */}
      <div className="bg-white border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <button
                onClick={() => navigate("/jobseeker/dashboard")}
                className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
              >
                <ArrowLeft size={24} />
              </button>
              <div>
                <h1 className="text-3xl font-bold text-slate-900 flex items-center gap-3">
                  <Brain className="text-cyan-600" size={32} />
                  AI Resume Analytics
                </h1>
                <p className="text-slate-600 mt-1">
                  Comprehensive AI-powered analysis of your resume
                </p>
              </div>
            </div>
            {hasAnalysis && (
              <button
                onClick={() => analyzeResume(selectedResume._id)}
                disabled={analyzing}
                className="px-6 py-3 bg-gradient-to-r from-blue-600 to-cyan-600 text-white rounded-xl font-semibold hover:from-blue-700 hover:to-cyan-700 transition-all disabled:opacity-50 flex items-center gap-2"
              >
                <Sparkles size={20} />
                {analyzing ? "Re-analyzing..." : "Re-Analyze"}
              </button>
            )}
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Resume Selector */}
        {resumes.length > 1 && (
          <div className="mb-6">
            <label className="block text-sm font-semibold text-slate-700 mb-2">
              Select Resume
            </label>
            <select
              value={selectedResume._id}
              onChange={(e) => {
                const resume = resumes.find((r) => r._id === e.target.value);
                if (resume) setSelectedResume(resume);
              }}
              className="px-4 py-3 border border-slate-300 rounded-xl w-full max-w-md focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500"
            >
              {resumes.map((resume) => (
                <option key={resume._id} value={resume._id}>
                  {resume.originalFile} - {new Date(resume.uploadedAt).toLocaleDateString()}
                </option>
              ))}
            </select>
          </div>
        )}

        {!hasAnalysis ? (
          /* No Analysis Yet */
          <div className="bg-white rounded-2xl p-12 text-center border border-slate-200">
            {analyzing ? (
              <>
                <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-cyan-600 mx-auto mb-4"></div>
                <h2 className="text-2xl font-bold text-slate-900 mb-2">
                  Analyzing Resume...
                </h2>
                <p className="text-slate-600 mb-2">
                  Our AI is analyzing your resume. This may take 30-60 seconds.
                </p>
                <p className="text-sm text-slate-500">
                  Please don't close this page.
                </p>
              </>
            ) : (
              <>
                <Brain className="mx-auto mb-4 text-slate-400" size={64} />
                <h2 className="text-2xl font-bold text-slate-900 mb-2">
                  Ready to Analyze
                </h2>
                <p className="text-slate-600 mb-6 max-w-md mx-auto">
                  Get detailed AI-powered insights about your resume including ATS
                  compatibility, grammar, readability, and personalized suggestions.
                </p>
                <button
                  onClick={() => analyzeResume(selectedResume._id)}
                  disabled={analyzing}
                  className="px-8 py-4 bg-gradient-to-r from-blue-600 to-cyan-600 text-white rounded-xl font-semibold hover:from-blue-700 hover:to-cyan-700 transition-all disabled:opacity-50 flex items-center gap-2 mx-auto"
                >
                  <Sparkles size={20} />
                  Analyze Resume with AI
                </button>
              </>
            )}
          </div>
        ) : (
          /* Analysis Results */
          <div className="space-y-6 relative">
            {/* Analyzing Overlay */}
            {analyzing && (
              <div className="absolute inset-0 bg-white/90 backdrop-blur-sm z-10 rounded-2xl flex items-center justify-center">
                <div className="text-center">
                  <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-cyan-600 mx-auto mb-4"></div>
                  <h3 className="text-xl font-bold text-slate-900 mb-2">
                    Re-analyzing Resume...
                  </h3>
                  <p className="text-slate-600">This may take 30-60 seconds</p>
                </div>
              </div>
            )}

            {/* Overall Score Card */}
            <div className="bg-gradient-to-br from-blue-600 to-cyan-600 rounded-2xl p-8 text-white">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-blue-100 mb-2">Overall Score</p>
                  <h2 className="text-6xl font-bold">{computedOverall}%</h2>
                  <p className="text-xl mt-2 text-blue-100">
                    {getScoreLabel(computedOverall)}
                  </p>
                  <p className="text-sm text-blue-200 mt-1">ATS 35% · Grammar 20% · Readability 20% · Structure 25%</p>
                </div>
                <Award size={80} className="text-white opacity-20" />
              </div>
            </div>

            {/* Score Breakdown */}
            <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
              <div className="bg-white rounded-2xl p-6 border border-slate-200">
                <div className="flex items-center justify-between mb-4">
                  <Target className="text-blue-600" size={24} />
                  <span
                    className={`text-2xl font-bold ${getScoreColor(
                      analysis.atsScore || 0
                    )}`}
                  >
                    {analysis.atsScore || 0}%
                  </span>
                </div>
                <h3 className="text-slate-900 font-semibold mb-2">ATS Score</h3>
                <div className="w-full bg-slate-200 rounded-full h-2">
                  <div
                    className="bg-gradient-to-r from-blue-600 to-cyan-600 h-2 rounded-full"
                    style={{ width: `${analysis.atsScore || 0}%` }}
                  ></div>
                </div>
              </div>

              <div className="bg-white rounded-2xl p-6 border border-slate-200">
                <div className="flex items-center justify-between mb-4">
                  <CheckCircle className="text-green-600" size={24} />
                  <span
                    className={`text-2xl font-bold ${getScoreColor(
                      analysis.grammarScore || 0
                    )}`}
                  >
                    {analysis.grammarScore || 0}%
                  </span>
                </div>
                <h3 className="text-slate-900 font-semibold mb-2">Grammar</h3>
                <div className="w-full bg-slate-200 rounded-full h-2">
                  <div
                    className="bg-gradient-to-r from-green-600 to-emerald-600 h-2 rounded-full"
                    style={{ width: `${analysis.grammarScore || 0}%` }}
                  ></div>
                </div>
              </div>

              <div className="bg-white rounded-2xl p-6 border border-slate-200">
                <div className="flex items-center justify-between mb-4">
                  <BarChart3 className="text-amber-600" size={24} />
                  <span
                    className={`text-2xl font-bold ${getScoreColor(
                      analysis.readability || 0
                    )}`}
                  >
                    {analysis.readability || 0}%
                  </span>
                </div>
                <h3 className="text-slate-900 font-semibold mb-2">
                  Readability
                </h3>
                <div className="w-full bg-slate-200 rounded-full h-2">
                  <div
                    className="bg-gradient-to-r from-amber-600 to-yellow-600 h-2 rounded-full"
                    style={{ width: `${analysis.readability || 0}%` }}
                  ></div>
                </div>
              </div>

              <div className="bg-white rounded-2xl p-6 border border-slate-200">
                <div className="flex items-center justify-between mb-4">
                  <TrendingUp className="text-cyan-600" size={24} />
                  <span
                    className={`text-2xl font-bold ${getScoreColor(
                      analysis.structureScore || 0
                    )}`}
                  >
                    {analysis.structureScore || 0}%
                  </span>
                </div>
                <h3 className="text-slate-900 font-semibold mb-2">Structure</h3>
                <div className="w-full bg-slate-200 rounded-full h-2">
                  <div
                    className="bg-gradient-to-r from-cyan-600 to-blue-600 h-2 rounded-full"
                    style={{ width: `${analysis.structureScore || 0}%` }}
                  ></div>
                </div>
              </div>
            </div>

            {/* Suggestions and Weaknesses */}
            <div className="grid lg:grid-cols-2 gap-6">
              {/* AI Suggestions */}
              <div className="bg-white rounded-2xl p-6 border border-slate-200">
                <h3 className="text-xl font-bold text-slate-900 mb-4 flex items-center gap-2">
                  <Zap className="text-blue-600" size={24} />
                  AI Suggestions
                </h3>
                <div className="space-y-3">
                  {analysis.suggestions && analysis.suggestions.length > 0 ? (
                    analysis.suggestions.map((suggestion, idx) => (
                      <div
                        key={idx}
                        className="flex gap-3 p-4 rounded-xl bg-blue-50 border border-blue-200"
                      >
                        <Sparkles
                          className="text-blue-600 flex-shrink-0 mt-0.5"
                          size={18}
                        />
                        <p className="text-slate-700 text-sm">{suggestion}</p>
                      </div>
                    ))
                  ) : (
                    <p className="text-slate-500 text-center py-8">
                      No suggestions available
                    </p>
                  )}
                </div>
              </div>

              {/* Weaknesses */}
              <div className="bg-white rounded-2xl p-6 border border-slate-200">
                <h3 className="text-xl font-bold text-slate-900 mb-4 flex items-center gap-2">
                  <AlertCircle className="text-red-600" size={24} />
                  Areas to Improve
                </h3>
                <div className="space-y-3">
                  {analysis.weaknesses && analysis.weaknesses.length > 0 ? (
                    analysis.weaknesses.map((weakness, idx) => (
                      <div
                        key={idx}
                        className="flex gap-3 p-4 rounded-xl bg-red-50 border border-red-200"
                      >
                        <AlertCircle
                          className="text-red-600 flex-shrink-0 mt-0.5"
                          size={18}
                        />
                        <p className="text-slate-700 text-sm">{weakness}</p>
                      </div>
                    ))
                  ) : (
                    <p className="text-slate-500 text-center py-8">
                      No weaknesses identified
                    </p>
                  )}
                </div>
              </div>
            </div>

            {/* Resume Details */}
            <div className="bg-white rounded-2xl p-6 border border-slate-200">
              <h3 className="text-xl font-bold text-slate-900 mb-4 flex items-center gap-2">
                <FileText className="text-cyan-600" size={24} />
                Resume Details
              </h3>
              <div className="grid md:grid-cols-2 gap-6">
                <div>
                  <p className="text-sm font-semibold text-slate-600 mb-1">
                    Candidate Name
                  </p>
                  <p className="text-lg text-slate-900">
                    {selectedResume.parsedData.name || "Not specified"}
                  </p>
                </div>
                <div>
                  <p className="text-sm font-semibold text-slate-600 mb-1">
                    Email
                  </p>
                  <p className="text-lg text-slate-900">
                    {selectedResume.parsedData.email || "Not specified"}
                  </p>
                </div>
                <div>
                  <p className="text-sm font-semibold text-slate-600 mb-1">
                    Skills Count
                  </p>
                  <p className="text-lg text-slate-900">
                    {selectedResume.parsedData.skills?.length || 0} skills
                  </p>
                </div>
                <div>
                  <p className="text-sm font-semibold text-slate-600 mb-1">
                    Uploaded On
                  </p>
                  <p className="text-lg text-slate-900">
                    {new Date(selectedResume.uploadedAt).toLocaleDateString()}
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default AIAnalytics;
