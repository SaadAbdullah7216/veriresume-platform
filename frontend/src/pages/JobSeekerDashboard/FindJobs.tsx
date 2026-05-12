import { useState, useEffect, useRef } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import DashboardLayout from "./DashboardLayout";
import axios from "axios";
import {
  Search,
  MapPin,
  Loader,
  AlertCircle,
  Filter,
  Briefcase,
  Clock,
  DollarSign,
  Building2,
  ExternalLink,
  BookmarkPlus,
  BookmarkCheck,
  ChevronDown,
  ChevronUp,
  Globe,
  Sparkles,
  X,
  LayoutList,
  LayoutGrid,
} from "lucide-react";

const API_URL =
  import.meta.env.VITE_API_URL ||
  import.meta.env.VITE_API_BASE_URL ||
  "http://localhost:3000";

interface JSearchJob {
  id: string;
  title: string;
  company: string;
  location: string;
  type: string;
  description: string;
  salary: string;
  applyUrl: string;
  logo: string | null;
  postedDate: string;
  source: string;
  isRemote?: boolean;
  qualifications?: string[];
  responsibilities?: string[];
  benefits?: string[];
}

const FindJobs = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [searchTerm, setSearchTerm] = useState(searchParams.get("q") || "");
  const [locationTerm, setLocationTerm] = useState("");
  const [jobs, setJobs] = useState<JSearchJob[]>([]);
  const [filteredJobs, setFilteredJobs] = useState<JSearchJob[]>([]);
  const [loading, setLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);
  const [error, setError] = useState("");
  const [savedJobIds, setSavedJobIds] = useState<Set<string>>(new Set());
  const [savingJob, setSavingJob] = useState<string | null>(null);
  const [expandedJob, setExpandedJob] = useState<string | null>(null);

  // Filters & View
  const [showFilters, setShowFilters] = useState(false);
  const [typeFilter, setTypeFilter] = useState("all");
  const [remoteOnly, setRemoteOnly] = useState(false);
  const [sortBy, setSortBy] = useState<"relevance" | "recent">("relevance");
  const [viewMode, setViewMode] = useState<"list" | "company">("list");
  const [expandedCompanies, setExpandedCompanies] = useState<Set<string>>(new Set());

  const initialSearchDone = useRef(false);
  const [hasSearched, setHasSearched] = useState(false);
  const [searchMode, setSearchMode] = useState<"job" | "company">("job");

  const popularSearches = [
    "Software Engineer",
    "Data Scientist",
    "Product Manager",
    "UX Designer",
    "DevOps Engineer",
    "Full Stack Developer",
    "Machine Learning",
    "React Developer",
    "Python Developer",
    "Cyber Security",
  ];

  const detectCountry = (loc: string): string => {
    const lower = loc.toLowerCase();
    if (/pakistan|islamabad|karachi|lahore|peshawar|rawalpindi|faisalabad/.test(lower)) return "pk";
    if (/united kingdom|uk|london|manchester|birmingham|leeds/.test(lower)) return "gb";
    if (/canada|toronto|vancouver|montreal|calgary|ottawa/.test(lower)) return "ca";
    if (/india|mumbai|delhi|bangalore|bengaluru|hyderabad|chennai|pune/.test(lower)) return "in";
    if (/australia|sydney|melbourne|brisbane|perth|adelaide/.test(lower)) return "au";
    if (/germany|berlin|munich|hamburg|frankfurt/.test(lower)) return "de";
    if (/uae|dubai|abu dhabi/.test(lower)) return "ae";
    if (/saudi|riyadh|jeddah/.test(lower)) return "sa";
    return "us";
  };

  // Fetch saved jobs on mount
  useEffect(() => {
    fetchSavedJobs();
  }, []);

  // Only auto-search when there's a ?q= URL param
  useEffect(() => {
    if (initialSearchDone.current) return;
    initialSearchDone.current = true;
    const queryFromUrl = searchParams.get("q");
    if (queryFromUrl) {
      setSearchTerm(queryFromUrl);
      searchJobs(queryFromUrl);
    }
  }, []);

  // Apply filters whenever jobs or filters change
  useEffect(() => {
    applyFilters();
  }, [jobs, typeFilter, remoteOnly, sortBy]);

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
    } catch {
      // ignore
    }
  };

  const searchJobs = async (query?: string) => {
    const q = query || searchTerm;
    if (!q.trim()) {
      setError("Please enter a search term");
      return;
    }

    setLoading(true);
    setError("");
    setInitialLoading(false);
    setHasSearched(true);

    try {
      const token = localStorage.getItem("token");
      const jsearchQuery = searchMode === "company" ? `jobs at ${q}` : q;
      const jsearchParams: any = { query: jsearchQuery, page: 1, num_pages: 2 };
      if (locationTerm.trim()) jsearchParams.location = locationTerm.trim();
      if (remoteOnly) jsearchParams.remote_jobs_only = "true";

      const glassdoorParams: any = { query: q, page: 1 };
      if (locationTerm.trim()) glassdoorParams.location = locationTerm.trim();

      const detectedCountry = detectCountry(locationTerm.trim() || q);

      // Search JSearch + Glassdoor + Indeed + LinkedIn in parallel
      const [jsearchRes, glassdoorRes, indeedRes, linkedinRes] = await Promise.allSettled([
        axios.get(`${API_URL}/api/jsearch/search`, {
          params: jsearchParams,
          headers: { Authorization: `Bearer ${token}` },
          timeout: 20000,
        }),
        axios.get(`${API_URL}/api/glassdoor/search`, {
          params: glassdoorParams,
          headers: { Authorization: `Bearer ${token}` },
          timeout: 15000,
        }),
        axios.post(
          `${API_URL}/api/jobseeker/search-indeed`,
          {
            keywords: q,
            location: locationTerm.trim() || "",
            country: detectedCountry,
            maxRows: 20,
            fromDays: "7",
            searchType: searchMode,
          },
          { headers: { Authorization: `Bearer ${token}` }, timeout: 30000 }
        ),
        axios.post(
          `${API_URL}/api/jobseeker/search-linkedin`,
          {
            keywords: q,
            location: locationTerm.trim() || "",
            limit: 20,
            timeRange: searchMode === "company" ? "7d" : "24h",
            searchType: searchMode,
          },
          { headers: { Authorization: `Bearer ${token}` }, timeout: 30000 }
        ),
      ]);

      let allJobs: JSearchJob[] = [];
      let primaryFailed = false;

      // Collect JSearch results
      if (jsearchRes.status === "fulfilled" && jsearchRes.value.data.success) {
        const jsJobs = (jsearchRes.value.data.data.jobs || []).map((j: any) => ({ ...j, source: "JSearch" }));
        allJobs.push(...jsJobs);
      } else {
        primaryFailed = true;
      }

      // Collect Glassdoor results
      if (glassdoorRes.status === "fulfilled" && glassdoorRes.value.data.success) {
        const gdJobs = (glassdoorRes.value.data.data.jobs || []).map((j: any) => ({
          ...j,
          source: "Glassdoor",
        }));
        allJobs.push(...gdJobs);
      } else {
        if (allJobs.length === 0) primaryFailed = true;
      }

      // Collect Indeed results
      if (indeedRes.status === "fulfilled" && indeedRes.value.data.success) {
        const indeedJobs: JSearchJob[] = (indeedRes.value.data.data.jobs || []).map((j: any) => ({
          id: j.id || `indeed-${Date.now()}-${Math.random()}`,
          title: j.title || "Untitled",
          company: j.company || "Unknown",
          location: j.location || "Remote",
          type: j.job_type || j.type || "Full-time",
          description: j.description || "",
          salary: j.salary || "Not specified",
          applyUrl: j.url || j.applyUrl || "#",
          logo: j.logo || null,
          postedDate: j.posted_date || j.postedDate || "",
          source: "Indeed",
          isRemote: (j.location || "").toLowerCase().includes("remote"),
          qualifications: [],
          responsibilities: [],
          benefits: [],
        }));
        allJobs.push(...indeedJobs);
        if (indeedJobs.length > 0) primaryFailed = false;
      }

      // Collect LinkedIn results
      if (linkedinRes.status === "fulfilled" && linkedinRes.value.data.success) {
        const linkedinJobs: JSearchJob[] = (linkedinRes.value.data.data.jobs || []).map((j: any) => ({
          id: j.id || `linkedin-${Date.now()}-${Math.random()}`,
          title: j.title || "Untitled",
          company: j.company || "Unknown",
          location: j.location || "Remote",
          type: j.job_type || j.type || "Full-time",
          description: j.description || j.full_description || "",
          salary: j.salary || "Not specified",
          applyUrl: j.url || j.applyUrl || "#",
          logo: j.logo || null,
          postedDate: j.posted_date || j.postedDate || "",
          source: "LinkedIn",
          isRemote: (j.location || "").toLowerCase().includes("remote"),
          qualifications: [],
          responsibilities: [],
          benefits: [],
        }));
        allJobs.push(...linkedinJobs);
        if (linkedinJobs.length > 0) primaryFailed = false;
      }

      // Fallback to free APIs when all premium sources returned nothing
      if (allJobs.length === 0 && primaryFailed) {
        console.log("[FindJobs] Premium APIs failed, falling back to free job APIs...");
        try {
          const freeRes = await axios.post(
            `${API_URL}/api/jobseeker/search-jobs-api`,
            { query: q, location: locationTerm.trim() || "", max_per_platform: 15 },
            { headers: { Authorization: `Bearer ${token}` }, timeout: 30000 }
          );
          if (freeRes.data.success) {
            const freeJobs: JSearchJob[] = (freeRes.data.data.jobs || []).map((j: any) => ({
              id: j.id || `free-${Date.now()}-${Math.random()}`,
              title: j.title || "Untitled",
              company: j.company || "Unknown",
              location: j.location || "Remote",
              type: j.job_type || "Full-time",
              description: j.description || "",
              salary: j.salary || "Not specified",
              applyUrl: j.url || "#",
              logo: null,
              postedDate: j.posted_date || "",
              source: j.source || "Free API",
              isRemote: (j.location || "").toLowerCase().includes("remote"),
              qualifications: [],
              responsibilities: [],
              benefits: [],
            }));
            allJobs.push(...freeJobs);
          }
        } catch (freeErr) {
          console.error("Free API fallback also failed:", freeErr);
        }
      }

      setJobs(allJobs);
      if (allJobs.length === 0) {
        setError(`No jobs found for "${q}". Try different keywords.`);
      }
    } catch (err: any) {
      console.error("Search error:", err);
      setError(err.response?.data?.error || err.message || "Failed to search jobs");
    } finally {
      setLoading(false);
    }
  };

  const applyFilters = () => {
    let filtered = [...jobs];

    if (typeFilter !== "all") {
      filtered = filtered.filter(
        (j) => j.type?.toLowerCase().includes(typeFilter.toLowerCase())
      );
    }

    if (remoteOnly) {
      filtered = filtered.filter(
        (j) => j.isRemote || j.location?.toLowerCase().includes("remote")
      );
    }

    if (sortBy === "recent") {
      filtered.sort((a, b) => {
        const dateA = new Date(a.postedDate || 0).getTime();
        const dateB = new Date(b.postedDate || 0).getTime();
        return dateB - dateA;
      });
    }

    setFilteredJobs(filtered);
  };

  const handleSaveJob = async (job: JSearchJob) => {
    const token = localStorage.getItem("token");
    setSavingJob(job.id);

    try {
      if (savedJobIds.has(job.id)) {
        // Find the saved job ID from the server to delete
        const response = await axios.get(`${API_URL}/api/jobseeker/saved-jobs`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        const savedJob = response.data.data?.find((s: any) => s.jobId === job.id);
        if (savedJob) {
          await axios.delete(`${API_URL}/api/jobseeker/saved-jobs/${savedJob._id}`, {
            headers: { Authorization: `Bearer ${token}` },
          });
          setSavedJobIds((prev) => {
            const next = new Set(prev);
            next.delete(job.id);
            return next;
          });
        }
      } else {
        await axios.post(
          `${API_URL}/api/jobseeker/saved-jobs`,
          {
            jobId: job.id,
            title: job.title,
            company: job.company,
            location: job.location,
            type: job.type,
            salary: job.salary,
            description: job.description?.substring(0, 500),
            applyUrl: job.applyUrl || (job as any).job_apply_link || (job as any).url || (job as any).link || "",
            logo: job.logo,
            source: job.source || "JSearch",
            postedDate: job.postedDate,
          },
          { headers: { Authorization: `Bearer ${token}` } }
        );
        setSavedJobIds((prev) => new Set(prev).add(job.id));
      }
    } catch (err: any) {
      console.error("Save job error:", err);
    } finally {
      setSavingJob(null);
    }
  };

  const handleApply = (job: JSearchJob) => {
    const applyLink = job.applyUrl || job.job_apply_link || job.url || job.link || "#";
    if (applyLink && applyLink !== "#") {
      window.open(applyLink, "_blank", "noopener,noreferrer");
    }
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

  const cleanDescription = (text: string) => {
    if (!text) return "";
    return text
      .replace(/<[^>]*>/g, "")
      .replace(/&nbsp;/g, " ")
      .replace(/&amp;/g, "&")
      .replace(/&lt;/g, "<")
      .replace(/&gt;/g, ">")
      .replace(/\n{3,}/g, "\n\n")
      .trim();
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      searchJobs();
    }
  };

  // Group jobs by company for company view
  const groupedByCompany = (() => {
    const map = new Map<string, { company: string; logo: string | null; jobs: JSearchJob[] }>();
    for (const job of filteredJobs) {
      const key = (job.company || "Unknown").toLowerCase().trim();
      if (!map.has(key)) {
        map.set(key, { company: job.company || "Unknown", logo: job.logo, jobs: [] });
      }
      map.get(key)!.jobs.push(job);
    }
    return Array.from(map.values()).sort((a, b) => b.jobs.length - a.jobs.length);
  })();

  const toggleCompanyExpand = (key: string) => {
    setExpandedCompanies((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  const getCompanyInitials = (name: string) =>
    name.split(" ").map((w) => w[0]).filter(Boolean).join("").toUpperCase().slice(0, 2);

  const companyGradients = [
    "from-blue-600 to-cyan-600",
    "from-purple-600 to-indigo-600",
    "from-emerald-600 to-green-600",
    "from-amber-600 to-orange-600",
    "from-rose-600 to-pink-600",
    "from-teal-600 to-cyan-600",
    "from-violet-600 to-purple-600",
    "from-red-600 to-rose-600",
  ];

  return (
    <DashboardLayout
      title="Find Jobs"
      subtitle="Search thousands of jobs from multiple platforms — powered by real-time data"
    >
      {/* Search Bar */}
      <div className="bg-white rounded-2xl shadow-lg border border-slate-200 p-6 mb-6">
        {/* Search Mode Toggle */}
        <div className="flex items-center gap-3 mb-4">
          <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Search by:</span>
          <div className="flex items-center bg-slate-100 rounded-xl p-0.5">
            <button
              onClick={() => setSearchMode("job")}
              className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-semibold transition-all ${
                searchMode === "job"
                  ? "bg-white text-cyan-700 shadow-sm border border-slate-200"
                  : "text-slate-500 hover:text-slate-700"
              }`}
            >
              <Briefcase size={14} />
              Job Title
            </button>
            <button
              onClick={() => setSearchMode("company")}
              className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-semibold transition-all ${
                searchMode === "company"
                  ? "bg-white text-cyan-700 shadow-sm border border-slate-200"
                  : "text-slate-500 hover:text-slate-700"
              }`}
            >
              <Building2 size={14} />
              Company
            </button>
          </div>
        </div>

        <div className="flex flex-col md:flex-row gap-3">
          <div className="flex-1 relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
            <input
              type="text"
              placeholder={searchMode === "company" ? "Company name (e.g. Google, ibex, Microsoft)..." : "Job title, keywords, or company..."}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              onKeyDown={handleKeyPress}
              className="w-full pl-12 pr-4 py-3 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500 text-sm"
            />
          </div>
          <div className="md:w-56 relative">
            <MapPin className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
            <input
              type="text"
              placeholder="Location (optional)"
              value={locationTerm}
              onChange={(e) => setLocationTerm(e.target.value)}
              onKeyDown={handleKeyPress}
              className="w-full pl-12 pr-4 py-3 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500 text-sm"
            />
          </div>
          <button
            onClick={() => searchJobs()}
            disabled={loading}
            className="px-8 py-3 bg-gradient-to-r from-blue-600 to-cyan-600 text-white rounded-xl font-semibold hover:shadow-lg transition-all disabled:opacity-50 flex items-center gap-2"
          >
            {loading ? <Loader size={18} className="animate-spin" /> : <Search size={18} />}
            Search
          </button>
          <button
            onClick={() => setShowFilters(!showFilters)}
            className={`px-4 py-3 rounded-xl border font-semibold transition-all flex items-center gap-2 text-sm ${
              showFilters
                ? "bg-cyan-50 border-cyan-300 text-cyan-700"
                : "bg-white border-slate-300 text-slate-600 hover:border-cyan-300"
            }`}
          >
            <Filter size={18} />
            Filters
          </button>
        </div>

        {/* Filter Panel */}
        {showFilters && (
          <div className="mt-4 pt-4 border-t border-slate-200 grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <label className="text-xs font-semibold text-slate-600 mb-1 block">Job Type</label>
              <select
                value={typeFilter}
                onChange={(e) => setTypeFilter(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-cyan-500 text-sm"
              >
                <option value="all">All Types</option>
                <option value="fulltime">Full-time</option>
                <option value="parttime">Part-time</option>
                <option value="contractor">Contract</option>
                <option value="intern">Internship</option>
              </select>
            </div>
            <div>
              <label className="text-xs font-semibold text-slate-600 mb-1 block">Sort By</label>
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as any)}
                className="w-full px-3 py-2 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-cyan-500 text-sm"
              >
                <option value="relevance">Most Relevant</option>
                <option value="recent">Most Recent</option>
              </select>
            </div>
            <div className="flex items-end">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={remoteOnly}
                  onChange={(e) => setRemoteOnly(e.target.checked)}
                  className="w-4 h-4 rounded border-slate-300 text-cyan-600 focus:ring-cyan-500"
                />
                <span className="text-sm font-medium text-slate-700">Remote Only</span>
              </label>
            </div>
            <div className="flex items-end">
              <button
                onClick={() => {
                  setTypeFilter("all");
                  setRemoteOnly(false);
                  setSortBy("relevance");
                }}
                className="text-sm text-cyan-600 hover:text-cyan-800 font-semibold"
              >
                Clear Filters
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Popular Searches */}
      <div className="mb-6">
        <h3 className="text-sm font-bold text-slate-600 mb-3 flex items-center gap-2 uppercase tracking-wider">
          <Sparkles size={14} className="text-cyan-600" />
          Popular Searches — click a term to fill the search box
        </h3>
        <div className="flex flex-wrap gap-2">
          {popularSearches.map((term, idx) => (
            <button
              key={idx}
              onClick={() => setSearchTerm(term)}
              className="px-4 py-2 bg-white border border-slate-200 rounded-full text-sm font-medium text-slate-600 hover:border-cyan-400 hover:text-cyan-700 hover:bg-cyan-50 transition-all"
            >
              {term}
            </button>
          ))}
        </div>
      </div>

      {/* Error */}
      {error && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-xl flex items-center text-red-700">
          <AlertCircle className="w-5 h-5 mr-3 flex-shrink-0" />
          {error}
          <button onClick={() => setError("")} className="ml-auto text-red-500 hover:text-red-700 font-bold">
            <X size={18} />
          </button>
        </div>
      )}

      {/* Loading */}
      {loading && (
        <div className="flex items-center justify-center py-16">
          <div className="text-center">
            <Loader className="w-12 h-12 animate-spin text-cyan-600 mx-auto mb-4" />
            <p className="text-slate-600">
              {searchMode === "company"
                ? `Finding jobs at "${searchTerm}"...`
                : "Searching jobs across platforms..."}
            </p>
            <p className="text-xs text-slate-400 mt-1">JSearch + Glassdoor + Indeed + LinkedIn + Free APIs</p>
          </div>
        </div>
      )}

      {/* Landing State — before any search */}
      {!loading && !hasSearched && (
        <div className="text-center py-20 bg-white rounded-2xl border border-slate-200 shadow-sm">
          <div className="mx-auto w-20 h-20 rounded-2xl bg-gradient-to-br from-blue-100 to-cyan-100 flex items-center justify-center mb-6">
            <Search className="text-cyan-600" size={36} />
          </div>
          <h2 className="text-2xl font-bold text-slate-800 mb-2">Search for Your Dream Job</h2>
          <p className="text-slate-500 max-w-md mx-auto mb-8">
            Enter a job title, keywords, or company name above and click <strong>Search</strong> to explore thousands of real-time job listings.
          </p>
          <div className="flex flex-wrap justify-center gap-2 max-w-lg mx-auto">
            {popularSearches.slice(0, 6).map((term, idx) => (
              <button
                key={idx}
                onClick={() => setSearchTerm(term)}
                className="px-4 py-2 bg-gradient-to-r from-blue-50 to-cyan-50 border border-blue-200 rounded-full text-sm font-medium text-blue-700 hover:shadow-md hover:border-cyan-400 transition-all"
                title="Click to fill search box, then press Search"
              >
                {term}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Results Count + View Toggle */}
      {!loading && filteredJobs.length > 0 && (
        <div className="flex items-center justify-between mb-4">
          <p className="text-sm text-slate-600">
            Showing <span className="font-bold text-slate-900">{filteredJobs.length}</span> jobs
            {viewMode === "company" && (
              <span className="text-slate-400"> from <strong className="text-slate-700">{groupedByCompany.length}</strong> companies</span>
            )}
            {(() => {
              const sources = filteredJobs.reduce((acc: Record<string, number>, j) => {
                const s = j.source || 'JSearch';
                acc[s] = (acc[s] || 0) + 1;
                return acc;
              }, {});
              const parts = Object.entries(sources).map(([k, v]) => `${v} from ${k}`);
              return parts.length > 0 ? ` (${parts.join(', ')})` : '';
            })()}
          </p>
          <div className="flex items-center gap-3">
            <div className="flex items-center bg-slate-100 rounded-lg p-0.5">
              <button
                onClick={() => setViewMode("list")}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold transition-all ${
                  viewMode === "list"
                    ? "bg-white text-cyan-700 shadow-sm border border-slate-200"
                    : "text-slate-500 hover:text-slate-700"
                }`}
              >
                <LayoutList size={14} />
                List
              </button>
              <button
                onClick={() => setViewMode("company")}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold transition-all ${
                  viewMode === "company"
                    ? "bg-white text-cyan-700 shadow-sm border border-slate-200"
                    : "text-slate-500 hover:text-slate-700"
                }`}
              >
                <LayoutGrid size={14} />
                Companies
              </button>
            </div>
            <div className="flex items-center gap-2 text-xs text-slate-500">
              <Globe size={14} /> Multi-platform
            </div>
          </div>
        </div>
      )}

      {/* Company View */}
      {!loading && filteredJobs.length > 0 && viewMode === "company" && (
        <div className="space-y-5">
          {groupedByCompany.map((group, gIdx) => {
            const companyKey = group.company.toLowerCase().trim();
            const isExpanded = expandedCompanies.has(companyKey);
            const INITIAL_SHOW = 3;
            const visibleJobs = isExpanded ? group.jobs : group.jobs.slice(0, INITIAL_SHOW);
            const hasMore = group.jobs.length > INITIAL_SHOW;
            const platforms = [...new Set(group.jobs.map((j) => j.source || "JSearch"))];
            const locations = [...new Set(group.jobs.map((j) => j.location).filter(Boolean))].slice(0, 3);

            return (
              <div
                key={companyKey}
                className="bg-white rounded-2xl border border-slate-200 hover:border-blue-200 transition-all overflow-hidden"
              >
                {/* Company Header */}
                <div className="p-5 pb-3">
                  <div className="flex items-start gap-4">
                    {group.logo ? (
                      <img
                        src={group.logo}
                        alt={group.company}
                        className="w-14 h-14 rounded-xl object-contain bg-slate-50 p-1 border border-slate-200 flex-shrink-0"
                        onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
                      />
                    ) : (
                      <div
                        className={`w-14 h-14 bg-gradient-to-br ${companyGradients[gIdx % companyGradients.length]} rounded-xl flex items-center justify-center flex-shrink-0`}
                      >
                        <span className="text-white font-bold text-lg">{getCompanyInitials(group.company)}</span>
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="text-lg font-bold text-slate-900">{group.company}</h3>
                        <span className="px-2 py-0.5 bg-blue-50 text-blue-700 rounded-full text-xs font-bold border border-blue-200">
                          {group.jobs.length} job{group.jobs.length !== 1 ? "s" : ""}
                        </span>
                      </div>
                      <div className="flex items-center gap-3 mt-1 flex-wrap">
                        {locations.length > 0 && (
                          <span className="flex items-center gap-1 text-sm text-slate-500">
                            <MapPin size={12} className="text-slate-400" />
                            {locations.join(" · ")}
                          </span>
                        )}
                        <div className="flex gap-1">
                          {platforms.map((p, i) => (
                            <span
                              key={i}
                              className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                                p.toLowerCase() === "glassdoor" ? "bg-emerald-50 text-emerald-700" :
                                p.toLowerCase() === "indeed" ? "bg-indigo-50 text-indigo-700" :
                                p.toLowerCase() === "linkedin" ? "bg-sky-50 text-sky-700" :
                                "bg-cyan-50 text-cyan-700"
                              }`}
                            >
                              {p}
                            </span>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Job List */}
                <div className="px-5 pb-2">
                  <div className="border-t border-slate-100 pt-3 space-y-2">
                    {visibleJobs.map((job) => {
                      const isSaved = savedJobIds.has(job.id);
                      const isSaving = savingJob === job.id;
                      return (
                        <div
                          key={job.id}
                          className="flex items-center gap-3 bg-slate-50 hover:bg-slate-100 rounded-xl px-4 py-3 transition-colors group"
                        >
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-semibold text-slate-800 truncate">{job.title}</p>
                            <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                              {job.location && (
                                <span className="text-xs text-slate-500 flex items-center gap-0.5">
                                  <MapPin size={10} />
                                  {job.location}
                                </span>
                              )}
                              {job.type && (
                                <span className="text-[10px] px-1.5 py-0.5 bg-blue-50 text-blue-600 rounded font-medium capitalize">
                                  {job.type.replace(/_/g, " ")}
                                </span>
                              )}
                              {job.salary && job.salary !== "Not specified" && (
                                <span className="text-[10px] text-green-600 font-semibold flex items-center gap-0.5">
                                  <DollarSign size={9} />
                                  {job.salary}
                                </span>
                              )}
                              {job.postedDate && (
                                <span className="text-[10px] text-slate-400">{formatDate(job.postedDate)}</span>
                              )}
                              <span className={`text-[10px] px-1.5 py-0.5 rounded font-bold ${
                                (job.source || '').toLowerCase() === 'glassdoor' ? 'bg-emerald-50 text-emerald-600' :
                                (job.source || '').toLowerCase() === 'indeed' ? 'bg-indigo-50 text-indigo-600' :
                                'bg-cyan-50 text-cyan-600'
                              }`}>
                                {job.source || 'JSearch'}
                              </span>
                            </div>
                          </div>

                          {/* Action Buttons */}
                          <div className="flex items-center gap-1.5 flex-shrink-0 opacity-80 group-hover:opacity-100">
                            <button
                              onClick={() => handleSaveJob(job)}
                              disabled={isSaving}
                              className="p-1.5 hover:bg-white rounded-lg transition-all"
                              title={isSaved ? "Unsave" : "Save job"}
                            >
                              {isSaving ? (
                                <Loader size={14} className="animate-spin text-slate-400" />
                              ) : isSaved ? (
                                <BookmarkCheck className="text-cyan-600 fill-current" size={16} />
                              ) : (
                                <BookmarkPlus className="text-slate-400" size={16} />
                              )}
                            </button>
                            <button
                              onClick={() => setExpandedJob(expandedJob === job.id ? null : job.id)}
                              className="px-2.5 py-1.5 bg-white border border-slate-200 text-slate-600 rounded-lg text-xs font-semibold hover:border-cyan-300 hover:text-cyan-700 transition-all"
                            >
                              Details
                            </button>
                            <button
                              onClick={() => handleApply(job)}
                              className="px-2.5 py-1.5 bg-gradient-to-r from-emerald-600 to-green-600 text-white rounded-lg text-xs font-semibold hover:shadow-md transition-all flex items-center gap-1"
                            >
                              Apply <ExternalLink size={11} />
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {/* Expand/Collapse */}
                  {hasMore && (
                    <button
                      onClick={() => toggleCompanyExpand(companyKey)}
                      className="w-full flex items-center justify-center gap-1.5 py-2.5 mt-1 text-sm font-semibold text-blue-600 hover:text-blue-700 hover:bg-blue-50 rounded-xl transition-all"
                    >
                      {isExpanded ? (
                        <><ChevronUp size={16} /> Show Less</>
                      ) : (
                        <><ChevronDown size={16} /> Show All {group.jobs.length} Jobs (+{group.jobs.length - INITIAL_SHOW} more)</>
                      )}
                    </button>
                  )}
                </div>
                <div className="pb-3" />
              </div>
            );
          })}
        </div>
      )}

      {/* Job Cards (List View) */}
      {!loading && filteredJobs.length > 0 && viewMode === "list" && (
        <div className="space-y-4">
          {filteredJobs.map((job) => {
            const isExpanded = expandedJob === job.id;
            const isSaved = savedJobIds.has(job.id);
            const isSaving = savingJob === job.id;

            return (
              <div
                key={job.id}
                className="bg-white rounded-2xl border border-slate-200 hover:border-cyan-300 hover:shadow-lg transition-all overflow-hidden"
              >
                <div className="p-6">
                  {/* Top Row */}
                  <div className="flex items-start justify-between gap-4 mb-3">
                    <div className="flex items-start gap-4 flex-1 min-w-0">
                      {/* Company Logo */}
                      {job.logo ? (
                        <img
                          src={job.logo}
                          alt={job.company}
                          className="w-14 h-14 rounded-xl object-contain bg-slate-50 p-1 border border-slate-200 flex-shrink-0"
                          onError={(e) => {
                            (e.target as HTMLImageElement).style.display = "none";
                          }}
                        />
                      ) : (
                        <div className="w-14 h-14 bg-gradient-to-br from-slate-700 to-slate-900 rounded-xl flex items-center justify-center text-white font-bold text-lg flex-shrink-0">
                          {job.company?.charAt(0) || "J"}
                        </div>
                      )}

                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap mb-1">
                          <h3 className="text-lg font-bold text-slate-900 truncate">{job.title}</h3>
                          {job.type && (
                            <span className="px-2 py-0.5 bg-blue-100 text-blue-700 rounded-full text-xs font-semibold capitalize whitespace-nowrap">
                              {job.type.replace(/_/g, " ")}
                            </span>
                          )}
                          {job.isRemote && (
                            <span className="px-2 py-0.5 bg-green-100 text-green-700 rounded-full text-xs font-semibold">
                              Remote
                            </span>
                          )}
                          <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold whitespace-nowrap border ${
                            (job.source || '').toLowerCase() === 'glassdoor' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' :
                            (job.source || '').toLowerCase() === 'indeed' ? 'bg-indigo-50 text-indigo-700 border-indigo-200' :
                            (job.source || '').toLowerCase() === 'linkedin' ? 'bg-sky-50 text-sky-700 border-sky-200' :
                            (job.source || '').toLowerCase() === 'remotive' ? 'bg-orange-50 text-orange-700 border-orange-200' :
                            (job.source || '').toLowerCase() === 'arbeitnow' ? 'bg-violet-50 text-violet-700 border-violet-200' :
                            (job.source || '').toLowerCase() === 'jobicy' ? 'bg-pink-50 text-pink-700 border-pink-200' :
                            (job.source || '').toLowerCase() === 'usajobs' ? 'bg-red-50 text-red-700 border-red-200' :
                            'bg-cyan-50 text-cyan-700 border-cyan-200'
                          }`}>
                            <Globe size={10} />
                            via {job.source || 'JSearch'}
                          </span>
                        </div>
                        <div className="flex items-center gap-3 text-sm text-slate-600 flex-wrap">
                          <span className="flex items-center gap-1">
                            <Building2 size={14} className="text-slate-400" />
                            {job.company}
                          </span>
                          {job.location && (
                            <span className="flex items-center gap-1">
                              <MapPin size={14} className="text-slate-400" />
                              {job.location}
                            </span>
                          )}
                          {job.salary && job.salary !== "Not specified" && (
                            <span className="flex items-center gap-1 text-green-700 font-semibold">
                              <DollarSign size={14} className="text-green-500" />
                              {job.salary}
                            </span>
                          )}
                          {job.postedDate && (
                            <span className="flex items-center gap-1 text-slate-400">
                              <Clock size={14} />
                              {formatDate(job.postedDate)}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Save Button */}
                    <button
                      onClick={() => handleSaveJob(job)}
                      disabled={isSaving}
                      className="p-2 hover:bg-slate-100 rounded-lg transition-all flex-shrink-0"
                      title={isSaved ? "Remove from saved" : "Save job"}
                    >
                      {isSaving ? (
                        <Loader size={18} className="animate-spin text-slate-400" />
                      ) : isSaved ? (
                        <BookmarkCheck className="text-cyan-600 fill-current" size={20} />
                      ) : (
                        <BookmarkPlus className="text-slate-400" size={20} />
                      )}
                    </button>
                  </div>

                  {/* Short Description */}
                  {!isExpanded && job.description && (
                    <p className="text-sm text-slate-600 line-clamp-2 mb-3 leading-relaxed">
                      {cleanDescription(job.description).substring(0, 250)}...
                    </p>
                  )}

                  {/* Expanded Content */}
                  {isExpanded && (
                    <div className="mb-4 space-y-4">
                      {/* Full Description */}
                      <div className="p-4 bg-slate-50 rounded-xl border border-slate-200">
                        <p className="text-xs font-semibold text-slate-500 mb-2 uppercase">Job Description</p>
                        <p className="text-sm text-slate-700 leading-relaxed whitespace-pre-line">
                          {cleanDescription(job.description).substring(0, 2000)}
                          {cleanDescription(job.description).length > 2000 && "..."}
                        </p>
                      </div>

                      {/* Qualifications */}
                      {job.qualifications && job.qualifications.length > 0 && (
                        <div className="p-4 bg-blue-50 rounded-xl border border-blue-200">
                          <p className="text-xs font-semibold text-blue-600 mb-2 uppercase">Qualifications</p>
                          <ul className="space-y-1">
                            {job.qualifications.map((q, i) => (
                              <li key={i} className="text-sm text-slate-700 flex items-start gap-2">
                                <span className="mt-1.5 w-1.5 h-1.5 bg-blue-400 rounded-full flex-shrink-0"></span>
                                {q}
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}

                      {/* Responsibilities */}
                      {job.responsibilities && job.responsibilities.length > 0 && (
                        <div className="p-4 bg-emerald-50 rounded-xl border border-emerald-200">
                          <p className="text-xs font-semibold text-emerald-600 mb-2 uppercase">Responsibilities</p>
                          <ul className="space-y-1">
                            {job.responsibilities.map((r, i) => (
                              <li key={i} className="text-sm text-slate-700 flex items-start gap-2">
                                <span className="mt-1.5 w-1.5 h-1.5 bg-emerald-400 rounded-full flex-shrink-0"></span>
                                {r}
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}

                      {/* Benefits */}
                      {job.benefits && job.benefits.length > 0 && (
                        <div className="p-4 bg-amber-50 rounded-xl border border-amber-200">
                          <p className="text-xs font-semibold text-amber-600 mb-2 uppercase">Benefits</p>
                          <ul className="space-y-1">
                            {job.benefits.map((b, i) => (
                              <li key={i} className="text-sm text-slate-700 flex items-start gap-2">
                                <span className="mt-1.5 w-1.5 h-1.5 bg-amber-400 rounded-full flex-shrink-0"></span>
                                {b}
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Action Buttons */}
                  <div className="flex items-center gap-3">
                    <button
                      onClick={() => setExpandedJob(isExpanded ? null : job.id)}
                      className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-gradient-to-r from-blue-600 to-cyan-600 text-white rounded-xl font-semibold hover:shadow-lg transition-all text-sm"
                    >
                      {isExpanded ? <ChevronUp size={15} /> : <ChevronDown size={15} />}
                      {isExpanded ? "Show Less" : "View Details"}
                    </button>
                    <button
                      onClick={() => handleApply(job)}
                      className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-gradient-to-r from-emerald-600 to-green-600 text-white rounded-xl font-semibold hover:shadow-lg transition-all text-sm"
                    >
                      <ExternalLink size={15} />
                      Apply Now
                    </button>
                    <button
                      onClick={() => navigate(`/jobseeker/job/${encodeURIComponent(job.id)}`)}
                      className="px-4 py-2.5 bg-white border border-slate-300 rounded-xl font-semibold text-slate-700 hover:border-cyan-300 hover:bg-cyan-50 transition-all text-sm"
                    >
                      Full Page
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* No results (not loading) */}
      {!loading && !initialLoading && hasSearched && filteredJobs.length === 0 && !error && (
        <div className="text-center py-16 bg-white rounded-2xl border border-slate-200">
          <Briefcase className="mx-auto text-slate-300" size={56} />
          <p className="text-slate-600 mt-4 text-lg font-semibold">No jobs found</p>
          <p className="text-slate-500 mt-2">Try a different search term or adjust your filters</p>
        </div>
      )}
    </DashboardLayout>
  );
};

export default FindJobs;
