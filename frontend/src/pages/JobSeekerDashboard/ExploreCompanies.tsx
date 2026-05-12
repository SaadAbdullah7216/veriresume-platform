import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import DashboardLayout from "./DashboardLayout";
import axios from "axios";
import {
  Building2,
  Search,
  Briefcase,
  Users,
  Loader,
  AlertCircle,
  ChevronRight,
  ChevronDown,
  ChevronUp,
  MapPin,
  Star,
  Globe,
  ExternalLink,
  Filter,
  TrendingUp,
  ArrowUpRight,
} from "lucide-react";

const API_URL =
  import.meta.env.VITE_API_URL ||
  import.meta.env.VITE_API_BASE_URL ||
  "http://localhost:3000";

interface Company {
  companyKey: string;
  companyName: string;
  logoUrl?: string;
  description?: string;
  website?: string;
  location?: string;
  recruiters: { name: string; email: string; _id: string; avatar?: string }[];
  activeJobs: number;
  totalJobs: number;
}

interface PortalJob {
  _id: string;
  title: string;
  location: string;
  description: string;
  company: string;
  companyLogoUrl?: string;
  companyWebsite?: string;
  companyLocation?: string;
  postedDate?: string;
  createdAt?: string;
  type?: string;
}

interface JobListing {
  title: string;
  url: string;
  location: string;
  matchScore: number;
  source?: string;
}

interface ExternalCompany {
  name: string;
  platform: string;
  jobCount: number;
  avgMatchScore: number;
  topMatchScore: number;
  jobs: JobListing[];
}

type MergedCompany =
  | { type: "portal"; data: Company }
  | { type: "external"; data: ExternalCompany };

