import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import DashboardLayout from "./DashboardLayout";
import axios from "axios";
import {
  Briefcase,
  MapPin,
  DollarSign,
  Bookmark,
  BookmarkCheck,
  Loader,
  AlertCircle,
  Filter,
  Search,
  FileText,
  Upload,
  RefreshCw,
  TrendingUp,
  CheckCircle,
  XCircle,
  Brain,
  ChevronDown,
  ChevronUp,
  Sparkles,
  Tag,
  Clock,
  Building2,
  ArrowRight,
  Star,
  Users,
  ExternalLink,
  Globe,
} from "lucide-react";

const API_URL =
  import.meta.env.VITE_API_URL ||
  import.meta.env.VITE_API_BASE_URL ||
  "http://localhost:3000";

interface Job {
  _id: string;
  title: string;
  company: string;
  location: string;
  companyLogoUrl?: string;
  companyDescription?: string;
  companyWebsite?: string;
  companyLocation?: string;
  description: string;
  salary?: string;
  type?: string;
  experience?: string;
  industry?: string;
  requirements: string[];
  skillsRequired: string[];
  responsibilities: string[];
  benefits: string[];
  postedDate?: string;
  postedBy?: { name?: string; email?: string; company?: string };
  source?: string;
  matchScore?: number;
  matchedSkills?: string[];
  missingSkills?: string[];
  url?: string;
  applyUrl?: string;
  job_apply_link?: string;
}

