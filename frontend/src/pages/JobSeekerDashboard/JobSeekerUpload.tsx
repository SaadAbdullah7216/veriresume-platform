import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import {
  Upload,
  Brain,
  FileText,
  AlertCircle,
  CheckCircle,
  Zap,
  Briefcase,
  ArrowRight,
  Sparkles,
  BarChart3,
  Target,
  Loader,
  Menu,
  Bell,
  LogOut,
  Building,
} from "lucide-react";
import { useAuth } from "../../context/AuthContext";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:3000";

interface AIAnalysis {
  atsScore: number;
  keywordDensity: number;
  grammarScore: number;
  readability: number;
  structureScore: number;
  weaknesses: string[];
  suggestions: string[];
}

interface ResumeData {
  resumeId: string;
  aiAnalysis: AIAnalysis;
}

const JobSeekerUpload = () => {
  const [file, setFile] = useState<File | null>(null);
  const [jobTarget, setJobTarget] = useState("");
  const [uploading, setUploading] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);
  const [resumeData, setResumeData] = useState<ResumeData | null>(null);
  const [recommendedJobs, setRecommendedJobs] = useState<any[]>([]);
  const [recommendedKeywords, setRecommendedKeywords] = useState<string[]>([]);
  const [loadingJobs, setLoadingJobs] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const navigate = useNavigate();
  const { logout, user } = useAuth();

  // Check if user is logged in
  React.useEffect(() => {
    if (!user) {
      setError("Please login first to upload a resume");
      setTimeout(() => {
        navigate("/login");
      }, 2000);
    }
  }, [user, navigate]);

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      if (
        !["application/pdf", "application/msword"].includes(selectedFile.type)
      ) {
        setError("Please upload a PDF or Word document");
        return;
      }
      setFile(selectedFile);
      setError("");
    }
  };

  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file) {
      setError("Please select a file");
      return;
    }

    setUploading(true);
    setError("");
    setSuccess("");
    setRecommendedJobs([]);
    setRecommendedKeywords([]);

    try {
      const formData = new FormData();
      formData.append("resume", file);
      if (jobTarget) {
        formData.append("jobTarget", jobTarget);
      }

      const token = localStorage.getItem("token");
      if (!token) {
        setError("Authentication token not found. Please login again.");
        navigate("/login");
        return;
      }

      const response = await axios.post(
        `${API_URL}/api/jobseeker/upload-resume`,
        formData,
        {
          headers: {
            "Content-Type": "multipart/form-data",
            Authorization: `Bearer ${token}`,
          },
        }
      );

      if (response.data.success) {
        setSuccess("Resume uploaded successfully! Analyzing...");
        setResumeData({
          resumeId: response.data.data.resumeId,
          aiAnalysis: response.data.data.aiAnalysis,
        });

        // Extract recommended keywords from AI analysis
        const aiKeywords = response.data.data.recommendedKeywords || 
          response.data.data.aiAnalysis?.recommendedKeywords || [];
        if (aiKeywords.length > 0) {
          setRecommendedKeywords(aiKeywords);
        } else {
          // Fallback: use parsed skills as keywords
          const skills = response.data.data.parsedData?.skills || [];
          setRecommendedKeywords(skills.slice(0, 15));
        }

        // Fetch recommended jobs based on resume
        setLoadingJobs(true);
        try {
          const jobResponse = await axios.post(
            `${API_URL}/api/jobseeker/find-matching-jobs`,
            { resumeId: response.data.data.resumeId },
            {
              headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${token}`,
              },
              timeout: 60000,
            }
          );
          if (jobResponse.data.success) {
            const jobs = jobResponse.data.data?.allMatchingJobs || [];
            setRecommendedJobs(jobs);
            // Cache for dashboard
            localStorage.setItem('veriresume_cached_jobs', JSON.stringify(jobs));
            localStorage.setItem('veriresume_jobs_timestamp', Date.now().toString());
          }
        } catch (jobErr: any) {
          console.warn("Job fetch error (non-critical):", jobErr.message);
        }

        setFile(null);
        setJobTarget("");
      }
    } catch (err: any) {
      console.error("Upload error:", err);
      if (err.response?.status === 401) {
        setError("Authentication failed. Please login again.");
        setTimeout(() => {
          navigate("/login");
        }, 2000);
      } else {
        setError(err.response?.data?.error || err.message || "Upload failed");
      }
    } finally {
      setUploading(false);
      setLoadingJobs(false);
    }
  };

  const handleReAnalyze = async () => {
    if (!resumeData) return;

    setAnalyzing(true);
    setError("");

    try {
      const token = localStorage.getItem("token");
      if (!token) {
        setError("Authentication token not found. Please login again.");
        navigate("/login");
        return;
      }

      const response = await axios.post(
        `${API_URL}/api/jobseeker/analyze/${resumeData.resumeId}`,
        {},
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      if (response.data.success) {
        setResumeData({
          ...resumeData,
          aiAnalysis: response.data.data.aiAnalysis,
        });
        setSuccess("Resume re-analyzed successfully!");
      }
    } catch (err: any) {
      console.error("Re-analyze error:", err);
      if (err.response?.status === 401) {
        setError("Authentication failed. Please login again.");
        setTimeout(() => {
          navigate("/login");
        }, 2000);
      } else {
        setError(err.response?.data?.error || err.message || "Analysis failed");
      }
    } finally {
      setAnalyzing(false);
    }
  };

  const handleViewJobs = () => {
    if (resumeData) {
      navigate(`/jobseeker/jobs/${resumeData.resumeId}`);
    }
  };

  const KeywordSuggestions = [
    "SQL",
    "Python",
    "Tableau",
    "Power BI",
    "Data Analysis",
    "Machine Learning",
    "Excel",
    "R Programming",
  ];

  const PowerVerbs = [
    "Developed",
    "Implemented",
    "Designed",
    "Managed",
    "Led",
    "Optimized",
    "Improved",
    "Created",
  ];

  return (
    <div className="flex h-screen bg-slate-50">
      {/* Sidebar */}
      <aside
        className={`${
          sidebarOpen ? "w-64" : "w-20"
        } bg-gradient-to-b from-slate-900 to-blue-900 text-white transition-all duration-300 flex flex-col`}
      >
        <div className="p-4 flex items-center justify-between border-b border-white/10">
          {sidebarOpen && (
            <div className="flex items-center gap-2">
              <Brain className="text-cyan-400" size={28} />
              <span className="font-bold text-xl">VeriResume</span>
            </div>
          )}
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="p-2 hover:bg-white/10 rounded-lg"
          >
            <Menu size={20} />
          </button>
        </div>

        <nav className="flex-1 p-4 space-y-2">
          <a
            href="/jobseeker/dashboard"
            className="flex items-center gap-3 px-4 py-3 rounded-xl hover:bg-white/10 text-slate-300 hover:text-white transition-all"
          >
            <FileText size={20} />
            {sidebarOpen && <span>Dashboard</span>}
          </a>
          <a
            href="/jobseeker/upload"
            className="flex items-center gap-3 px-4 py-3 rounded-xl bg-cyan-500 text-white transition-all"
          >
            <Upload size={20} />
            {sidebarOpen && <span>Upload Resume</span>}
          </a>
          <a
            href="/jobseeker/analysis"
            className="flex items-center gap-3 px-4 py-3 rounded-xl hover:bg-white/10 text-slate-300 hover:text-white transition-all"
          >
            <Brain size={20} />
            {sidebarOpen && <span>AI Analysis</span>}
          </a>
          <a
            href="/jobseeker/jobs"
            className="flex items-center gap-3 px-4 py-3 rounded-xl hover:bg-white/10 text-slate-300 hover:text-white transition-all"
          >
            <Briefcase size={20} />
            {sidebarOpen && <span>Job Recommendations</span>}
          </a>
        </nav>

        {sidebarOpen && (
          <div className="p-4 border-t border-white/10">
            <button
              onClick={handleLogout}
              className="w-full bg-red-500/20 hover:bg-red-500/30 text-red-400 hover:text-red-300 px-4 py-3 rounded-xl transition-all flex items-center gap-2 justify-center font-semibold"
            >
              <LogOut size={18} />
              Logout
            </button>
          </div>
        )}
      </aside>

      {/* Main Content */}
      <div className="flex-1 overflow-auto">
        {/* Header */}
        <header className="bg-white border-b border-slate-200 sticky top-0 z-10">
          <div className="px-8 py-4 flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-slate-900">
                Upload & Analyze Resume
              </h1>
              <p className="text-slate-600">
                Get instant AI analysis and job recommendations
              </p>
            </div>
            <button className="relative p-3 hover:bg-slate-100 rounded-xl transition-all">
              <Bell size={20} className="text-slate-600" />
            </button>
          </div>
        </header>

        {/* Main Content */}
        <main className="p-8">
          {error && (
            <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-xl flex gap-3">
              <AlertCircle className="text-red-600 flex-shrink-0" size={20} />
              <p className="text-red-800">{error}</p>
            </div>
          )}

          {success && (
            <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-xl flex gap-3">
              <CheckCircle className="text-green-600 flex-shrink-0" size={20} />
              <p className="text-green-800">{success}</p>
            </div>
          )}

          <div className="grid lg:grid-cols-3 gap-6">
            {/* Upload Form */}
            <div className="lg:col-span-2">
              <div className="bg-white rounded-2xl p-8 border border-slate-200">
                <h2 className="text-2xl font-bold text-slate-900 mb-6 flex items-center gap-2">
                  <Upload className="text-cyan-600" size={28} />
                  Upload Your Resume
                </h2>

                <form onSubmit={handleUpload} className="space-y-6">
                  {/* File Upload Area */}
                  <div
                    className="relative border-2 border-dashed border-slate-300 rounded-2xl p-8 text-center hover:border-cyan-400 transition-all cursor-pointer group"
                    onDragOver={(e) => {
                      e.preventDefault();
                      e.currentTarget.classList.add("bg-cyan-50");
                    }}
                    onDragLeave={(e) => {
                      e.currentTarget.classList.remove("bg-cyan-50");
                    }}
                    onDrop={(e) => {
                      e.preventDefault();
                      const droppedFile = e.dataTransfer.files[0];
                      if (droppedFile) {
                        handleFileChange({
                          target: { files: [droppedFile] },
                        } as any);
                      }
                    }}
                  >
                    <input
                      type="file"
                      accept=".pdf,.doc,.docx"
                      onChange={handleFileChange}
                      className="hidden"
                      id="file-input"
                      disabled={uploading}
                    />
                    <label
                      htmlFor="file-input"
                      className="cursor-pointer flex flex-col items-center gap-4"
                    >
                      <div className="w-16 h-16 bg-gradient-to-br from-blue-100 to-cyan-100 rounded-2xl flex items-center justify-center group-hover:scale-110 transition-transform">
                        <Upload className="text-cyan-600" size={32} />
                      </div>
                      <div>
                        <p className="text-lg font-semibold text-slate-900">
                          {file ? file.name : "Drop your resume here"}
                        </p>
                        <p className="text-sm text-slate-600">
                          or click to browse (PDF, DOC, DOCX)
                        </p>
                      </div>
                    </label>
                  </div>

                  {/* Job Target Input */}
                  <div>
                    <label className="block text-sm font-semibold text-slate-900 mb-2">
                      Target Job Position <span className="text-gray-400 text-xs">(Optional)</span>
                    </label>
                    <input
                      type="text"
                      value={jobTarget}
                      onChange={(e) => setJobTarget(e.target.value)}
                      placeholder="e.g., Data Analyst, Software Engineer"
                      className="w-full px-4 py-3 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-cyan-500"
                      disabled={uploading}
                    />
                    <p className="text-xs text-slate-500 mt-1">
                      Leave empty for AI to auto-detect or specify your target role
                    </p>
                  </div>

                  {/* Submit Button */}
                  <button
                    type="submit"
                    disabled={!file || uploading}
                    className="w-full bg-gradient-to-r from-blue-600 to-cyan-600 text-white py-4 rounded-xl font-bold hover:from-blue-700 hover:to-cyan-700 disabled:from-slate-400 disabled:to-slate-400 transition-all flex items-center justify-center gap-2"
                  >
                    {uploading ? (
                      <>
                        <Loader className="animate-spin" size={20} />
                        Uploading...
                      </>
                    ) : (
                      <>
                        <Upload size={20} />
                        Upload & Analyze Resume
                      </>
                    )}
                  </button>
                </form>
              </div>

              {/* AI Analysis Results */}
              {resumeData && (
                <div className="mt-6 bg-white rounded-2xl p-8 border border-slate-200">
                  <div className="flex items-center justify-between mb-6">
                    <h2 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
                      <Brain className="text-cyan-600" size={28} />
                      AI Resume Analysis
                    </h2>
                    <button
                      onClick={handleReAnalyze}
                      disabled={analyzing}
                      className="px-4 py-2 bg-cyan-100 text-cyan-700 rounded-lg font-semibold hover:bg-cyan-200 transition-all text-sm disabled:opacity-50"
                    >
                      {analyzing ? "Re-analyzing..." : "Re-Analyze"}
                    </button>
                  </div>

                  {/* Metrics Grid */}
                  <div className="grid md:grid-cols-2 gap-4 mb-6">
                    {[
                      {
                        label: "ATS Score",
                        value: resumeData.aiAnalysis.atsScore,
                        color: "from-cyan-600 to-blue-600",
                      },
                      {
                        label: "Grammar Score",
                        value: resumeData.aiAnalysis.grammarScore,
                        color: "from-green-600 to-emerald-600",
                      },
                      {
                        label: "Readability",
                        value: resumeData.aiAnalysis.readability,
                        color: "from-amber-600 to-yellow-600",
                      },
                      {
                        label: "Structure Score",
                        value: resumeData.aiAnalysis.structureScore,
                        color: "from-purple-600 to-pink-600",
                      },
                    ].map((metric, idx) => (
                      <div
                        key={idx}
                        className="bg-gradient-to-br from-slate-50 to-slate-100 rounded-xl p-4 border border-slate-200"
                      >
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-sm font-semibold text-slate-600">
                            {metric.label}
                          </span>
                          <span className={`text-2xl font-bold bg-gradient-to-r ${metric.color} bg-clip-text text-transparent`}>
                            {metric.value}%
                          </span>
                        </div>
                        <div className="w-full bg-slate-300 rounded-full h-2">
                          <div
                            className={`bg-gradient-to-r ${metric.color} h-2 rounded-full transition-all`}
                            style={{ width: `${metric.value}%` }}
                          ></div>
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Suggestions */}
                  <div className="space-y-3 mb-6">
                    {resumeData.aiAnalysis.suggestions.map(
                      (suggestion, idx) => (
                        <div
                          key={idx}
                          className="flex gap-3 p-4 bg-blue-50 border border-blue-200 rounded-xl"
                        >
                          <Zap
                            className="text-blue-600 flex-shrink-0"
                            size={20}
                          />
                          <p className="text-slate-700 text-sm">{suggestion}</p>
                        </div>
                      )
                    )}
                  </div>

                  {/* Weaknesses */}
                  {resumeData.aiAnalysis.weaknesses.length > 0 && (
                    <div className="space-y-3 mb-6">
                      <h3 className="font-semibold text-slate-900 flex items-center gap-2">
                        <AlertCircle className="text-red-600" size={20} />
                        Areas to Improve
                      </h3>
                      {resumeData.aiAnalysis.weaknesses.map((weakness, idx) => (
                        <div
                          key={idx}
                          className="flex gap-3 p-4 bg-red-50 border border-red-200 rounded-xl"
                        >
                          <AlertCircle
                            className="text-red-600 flex-shrink-0"
                            size={20}
                          />
                          <p className="text-slate-700 text-sm">{weakness}</p>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Recommended Keywords from AI Analysis */}
                  {recommendedKeywords.length > 0 && (
                    <div className="bg-gradient-to-br from-cyan-50 to-blue-50 rounded-xl p-6 border border-cyan-200 mb-6">
                      <h3 className="text-lg font-bold text-slate-900 mb-4 flex items-center gap-2">
                        <Sparkles className="text-cyan-600" size={20} />
                        Recommended Keywords from Your Resume
                      </h3>
                      <div className="flex flex-wrap gap-2">
                        {recommendedKeywords.map((keyword, idx) => (
                          <span
                            key={idx}
                            className="px-4 py-2 bg-white border-2 border-cyan-300 text-cyan-700 rounded-full text-sm font-semibold hover:bg-cyan-50 transition-all cursor-pointer"
                          >
                            {keyword}
                          </span>
                        ))}
                      </div>
                      <p className="text-xs text-slate-600 mt-4">
                        💡 These keywords were extracted by AI from your resume. Jobs are matched against these keywords!
                      </p>
                    </div>
                  )}

                  {/* Recommended Jobs from Scrapers */}
                  {recommendedJobs.length > 0 && (
                    <div className="mb-6">
                      <h3 className="text-lg font-bold text-slate-900 mb-4 flex items-center gap-2">
                        <Target className="text-emerald-600" size={20} />
                        Recommended Jobs Matching Your Resume
                      </h3>
                      <div className="grid gap-4">
                        {recommendedJobs.slice(0, 5).map((job, idx) => (
                          <div
                            key={idx}
                            className="bg-white border-2 border-emerald-200 rounded-xl p-5 hover:shadow-lg transition-all"
                          >
                            <div className="flex items-start justify-between mb-2">
                              <div className="flex-1">
                                <h4 className="text-base font-bold text-slate-900 mb-1">
                                  {job.title}
                                </h4>
                                <p className="text-sm text-slate-600 flex items-center gap-1 mb-2">
                                  <Building size={16} />
                                  {job.company} • {job.location || "Remote"}
                                </p>
                              </div>
                              <div className="text-right">
                                <div className="inline-block px-3 py-1 bg-emerald-100 text-emerald-700 rounded-full text-sm font-bold">
                                  {job.matchScore || 85}% Match
                                </div>
                                <p className="text-xs text-slate-500 mt-1 capitalize">
                                  {job.source || "Indeed"}
                                </p>
                              </div>
                            </div>
                            <p className="text-sm text-slate-600 line-clamp-2 mb-3">
                              {job.description}
                            </p>
                            <a
                              href={job.url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-1 text-sm font-semibold text-cyan-600 hover:text-cyan-700 transition-all"
                            >
                              View Job <ArrowRight size={16} />
                            </a>
                          </div>
                        ))}
                      </div>
                      {recommendedJobs.length > 5 && (
                        <p className="text-sm text-slate-600 mt-4 text-center">
                          ... and {recommendedJobs.length - 5} more jobs available
                        </p>
                      )}
                    </div>
                  )}

                  {/* Loading Jobs */}
                  {loadingJobs && (
                    <div className="bg-blue-50 rounded-xl p-6 border border-blue-200 text-center mb-6">
                      <Loader className="animate-spin mx-auto mb-3" size={32} />
                      <p className="text-slate-600 font-semibold">Finding jobs that match your resume...</p>
                      <p className="text-sm text-slate-500 mt-2">This may take a few moments</p>
                    </div>
                  )}

                  {/* View Jobs Button */}
                  <button
                    onClick={handleViewJobs}
                    className="w-full bg-gradient-to-r from-blue-600 to-cyan-600 text-white py-3 rounded-xl font-semibold hover:from-blue-700 hover:to-cyan-700 transition-all flex items-center justify-center gap-2"
                  >
                    <Target size={20} />
                    {recommendedJobs.length > 0 ? `View All ${recommendedJobs.length} Recommended Jobs` : "Find Jobs"}
                    <ArrowRight size={20} />
                  </button>
                </div>
              )}
            </div>

            {/* Sidebar - Tips & Keywords */}
            <div className="space-y-6">
              {/* Keyword Suggestions */}
              <div className="bg-white rounded-2xl p-6 border border-slate-200">
                <h3 className="text-lg font-bold text-slate-900 mb-4 flex items-center gap-2">
                  <Sparkles className="text-cyan-600" size={20} />
                  Recommended Keywords
                </h3>
                <p className="text-sm text-slate-600 mb-4">
                  Add these keywords to boost your ATS score:
                </p>
                <div className="flex flex-wrap gap-2">
                  {KeywordSuggestions.map((keyword, idx) => (
                    <span
                      key={idx}
                      className="px-3 py-1 bg-cyan-100 text-cyan-700 rounded-full text-xs font-semibold hover:bg-cyan-200 transition-all cursor-pointer"
                    >
                      {keyword}
                    </span>
                  ))}
                </div>
              </div>

              {/* Power Verbs */}
              <div className="bg-white rounded-2xl p-6 border border-slate-200">
                <h3 className="text-lg font-bold text-slate-900 mb-4 flex items-center gap-2">
                  <Zap className="text-amber-600" size={20} />
                  Power Verbs to Use
                </h3>
                <p className="text-sm text-slate-600 mb-4">
                  Replace weak verbs with these action words:
                </p>
                <div className="space-y-2">
                  {PowerVerbs.map((verb, idx) => (
                    <div
                      key={idx}
                      className="px-3 py-2 bg-amber-50 border border-amber-200 rounded-lg text-sm font-semibold text-amber-900 hover:bg-amber-100 transition-all cursor-pointer"
                    >
                      {verb}
                    </div>
                  ))}
                </div>
              </div>

              {/* Tips */}
              <div className="bg-gradient-to-br from-blue-50 to-cyan-50 rounded-2xl p-6 border border-blue-200">
                <h3 className="text-lg font-bold text-slate-900 mb-4 flex items-center gap-2">
                  <BarChart3 className="text-blue-600" size={20} />
                  Pro Tips
                </h3>
                <ul className="space-y-2 text-sm text-slate-700">
                  <li className="flex gap-2">
                    <span className="text-blue-600 font-bold">•</span>
                    <span>
                      Add quantifiable achievements (e.g., "Increased sales by
                      40%")
                    </span>
                  </li>
                  <li className="flex gap-2">
                    <span className="text-blue-600 font-bold">•</span>
                    <span>Use industry-specific keywords</span>
                  </li>
                  <li className="flex gap-2">
                    <span className="text-blue-600 font-bold">•</span>
                    <span>Keep format simple for ATS systems</span>
                  </li>
                  <li className="flex gap-2">
                    <span className="text-blue-600 font-bold">•</span>
                    <span>Tailor resume for each job</span>
                  </li>
                </ul>
              </div>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
};

export default JobSeekerUpload;