const ExploreCompanies = () => {
  const navigate = useNavigate();
  const [portalCompanies, setPortalCompanies] = useState<Company[]>([]);
  const [externalCompanies, setExternalCompanies] = useState<ExternalCompany[]>([]);
  const [allCompanies, setAllCompanies] = useState<MergedCompany[]>([]);
  const [filteredCompanies, setFilteredCompanies] = useState<MergedCompany[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [sourceFilter, setSourceFilter] = useState<"all" | "portal" | "external">("all");
  const [expandedCompanies, setExpandedCompanies] = useState<Set<string>>(new Set());
  const [portalJobs, setPortalJobs] = useState<Record<string, PortalJob[]>>({});
  const [portalJobsLoading, setPortalJobsLoading] = useState<Record<string, boolean>>({});

  useEffect(() => {
    fetchAllCompanies();
  }, []);

  // Merge & filter whenever data or filters change
  useEffect(() => {
    const merged: MergedCompany[] = [];

    if (sourceFilter === "all" || sourceFilter === "portal") {
      portalCompanies.forEach((c) => merged.push({ type: "portal", data: c }));
    }
    if (sourceFilter === "all" || sourceFilter === "external") {
      externalCompanies.forEach((c) => merged.push({ type: "external", data: c }));
    }

    setAllCompanies(merged);

    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      setFilteredCompanies(
        merged.filter((item) => {
          if (item.type === "portal") {
            const c = item.data as Company;
            return (
              c.companyName.toLowerCase().includes(term) ||
              c.website?.toLowerCase().includes(term) ||
              c.location?.toLowerCase().includes(term) ||
              c.description?.toLowerCase().includes(term) ||
              c.recruiters.some((r) => r.name.toLowerCase().includes(term))
            );
          } else {
            const c = item.data as ExternalCompany;
            return (
              c.name.toLowerCase().includes(term) ||
              c.platform.toLowerCase().includes(term) ||
              c.jobs.some((j) => j.title.toLowerCase().includes(term) || j.location?.toLowerCase().includes(term))
            );
          }
        })
      );
    } else {
      setFilteredCompanies(merged);
    }
  }, [searchTerm, portalCompanies, externalCompanies, sourceFilter]);

  const fetchAllCompanies = async () => {
    setLoading(true);
    setError("");

    try {
      const token = localStorage.getItem("token");

      const portalPromise = axios
        .get(`${API_URL}/api/companies`, {
          headers: { Authorization: `Bearer ${token}` },
        })
        .then((res) => {
          if (res.data.success) return res.data.data || [];
          return [];
        })
        .catch(() => []);

      const externalPromise = getExternalCompanies(token);

      const [portal, external] = await Promise.all([portalPromise, externalPromise]);

      setPortalCompanies(portal);
      setExternalCompanies(external);
    } catch (err: any) {
      setError("Failed to load companies. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const getExternalCompanies = async (token: string | null): Promise<ExternalCompany[]> => {
    try {
      const cachedJobs = localStorage.getItem("veriresume_cached_jobs");
      const cachedTimestamp = localStorage.getItem("veriresume_jobs_timestamp");
      const cacheAge = cachedTimestamp ? Date.now() - parseInt(cachedTimestamp) : Infinity;

      let externalJobs: any[] = [];

      if (cachedJobs && cacheAge < 30 * 60 * 1000) {
        try {
          externalJobs = JSON.parse(cachedJobs);
        } catch (e) {
          externalJobs = [];
        }
      }

      if (externalJobs.length === 0 && token) {
        try {
          const resumeRes = await axios.get(`${API_URL}/api/jobseeker/my-resumes`, {
            headers: { Authorization: `Bearer ${token}` },
          });
          if (resumeRes.data.success && resumeRes.data.data?.resumes?.length > 0) {
            const resumeId = resumeRes.data.data.resumes[0]._id;
            const jobsRes = await axios.post(
              `${API_URL}/api/jobseeker/find-matching-jobs`,
              { resumeId },
              { headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" } }
            );
            if (jobsRes.data.success) {
              externalJobs = jobsRes.data.data?.allMatchingJobs || [];
              localStorage.setItem("veriresume_cached_jobs", JSON.stringify(externalJobs));
              localStorage.setItem("veriresume_jobs_timestamp", Date.now().toString());
            }
          }
        } catch (e) {
          console.warn("Could not fetch external jobs for companies:", e);
        }
      }

      // Filter invalid URLs
      externalJobs = externalJobs.filter((j: any) => {
        if (!j.url || j.url === "#") return false;
        try {
          const u = new URL(j.url);
          if (u.pathname === "/" && !u.search) return false;
          return true;
        } catch { return false; }
      });

      // Group by company name
      const companyMap = new Map<string, ExternalCompany>();

      for (const job of externalJobs) {
        const companyName = job.company || "Unknown Company";
        if (companyName === "Unknown" || companyName === "Unknown Company") continue;

        const key = companyName.toLowerCase().trim();
        if (!companyMap.has(key)) {
          companyMap.set(key, {
            name: companyName,
            platform: job.source || "external",
            jobCount: 0,
            avgMatchScore: 0,
            topMatchScore: 0,
            jobs: [],
          });
        }

        const entry = companyMap.get(key)!;
        entry.jobCount++;
        if (job.source && job.source !== entry.platform) {
          entry.platform = "multiple";
        }
        const score = job.matchScore || 0;
        if (score > entry.topMatchScore) entry.topMatchScore = score;
        entry.jobs.push({
          title: job.title || "Untitled",
          url: job.url || "#",
          location: job.location || "",
          matchScore: score,
          source: job.source || "external",
        });
      }

      // Compute average match score and sort jobs within each company
      for (const [, company] of companyMap) {
        const totalScore = company.jobs.reduce((sum, j) => sum + j.matchScore, 0);
        company.avgMatchScore = company.jobs.length > 0 ? Math.round(totalScore / company.jobs.length) : 0;
        company.jobs.sort((a, b) => b.matchScore - a.matchScore);
      }

      // Sort companies by top match score, then by job count
      return Array.from(companyMap.values()).sort(
        (a, b) => b.topMatchScore - a.topMatchScore || b.jobCount - a.jobCount
      );
    } catch (e) {
      return [];
    }
  };

  const fetchPortalCompanyJobs = async (companyKey: string) => {
    const token = localStorage.getItem("token");
    if (!token) return;

    setPortalJobsLoading((prev) => ({ ...prev, [companyKey]: true }));
    try {
      const res = await axios.get(`${API_URL}/api/companies/${companyKey}/jobs`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.data.success) {
        setPortalJobs((prev) => ({ ...prev, [companyKey]: res.data.data || [] }));
      }
    } catch (err) {
      console.warn("Failed to load company jobs:", err);
    } finally {
      setPortalJobsLoading((prev) => ({ ...prev, [companyKey]: false }));
    }
  };

  const togglePortalJobs = async (companyKey: string) => {
    const expandedKey = `portal-${companyKey}`;
    setExpandedCompanies((prev) => {
      const next = new Set(prev);
      if (next.has(expandedKey)) {
        next.delete(expandedKey);
      } else {
        next.add(expandedKey);
      }
      return next;
    });

    if (!portalJobs[companyKey]) {
      await fetchPortalCompanyJobs(companyKey);
    }
  };

  const toggleExpand = (companyKey: string) => {
    setExpandedCompanies((prev) => {
      const next = new Set(prev);
      if (next.has(companyKey)) {
        next.delete(companyKey);
      } else {
        next.add(companyKey);
      }
      return next;
    });
  };

  const getCompanyInitials = (name: string) => {
    return name
      .split(" ")
      .map((w) => w[0])
      .filter(Boolean)
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  const getScoreColor = (score: number) => {
    if (score >= 80) return "text-emerald-600 bg-emerald-50 border-emerald-200";
    if (score >= 60) return "text-cyan-600 bg-cyan-50 border-cyan-200";
    if (score >= 40) return "text-amber-600 bg-amber-50 border-amber-200";
    return "text-slate-600 bg-slate-50 border-slate-200";
  };

  const getScoreBg = (score: number) => {
    if (score >= 80) return "from-emerald-500 to-green-500";
    if (score >= 60) return "from-cyan-500 to-blue-500";
    if (score >= 40) return "from-amber-500 to-orange-500";
    return "from-slate-400 to-slate-500";
  };

  const portalColors = [
    "from-blue-600 to-cyan-600",
    "from-purple-600 to-indigo-600",
    "from-emerald-600 to-green-600",
    "from-amber-600 to-orange-600",
    "from-rose-600 to-pink-600",
    "from-teal-600 to-cyan-600",
  ];

  const platformBadge = (platform: string) => {
    const p = platform.toLowerCase();
    if (p === "remotive") return { bg: "bg-blue-100 text-blue-700 border-blue-200", label: "Remotive" };
    if (p === "jobicy") return { bg: "bg-purple-100 text-purple-700 border-purple-200", label: "Jobicy" };
    if (p === "arbeitnow") return { bg: "bg-teal-100 text-teal-700 border-teal-200", label: "ArbeitNow" };
    if (p === "usajobs") return { bg: "bg-red-100 text-red-700 border-red-200", label: "USAJobs" };
    if (p === "indeed") return { bg: "bg-indigo-100 text-indigo-700 border-indigo-200", label: "Indeed" };
    if (p === "linkedin") return { bg: "bg-sky-100 text-sky-700 border-sky-200", label: "LinkedIn" };
    if (p === "glassdoor") return { bg: "bg-emerald-100 text-emerald-700 border-emerald-200", label: "Glassdoor" };
    if (p === "portal") return { bg: "bg-cyan-100 text-cyan-700 border-cyan-200", label: "VeriResume" };
    if (p === "multiple") return { bg: "bg-amber-100 text-amber-700 border-amber-200", label: "Multiple Platforms" };
    return { bg: "bg-slate-100 text-slate-700 border-slate-200", label: platform };
  };

  const jobSourceBadge = (source: string) => {
    const p = source.toLowerCase();
    if (p === "remotive") return { bg: "bg-blue-50 text-blue-600", label: "Remotive" };
    if (p === "jobicy") return { bg: "bg-purple-50 text-purple-600", label: "Jobicy" };
    if (p === "arbeitnow") return { bg: "bg-teal-50 text-teal-600", label: "ArbeitNow" };
    if (p === "usajobs") return { bg: "bg-red-50 text-red-600", label: "USAJobs" };
    if (p === "indeed") return { bg: "bg-indigo-50 text-indigo-600", label: "Indeed" };
    if (p === "linkedin") return { bg: "bg-sky-50 text-sky-600", label: "LinkedIn" };
    if (p === "glassdoor") return { bg: "bg-emerald-50 text-emerald-600", label: "Glassdoor" };
    return { bg: "bg-slate-50 text-slate-600", label: source };
  };

  const totalPortal = filteredCompanies.filter((c) => c.type === "portal").length;
  const totalExternal = filteredCompanies.filter((c) => c.type === "external").length;
  const totalJobs = filteredCompanies
    .filter((c) => c.type === "external")
    .reduce((sum, c) => sum + (c.data as ExternalCompany).jobCount, 0);

  return (
    <DashboardLayout title="Explore Companies" subtitle="Companies that posted jobs matching your resume">
      {/* Search & Filters */}
      <div className="bg-white rounded-2xl p-5 border border-slate-200 mb-6">
        <div className="flex flex-col md:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
            <input
              type="text"
              placeholder="Search companies, job titles, or locations..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-12 pr-4 py-3 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-cyan-500 text-sm"
            />
          </div>
          <div className="relative">
            <Filter className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
            <select
              value={sourceFilter}
              onChange={(e) => setSourceFilter(e.target.value as any)}
              className="pl-9 pr-8 py-3 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-cyan-500 text-sm bg-white appearance-none cursor-pointer min-w-[180px]"
            >
              <option value="all">All Sources</option>
              <option value="portal">VeriResume Portal</option>
              <option value="external">External Platforms</option>
            </select>
          </div>
        </div>
        {!loading && (
          <div className="flex items-center gap-4 mt-3 flex-wrap">
            <p className="text-xs text-slate-500">
              <strong className="text-slate-700">{filteredCompanies.length}</strong> companies
            </p>
            <div className="flex gap-2 text-xs flex-wrap">
              {totalPortal > 0 && (
                <span className="px-2 py-0.5 bg-cyan-50 text-cyan-700 rounded-lg border border-cyan-200">
                  {totalPortal} Portal
                </span>
              )}
              {totalExternal > 0 && (
                <span className="px-2 py-0.5 bg-amber-50 text-amber-700 rounded-lg border border-amber-200">
                  {totalExternal} External
                </span>
              )}
              {totalJobs > 0 && (
                <span className="px-2 py-0.5 bg-violet-50 text-violet-700 rounded-lg border border-violet-200">
                  {totalJobs} total jobs
                </span>
              )}
            </div>
          </div>
        )}
      </div>

      {loading ? (
        <div className="flex flex-col items-center justify-center py-20">
          <Loader className="animate-spin text-cyan-600 mb-4" size={40} />
          <p className="text-slate-600">Discovering companies from your matched jobs...</p>
        </div>
      ) : error ? (
        <div className="bg-red-50 border border-red-200 rounded-2xl p-8 text-center">
          <AlertCircle className="mx-auto text-red-400 mb-3" size={40} />
          <p className="text-red-700 font-semibold">{error}</p>
        </div>
      ) : allCompanies.length === 0 ? (
        <div className="text-center py-16 bg-white rounded-2xl border border-slate-200">
          <Building2 className="mx-auto text-slate-300" size={56} />
          <p className="text-slate-700 text-lg mt-4 font-semibold">No companies found</p>
          <p className="text-slate-500 mt-2">Upload your resume first to discover matching companies and their jobs.</p>
          <button
            onClick={() => navigate("/jobseeker/upload-resume")}
            className="mt-4 px-6 py-2.5 bg-gradient-to-r from-blue-600 to-cyan-600 text-white rounded-xl font-semibold hover:shadow-lg transition-all text-sm"
          >
            Upload Resume
          </button>
        </div>
      ) : (
        <div className="space-y-5">
          {filteredCompanies.map((item, idx) => {
            if (item.type === "portal") {
              const company = item.data as Company;
              const portalKey = `portal-${company.companyKey}`;
              const isExpanded = expandedCompanies.has(portalKey);
              const jobs = portalJobs[company.companyKey] || [];
              const isLoadingJobs = portalJobsLoading[company.companyKey];
              return (
                <div
                  key={`portal-${company.companyKey}`}
                  className="bg-white rounded-2xl border border-slate-200 hover:border-cyan-300 hover:shadow-lg transition-all overflow-hidden"
                >
                  <div className="p-6">
                    <div className="flex items-start gap-4">
                      {/* Company Avatar */}
                      {company.logoUrl ? (
                        <img
                          src={company.logoUrl}
                          alt={company.companyName}
                          className="w-14 h-14 rounded-xl object-cover border border-slate-200 flex-shrink-0"
                        />
                      ) : (
                        <div
                          className={`w-14 h-14 bg-gradient-to-br ${
                            portalColors[idx % portalColors.length]
                          } rounded-xl flex items-center justify-center flex-shrink-0`}
                        >
                          <span className="text-white font-bold text-lg">{getCompanyInitials(company.companyName)}</span>
                        </div>
                      )}
                      {/* Company Info */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <h3 className="text-lg font-bold text-slate-900">{company.companyName}</h3>
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-cyan-50 text-cyan-700 rounded-lg text-xs font-semibold border border-cyan-200">
                            <Star size={10} />
                            VeriResume
                          </span>
                        </div>
                        <div className="flex items-center gap-3 text-sm text-slate-500 mt-1 flex-wrap">
                          <span className="flex items-center gap-1">
                            <Briefcase size={12} className="text-slate-400" />
                            {company.activeJobs} active / {company.totalJobs} total
                          </span>
                          {company.location && (
                            <span className="flex items-center gap-1">
                              <MapPin size={12} className="text-slate-400" />
                              {company.location}
                            </span>
                          )}
                          {company.website && (
                            <span className="flex items-center gap-1">
                              <Globe size={12} className="text-slate-400" />
                              {company.website}
                            </span>
                          )}
                        </div>
                        {company.description && (
                          <p className="text-sm text-slate-600 mt-2 line-clamp-2">{company.description}</p>
                        )}
                        {/* Recruiters */}
                        <div className="flex flex-wrap gap-1.5 mt-2">
                          {company.recruiters.slice(0, 4).map((r, i) => (
                            <span
                              key={i}
                              className="inline-flex items-center gap-1 px-2 py-0.5 bg-blue-50 text-blue-600 rounded-lg text-xs font-medium border border-blue-100"
                            >
                              <Users size={10} />
                              {r.name}
                            </span>
                          ))}
                          {company.recruiters.length > 4 && (
                            <span className="px-2 py-0.5 bg-slate-100 text-slate-500 rounded-lg text-xs font-medium">
                              +{company.recruiters.length - 4} more
                            </span>
                          )}
                        </div>
                      </div>
                      {/* View Jobs */}
                      <button
                        onClick={() => togglePortalJobs(company.companyKey)}
                        className="flex items-center gap-1.5 px-4 py-2 bg-gradient-to-r from-blue-600 to-cyan-600 text-white rounded-xl font-semibold hover:shadow-lg transition-all text-sm flex-shrink-0"
                      >
                        <Briefcase size={14} />
                        {isExpanded ? "Hide Jobs" : "View Jobs"}
                        {isExpanded ? <ChevronUp size={14} /> : <ChevronRight size={14} />}
                      </button>
                    </div>
                  </div>

                  {isExpanded && (
                    <div className="px-6 pb-6">
                      <div className="border-t border-slate-100 pt-4">
                        {isLoadingJobs ? (
                          <div className="flex items-center gap-2 text-sm text-slate-500">
                            <Loader className="animate-spin" size={16} />
                            Loading jobs...
                          </div>
                        ) : jobs.length === 0 ? (
                          <p className="text-sm text-slate-500">No active jobs listed for this company.</p>
                        ) : (
                          <div className="space-y-3">
                            {jobs.map((job) => (
                              <div
                                key={job._id}
                                className="flex items-start justify-between gap-4 p-4 bg-slate-50 rounded-xl border border-slate-200"
                              >
                                <div>
                                  <p className="font-semibold text-slate-900">{job.title}</p>
                                  <div className="flex items-center gap-2 text-xs text-slate-500 mt-1 flex-wrap">
                                    <span className="flex items-center gap-1">
                                      <MapPin size={10} />
                                      {job.location}
                                    </span>
                                    {job.type && (
                                      <span className="flex items-center gap-1">
                                        <Briefcase size={10} />
                                        {job.type}
                                      </span>
                                    )}
                                  </div>
                                  <p className="text-sm text-slate-600 mt-2 line-clamp-2">{job.description}</p>
                                </div>
                                <button
                                  onClick={() => navigate("/jobseeker/jobs")}
                                  className="px-3 py-2 text-xs font-semibold text-blue-700 bg-blue-50 rounded-lg hover:bg-blue-100 transition-all"
                                >
                                  View Details
                                </button>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              );
            } else {
              // External company card with ALL job listings
              const company = item.data as ExternalCompany;
              const badge = platformBadge(company.platform);
              const companyKey = `ext-${company.name.toLowerCase().trim()}`;
              const isExpanded = expandedCompanies.has(companyKey);
              const INITIAL_SHOW = 5;
              const sortedJobs = company.jobs; // already sorted by matchScore desc
              const visibleJobs = isExpanded ? sortedJobs : sortedJobs.slice(0, INITIAL_SHOW);
              const hasMoreJobs = sortedJobs.length > INITIAL_SHOW;

              return (
                <div
                  key={`ext-${idx}`}
                  className="bg-white rounded-2xl border border-slate-200 hover:border-blue-200 transition-all overflow-hidden"
                >
                  {/* Company Header */}
                  <div className="p-6 pb-4">
                    <div className="flex items-start gap-4">
                      {/* Company Avatar with Score */}
                      <div className="relative flex-shrink-0">
                        <div className={`w-14 h-14 bg-gradient-to-br ${getScoreBg(company.topMatchScore)} rounded-xl flex items-center justify-center`}>
                          <span className="text-white font-bold text-lg">{getCompanyInitials(company.name)}</span>
                        </div>
                        <div className={`absolute -bottom-1 -right-1 px-1.5 py-0.5 rounded-md text-[10px] font-bold border ${getScoreColor(company.topMatchScore)}`}>
                          {company.topMatchScore}%
                        </div>
                      </div>
                      {/* Company Info */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <h3 className="text-lg font-bold text-slate-900">{company.name}</h3>
                          <span
                            className={`inline-flex items-center gap-1 px-2 py-0.5 ${badge.bg} rounded-lg text-xs font-semibold border`}
                          >
                            <Globe size={10} />
                            {badge.label}
                          </span>
                        </div>
                        <div className="flex items-center gap-4 text-sm text-slate-500 mt-1 flex-wrap">
                          <span className="flex items-center gap-1">
                            <Briefcase size={12} className="text-slate-400" />
                            {company.jobCount} matching job{company.jobCount !== 1 ? "s" : ""}
                          </span>
                          <span className="flex items-center gap-1">
                            <TrendingUp size={12} className="text-slate-400" />
                            Avg match: {company.avgMatchScore}%
                          </span>
                          {sortedJobs[0]?.location && (
                            <span className="flex items-center gap-1">
                              <MapPin size={12} className="text-slate-400" />
                              {sortedJobs[0].location}
                            </span>
                          )}
                        </div>
                      </div>
                      {/* Find More Button */}
                      <button
                        onClick={() => navigate(`/jobseeker/find-jobs?q=${encodeURIComponent(company.name)}`)}
                        className="flex items-center gap-1.5 px-4 py-2 bg-gradient-to-r from-blue-600 to-cyan-600 text-white rounded-xl font-semibold hover:shadow-lg transition-all text-sm flex-shrink-0"
                        title={`Search for more jobs at ${company.name}`}
                      >
                        <Search size={14} />
                        Find More Jobs
                        <ArrowUpRight size={14} />
                      </button>
                    </div>
                  </div>

                  {/* ALL Job Listings */}
                  <div className="px-6 pb-2">
                    <div className="border-t border-slate-100 pt-3">
                      <p className="text-xs font-semibold text-slate-500 uppercase mb-2">
                        All Matching Jobs ({company.jobCount})
                      </p>
                      <div className="space-y-2">
                        {visibleJobs.map((job, jIdx) => {
                          const srcBadge = jobSourceBadge(job.source || company.platform);
                          return (
                            <div
                              key={jIdx}
                              className="flex items-center gap-3 bg-slate-50 hover:bg-slate-100 rounded-xl px-4 py-3 transition-colors group"
                            >
                              {/* Match Score Circle */}
                              <div className={`w-10 h-10 rounded-full bg-gradient-to-br ${getScoreBg(job.matchScore)} flex items-center justify-center flex-shrink-0`}>
                                <span className="text-white text-xs font-bold">{job.matchScore}%</span>
                              </div>
                              {/* Job Info */}
                              <div className="flex-1 min-w-0">
                                <p className="text-sm font-semibold text-slate-800 truncate">{job.title}</p>
                                <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                                  {job.location && (
                                    <span className="text-xs text-slate-500 flex items-center gap-0.5">
                                      <MapPin size={10} />
                                      {job.location}
                                    </span>
                                  )}
                                  <span className={`text-[10px] px-1.5 py-0.5 rounded font-medium ${srcBadge.bg}`}>
                                    {srcBadge.label}
                                  </span>
                                </div>
                              </div>
                              {/* Apply Button */}
                              {job.url && job.url !== "#" && (
                                <button
                                  onClick={() => window.open(job.url, "_blank")}
                                  className="flex items-center gap-1 px-3 py-1.5 bg-white border border-slate-200 text-slate-700 rounded-lg text-xs font-semibold hover:bg-blue-50 hover:border-blue-300 hover:text-blue-700 transition-all opacity-80 group-hover:opacity-100"
                                >
                                  Apply
                                  <ExternalLink size={11} />
                                </button>
                              )}
                            </div>
                          );
                        })}
                      </div>

                      {/* Expand / Collapse */}
                      {hasMoreJobs && (
                        <button
                          onClick={() => toggleExpand(companyKey)}
                          className="w-full flex items-center justify-center gap-1.5 py-2.5 mt-2 text-sm font-semibold text-blue-600 hover:text-blue-700 hover:bg-blue-50 rounded-xl transition-all"
                        >
                          {isExpanded ? (
                            <>
                              <ChevronUp size={16} />
                              Show Less
                            </>
                          ) : (
                            <>
                              <ChevronDown size={16} />
                              Show All {sortedJobs.length} Jobs (+{sortedJobs.length - INITIAL_SHOW} more)
                            </>
                          )}
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Footer */}
                  <div className="px-6 pb-5 pt-1" />
                </div>
              );
            }
          })}
        </div>
      )}

      {/* No search results */}
      {!loading && allCompanies.length > 0 && filteredCompanies.length === 0 && searchTerm && (
        <div className="text-center py-12 bg-white rounded-2xl border border-slate-200 mt-6">
          <Search className="mx-auto text-slate-300" size={48} />
          <p className="text-slate-600 mt-3 font-medium">No companies match "{searchTerm}"</p>
          <button
            onClick={() => setSearchTerm("")}
            className="mt-3 text-cyan-600 hover:text-cyan-700 font-semibold text-sm"
          >
            Clear search
          </button>
        </div>
      )}
    </DashboardLayout>
  );
};

export default ExploreCompanies;