const JobSeekerJobs = () => {
  const navigate = useNavigate();

  // Resume state
  const [hasResume, setHasResume] = useState(false);
  const [resumeData, setResumeData] = useState<any>(null);
  const [, setResumeId] = useState("");
  const [recommendedKeywords, setRecommendedKeywords] = useState<string[]>([]);

  // Job state
  const [portalJobs, setPortalJobs] = useState<Job[]>([]);
  const [externalJobs, setExternalJobs] = useState<any[]>([]);
  const [allJobs, setAllJobs] = useState<Job[]>([]);
  const [filteredJobs, setFilteredJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState(true);
  const [externalLoading, setExternalLoading] = useState(false);
  const [error, setError] = useState("");
  // savedJobMap: jobId → saved document _id in DB
  const [savedJobMap, setSavedJobMap] = useState<Record<string, string>>({});
  const [savingJob, setSavingJob] = useState<string | null>(null);

  // Search & filter state
  const [searchTerm, setSearchTerm] = useState("");
  const [typeFilter, setTypeFilter] = useState("all");
  const [sourceFilter, setSourceFilter] = useState("all");
  const [sortBy, setSortBy] = useState<"match" | "recent">("match");
  const [minMatchFilter, setMinMatchFilter] = useState(35); // 35 = hide Low Match (<35%); 0 = show all
  const [expandedJob, setExpandedJob] = useState<string | null>(null);

  // Application state
  const [appliedJobs, setAppliedJobs] = useState<Record<string, string>>({});

  const jobTypes = ["all", "Full-time", "Part-time", "Contract", "Remote", "Internship"];

  useEffect(() => {
    fetchResumeAndJobs();
    fetchSavedJobIds(); // Load persisted saved jobs on mount
  }, []);

  useEffect(() => {
    // Merge portal and external jobs
    // Helper: check if a job URL is valid and not a bare domain root
    const isValidJobUrl = (url?: string): boolean => {
      if (!url || url === '#') return false;
      try {
        const u = new URL(url);
        if (u.pathname === '/' && !u.search) return false;
        return true;
      } catch { return false; }
    };

    const mapped = externalJobs
      .filter((ej: any) => isValidJobUrl(ej.url || ej.applyUrl || ej.job_apply_link || ej.link)) // drop jobs with no valid URL
      .map((ej: any, idx: number) => {
        // Create a stable fallback ID if missing, to prevent re-renders breaking the savedJobMap
        const stableId = ej.id || `ext-${btoa((ej.title || "") + (ej.company || "")).substring(0, 15)}-${idx}`;
        return {
        _id: stableId,
        title: ej.title || "Untitled",
        company: ej.company || "Unknown Company",
        location: ej.location || "Remote",
        description: ej.description || "",
        salary: ej.salary || "",
        type: ej.job_type || ej.type || "",
        experience: "",
        industry: ej.category || "",
        requirements: [],
        skillsRequired: ej.keywords || [],
        responsibilities: [],
        benefits: [],
        postedDate: ej.posted_date || ej.postedDate || "",
        source: ej.source || "External",
        matchScore: ej.matchScore || 0,
        matchedSkills: ej.matchedSkills || [],
        missingSkills: ej.missingSkills || [],
        companyLogoUrl: ej.logo || ej.company_logo || "",
        // Capture all possible URL fields so apply & save both work
        url: ej.url || ej.applyUrl || ej.job_apply_link || ej.link || "#",
        applyUrl: ej.applyUrl || ej.url || ej.job_apply_link || ej.link || "#",
        job_apply_link: ej.job_apply_link || "",
      };
      });

    const merged: Job[] = [...portalJobs, ...mapped];
    setAllJobs(merged);
  }, [portalJobs, externalJobs]);

  useEffect(() => {
    filterJobs();
  }, [allJobs, searchTerm, typeFilter, sourceFilter, sortBy, minMatchFilter]);

  // ═══════════════════════════════════════════════
  // Fetch saved job IDs from DB (persists across sessions)
  // ═══════════════════════════════════════════════
  const fetchSavedJobIds = async () => {
    try {
      const token = localStorage.getItem("token");
      if (!token) return;
      const response = await axios.get(`${API_URL}/api/jobseeker/saved-jobs`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (response.data.success) {
        const map: Record<string, string> = {};
        (response.data.data || []).forEach((saved: any) => {
          if (saved.jobId) map[saved.jobId] = saved._id;
        });
        setSavedJobMap(map);
      }
    } catch (err: any) {
      console.warn("Could not load saved jobs:", err.message);
    }
  };

  const fetchResumeAndJobs = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem("token");

      // Step 1: Fetch resume
      const resumeResponse = await axios.get(`${API_URL}/api/jobseeker/my-resumes`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      let rId = "";
      if (resumeResponse.data.success && resumeResponse.data.data?.resumes?.length > 0) {
        const resume = resumeResponse.data.data.resumes[0];
        setResumeData(resume);
        setHasResume(true);
        rId = resume._id;
        setResumeId(rId);

        // Extract keywords from resume
        const skills = resume.parsedData?.skills || [];
        const aiKeywords = resume.aiAnalysis?.recommendedKeywords || [];
        const techSkills = resume.aiAnalysis?.techSkills || [];
        let allKeywords = [...new Set([...skills, ...aiKeywords, ...techSkills])]
          .filter((k: string) => k && typeof k === "string" && k.length > 1 && k.length < 50);

        // ── AI-filter: keep only real tech/professional skills (via Groq/Gemini) ──
        if (allKeywords.length > 0) {
          try {
            const filterResponse = await axios.post(
              `${API_URL}/api/filter-tech-keywords`,
              { keywords: allKeywords },
              { headers: { Authorization: `Bearer ${token}` }, timeout: 15000 }
            );
            if (filterResponse.data.success && filterResponse.data.tech_keywords) {
              console.log(`🔧 Tech filter: ${allKeywords.length} → ${filterResponse.data.tech_keywords.length} tech keywords`);
              console.log(`   Filtered out: ${(filterResponse.data.filtered_out || []).join(', ')}`);
              allKeywords = filterResponse.data.tech_keywords;
            }
          } catch (filterErr) {
            console.warn("Tech keyword filter failed, showing all:", filterErr);
          }
        }

        setRecommendedKeywords(allKeywords);
      } else {
        setHasResume(false);
      }

      // Step 2: Fetch all active HR-posted jobs
      await fetchHRJobs(rId);

      // Step 3: Fetch external platform jobs
      if (rId) {
        fetchExternalJobs(rId);
      }

      // Step 4: Check applied jobs
      checkAppliedJobs();
    } catch (err: any) {
      console.error("Failed to fetch data:", err);
      setError("Failed to load data. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const fetchHRJobs = async (rid: string = "") => {
    try {
      const token = localStorage.getItem("token");
      const url = rid
        ? `${API_URL}/api/jobs/active?resumeId=${rid}`
        : `${API_URL}/api/jobs/active`;

      const response = await axios.get(url, {
        headers: { Authorization: `Bearer ${token}` },
        timeout: 15000,
      });

      if (response.data.success) {
        const jobList = (response.data.data?.jobs || []).map((j: any) => ({
          ...j,
          source: "Portal",
        }));
        setPortalJobs(jobList);
      }
    } catch (err: any) {
      console.error("HR Job fetch error:", err);
    }
  };

  const fetchExternalJobs = async (rid: string) => {
    try {
      setExternalLoading(true);

      // Check localStorage cache first (from dashboard)
      const cachedJobs = localStorage.getItem("veriresume_cached_jobs");
      const cachedTimestamp = localStorage.getItem("veriresume_jobs_timestamp");
      const cacheAge = cachedTimestamp ? Date.now() - parseInt(cachedTimestamp) : Infinity;

      let baseJobs: any[] = [];

      if (cachedJobs && cacheAge < 30 * 60 * 1000) {
        try {
          const jobs = JSON.parse(cachedJobs);
          if (jobs.length > 0) {
            baseJobs = jobs;
          }
        } catch (e) {}
      }

      // Fetch fresh from APIs in parallel if no cache
      const token = localStorage.getItem("token");
      
      if (baseJobs.length === 0) {
        try {
          const response = await axios.post(
            `${API_URL}/api/jobseeker/find-matching-jobs`,
            { resumeId: rid },
            {
              headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${token}`,
              },
              timeout: 60000,
            }
          );
          if (response.data.success) {
            baseJobs = response.data.data?.allMatchingJobs || [];
          }
        } catch (err: any) {
          console.error("Free API jobs fetch error:", err);
        }
      }

      // Also fetch LinkedIn jobs in parallel
      const resumeSkills = recommendedKeywords.slice(0, 5);
      let linkedinJobs: any[] = [];
      if (resumeSkills.length > 0) {
        try {
          const linkedinResp = await axios.post(
            `${API_URL}/api/jobseeker/search-linkedin`,
            {
              keywords: resumeSkills,
              limit: 20,
              timeRange: "24h",
            },
            {
              headers: { Authorization: `Bearer ${token}` },
              timeout: 60000,
            }
          );
          if (linkedinResp.data.success) {
            linkedinJobs = (linkedinResp.data.data?.jobs || []).map((j: any) => ({
              ...j,
              source: "LinkedIn",
              matchScore: j.matchScore || 0,
            }));
            console.log(`✅ LinkedIn jobs for recommendations: ${linkedinJobs.length}`);
          }
        } catch (err: any) {
          console.warn("LinkedIn jobs fetch for recommendations:", err.message);
        }
      }

      // Also fetch Indeed jobs
      let indeedJobs: any[] = [];
      if (resumeSkills.length > 0) {
        try {
          const indeedResp = await axios.post(
            `${API_URL}/api/jobseeker/search-indeed`,
            {
              keywords: resumeSkills,
              country: "us",
              maxResults: 15,
            },
            {
              headers: { Authorization: `Bearer ${token}` },
              timeout: 90000,
            }
          );
          if (indeedResp.data.success) {
            indeedJobs = (indeedResp.data.data?.jobs || []).map((j: any) => ({
              ...j,
              source: j.source || "Indeed",
              matchScore: j.matchScore || 0,
            }));
            console.log(`✅ Indeed jobs for recommendations: ${indeedJobs.length}`);
          }
        } catch (err: any) {
          console.warn("Indeed jobs fetch for recommendations:", err.message);
        }
      }

      // Merge all jobs (deduplicate by title+company)
      const allExternal = [...baseJobs, ...linkedinJobs, ...indeedJobs];
      const seen = new Set<string>();
      const dedupedJobs = allExternal.filter((job: any) => {
        const key = `${(job.title || '').toLowerCase().trim()}|${(job.company || '').toLowerCase().trim()}`;
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
      });

      setExternalJobs(dedupedJobs);

      // Update cache
      localStorage.setItem("veriresume_cached_jobs", JSON.stringify(dedupedJobs));
      localStorage.setItem("veriresume_jobs_timestamp", Date.now().toString());
    } catch (err: any) {
      console.error("External jobs fetch error:", err);
    } finally {
      setExternalLoading(false);
    }
  };

  // ═══════════════════════════════════════════════
  // Filter + Sort jobs
  // ═══════════════════════════════════════════════
  const filterJobs = () => {
    let filtered = allJobs;

    // Minimum match score filter — portal jobs always pass through
    if (minMatchFilter > 0) {
      filtered = filtered.filter(
        (job) => job.source === "Portal" || (job.matchScore || 0) >= minMatchFilter
      );
    }

    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(
        (job) =>
          job.title?.toLowerCase().includes(term) ||
          job.company?.toLowerCase().includes(term) ||
          job.location?.toLowerCase().includes(term) ||
          job.description?.toLowerCase().includes(term) ||
          job.companyDescription?.toLowerCase().includes(term) ||
          job.requirements?.some((r) => r.toLowerCase().includes(term)) ||
          job.skillsRequired?.some((s) => s.toLowerCase().includes(term))
      );
    }

    if (typeFilter !== "all") {
      filtered = filtered.filter((job) => job.type === typeFilter);
    }

    if (sourceFilter !== "all") {
      if (sourceFilter === "portal") {
        filtered = filtered.filter((job) => job.source === "Portal");
      } else if (sourceFilter === "external") {
        filtered = filtered.filter((job) => job.source !== "Portal");
      } else {
        // Filter by specific platform name (indeed, linkedin, glassdoor, remotive, etc.)
        filtered = filtered.filter(
          (job) => (job.source || "").toLowerCase() === sourceFilter.toLowerCase()
        );
      }
    }

    // Deduplicate by normalized title + company
    const seen = new Set<string>();
    filtered = filtered.filter((job) => {
      const key = `${(job.title || '').toLowerCase().trim()}|${(job.company || '').toLowerCase().trim()}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });

    filtered.sort((a, b) => {
      if (sortBy === "match") {
        return (b.matchScore || 0) - (a.matchScore || 0);
      }
      const dateA = new Date(a.postedDate || 0).getTime();
      const dateB = new Date(b.postedDate || 0).getTime();
      return dateB - dateA;
    });

    setFilteredJobs(filtered);
  };

  // ═══════════════════════════════════════════════
  // Save / unsave a job (persists to DB)
  // ═══════════════════════════════════════════════
  const handleSaveJob = async (job: Job) => {
    const jobId = job._id;
    const token = localStorage.getItem("token");
    setSavingJob(jobId);
    try {
      const existingDocId = savedJobMap[jobId];
      if (existingDocId) {
        // Already saved → unsave
        await axios.delete(`${API_URL}/api/jobseeker/saved-jobs/${existingDocId}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        setSavedJobMap((prev) => {
          const next = { ...prev };
          delete next[jobId];
          return next;
        });
      } else {
        // Not saved → save
        const applyLink =
          job.applyUrl || job.job_apply_link || job.url || "#";
        const response = await axios.post(
          `${API_URL}/api/jobseeker/saved-jobs`,
          {
            jobId,
            title: job.title,
            company: job.company || "Unknown",
            location: job.location || "",
            type: job.type || "Full-time",
            salary: job.salary || "Not specified",
            description: (job.description || "").substring(0, 500),
            applyUrl: applyLink,
            logo: job.companyLogoUrl || null,
            source: job.source || "External",
            postedDate: job.postedDate || "",
          },
          { headers: { Authorization: `Bearer ${token}` } }
        );
        const savedDocId = response.data?.data?._id;
        if (savedDocId) {
          setSavedJobMap((prev) => ({ ...prev, [jobId]: savedDocId }));
        }
      }
    } catch (err: any) {
      console.error("Save job error:", err.response?.data?.error || err.message);
    } finally {
      setSavingJob(null);
    }
  };

  // ═══════════════════════════════════════════════
  // Check which jobs have been applied to
  // ═══════════════════════════════════════════════
  const checkAppliedJobs = async () => {
    try {
      const token = localStorage.getItem("token");
      const response = await axios.get(`${API_URL}/api/jobseeker/my-applications`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (response.data.success) {
        const applied: Record<string, string> = {};
        (response.data.data || []).forEach((app: any) => {
          const jId = typeof app.job === "object" ? app.job._id : app.job;
          applied[jId] = app.status;
        });
        setAppliedJobs(applied);
      }
    } catch {
      // ignore — just means we can't show applied status
    }
  };

  const handleApply = (job: Job) => {
    // Resolve the best available URL from all possible field names
    const applyLink =
      job.applyUrl || job.job_apply_link || job.url || "#";

    if (job.source === "Portal") {
      // Portal jobs → apply via API (registers application in DB)
      applyToPortalJob(job._id);
    } else if (applyLink && applyLink !== "#") {
      // External jobs → open the real job URL in new tab
      window.open(applyLink, "_blank", "noopener,noreferrer");
    } else {
      console.warn("No apply link available for job:", job.title);
    }
  };

  const applyToPortalJob = async (jobId: string) => {
    try {
      const token = localStorage.getItem("token");
      const response = await axios.post(
        `${API_URL}/api/jobs/${jobId}/apply`,
        {},
        { headers: { Authorization: `Bearer ${token}` } }
      );
      if (response.data.success) {
        setAppliedJobs((prev) => ({ ...prev, [jobId]: "pending" }));
      }
    } catch (err: any) {
      const msg = err.response?.data?.error || "Failed to apply";
      if (msg.includes("already applied")) {
        setAppliedJobs((prev) => ({ ...prev, [jobId]: "pending" }));
      } else {
        alert(msg);
      }
    }
  };

  const getMatchColor = (score: number) => {
    if (score >= 75) return "text-green-600 bg-green-50 border-green-200";
    if (score >= 50) return "text-amber-600 bg-amber-50 border-amber-200";
    return "text-red-600 bg-red-50 border-red-200";
  };

  const getMatchLabel = (score: number) => {
    if (score >= 85) return "Excellent Match";
    if (score >= 70) return "Strong Match";
    if (score >= 50) return "Good Match";
    if (score >= 35) return "Partial Match";
    return "Low Match";
  };

  const getSourceBadge = (source: string) => {
    const s = (source || "").toLowerCase();
    if (s === "portal") return { label: "VeriResume", color: "bg-purple-100 text-purple-700 border-purple-200" };
    if (s === "indeed") return { label: "Indeed", color: "bg-indigo-100 text-indigo-700 border-indigo-200" };
    if (s === "linkedin") return { label: "LinkedIn", color: "bg-sky-100 text-sky-700 border-sky-200" };
    if (s === "glassdoor") return { label: "Glassdoor", color: "bg-emerald-100 text-emerald-700 border-emerald-200" };
    if (s === "remotive") return { label: "Remotive", color: "bg-blue-100 text-blue-700 border-blue-200" };
    if (s === "jobicy") return { label: "Jobicy", color: "bg-purple-100 text-purple-700 border-purple-200" };
    if (s === "arbeitnow") return { label: "ArbeitNow", color: "bg-orange-100 text-orange-700 border-orange-200" };
    if (s === "usajobs") return { label: "USAJobs", color: "bg-red-100 text-red-700 border-red-200" };
    return { label: source || "External", color: "bg-slate-100 text-slate-600 border-slate-200" };
  };

  const formatDate = (dateStr: string) => {
    try {
      const date = new Date(dateStr);
      if (isNaN(date.getTime())) return dateStr || "";
      const now = new Date();
      const diffMs = now.getTime() - date.getTime();
      const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
      if (diffDays === 0) return "Today";
      if (diffDays === 1) return "Yesterday";
      if (diffDays < 7) return `${diffDays} days ago`;
      if (diffDays < 30) return `${Math.floor(diffDays / 7)} weeks ago`;
      return date.toLocaleDateString();
    } catch {
      return dateStr || "";
    }
  };

  // ═══════════════════════════════════════════════
  // RENDER
  // ═══════════════════════════════════════════════
  if (loading) {
    return (
      <DashboardLayout title="Job Recommendations" subtitle="AI-powered job matching">
        <div className="flex items-center justify-center h-96">
          <div className="text-center">
            <Loader className="w-12 h-12 animate-spin text-cyan-600 mx-auto mb-4" />
            <p className="text-slate-600">Loading jobs...</p>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout
      title="Job Recommendations"
      subtitle="Browse jobs from VeriResume portal & external platforms — matched to your resume"
    >
      {error && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-xl flex items-center text-red-700">
          <AlertCircle className="w-5 h-5 mr-3 flex-shrink-0" />
          {error}
          <button onClick={() => setError("")} className="ml-auto text-red-500 hover:text-red-700 font-bold">
            ×
          </button>
        </div>
      )}

      {/* ═══ NO RESUME STATE ═══ */}
      {!hasResume ? (
        <div className="bg-white rounded-2xl shadow-lg p-12 text-center border border-slate-200">
          <FileText className="w-16 h-16 text-slate-300 mx-auto mb-4" />
          <h3 className="text-xl font-semibold text-slate-900 mb-2">No Resume Uploaded</h3>
          <p className="text-slate-600 mb-6">
            Upload your resume first to get AI-powered ATS analysis and personalized job recommendations
          </p>
          <button
            onClick={() => navigate("/jobseeker/upload")}
            className="px-8 py-3 bg-gradient-to-r from-blue-600 to-cyan-600 text-white rounded-xl hover:shadow-lg transition-all font-semibold flex items-center gap-2 mx-auto"
          >
            <Upload size={20} /> Upload Resume
          </button>
        </div>
      ) : (
        <>
          {/* ═══ RESUME ANALYSIS SUMMARY BANNER ═══ */}
          <div className="bg-gradient-to-r from-slate-900 to-blue-900 rounded-2xl p-6 text-white mb-6">
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <h3 className="text-lg font-bold flex items-center gap-2 mb-3">
                  <Brain size={22} className="text-cyan-400" /> Resume Analysis Summary
                </h3>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="bg-white/10 rounded-xl p-3 text-center">
                    <p className="text-2xl font-bold text-cyan-300">
                      {resumeData?.aiAnalysis?.atsScore || resumeData?.completeAnalysis?.ats_score || "--"}%
                    </p>
                    <p className="text-xs text-blue-200 mt-1">ATS Score</p>
                  </div>
                  <div className="bg-white/10 rounded-xl p-3 text-center">
                    <p className="text-2xl font-bold text-green-300">
                      {resumeData?.aiAnalysis?.grammarScore || resumeData?.completeAnalysis?.grammar_score || "--"}%
                    </p>
                    <p className="text-xs text-blue-200 mt-1">Grammar</p>
                  </div>
                  <div className="bg-white/10 rounded-xl p-3 text-center">
                    <p className="text-2xl font-bold text-purple-300">
                      {resumeData?.aiAnalysis?.readability || resumeData?.completeAnalysis?.readability_score || "--"}%
                    </p>
                    <p className="text-xs text-blue-200 mt-1">Readability</p>
                  </div>
                  <div className="bg-white/10 rounded-xl p-3 text-center">
                    <p className="text-2xl font-bold text-amber-300">
                      {resumeData?.aiAnalysis?.structureScore || resumeData?.completeAnalysis?.structure_score || "--"}%
                    </p>
                    <p className="text-xs text-blue-200 mt-1">Structure</p>
                  </div>
                </div>
              </div>
              <button
                onClick={() => navigate("/jobseeker/analysis")}
                className="ml-4 px-4 py-2 bg-white/10 hover:bg-white/20 rounded-xl text-sm font-semibold transition-all flex items-center gap-1 whitespace-nowrap"
              >
                Full Analysis <ArrowRight size={14} />
              </button>
            </div>
          </div>

          {/* ═══ YOUR SKILLS FROM RESUME ═══ */}
          {recommendedKeywords.length > 0 && (
            <div className="bg-white rounded-2xl p-6 border border-slate-200 mb-6">
              <h3 className="text-sm font-bold text-slate-900 mb-3 flex items-center gap-2 uppercase tracking-wider">
                <Sparkles size={16} className="text-cyan-600" />
                Your Resume Skills
              </h3>
              <p className="text-xs text-slate-500 mb-4">
                Jobs below are matched against these skills from your resume
              </p>
              <div className="flex flex-wrap gap-2">
                {recommendedKeywords.slice(0, 20).map((keyword, idx) => (
                  <span
                    key={idx}
                    className="px-3 py-1.5 rounded-full text-sm font-medium bg-cyan-50 text-cyan-700 border border-cyan-200"
                  >
                    <Tag size={12} className="inline mr-1" />
                    {keyword}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* ═══ JOBS STATS ═══ */}
          <div className="bg-gradient-to-r from-cyan-50 to-blue-50 rounded-2xl p-4 border border-cyan-200 mb-6">
            <div className="flex items-center justify-between flex-wrap gap-3">
              <div className="flex items-center gap-6 flex-wrap">
                <div className="flex items-center gap-2">
                  <Globe size={16} className="text-cyan-600" />
                  <span className="text-sm font-semibold text-slate-700">
                    {allJobs.length} total jobs
                    {portalJobs.length > 0 && (
                      <span className="text-xs text-slate-500 ml-1">
                        ({portalJobs.length} portal, {externalJobs.length} external)
                      </span>
                    )}
                  </span>
                </div>
                {externalLoading && (
                  <div className="flex items-center gap-1 text-xs text-cyan-600">
                    <Loader size={12} className="animate-spin" /> Loading external jobs...
                  </div>
                )}
                <div className="flex gap-3 text-xs text-slate-600">
                  <span className="px-2 py-1 bg-white rounded-full border border-slate-200">
                    <Star size={10} className="inline mr-1 text-green-500" />
                    High Match (≥75%): <strong>{allJobs.filter((j) => (j.matchScore || 0) >= 75).length}</strong>
                  </span>
                  <span className="px-2 py-1 bg-white rounded-full border border-slate-200">
                    Good Match (50-74%):{" "}
                    <strong>{allJobs.filter((j) => (j.matchScore || 0) >= 50 && (j.matchScore || 0) < 75).length}</strong>
                  </span>
                </div>
              </div>
              <button
                onClick={() => fetchResumeAndJobs()}
                className="flex items-center gap-1 text-sm text-cyan-700 hover:text-cyan-900 font-semibold"
              >
                <RefreshCw className="w-3 h-3" />
                Refresh
              </button>
            </div>
          </div>

          {/* ═══ FILTER BAR ═══ */}
          <div className="bg-white rounded-2xl p-5 border border-slate-200 mb-6">
            <div className="grid md:grid-cols-6 gap-3">
              <div className="relative md:col-span-2">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                <input
                  type="text"
                  placeholder="Filter by title, company, location, or skill..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-11 pr-4 py-2.5 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-cyan-500 text-sm"
                />
              </div>
              <div className="flex items-center gap-2">
                <Star className="text-slate-400 flex-shrink-0" size={18} />
                <select
                  value={minMatchFilter}
                  onChange={(e) => setMinMatchFilter(parseInt(e.target.value))}
                  className="flex-1 px-3 py-2.5 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-cyan-500 text-sm font-medium"
                >
                  <option value={0}>All Jobs</option>
                  <option value={35}>Partial+ (≥35%)</option>
                  <option value={50}>Good Match (≥50%)</option>
                  <option value={70}>Strong Match (≥70%)</option>
                  <option value={85}>Excellent (≥85%)</option>
                </select>
              </div>
              <div className="flex items-center gap-2">
                <Filter className="text-slate-400 flex-shrink-0" size={18} />
                <select
                  value={typeFilter}
                  onChange={(e) => setTypeFilter(e.target.value)}
                  className="flex-1 px-3 py-2.5 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-cyan-500 text-sm"
                >
                  {jobTypes.map((t) => (
                    <option key={t} value={t}>
                      {t === "all" ? "All Job Types" : t}
                    </option>
                  ))}
                </select>
              </div>
              <div className="flex items-center gap-2">
                <Globe className="text-slate-400 flex-shrink-0" size={18} />
                <select
                  value={sourceFilter}
                  onChange={(e) => setSourceFilter(e.target.value)}
                  className="flex-1 px-3 py-2.5 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-cyan-500 text-sm"
                >
                  <option value="all">All Sources</option>
                  <option value="portal">VeriResume Portal</option>
                  <option value="external">External Platforms</option>
                  <option value="indeed">Indeed</option>
                  <option value="linkedin">LinkedIn</option>
                  <option value="glassdoor">Glassdoor</option>
                  <option value="remotive">Remotive</option>
                  <option value="arbeitnow">ArbeitNow</option>
                  <option value="usajobs">USAJobs</option>
                </select>
              </div>
              <div className="flex items-center gap-2">
                <TrendingUp className="text-slate-400 flex-shrink-0" size={18} />
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value as any)}
                  className="flex-1 px-3 py-2.5 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-cyan-500 text-sm"
                >
                  <option value="match">Best Match</option>
                  <option value="recent">Most Recent</option>
                </select>
              </div>
            </div>
            <div className="flex items-center justify-between mt-3">
              <p className="text-xs text-slate-500">
                Showing <span className="font-bold text-slate-700">{filteredJobs.length}</span> matched jobs
                {minMatchFilter > 0 && allJobs.length > filteredJobs.length && (
                  <button
                    onClick={() => setMinMatchFilter(0)}
                    className="ml-2 text-cyan-600 hover:underline font-semibold"
                  >
                    Show all {allJobs.length}
                  </button>
                )}
              </p>
              {minMatchFilter === 0 && (
                <button
                  onClick={() => setMinMatchFilter(1)}
                  className="text-xs text-cyan-600 hover:underline font-semibold"
                >
                  Show only skill-matched jobs
                </button>
              )}
            </div>
          </div>

          {/* ═══ NO JOBS ═══ */}
          {!loading && allJobs.length === 0 && hasResume && !externalLoading && (
            <div className="text-center py-16 bg-white rounded-2xl border border-slate-200">
              <Briefcase className="mx-auto text-slate-300" size={56} />
              <p className="text-slate-700 text-lg mt-4 font-semibold">No jobs available yet</p>
              <p className="text-slate-500 mt-2 max-w-md mx-auto">
                No jobs found from portal or external platforms. Check back later!
              </p>
            </div>
          )}

          {/* ═══ JOB CARDS ═══ */}
          {filteredJobs.length > 0 && (
            <div className="space-y-4">
              {filteredJobs.map((job) => {
                const matchScore = job.matchScore || 0;
                const jobId = job._id;
                const isExpanded = expandedJob === jobId;
                const postedDate = job.postedDate ? formatDate(job.postedDate) : "";
                const isPortal = job.source === "Portal";
                const badge = getSourceBadge(job.source || "");

                return (
                  <div
                    key={jobId}
                    className="bg-white rounded-2xl border border-slate-200 hover:border-cyan-300 hover:shadow-lg transition-all overflow-hidden"
                  >
                    <div className="p-6">
                      {/* Top Row */}
                      <div className="flex items-start justify-between gap-4 mb-3">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1 flex-wrap">
                            {job.companyLogoUrl && (
                              <img
                                src={job.companyLogoUrl}
                                alt={job.company}
                                className="w-8 h-8 rounded-lg object-cover border border-slate-200"
                              />
                            )}
                            <h3 className="text-lg font-bold text-slate-900">{job.title}</h3>
                            <span
                              className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold border ${badge.color}`}
                            >
                              {isPortal ? <Building2 size={10} className="mr-1" /> : <Globe size={10} className="mr-1" />}
                              {badge.label}
                            </span>
                            {job.type && (
                              <span className="inline-flex items-center px-2 py-0.5 bg-slate-100 text-slate-600 rounded-full text-xs font-medium">
                                {job.type}
                              </span>
                            )}
                          </div>
                          <div className="flex items-center gap-3 text-sm text-slate-600">
                            <span className="flex items-center gap-1">
                              <Building2 size={14} className="text-slate-400" />
                              {job.company}
                            </span>
                            {isPortal && job.postedBy?.name && (
                              <span className="flex items-center gap-1 text-xs text-slate-400">
                                <Users size={12} />
                                Posted by {job.postedBy.name}
                              </span>
                            )}
                          </div>
                        </div>

                        {/* Match Score */}
                        <div className="flex items-center gap-2 flex-shrink-0">
                          {matchScore > 0 && (
                            <div
                              className={`relative w-14 h-14 rounded-full flex items-center justify-center border-[3px] ${
                                matchScore >= 75
                                  ? "border-green-400 bg-green-50"
                                  : matchScore >= 50
                                  ? "border-amber-400 bg-amber-50"
                                  : "border-slate-300 bg-slate-50"
                              }`}
                            >
                              <p
                                className={`text-sm font-bold ${
                                  matchScore >= 75
                                    ? "text-green-700"
                                    : matchScore >= 50
                                    ? "text-amber-700"
                                    : "text-slate-600"
                                }`}
                              >
                                {Math.round(matchScore)}%
                              </p>
                            </div>
                          )}
                          <button
                            onClick={() => handleSaveJob(job)}
                            disabled={savingJob === jobId}
                            className="p-2 hover:bg-slate-100 rounded-lg transition-all"
                            title={savedJobMap[jobId] ? "Unsave job" : "Save job"}
                          >
                            {savingJob === jobId ? (
                              <Loader className="animate-spin text-slate-400" size={18} />
                            ) : savedJobMap[jobId] ? (
                              <BookmarkCheck className="text-cyan-600 fill-current" size={18} />
                            ) : (
                              <Bookmark className="text-slate-400" size={18} />
                            )}
                          </button>
                        </div>
                      </div>

                      {/* Details Row */}
                      <div className="flex flex-wrap items-center gap-3 text-sm text-slate-600 mb-3">
                        {job.location && (
                          <span className="flex items-center gap-1">
                            <MapPin size={13} className="text-slate-400" />
                            {job.location}
                          </span>
                        )}
                        {job.salary && job.salary !== "Competitive" && (
                          <span className="flex items-center gap-1 text-green-700 font-semibold">
                            <DollarSign size={13} className="text-green-500" />
                            {job.salary}
                          </span>
                        )}
                        {job.experience && job.experience !== "Not specified" && (
                          <span className="flex items-center gap-1 text-slate-500">
                            <Briefcase size={13} className="text-slate-400" />
                            {job.experience}
                          </span>
                        )}
                        {postedDate && (
                          <span className="flex items-center gap-1 text-slate-400">
                            <Clock size={13} />
                            {postedDate}
                          </span>
                        )}
                        {matchScore > 0 && (
                          <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${getMatchColor(matchScore)}`}>
                            {getMatchLabel(matchScore)}
                          </span>
                        )}
                      </div>

                      {/* Matched Skills */}
                      {job.matchedSkills && job.matchedSkills.length > 0 && (
                        <div className="mb-3">
                          <p className="text-xs font-semibold text-slate-500 mb-1.5 uppercase">Matched Skills</p>
                          <div className="flex flex-wrap gap-1.5">
                            {job.matchedSkills.slice(0, 8).map((skill: string, i: number) => (
                              <span
                                key={i}
                                className="inline-flex items-center gap-1 px-2 py-0.5 bg-green-50 text-green-700 rounded-lg text-xs font-semibold border border-green-200"
                              >
                                <CheckCircle size={10} /> {skill}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Required Skills (when not expanded) */}
                      {!isExpanded && job.skillsRequired && job.skillsRequired.length > 0 && (
                        <div className="mb-3">
                          <div className="flex flex-wrap gap-1.5">
                            {job.skillsRequired.slice(0, 6).map((skill: string, i: number) => (
                              <span
                                key={i}
                                className="px-2 py-0.5 bg-blue-50 text-blue-600 rounded-lg text-xs font-medium border border-blue-100"
                              >
                                {skill}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Expanded Content */}
                      {isExpanded && (
                        <>
                          {/* Missing Skills */}
                          {job.missingSkills && job.missingSkills.length > 0 && (
                            <div className="mb-3">
                              <p className="text-xs font-semibold text-slate-500 mb-1.5 uppercase">Skills to Develop</p>
                              <div className="flex flex-wrap gap-1.5">
                                {job.missingSkills.slice(0, 8).map((skill: string, i: number) => (
                                  <span
                                    key={i}
                                    className="inline-flex items-center gap-1 px-2 py-0.5 bg-red-50 text-red-600 rounded-lg text-xs font-semibold border border-red-200"
                                  >
                                    <XCircle size={10} /> {skill}
                                  </span>
                                ))}
                              </div>
                            </div>
                          )}

                          {/* Description */}
                          {job.description && (
                            <div className="mb-3 p-4 bg-slate-50 rounded-xl border border-slate-200">
                              <p className="text-xs font-semibold text-slate-500 mb-2 uppercase">Job Description</p>
                              <p className="text-sm text-slate-700 leading-relaxed whitespace-pre-line">
                                {job.description.length > 1000
                                  ? job.description.substring(0, 1000) + "..."
                                  : job.description}
                              </p>
                            </div>
                          )}

                          {/* Requirements (Portal) */}
                          {isPortal && job.requirements && job.requirements.length > 0 && (
                            <div className="mb-3 p-4 bg-blue-50 rounded-xl border border-blue-200">
                              <p className="text-xs font-semibold text-blue-600 mb-2 uppercase">Requirements</p>
                              <ul className="space-y-1">
                                {job.requirements.map((req, i) => (
                                  <li key={i} className="text-sm text-slate-700 flex items-start gap-2">
                                    <span className="mt-1.5 w-1.5 h-1.5 bg-blue-400 rounded-full flex-shrink-0"></span>
                                    {req}
                                  </li>
                                ))}
                              </ul>
                            </div>
                          )}

                          {/* Responsibilities (Portal) */}
                          {isPortal && job.responsibilities && job.responsibilities.length > 0 && (
                            <div className="mb-3 p-4 bg-emerald-50 rounded-xl border border-emerald-200">
                              <p className="text-xs font-semibold text-emerald-600 mb-2 uppercase">Responsibilities</p>
                              <ul className="space-y-1">
                                {job.responsibilities.map((resp, i) => (
                                  <li key={i} className="text-sm text-slate-700 flex items-start gap-2">
                                    <span className="mt-1.5 w-1.5 h-1.5 bg-emerald-400 rounded-full flex-shrink-0"></span>
                                    {resp}
                                  </li>
                                ))}
                              </ul>
                            </div>
                          )}

                          {/* Benefits (Portal) */}
                          {isPortal && job.benefits && job.benefits.length > 0 && (
                            <div className="mb-3 p-4 bg-amber-50 rounded-xl border border-amber-200">
                              <p className="text-xs font-semibold text-amber-600 mb-2 uppercase">Benefits</p>
                              <ul className="space-y-1">
                                {job.benefits.map((benefit, i) => (
                                  <li key={i} className="text-sm text-slate-700 flex items-start gap-2">
                                    <span className="mt-1.5 w-1.5 h-1.5 bg-amber-400 rounded-full flex-shrink-0"></span>
                                    {benefit}
                                  </li>
                                ))}
                              </ul>
                            </div>
                          )}

                          {/* Job Info */}
                          <div className="flex gap-3 mb-3 text-xs text-slate-500 flex-wrap">
                            {job.industry && (
                              <span>
                                Industry: <strong className="text-slate-700">{job.industry}</strong>
                              </span>
                            )}
                            {job.experience && job.experience !== "Not specified" && (
                              <span>
                                Experience: <strong className="text-slate-700">{job.experience}</strong>
                              </span>
                            )}
                          </div>
                        </>
                      )}

                      {/* Action Buttons */}
                      <div className="flex items-center gap-3 mt-3">
                        <button
                          onClick={() => setExpandedJob(isExpanded ? null : jobId)}
                          className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-gradient-to-r from-blue-600 to-cyan-600 text-white rounded-xl font-semibold hover:shadow-lg transition-all text-sm"
                        >
                          {isExpanded ? <ChevronUp size={15} /> : <ChevronDown size={15} />}
                          {isExpanded ? "Show Less" : "View Full Details"}
                        </button>

                        {/* Apply Button */}
                        {isPortal ? (
                          // Portal job: apply via API or show applied status
                          appliedJobs[jobId] ? (
                            <button
                              disabled
                              className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-green-100 text-green-700 rounded-xl font-semibold text-sm border border-green-300 cursor-default"
                            >
                              <CheckCircle size={15} />
                              Applied
                              {appliedJobs[jobId] !== "pending" ? ` — ${appliedJobs[jobId].replace("_", " ")}` : ""}
                            </button>
                          ) : (
                            <button
                              onClick={() => handleApply(job)}
                              className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-gradient-to-r from-emerald-600 to-green-600 text-white rounded-xl font-semibold hover:shadow-lg transition-all text-sm"
                            >
                              <Briefcase size={15} />
                              Apply Now
                            </button>
                          )
                        ) : (
                          // External job: open direct link
                          <button
                            onClick={() => handleApply(job)}
                            className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-gradient-to-r from-emerald-600 to-green-600 text-white rounded-xl font-semibold hover:shadow-lg transition-all text-sm"
                          >
                            <ExternalLink size={15} />
                            Apply on {getSourceBadge(job.source || "").label}
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* ═══ NO FILTERED RESULTS ═══ */}
          {allJobs.length > 0 && filteredJobs.length === 0 && (searchTerm || typeFilter !== "all" || sourceFilter !== "all") && (
            <div className="text-center py-12 bg-white rounded-2xl border border-slate-200">
              <Filter className="mx-auto text-slate-300" size={48} />
              <p className="text-slate-600 mt-3 font-medium">No jobs match your filters</p>
              <button
                onClick={() => {
                  setSearchTerm("");
                  setTypeFilter("all");
                  setSourceFilter("all");
                }}
                className="mt-3 text-cyan-600 hover:text-cyan-700 font-semibold text-sm"
              >
                Clear all filters
              </button>
            </div>
          )}
        </>
      )}
    </DashboardLayout>
  );
};

export default JobSeekerJobs;
