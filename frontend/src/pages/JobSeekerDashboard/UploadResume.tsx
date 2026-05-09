import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import axios from "axios";
import {
  Upload,
  FileText,
  CheckCircle,
  AlertCircle,
// ArrowLeft removed
  Loader,
  X,
  Sparkles,
  Briefcase,
  Search,
  Brain,
  Target,
  Star,
  TrendingUp,
  MapPin,
  ExternalLink,
// Filter removed
  Globe,
  Zap,
  BookmarkPlus,
  BookmarkCheck,
} from "lucide-react";
import DashboardLayout from "./DashboardLayout";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:3000";

const UploadResume = () => {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadSuccess, setUploadSuccess] = useState(false);
  const [analysisPending, setAnalysisPending] = useState(false);
  const [error, setError] = useState("");
  const [targetRole, setTargetRole] = useState("");
  const [resumeId, setResumeId] = useState<string | null>(null);
  const [analysisData, setAnalysisData] = useState<any>(null);
  const [matchingJobs, setMatchingJobs] = useState<any[]>([]);
  const [loadingJobs, setLoadingJobs] = useState(false);
  const [resumeSkills, setResumeSkills] = useState<string[]>([]);
  const [, setParsedData] = useState<any>(null);
  const [selectedSearchKeywords, setSelectedSearchKeywords] = useState<string[]>([]);

  // ── Deep AI Analysis State ──
  const [deepAnalysis, setDeepAnalysis] = useState<any>(null);
  const [loadingDeepAnalysis, setLoadingDeepAnalysis] = useState(false);
  const [deepAnalysisError, setDeepAnalysisError] = useState("");

  // ── Indeed Job Search State ──
  const [indeedJobs, setIndeedJobs] = useState<any[]>([]);
  const [loadingIndeed, setLoadingIndeed] = useState(false);
  const [indeedSearchDone, setIndeedSearchDone] = useState(false);
  const [indeedCountry, setIndeedCountry] = useState("us");
  const [indeedLocation, setIndeedLocation] = useState("");

  // ── LinkedIn Job Search State ──
  const [linkedinJobs, setLinkedinJobs] = useState<any[]>([]);
  const [loadingLinkedin, setLoadingLinkedin] = useState(false);
  const [linkedinSearchDone, setLinkedinSearchDone] = useState(false);
  const [linkedinLocation, setLinkedinLocation] = useState("");
  const [linkedinTimeRange, setLinkedinTimeRange] = useState("24h");

  // ── Save Job State ──
  const [savedJobIds, setSavedJobIds] = useState<Set<string>>(new Set());
  const [savingJob, setSavingJob] = useState<string | null>(null);
  const [isPremiumError, setIsPremiumError] = useState(false);

  const navigate = useNavigate();
  const { user } = useAuth();

  const toggleKeyword = (keyword: string) => {
    setSelectedSearchKeywords(prev =>
      prev.includes(keyword)
        ? prev.filter(k => k !== keyword)
        : [...prev, keyword]
    );
  };

  // Fetch saved job IDs on mount
  React.useEffect(() => {
    const fetchSavedJobs = async () => {
      try {
        const token = localStorage.getItem("token");
        const response = await axios.get(`${API_URL}/api/jobseeker/saved-jobs`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (response.data.success) {
          const ids = new Set<string>(response.data.data.map((j: any) => j.jobId));
          setSavedJobIds(ids);
        }
      } catch { /* ignore */ }
    };
    if (user) fetchSavedJobs();
  }, [user]);

  const handleSaveJob = async (job: any, source: string) => {
    const jobId = job.id || job.url || job.applyUrl || `${source}-${job.title}-${job.company}`;
    const token = localStorage.getItem("token");
    setSavingJob(jobId);
    try {
      if (savedJobIds.has(jobId)) {
        const response = await axios.get(`${API_URL}/api/jobseeker/saved-jobs`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        const savedJob = response.data.data?.find((s: any) => s.jobId === jobId);
        if (savedJob) {
          await axios.delete(`${API_URL}/api/jobseeker/saved-jobs/${savedJob._id}`, {
            headers: { Authorization: `Bearer ${token}` },
          });
          setSavedJobIds((prev) => { const next = new Set(prev); next.delete(jobId); return next; });
        }
      } else {
        await axios.post(
          `${API_URL}/api/jobseeker/saved-jobs`,
          {
            jobId,
            title: job.title,
            company: job.company,
            location: job.location,
            type: job.type || job.job_type || "",
            salary: job.salary || "",
            description: (job.description || "").substring(0, 500),
            applyUrl: job.applyUrl || job.url || "",
            logo: job.logo || job.company_logo || "",
            source,
            postedDate: job.postedDate || job.posted_date || "",
          },
          { headers: { Authorization: `Bearer ${token}` } }
        );
        setSavedJobIds((prev) => new Set(prev).add(jobId));
      }
    } catch (err: any) {
      console.error("Save job error:", err);
    } finally {
      setSavingJob(null);
    }
  };

  // Check if user is logged in
  React.useEffect(() => {
    if (!user) {
      setError("Please login first to upload a resume");
      setTimeout(() => {
        navigate("/login");
      }, 2000);
    }
  }, [user, navigate]);

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.name.match(/\.(pdf|docx)$/i)) {
      setError("Please upload a PDF or DOCX file");
      return;
    }

    // Validate file size (10MB)
    if (file.size > 10 * 1024 * 1024) {
      setError("File size must be less than 10MB");
      return;
    }

    setSelectedFile(file);
    setError("");
  };

  const handleDrop = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    const file = event.dataTransfer.files[0];
    
    if (!file) return;

    // Validate file type
    if (!file.name.match(/\.(pdf|docx)$/i)) {
      setError("Please upload a PDF or DOCX file");
      return;
    }

    // Validate file size (10MB)
    if (file.size > 10 * 1024 * 1024) {
      setError("File size must be less than 10MB");
      return;
    }

    setSelectedFile(file);
    setError("");
  };

  const handleDragOver = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
  };

  const removeFile = () => {
    setSelectedFile(null);
    setError("");
  };

  const handleUpload = async () => {
    if (!selectedFile) {
      setError("Please select a file first");
      return;
    }

    const formData = new FormData();
    formData.append("resume", selectedFile);
    if (targetRole) {
      formData.append("targetRole", targetRole);
    }

    setUploading(true);
    setUploadProgress(0);
    setError("");

    try {
      const token = localStorage.getItem("token");
      const response = await axios.post(
        `${API_URL}/api/jobseeker/upload-resume`,
        formData,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "multipart/form-data",
          },
          onUploadProgress: (progressEvent) => {
            const percentCompleted = Math.round(
              (progressEvent.loaded * 100) / (progressEvent.total || 1)
            );
            setUploadProgress(percentCompleted);
          },
        }
      );

      if (response.data.success) {
        console.log("✅ Resume uploaded successfully");
        console.log("📝 Resume data:", response.data.data);
        
        const uploadedResumeId = response.data.data?.resumeId;
        const parsedResume = response.data.data?.parsedData;
        const analysisPending = response.data.data?.analysisPending;
        
        if (analysisPending) {
          // Python service unavailable — still show success with info message
          console.warn("⚠️ AI analysis pending — Python service unavailable");
          setAnalysisPending(true);
          setError(""); // clear any errors
        }
        
        if (uploadedResumeId) {
          setResumeId(uploadedResumeId);
          setAnalysisData(response.data.data?.aiAnalysis);
          setParsedData(parsedResume);
          console.log("💾 Resume ID:", uploadedResumeId);
          console.log("📋 Resume Skills:", parsedResume?.skills);
          
          // Extract and set resume skills (these are the actual skills from the resume)
          let allSkills: string[] = [];
          if (parsedResume?.skills && Array.isArray(parsedResume.skills)) {
            allSkills = [...parsedResume.skills];
          }
          
          // Also pull recommended keywords from AI analysis if available
          const aiAnalysisData = response.data.data?.aiAnalysis;
          if (aiAnalysisData?.recommendedKeywords && aiAnalysisData.recommendedKeywords.length > 0) {
            allSkills = [...new Set([
              ...allSkills,
              ...(aiAnalysisData.recommendedKeywords || []),
            ])];
          }
          
          // ── AI-filter: keep only tech-related keywords ──
          if (allSkills.length > 0) {
            try {
              const filterResponse = await axios.post(
                `${API_URL}/api/filter-tech-keywords`,
                { keywords: allSkills },
                { headers: { Authorization: `Bearer ${token}` }, timeout: 15000 }
              );
              if (filterResponse.data.success && filterResponse.data.tech_keywords) {
                console.log(`🔧 Tech filter: ${allSkills.length} → ${filterResponse.data.tech_keywords.length} tech keywords`);
                console.log(`   Filtered out: ${(filterResponse.data.filtered_out || []).join(', ')}`);
                allSkills = filterResponse.data.tech_keywords;
              }
            } catch (filterErr) {
              console.warn("Tech keyword filter failed, showing all:", filterErr);
            }
          }
          
          setResumeSkills(allSkills);
          
          // Automatically fetch matching jobs with tech field targeting
          await fetchMatchingJobs(uploadedResumeId, targetRole);

          // Trigger deep AI analysis (Groq + Gemini) in background
          // Skip if Python was unavailable during upload (no rawText stored) — user can retry manually
          if (!analysisPending) {
            runDeepAnalysis(uploadedResumeId);
          }
        }
        
        setUploadSuccess(true);
      }
    } catch (error: any) {
      console.error("Upload error:", error);
      if (error.response?.status === 401) {
        setError("Authentication failed. Please login again and try uploading.");
        setTimeout(() => {
          navigate("/login");
        }, 2000);
      } else if (error.response?.status === 429 && error.response?.data?.requiresPremium) {
        setError(error.response.data.error);
        setIsPremiumError(true);
      } else {
        setError(
          error.response?.data?.error || error.message || "Failed to upload resume. Please try again."
        );
      }
    } finally {
      setUploading(false);
    }
  };

  const fetchMatchingJobs = async (id: string, jobTarget: string = "") => {
    setLoadingJobs(true);
    try {
      console.log("Fetching matching jobs for resume:", id);
      const response = await axios.post(
        `${API_URL}/api/jobseeker/find-matching-jobs`,
        { resumeId: id, jobTarget: jobTarget || undefined },
        {
          headers: {
            Authorization: `Bearer ${localStorage.getItem("token")}`,
          },
          timeout: 60000,
        }
      );

      if (response.data.success) {
        const rawJobs = response.data.data?.allMatchingJobs || response.data.data?.matchingJobs || [];
        // Filter out jobs with invalid/broken URLs
        const allJobs = rawJobs.filter((job: any) => {
          if (!job.url || job.url === '#') return false;
          try {
            const u = new URL(job.url);
            // Reject bare domain roots (e.g. https://indeed.com or https://indeed.com/)
            if (u.pathname === '/' && !u.search) return false;
            return true;
          } catch { return false; }
        });
        console.log(`Matching jobs found: ${rawJobs.length} total, ${allJobs.length} with valid URLs`);
        setMatchingJobs(allJobs);
        // Cache jobs in localStorage so other pages can use them
        localStorage.setItem('veriresume_cached_jobs', JSON.stringify(allJobs));
        localStorage.setItem('veriresume_jobs_timestamp', Date.now().toString());
      }
    } catch (error: any) {
      console.error("Error fetching jobs:", error);
    } finally {
      setLoadingJobs(false);
    }
  };

  // ── Deep AI Analysis (Groq + Gemini combined) ──
  const runDeepAnalysis = async (id: string) => {
    setLoadingDeepAnalysis(true);
    setDeepAnalysisError("");
    try {
      console.log("🧠 Starting deep AI analysis (Groq + Gemini)...");
      const response = await axios.post(
        `${API_URL}/api/jobseeker/deep-analyze`,
        { resumeId: id },
        {
          headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
          timeout: 120000,
        }
      );
      if (response.data.success && response.data.data) {
        const deep = response.data.data;
        setDeepAnalysis(deep);
        console.log("✅ Deep analysis complete:", deep);

        // Merge deep analysis keywords into resumeSkills
        if (deep.recommended_job_keywords && deep.recommended_job_keywords.length > 0) {
          setResumeSkills((prev) => {
            const merged = [...new Set([...deep.recommended_job_keywords, ...prev])];

            // ── Auto-suggest: pre-select the best keywords ──
            // Prioritize: suggested job titles > skill_keywords > recommended_job_keywords
            const suggestedTitles: string[] = deep.suggested_job_titles || [];
            const skillKeywords: string[] = deep.skill_keywords || [];
            const autoSelect = [
              ...suggestedTitles.slice(0, 5),
              ...skillKeywords.slice(0, 10),
              ...deep.recommended_job_keywords.slice(0, 5),
            ];
            // Deduplicate case-insensitively, keep only items present in merged
            const mergedLower = new Set(merged.map(k => k.toLowerCase()));
            const seen = new Set<string>();
            const finalAutoSelect: string[] = [];
            for (const kw of autoSelect) {
              const lower = kw.toLowerCase();
              if (!seen.has(lower) && mergedLower.has(lower)) {
                // Find the exact-case version in merged
                const exact = merged.find(m => m.toLowerCase() === lower) || kw;
                finalAutoSelect.push(exact);
                seen.add(lower);
              }
            }
            if (finalAutoSelect.length > 0) {
              console.log(`🎯 Auto-selected ${finalAutoSelect.length} keywords:`, finalAutoSelect);
              setSelectedSearchKeywords(finalAutoSelect);
            }

            return merged;
          });
        }
      }
    } catch (err: any) {
      console.error("Deep analysis error:", err);
      setDeepAnalysisError(err.response?.data?.error || "Deep analysis failed. Basic analysis is still available above.");
    } finally {
      setLoadingDeepAnalysis(false);
    }
  };

  // ── Search Indeed Jobs via RapidAPI ──
  const searchIndeedJobs = async () => {
    const keywords = selectedSearchKeywords.length > 0
      ? selectedSearchKeywords
      : resumeSkills.slice(0, 5);

    if (keywords.length === 0) return;

    setLoadingIndeed(true);
    setIndeedSearchDone(false);
    try {
      console.log("🔍 Searching Indeed jobs with keywords:", keywords);
      const response = await axios.post(
        `${API_URL}/api/jobseeker/search-indeed`,
        {
          keywords,
          location: indeedLocation || undefined,
          country: indeedCountry,
          maxResults: 15,
        },
        {
          headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
          timeout: 90000,
        }
      );
      if (response.data.success) {
        const jobs = response.data.data?.jobs || [];
        console.log(`✅ Indeed jobs found: ${jobs.length}`);
        setIndeedJobs(jobs);
      }
    } catch (err: any) {
      console.error("Indeed search error:", err);
    } finally {
      setLoadingIndeed(false);
      setIndeedSearchDone(true);
    }
  };

  // ── Search LinkedIn Jobs via RapidAPI ──
  const searchLinkedInJobs = async () => {
    const keywords = selectedSearchKeywords.length > 0
      ? selectedSearchKeywords
      : resumeSkills.slice(0, 5);

    if (keywords.length === 0) return;

    setLoadingLinkedin(true);
    setLinkedinSearchDone(false);
    try {
      console.log("🔗 Searching LinkedIn jobs with keywords:", keywords);
      const response = await axios.post(
        `${API_URL}/api/jobseeker/search-linkedin`,
        {
          keywords,
          location: linkedinLocation || undefined,
          limit: 20,
          timeRange: linkedinTimeRange,
        },
        {
          headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
          timeout: 60000,
        }
      );
      if (response.data.success) {
        const jobs = response.data.data?.jobs || [];
        console.log(`✅ LinkedIn jobs found: ${jobs.length}`);
        setLinkedinJobs(jobs);
      }
    } catch (err: any) {
      console.error("LinkedIn search error:", err);
    } finally {
      setLoadingLinkedin(false);
      setLinkedinSearchDone(true);
    }
  };

  return (
    <DashboardLayout title="Upload Resume" subtitle="Upload your resume for AI-powered analysis">
        <div className="bg-white rounded-2xl p-8 border border-slate-200 shadow-sm">
          {/* Success Message */}
          {uploadSuccess && (
            <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-xl flex items-center gap-3">
              <CheckCircle className="text-green-600" size={24} />
              <div>
                <p className="font-semibold text-green-900">Resume uploaded successfully!</p>
                <p className="text-sm text-green-700">Redirecting to dashboard...</p>
              </div>
            </div>
          )}

          {/* Analysis Pending Notice */}
          {uploadSuccess && analysisPending && (
            <div className="mb-6 p-4 bg-amber-50 border border-amber-200 rounded-xl flex items-start gap-3">
              <AlertCircle className="text-amber-600 mt-0.5 shrink-0" size={20} />
              <div>
                <p className="font-semibold text-amber-900">AI analysis pending</p>
                <p className="text-sm text-amber-700">
                  Your resume was saved but AI parsing is currently unavailable. The analysis service needs to be running to extract skills and match jobs.
                  You can re-analyze from the <strong>Analysis</strong> page once the service is back online.
                </p>
              </div>
            </div>
          )}

          {/* Error Message */}
          {error && (
            <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-xl flex items-center gap-3">
              <AlertCircle className="text-red-600" size={24} />
              <div className="flex-1">
                <p className="font-semibold text-red-900">Upload failed</p>
                <p className="text-sm text-red-700">{error}</p>
                {isPremiumError && (
                  <button
                    onClick={() => navigate("/jobseeker/premium")}
                    className="mt-3 inline-flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-amber-500 to-amber-600 text-white rounded-lg font-semibold text-sm hover:from-amber-600 hover:to-amber-700 transition-all shadow-md"
                  >
                    <Sparkles size={16} />
                    Upgrade Now
                  </button>
                )}
              </div>
              <button onClick={() => { setError(""); setIsPremiumError(false); }} className="text-red-600 hover:text-red-800">
                <X size={20} />
              </button>
            </div>
          )}

          {/* Upload Instructions */}
          <div className="text-center mb-8">
            <div className="bg-gradient-to-br from-blue-100 to-cyan-100 w-20 h-20 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <Upload className="text-blue-600" size={40} />
            </div>
            <h2 className="text-2xl font-bold text-slate-900 mb-2">
              Upload Your Resume
            </h2>
            <p className="text-slate-600">
              Supported formats: PDF, DOCX (max 10MB)
            </p>
          </div>

          {/* Target Role Input */}
          <div className="mb-6">
            <label className="block text-sm font-semibold text-slate-900 mb-2">
              Target Job Role (Optional)
            </label>
            <input
              type="text"
              value={targetRole}
              onChange={(e) => setTargetRole(e.target.value)}
              placeholder="e.g., Software Engineer, Data Analyst, etc."
              className="w-full px-4 py-3 border border-slate-300 rounded-xl focus:outline-none focus:border-cyan-500 transition-all"
              disabled={uploading}
            />
            <p className="text-sm text-slate-500 mt-1">
              Help us analyze your resume better by specifying your target role
            </p>
          </div>

          {/* Upload Area */}
          <div
            onDrop={handleDrop}
            onDragOver={handleDragOver}
            className={`border-2 border-dashed rounded-2xl p-12 text-center transition-all ${
              selectedFile
                ? "border-cyan-400 bg-cyan-50"
                : "border-slate-300 hover:border-cyan-400 hover:bg-slate-50"
            }`}
          >
            <input
              type="file"
              id="resumeUpload"
              accept=".pdf,.docx"
              onChange={handleFileSelect}
              className="hidden"
              disabled={uploading}
            />

            {!selectedFile ? (
              <label htmlFor="resumeUpload" className="cursor-pointer block">
                <FileText className="mx-auto mb-4 text-slate-400" size={64} />
                <p className="text-lg font-semibold text-slate-900 mb-2">
                  Click to upload or drag and drop
                </p>
                <p className="text-sm text-slate-500">PDF or DOCX (max 10MB)</p>
              </label>
            ) : (
              <div className="space-y-4">
                <div className="bg-white rounded-xl p-4 border border-slate-200">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="bg-blue-100 p-3 rounded-lg">
                        <FileText className="text-blue-600" size={24} />
                      </div>
                      <div className="text-left">
                        <p className="font-semibold text-slate-900">{selectedFile.name}</p>
                        <p className="text-sm text-slate-500">
                          {(selectedFile.size / (1024 * 1024)).toFixed(2)} MB
                        </p>
                      </div>
                    </div>
                    {!uploading && (
                      <button
                        onClick={removeFile}
                        className="p-2 hover:bg-red-50 rounded-lg transition-all"
                      >
                        <X size={20} className="text-red-600" />
                      </button>
                    )}
                  </div>
                </div>

                {uploading && (
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-slate-600">Uploading...</span>
                      <span className="font-semibold text-cyan-600">{uploadProgress}%</span>
                    </div>
                    <div className="w-full bg-slate-200 rounded-full h-2">
                      <div
                        className="bg-gradient-to-r from-blue-600 to-cyan-600 h-2 rounded-full transition-all duration-300"
                        style={{ width: `${uploadProgress}%` }}
                      ></div>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Upload Button */}
          <div className="mt-8 flex gap-4">
            <button
              onClick={() => navigate("/dashboardjob")}
              className="flex-1 px-6 py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-semibold transition-all"
              disabled={uploading}
            >
              Cancel
            </button>
            <button
              onClick={handleUpload}
              disabled={!selectedFile || uploading}
              className="flex-1 px-6 py-3 bg-gradient-to-r from-blue-600 to-cyan-600 text-white rounded-xl font-semibold hover:shadow-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {uploading ? (
                <>
                  <Loader className="animate-spin" size={20} />
                  Uploading...
                </>
              ) : (
                <>
                  <Upload size={20} />
                  Upload Resume
                </>
              )}
            </button>
          </div>

          {/* Analysis Results Section */}
          {uploadSuccess && analysisData && (
            <div className="mt-8 pt-8 border-t border-slate-200 animated-in fade-in">

              {/* Overall Score */}
              <div className="mb-8 text-center">
                <h3 className="text-2xl font-bold text-slate-900 mb-4">Resume Analysis Results</h3>
                <div className="inline-flex items-center justify-center w-32 h-32 rounded-full bg-gradient-to-br from-blue-500 to-cyan-500 text-white shadow-lg">
                  <div>
                    <p className="text-4xl font-bold">{Math.round(
                      (analysisData?.atsScore ?? analysisData?.ats_score ?? 0) * 0.35 +
                      (analysisData?.grammarScore ?? analysisData?.grammar_score ?? 0) * 0.20 +
                      (analysisData?.readability ?? analysisData?.readability_score ?? 0) * 0.20 +
                      (analysisData?.structureScore ?? analysisData?.structure_score ?? 0) * 0.25
                    )}%</p>
                    <p className="text-xs uppercase tracking-wider opacity-80">Overall</p>
                  </div>
                </div>
              </div>

              {/* Score Grid */}
              {analysisPending ? (
                <div className="mb-8 p-5 bg-amber-50 border border-amber-200 rounded-xl flex items-start gap-3">
                  <AlertCircle className="text-amber-500 mt-0.5 shrink-0" size={20} />
                  <div className="flex-1">
                    <p className="font-semibold text-amber-800">AI Analysis Pending</p>
                    <p className="text-sm text-amber-700 mt-1">The AI analysis service was unavailable during upload. Click below to run analysis now.</p>
                    <button
                      onClick={() => { if (resumeId) { setAnalysisPending(false); runDeepAnalysis(resumeId); } }}
                      disabled={loadingDeepAnalysis}
                      className="mt-3 px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-lg text-sm font-semibold transition-all disabled:opacity-50 flex items-center gap-2"
                    >
                      {loadingDeepAnalysis ? <Loader size={14} className="animate-spin" /> : <Brain size={14} />}
                      {loadingDeepAnalysis ? "Analyzing..." : "Run Deep Analysis Now"}
                    </button>
                  </div>
                </div>
              ) : (
                <div className="mb-8">
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="bg-gradient-to-br from-blue-50 to-blue-100 p-6 rounded-xl border border-blue-200">
                      <p className="text-sm text-blue-600 font-semibold uppercase mb-2">ATS Score</p>
                      <p className="text-3xl font-bold text-blue-900">{analysisData?.atsScore ?? analysisData?.ats_score ?? 0}%</p>
                      <p className="text-xs text-blue-500 mt-1">Applicant Tracking System</p>
                    </div>
                    <div className="bg-gradient-to-br from-green-50 to-green-100 p-6 rounded-xl border border-green-200">
                      <p className="text-sm text-green-600 font-semibold uppercase mb-2">Grammar</p>
                      <p className="text-3xl font-bold text-green-900">{analysisData?.grammarScore ?? analysisData?.grammar_score ?? 0}%</p>
                      <p className="text-xs text-green-500 mt-1">Language Quality</p>
                    </div>
                    <div className="bg-gradient-to-br from-purple-50 to-purple-100 p-6 rounded-xl border border-purple-200">
                      <p className="text-sm text-purple-600 font-semibold uppercase mb-2">Readability</p>
                      <p className="text-3xl font-bold text-purple-900">{analysisData?.readability ?? analysisData?.readability_score ?? 0}%</p>
                      <p className="text-xs text-purple-500 mt-1">Ease of Reading</p>
                    </div>
                    <div className="bg-gradient-to-br from-orange-50 to-orange-100 p-6 rounded-xl border border-orange-200">
                      <p className="text-sm text-orange-600 font-semibold uppercase mb-2">Structure</p>
                      <p className="text-3xl font-bold text-orange-900">{analysisData?.structureScore ?? analysisData?.structure_score ?? 0}%</p>
                      <p className="text-xs text-orange-500 mt-1">Resume Organization</p>
                    </div>
                  </div>
                </div>
              )}

              {/* ── Deep AI Analysis Section (Groq + Gemini) ── */}
              {loadingDeepAnalysis && (
                <div className="mb-8 p-6 bg-gradient-to-br from-violet-50 to-indigo-50 border border-violet-200 rounded-2xl">
                  <div className="flex items-center gap-3">
                    <Loader className="animate-spin text-violet-600" size={24} />
                    <div>
                      <p className="font-bold text-violet-900">Deep AI Analysis in Progress...</p>
                      <p className="text-sm text-violet-600">Analyzing with Groq (Llama 3.3) + Gemini 2.0 Flash</p>
                    </div>
                  </div>
                </div>
              )}

              {deepAnalysisError && (
                <div className="mb-6 p-4 bg-amber-50 border border-amber-200 rounded-xl flex items-start gap-3">
                  <AlertCircle className="text-amber-600 mt-0.5 shrink-0" size={18} />
                  <p className="text-sm text-amber-700">{deepAnalysisError}</p>
                </div>
              )}

              {deepAnalysis && (
                <div className="mb-8 space-y-6">
                  {/* Deep Analysis Header */}
                  <div className="p-6 bg-gradient-to-br from-violet-50 via-indigo-50 to-purple-50 border border-violet-200 rounded-2xl">
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="text-xl font-bold text-slate-900 flex items-center gap-2">
                        <Brain size={22} className="text-violet-600" />
                        Deep AI Analysis
                      </h3>
                      <div className="flex items-center gap-2">
                        {deepAnalysis.providers_used?.includes("groq") && (
                          <span className="px-3 py-1 bg-orange-100 text-orange-700 rounded-full text-xs font-bold">Groq (Llama 3.3)</span>
                        )}
                        {deepAnalysis.providers_used?.includes("gemini") && (
                          <span className="px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-xs font-bold">Gemini 2.0</span>
                        )}
                      </div>
                    </div>

                    {/* Profile Summary */}
                    {deepAnalysis.profile_summary && (
                      <div className="mb-4 p-4 bg-white/70 rounded-xl border border-violet-100">
                        <p className="text-sm text-slate-700 leading-relaxed">{deepAnalysis.profile_summary}</p>
                      </div>
                    )}

                    {/* Career Info Row */}
                    <div className="grid grid-cols-3 gap-4 mb-4">
                      <div className="bg-white/70 p-3 rounded-xl text-center border border-violet-100">
                        <p className="text-xs text-slate-500 uppercase font-semibold">Career Level</p>
                        <p className="text-lg font-bold text-violet-900 capitalize">{deepAnalysis.career_level || "N/A"}</p>
                      </div>
                      <div className="bg-white/70 p-3 rounded-xl text-center border border-violet-100">
                        <p className="text-xs text-slate-500 uppercase font-semibold">Experience</p>
                        <p className="text-lg font-bold text-violet-900">{deepAnalysis.years_experience || "N/A"}</p>
                      </div>
                      <div className="bg-white/70 p-3 rounded-xl text-center border border-violet-100">
                        <p className="text-xs text-slate-500 uppercase font-semibold">Overall Score</p>
                        <p className="text-lg font-bold text-violet-900">{deepAnalysis.overall_score || "N/A"}%</p>
                      </div>
                    </div>

                    {/* Deep Score Grid */}
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                      <div className="bg-white/70 p-3 rounded-xl text-center border border-blue-100">
                        <p className="text-xs text-blue-600 font-semibold">ATS</p>
                        <p className="text-2xl font-bold text-blue-900">{deepAnalysis.ats_score || 0}%</p>
                      </div>
                      <div className="bg-white/70 p-3 rounded-xl text-center border border-green-100">
                        <p className="text-xs text-green-600 font-semibold">Grammar</p>
                        <p className="text-2xl font-bold text-green-900">{deepAnalysis.grammar_score || 0}%</p>
                      </div>
                      <div className="bg-white/70 p-3 rounded-xl text-center border border-purple-100">
                        <p className="text-xs text-purple-600 font-semibold">Readability</p>
                        <p className="text-2xl font-bold text-purple-900">{deepAnalysis.readability_score || 0}%</p>
                      </div>
                      <div className="bg-white/70 p-3 rounded-xl text-center border border-orange-100">
                        <p className="text-xs text-orange-600 font-semibold">Structure</p>
                        <p className="text-2xl font-bold text-orange-900">{deepAnalysis.structure_score || 0}%</p>
                      </div>
                    </div>
                  </div>

                  {/* Technical & Soft Skills */}
                  {(deepAnalysis.technical_skills?.length > 0 || deepAnalysis.soft_skills?.length > 0) && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {deepAnalysis.technical_skills?.length > 0 && (
                        <div className="p-5 bg-blue-50 border border-blue-200 rounded-xl">
                          <h4 className="text-sm font-bold text-blue-900 mb-3 flex items-center gap-2">
                            <Zap size={16} className="text-blue-600" />
                            Technical Skills
                          </h4>
                          <div className="flex flex-wrap gap-2">
                            {deepAnalysis.technical_skills.map((skill: string, i: number) => (
                              <span key={i} className="px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-xs font-medium">{skill}</span>
                            ))}
                          </div>
                        </div>
                      )}
                      {deepAnalysis.soft_skills?.length > 0 && (
                        <div className="p-5 bg-emerald-50 border border-emerald-200 rounded-xl">
                          <h4 className="text-sm font-bold text-emerald-900 mb-3 flex items-center gap-2">
                            <Star size={16} className="text-emerald-600" />
                            Soft Skills
                          </h4>
                          <div className="flex flex-wrap gap-2">
                            {deepAnalysis.soft_skills.map((skill: string, i: number) => (
                              <span key={i} className="px-3 py-1 bg-emerald-100 text-emerald-700 rounded-full text-xs font-medium">{skill}</span>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Suggested Job Titles */}
                  {deepAnalysis.suggested_job_titles?.length > 0 && (
                    <div className="p-5 bg-amber-50 border border-amber-200 rounded-xl">
                      <h4 className="text-sm font-bold text-amber-900 mb-3 flex items-center gap-2">
                        <Target size={16} className="text-amber-600" />
                        Suggested Job Titles for You
                      </h4>
                      <div className="flex flex-wrap gap-2">
                        {deepAnalysis.suggested_job_titles.map((title: string, i: number) => (
                          <span key={i} className="px-4 py-2 bg-amber-100 text-amber-800 rounded-full text-sm font-semibold border border-amber-200">{title}</span>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Deep Strengths & Weaknesses */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {deepAnalysis.strengths?.length > 0 && (
                      <div className="p-5 bg-green-50 border border-green-200 rounded-xl">
                        <h4 className="text-sm font-bold text-green-900 mb-3 flex items-center gap-2">
                          <TrendingUp size={16} className="text-green-600" />
                          Strengths
                        </h4>
                        <ul className="space-y-2">
                          {deepAnalysis.strengths.slice(0, 5).map((s: string, i: number) => (
                            <li key={i} className="text-sm text-green-700 flex items-start gap-2">
                              <span className="mt-1.5 w-1.5 h-1.5 bg-green-400 rounded-full flex-shrink-0" />
                              {s}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                    {deepAnalysis.weaknesses?.length > 0 && (
                      <div className="p-5 bg-red-50 border border-red-200 rounded-xl">
                        <h4 className="text-sm font-bold text-red-900 mb-3 flex items-center gap-2">
                          <AlertCircle size={16} className="text-red-600" />
                          Weaknesses
                        </h4>
                        <ul className="space-y-2">
                          {deepAnalysis.weaknesses.slice(0, 5).map((w: string, i: number) => (
                            <li key={i} className="text-sm text-red-700 flex items-start gap-2">
                              <span className="mt-1.5 w-1.5 h-1.5 bg-red-400 rounded-full flex-shrink-0" />
                              {w}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* ── AI Classified Categories (Skills, Hobbies, Education) ── */}
              {deepAnalysis && (deepAnalysis.skill_keywords?.length > 0 || deepAnalysis.hobbies?.length > 0 || deepAnalysis.education_keywords?.length > 0) && (
                <div className="mb-8 space-y-4">
                  <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                    <Brain size={20} className="text-violet-600" />
                    AI-Classified Resume Information
                  </h3>
                  <p className="text-xs text-slate-500 -mt-2">Groq & Gemini distinguished between your skills, hobbies, and education</p>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {/* Professional Skills */}
                    {deepAnalysis.skill_keywords?.length > 0 && (
                      <div className="p-5 bg-cyan-50 border border-cyan-200 rounded-xl">
                        <h4 className="text-sm font-bold text-cyan-900 mb-3 flex items-center gap-2">
                          <Zap size={16} className="text-cyan-600" />
                          Professional Skills
                        </h4>
                        <div className="flex flex-wrap gap-2">
                          {deepAnalysis.skill_keywords.map((skill: string, i: number) => (
                            <span key={i} className="px-3 py-1 bg-cyan-100 text-cyan-700 rounded-full text-xs font-medium border border-cyan-200">{skill}</span>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Hobbies & Interests */}
                    {deepAnalysis.hobbies?.length > 0 && (
                      <div className="p-5 bg-pink-50 border border-pink-200 rounded-xl">
                        <h4 className="text-sm font-bold text-pink-900 mb-3 flex items-center gap-2">
                          <Star size={16} className="text-pink-600" />
                          Hobbies & Interests
                        </h4>
                        <div className="flex flex-wrap gap-2">
                          {deepAnalysis.hobbies.map((hobby: string, i: number) => (
                            <span key={i} className="px-3 py-1 bg-pink-100 text-pink-700 rounded-full text-xs font-medium border border-pink-200">{hobby}</span>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Education */}
                    {deepAnalysis.education_keywords?.length > 0 && (
                      <div className="p-5 bg-amber-50 border border-amber-200 rounded-xl">
                        <h4 className="text-sm font-bold text-amber-900 mb-3 flex items-center gap-2">
                          <Target size={16} className="text-amber-600" />
                          Education & Certifications
                        </h4>
                        <div className="flex flex-wrap gap-2">
                          {deepAnalysis.education_keywords.map((edu: string, i: number) => (
                            <span key={i} className="px-3 py-1 bg-amber-100 text-amber-700 rounded-full text-xs font-medium border border-amber-200">{edu}</span>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* ── Selectable Keywords Section ── */}
              {resumeSkills && resumeSkills.length > 0 && (
                <div className="mb-6 p-6 bg-cyan-50 border border-cyan-200 rounded-2xl">
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                      <Sparkles size={20} className="text-cyan-600" />
                      Select Keywords to Search Jobs
                    </h3>
                    <span className="text-sm font-bold text-cyan-700 bg-cyan-100 px-3 py-1 rounded-full">
                      {selectedSearchKeywords.length} selected
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 mb-4">
                    These tech keywords were extracted from your resume by AI. They will be used to match you with HR-posted jobs on the portal.
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {resumeSkills.slice(0, 20).map((skill, index) => (
                      <button
                        key={index}
                        onClick={() => toggleKeyword(skill)}
                        className={`px-4 py-2 rounded-full text-sm font-semibold border transition-all ${
                          selectedSearchKeywords.includes(skill)
                            ? "bg-cyan-600 text-white border-cyan-600 shadow-md scale-105"
                            : "bg-white text-cyan-700 border-cyan-200 hover:bg-cyan-100 hover:border-cyan-400"
                        }`}
                      >
                        {selectedSearchKeywords.includes(skill) ? "✓ " : ""}{skill}
                      </button>
                    ))}
                  </div>
                  <div className="mt-4 flex gap-2">
                    <button
                      onClick={() => setSelectedSearchKeywords(resumeSkills.slice(0, 20))}
                      className="px-4 py-2 text-xs bg-white border border-slate-300 text-slate-600 rounded-lg hover:bg-slate-50 transition-all"
                    >
                      Select All
                    </button>
                    <button
                      onClick={() => setSelectedSearchKeywords([])}
                      className="px-4 py-2 text-xs bg-white border border-slate-300 text-slate-600 rounded-lg hover:bg-slate-50 transition-all"
                    >
                      Clear
                    </button>
                  </div>
                </div>
              )}

              {/* ── Search Jobs Button ── */}
              {resumeSkills && resumeSkills.length > 0 && (
                <div className="mb-8">
                  <button
                    onClick={() => {
                      const keywords = selectedSearchKeywords.length > 0
                        ? selectedSearchKeywords
                        : resumeSkills.slice(0, 5);
                      localStorage.setItem("veriresume_selected_keywords", JSON.stringify(keywords));
                      if (resumeId) localStorage.setItem("veriresume_search_resumeid", resumeId);
                      navigate("/jobseeker/jobs");
                    }}
                    className="w-full px-6 py-4 bg-gradient-to-r from-blue-600 to-cyan-600 text-white rounded-xl font-bold text-lg hover:shadow-xl transition-all flex items-center justify-center gap-3"
                  >
                    <Search size={20} />
                    Search Jobs with{" "}
                    {selectedSearchKeywords.length > 0
                      ? `${selectedSearchKeywords.length} Selected Keyword${selectedSearchKeywords.length > 1 ? "s" : ""}`
                      : "Resume Keywords"}
                  </button>
                  <p className="text-center text-xs text-slate-500 mt-2">
                    Browse HR-posted jobs on the portal matched to your resume skills
                  </p>
                </div>
              )}

              {/* ── Indeed Job Search Section ── */}
              {resumeSkills && resumeSkills.length > 0 && (
                <div className="mb-8 p-6 bg-gradient-to-br from-indigo-50 to-blue-50 border border-indigo-200 rounded-2xl">
                  <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2 mb-4">
                    <Globe size={20} className="text-indigo-600" />
                    Search Indeed Jobs
                  </h3>
                  <p className="text-xs text-slate-500 mb-4">
                    Search Indeed for jobs matching your selected keywords using the Indeed Scraper API.
                  </p>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-4">
                    {/* Country Select */}
                    <div>
                      <label className="block text-xs font-semibold text-slate-600 mb-1">Country</label>
                      <select
                        value={indeedCountry}
                        onChange={(e) => setIndeedCountry(e.target.value)}
                        className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:border-indigo-500"
                      >
                        <option value="us">United States</option>
                        <option value="uk">United Kingdom</option>
                        <option value="pk">Pakistan</option>
                        <option value="in">India</option>
                        <option value="ca">Canada</option>
                        <option value="au">Australia</option>
                        <option value="de">Germany</option>
                        <option value="ae">UAE</option>
                      </select>
                    </div>

                    {/* Location Input */}
                    <div>
                      <label className="block text-xs font-semibold text-slate-600 mb-1">Location (Optional)</label>
                      <input
                        type="text"
                        value={indeedLocation}
                        onChange={(e) => setIndeedLocation(e.target.value)}
                        placeholder="e.g., New York, Remote"
                        className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:border-indigo-500"
                      />
                    </div>

                    {/* Search Button */}
                    <div className="flex items-end">
                      <button
                        onClick={searchIndeedJobs}
                        disabled={loadingIndeed}
                        className="w-full px-4 py-2 bg-gradient-to-r from-indigo-600 to-blue-600 text-white rounded-lg font-semibold text-sm hover:shadow-lg transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                      >
                        {loadingIndeed ? (
                          <>
                            <Loader className="animate-spin" size={16} />
                            Searching Indeed...
                          </>
                        ) : (
                          <>
                            <Search size={16} />
                            Search Indeed
                          </>
                        )}
                      </button>
                    </div>
                  </div>

                  {/* Indeed Results */}
                  {loadingIndeed && (
                    <div className="flex justify-center py-8">
                      <div className="text-center">
                        <Loader className="animate-spin text-indigo-600 mb-3 mx-auto" size={32} />
                        <p className="text-sm text-slate-600 font-semibold">Searching Indeed via API...</p>
                        <p className="text-xs text-slate-400">This may take up to a minute</p>
                      </div>
                    </div>
                  )}

                  {indeedSearchDone && indeedJobs.length > 0 && (
                    <div className="space-y-3 mt-4">
                      <div className="flex items-center justify-between">
                        <h4 className="text-sm font-bold text-slate-800">Indeed Results ({indeedJobs.length})</h4>
                        <span className="px-3 py-1 bg-indigo-100 text-indigo-700 rounded-full text-xs font-bold">Indeed</span>
                      </div>
                      {indeedJobs.map((job: any, idx: number) => (
                        <div key={idx} className="bg-white border border-slate-200 rounded-xl p-5 hover:shadow-md transition-all">
                          <div className="flex justify-between items-start mb-2">
                            <div className="flex-1">
                              <h5 className="text-base font-bold text-slate-900">{job.title}</h5>
                              <p className="text-sm text-slate-600">{job.company}</p>
                            </div>
                            <div className="flex items-center gap-2 ml-3">
                              {job.matchScore != null && (
                                <span className="px-3 py-1 bg-green-100 text-green-700 rounded-full text-xs font-bold">
                                  {job.matchScore}% Match
                                </span>
                              )}
                              <span className="px-2 py-1 bg-indigo-100 text-indigo-700 rounded-full text-xs font-bold">Indeed</span>
                            </div>
                          </div>

                          <div className="flex items-center gap-3 text-sm text-slate-500 mb-3">
                            {job.location && (
                              <span className="flex items-center gap-1">
                                <MapPin size={14} /> {job.location}
                              </span>
                            )}
                            {job.salary && (
                              <span className="text-green-600 font-semibold">{job.salary}</span>
                            )}
                            {job.posted_date && (
                              <span className="text-slate-400">• {job.posted_date}</span>
                            )}
                            {job.is_remote && (
                              <span className="px-2 py-0.5 bg-cyan-100 text-cyan-700 rounded text-xs font-medium">Remote</span>
                            )}
                          </div>

                          {job.matchedSkills && job.matchedSkills.length > 0 && (
                            <div className="mb-3">
                              <div className="flex flex-wrap gap-1.5">
                                {job.matchedSkills.map((skill: string, si: number) => (
                                  <span key={si} className="px-2 py-0.5 bg-green-100 text-green-700 rounded text-xs">
                                    ✓ {skill}
                                  </span>
                                ))}
                              </div>
                            </div>
                          )}

                          {job.description && (
                            <p className="text-xs text-slate-500 mb-3 line-clamp-2">{job.description}</p>
                          )}

                          <div className="flex gap-2">
                            {(job.applyUrl || job.url) && (
                              <a
                                href={job.applyUrl || job.url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="flex-1 px-4 py-2 bg-gradient-to-r from-indigo-600 to-blue-600 text-white rounded-lg text-sm font-semibold hover:shadow-md transition-all text-center flex items-center justify-center gap-2"
                              >
                                <ExternalLink size={14} />
                                Apply on Indeed
                              </a>
                            )}
                            <button
                              onClick={() => handleSaveJob(job, "Indeed")}
                              disabled={savingJob === (job.id || job.url || job.applyUrl || `Indeed-${job.title}-${job.company}`)}
                              className={`px-3 py-2 rounded-lg text-sm font-semibold transition-all flex items-center gap-1.5 ${
                                savedJobIds.has(job.id || job.url || job.applyUrl || `Indeed-${job.title}-${job.company}`)
                                  ? "bg-amber-100 text-amber-700 hover:bg-amber-200"
                                  : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                              }`}
                              title={savedJobIds.has(job.id || job.url || job.applyUrl || `Indeed-${job.title}-${job.company}`) ? "Unsave" : "Save Job"}
                            >
                              {savedJobIds.has(job.id || job.url || job.applyUrl || `Indeed-${job.title}-${job.company}`) ? (
                                <BookmarkCheck size={16} />
                              ) : (
                                <BookmarkPlus size={16} />
                              )}
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  {indeedSearchDone && indeedJobs.length === 0 && !loadingIndeed && (
                    <div className="text-center py-6 bg-white/60 rounded-xl border border-slate-200">
                      <p className="text-sm text-slate-500">No Indeed jobs found. Try different keywords or location.</p>
                    </div>
                  )}
                </div>
              )}

              {/* ── LinkedIn Job Search Section ── */}
              {resumeSkills && resumeSkills.length > 0 && (
                <div className="mb-8 p-6 bg-gradient-to-br from-sky-50 to-blue-50 border border-sky-200 rounded-2xl">
                  <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2 mb-4">
                    <Briefcase size={20} className="text-sky-600" />
                    Search LinkedIn Jobs
                  </h3>
                  <p className="text-xs text-slate-500 mb-4">
                    Search real LinkedIn job listings matching your selected keywords using the LinkedIn Job Search API.
                  </p>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-4">
                    {/* Location Input */}
                    <div>
                      <label className="block text-xs font-semibold text-slate-600 mb-1">Location (Optional)</label>
                      <input
                        type="text"
                        value={linkedinLocation}
                        onChange={(e) => setLinkedinLocation(e.target.value)}
                        placeholder="e.g., United States, Pakistan, Remote"
                        className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:border-sky-500"
                      />
                    </div>

                    {/* Time Range */}
                    <div>
                      <label className="block text-xs font-semibold text-slate-600 mb-1">Posted Within</label>
                      <select
                        value={linkedinTimeRange}
                        onChange={(e) => setLinkedinTimeRange(e.target.value)}
                        className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:border-sky-500"
                      >
                        <option value="24h">Last 24 Hours</option>
                        <option value="7d">Last 7 Days</option>
                      </select>
                    </div>

                    {/* Search Button */}
                    <div className="flex items-end">
                      <button
                        onClick={searchLinkedInJobs}
                        disabled={loadingLinkedin}
                        className="w-full px-4 py-2 bg-gradient-to-r from-sky-600 to-blue-700 text-white rounded-lg font-semibold text-sm hover:shadow-lg transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                      >
                        {loadingLinkedin ? (
                          <>
                            <Loader className="animate-spin" size={16} />
                            Searching LinkedIn...
                          </>
                        ) : (
                          <>
                            <Search size={16} />
                            Search LinkedIn
                          </>
                        )}
                      </button>
                    </div>
                  </div>

                  {/* LinkedIn Results */}
                  {loadingLinkedin && (
                    <div className="flex justify-center py-8">
                      <div className="text-center">
                        <Loader className="animate-spin text-sky-600 mb-3 mx-auto" size={32} />
                        <p className="text-sm text-slate-600 font-semibold">Searching LinkedIn jobs...</p>
                        <p className="text-xs text-slate-400">Fetching real-time listings</p>
                      </div>
                    </div>
                  )}

                  {linkedinSearchDone && linkedinJobs.length > 0 && (
                    <div className="space-y-3 mt-4">
                      <div className="flex items-center justify-between">
                        <h4 className="text-sm font-bold text-slate-800">LinkedIn Results ({linkedinJobs.length})</h4>
                        <span className="px-3 py-1 bg-sky-100 text-sky-700 rounded-full text-xs font-bold">LinkedIn</span>
                      </div>
                      {linkedinJobs.map((job: any, idx: number) => (
                        <div key={idx} className="bg-white border border-slate-200 rounded-xl p-5 hover:shadow-md transition-all">
                          <div className="flex justify-between items-start mb-2">
                            <div className="flex items-start gap-3 flex-1">
                              {job.company_logo && (
                                <img
                                  src={job.company_logo}
                                  alt={job.company}
                                  className="w-10 h-10 rounded-lg object-cover border border-slate-200 flex-shrink-0"
                                  onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
                                />
                              )}
                              <div>
                                <h5 className="text-base font-bold text-slate-900">{job.title}</h5>
                                <p className="text-sm text-slate-600">{job.company}</p>
                                {job.company_industry && (
                                  <p className="text-xs text-slate-400">{job.company_industry} · {job.company_size}</p>
                                )}
                              </div>
                            </div>
                            <div className="flex items-center gap-2 ml-3">
                              {job.matchScore != null && (
                                <span className="px-3 py-1 bg-green-100 text-green-700 rounded-full text-xs font-bold">
                                  {job.matchScore}% Match
                                </span>
                              )}
                              <span className="px-2 py-1 bg-sky-100 text-sky-700 rounded-full text-xs font-bold">LinkedIn</span>
                            </div>
                          </div>

                          <div className="flex items-center gap-3 text-sm text-slate-500 mb-3 flex-wrap">
                            {job.location && (
                              <span className="flex items-center gap-1">
                                <MapPin size={14} /> {job.location}
                              </span>
                            )}
                            {job.salary && (
                              <span className="text-green-600 font-semibold">{job.salary}</span>
                            )}
                            {job.seniority && job.seniority !== 'null' && (
                              <span className="px-2 py-0.5 bg-violet-100 text-violet-700 rounded text-xs font-medium">{job.seniority}</span>
                            )}
                            {job.is_remote && (
                              <span className="px-2 py-0.5 bg-cyan-100 text-cyan-700 rounded text-xs font-medium">Remote</span>
                            )}
                            {job.posted_date && (
                              <span className="text-slate-400">• {job.posted_date}</span>
                            )}
                          </div>

                          {job.matchedSkills && job.matchedSkills.length > 0 && (
                            <div className="mb-3">
                              <div className="flex flex-wrap gap-1.5">
                                {job.matchedSkills.map((skill: string, si: number) => (
                                  <span key={si} className="px-2 py-0.5 bg-green-100 text-green-700 rounded text-xs">
                                    ✓ {skill}
                                  </span>
                                ))}
                              </div>
                            </div>
                          )}

                          {job.description && (
                            <p className="text-xs text-slate-500 mb-3 line-clamp-2">{job.description}</p>
                          )}

                          <div className="flex gap-2">
                            {(job.applyUrl || job.url) && (
                              <a
                                href={job.applyUrl || job.url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="flex-1 px-4 py-2 bg-gradient-to-r from-sky-600 to-blue-700 text-white rounded-lg text-sm font-semibold hover:shadow-md transition-all text-center flex items-center justify-center gap-2"
                              >
                                <ExternalLink size={14} />
                                {job.direct_apply ? 'Apply Directly' : 'View on LinkedIn'}
                              </a>
                            )}
                            <button
                              onClick={() => handleSaveJob(job, "LinkedIn")}
                              disabled={savingJob === (job.id || job.url || job.applyUrl || `LinkedIn-${job.title}-${job.company}`)}
                              className={`px-3 py-2 rounded-lg text-sm font-semibold transition-all flex items-center gap-1.5 ${
                                savedJobIds.has(job.id || job.url || job.applyUrl || `LinkedIn-${job.title}-${job.company}`)
                                  ? "bg-amber-100 text-amber-700 hover:bg-amber-200"
                                  : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                              }`}
                              title={savedJobIds.has(job.id || job.url || job.applyUrl || `LinkedIn-${job.title}-${job.company}`) ? "Unsave" : "Save Job"}
                            >
                              {savedJobIds.has(job.id || job.url || job.applyUrl || `LinkedIn-${job.title}-${job.company}`) ? (
                                <BookmarkCheck size={16} />
                              ) : (
                                <BookmarkPlus size={16} />
                              )}
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  {linkedinSearchDone && linkedinJobs.length === 0 && !loadingLinkedin && (
                    <div className="text-center py-6 bg-white/60 rounded-xl border border-slate-200">
                      <p className="text-sm text-slate-500">No LinkedIn jobs found. Try different keywords or a wider time range.</p>
                    </div>
                  )}
                </div>
              )}

              {/* Weaknesses & Suggestions */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
                {/* Weaknesses */}
                {analysisData?.weaknesses && analysisData.weaknesses.length > 0 && (
                  <div className="p-6 bg-red-50 border border-red-200 rounded-xl">
                    <h4 className="text-lg font-bold text-red-900 mb-3 flex items-center gap-2">
                      <AlertCircle size={18} className="text-red-600" />
                      Areas to Improve
                    </h4>
                    <ul className="space-y-2">
                      {analysisData.weaknesses.slice(0, 5).map((item: string, idx: number) => (
                        <li key={idx} className="text-sm text-red-700 flex items-start gap-2">
                          <span className="mt-1 w-1.5 h-1.5 bg-red-400 rounded-full flex-shrink-0"></span>
                          {item}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Suggestions */}
                {analysisData?.suggestions && analysisData.suggestions.length > 0 && (
                  <div className="p-6 bg-emerald-50 border border-emerald-200 rounded-xl">
                    <h4 className="text-lg font-bold text-emerald-900 mb-3 flex items-center gap-2">
                      <CheckCircle size={18} className="text-emerald-600" />
                      Suggestions
                    </h4>
                    <ul className="space-y-2">
                      {analysisData.suggestions.slice(0, 5).map((item: string, idx: number) => (
                        <li key={idx} className="text-sm text-emerald-700 flex items-start gap-2">
                          <span className="mt-1 w-1.5 h-1.5 bg-emerald-400 rounded-full flex-shrink-0"></span>
                          {item}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>



              {/* Matching Jobs Section */}
              {loadingJobs && (
                <div className="flex justify-center py-12">
                  <div className="text-center">
                    <div className="inline-block">
                      <Loader className="animate-spin text-blue-600 mb-4" size={40} />
                    </div>
                    <p className="text-slate-600 font-semibold">Finding matching jobs from multiple platforms...</p>
                  </div>
                </div>
              )}

              {matchingJobs.length > 0 && !loadingJobs && (
                <div>
                  <h3 className="text-2xl font-bold text-slate-900 mb-6">Matching Jobs Found ({matchingJobs.length})</h3>
                  <div className="space-y-4">
                    {matchingJobs.map((job: any, index: number) => (
                      <div key={index} className="bg-white border border-slate-200 rounded-xl p-6 hover:shadow-lg transition-all">
                        <div className="flex justify-between items-start mb-3">
                          <div className="flex-1">
                            <h4 className="text-lg font-bold text-slate-900">{job.title}</h4>
                            <p className="text-sm text-slate-600">{job.company}</p>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-sm font-semibold">
                              {job.matchScore || job.match_score || 0}% Match
                            </span>
                            <span className={`px-3 py-1 rounded-full text-xs font-semibold ${
                              (job.source || job.platform || '').toLowerCase() === 'indeed' ? 'bg-indigo-100 text-indigo-700' :
                              (job.source || job.platform || '').toLowerCase() === 'remotive' ? 'bg-blue-100 text-blue-700' :
                              (job.source || job.platform || '').toLowerCase() === 'jobicy' ? 'bg-purple-100 text-purple-700' :
                              (job.source || job.platform || '').toLowerCase() === 'arbeitnow' ? 'bg-teal-100 text-teal-700' :
                              (job.source || job.platform || '').toLowerCase() === 'usajobs' ? 'bg-red-100 text-red-700' :
                              'bg-slate-100 text-slate-700'
                            }`}>
                              {(job.source || job.platform || 'Job Site').charAt(0).toUpperCase() + (job.source || job.platform || 'Job Site').slice(1)}
                            </span>
                          </div>
                        </div>
                        <div className="flex items-center gap-4 text-sm text-slate-600 mb-3">
                          <span className="flex items-center gap-1">📍 {job.location}</span>
                          {job.postedDate && <span className="text-slate-400">• {job.postedDate}</span>}
                        </div>
                        {job.matchedSkills && job.matchedSkills.length > 0 && (
                          <div className="mb-3">
                            <p className="text-xs text-slate-500 font-semibold mb-2">Matched Skills:</p>
                            <div className="flex flex-wrap gap-2">
                              {job.matchedSkills.map((skill: string, i: number) => (
                                <span key={i} className="px-2 py-1 bg-green-100 text-green-700 rounded text-xs">
                                  ✓ {skill}
                                </span>
                              ))}
                            </div>
                          </div>
                        )}
                        <div className="flex gap-2 mt-4">
                          {job.url && (
                            <a
                              href={job.url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="flex-1 px-4 py-2 bg-gradient-to-r from-blue-600 to-cyan-600 text-white rounded-lg text-sm font-semibold hover:shadow-md transition-all text-center"
                            >
                              Apply Now →
                            </a>
                          )}
                          <button
                            onClick={() => handleSaveJob(job, job.source || job.platform || "Job Site")}
                            disabled={savingJob === (job.id || job.url || `${(job.source || 'match')}-${job.title}-${job.company}`)}
                            className={`px-3 py-2 rounded-lg text-sm font-semibold transition-all flex items-center gap-1.5 ${
                              savedJobIds.has(job.id || job.url || `${(job.source || 'match')}-${job.title}-${job.company}`)
                                ? "bg-amber-100 text-amber-700 hover:bg-amber-200"
                                : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                            }`}
                            title={savedJobIds.has(job.id || job.url || `${(job.source || 'match')}-${job.title}-${job.company}`) ? "Unsave" : "Save Job"}
                          >
                            {savedJobIds.has(job.id || job.url || `${(job.source || 'match')}-${job.title}-${job.company}`) ? (
                              <BookmarkCheck size={16} />
                            ) : (
                              <BookmarkPlus size={16} />
                            )}
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {!loadingJobs && matchingJobs.length === 0 && (
                <div className="text-center py-12 bg-slate-50 rounded-xl border border-slate-200">
                  <p className="text-slate-600">No matching jobs found yet. Try adjusting your resume or search criteria.</p>
                </div>
              )}
            </div>
          )}

          {/* Features Info */}
          <div className="mt-8 pt-8 border-t border-slate-200">
            <h3 className="font-semibold text-slate-900 mb-4">What happens next?</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="flex gap-3">
                <div className="bg-blue-100 p-2 rounded-lg h-fit">
                  <CheckCircle className="text-blue-600" size={20} />
                </div>
                <div>
                  <p className="font-semibold text-slate-900 text-sm">AI Analysis</p>
                  <p className="text-xs text-slate-600">
                    Get your ATS score and detailed feedback
                  </p>
                </div>
              </div>
              <div className="flex gap-3">
                <div className="bg-green-100 p-2 rounded-lg h-fit">
                  <CheckCircle className="text-green-600" size={20} />
                </div>
                <div>
                  <p className="font-semibold text-slate-900 text-sm">Suggestions</p>
                  <p className="text-xs text-slate-600">
                    Receive AI-powered enhancement tips
                  </p>
                </div>
              </div>
              <div className="flex gap-3">
                <div className="bg-purple-100 p-2 rounded-lg h-fit">
                  <CheckCircle className="text-purple-600" size={20} />
                </div>
                <div>
                  <p className="font-semibold text-slate-900 text-sm">Job Matching</p>
                  <p className="text-xs text-slate-600">
                    Get personalized job recommendations
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </DashboardLayout>
  );
};

export default UploadResume;
