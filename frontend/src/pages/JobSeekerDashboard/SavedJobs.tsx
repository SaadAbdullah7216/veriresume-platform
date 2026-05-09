import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import DashboardLayout from "./DashboardLayout";
import axios from "axios";
import {
  Bookmark,
  Loader,
  AlertCircle,
  Trash2,
  ExternalLink,
  MapPin,
  Building2,
  Clock,
  DollarSign,
  Briefcase,
  Search,
  BookmarkX,
} from "lucide-react";

const API_URL =
  import.meta.env.VITE_API_URL ||
  import.meta.env.VITE_API_BASE_URL ||
  "http://localhost:3000";

interface SavedJobItem {
  _id: string;
  jobId: string;
  title: string;
  company: string;
  location: string;
  type: string;
  salary: string;
  description: string;
  applyUrl: string;
  logo: string | null;
  source: string;
  postedDate: string;
  createdAt: string;
}

const SavedJobs = () => {
  const navigate = useNavigate();
  const [savedJobs, setSavedJobs] = useState<SavedJobItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [removing, setRemoving] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");

  useEffect(() => {
    fetchSavedJobs();
  }, []);

  const fetchSavedJobs = async () => {
    setLoading(true);
    setError("");
    try {
      const token = localStorage.getItem("token");
      const response = await axios.get(`${API_URL}/api/jobseeker/saved-jobs`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (response.data.success) {
        setSavedJobs(response.data.data || []);
      }
    } catch (err: any) {
      setError("Failed to load saved jobs");
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleRemove = async (id: string) => {
    setRemoving(id);
    try {
      const token = localStorage.getItem("token");
      await axios.delete(`${API_URL}/api/jobseeker/saved-jobs/${id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setSavedJobs((prev) => prev.filter((j) => j._id !== id));
    } catch (err: any) {
      console.error("Remove saved job error:", err);
    } finally {
      setRemoving(null);
    }
  };

  const handleApply = (job: SavedJobItem) => {
    if (job.applyUrl && job.applyUrl !== "#") {
      window.open(job.applyUrl, "_blank", "noopener,noreferrer");
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

  const filteredJobs = savedJobs.filter((job) => {
    if (!searchTerm) return true;
    const term = searchTerm.toLowerCase();
    return (
      job.title?.toLowerCase().includes(term) ||
      job.company?.toLowerCase().includes(term) ||
      job.location?.toLowerCase().includes(term)
    );
  });

  if (loading) {
    return (
      <DashboardLayout title="Saved Jobs" subtitle="Your bookmarked jobs">
        <div className="flex items-center justify-center py-20">
          <div className="text-center">
            <Loader className="w-12 h-12 animate-spin text-cyan-600 mx-auto mb-4" />
            <p className="text-slate-600">Loading saved jobs...</p>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout title="Saved Jobs" subtitle="Jobs you've bookmarked for later">
      {error && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-xl flex items-center text-red-700">
          <AlertCircle className="w-5 h-5 mr-3" />
          {error}
        </div>
      )}

      {/* Search */}
      {savedJobs.length > 0 && (
        <div className="bg-white rounded-2xl p-4 border border-slate-200 mb-6">
          <div className="relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
            <input
              type="text"
              placeholder="Search saved jobs..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-11 pr-4 py-2.5 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-cyan-500 text-sm"
            />
          </div>
          <p className="text-xs text-slate-500 mt-2">
            {filteredJobs.length} of {savedJobs.length} saved jobs
          </p>
        </div>
      )}

      {/* Empty State */}
      {savedJobs.length === 0 && (
        <div className="text-center py-16 bg-white rounded-2xl border border-slate-200">
          <Bookmark className="mx-auto text-slate-300" size={56} />
          <p className="text-slate-700 text-lg mt-4 font-semibold">No saved jobs yet</p>
          <p className="text-slate-500 mt-2 max-w-md mx-auto">
            Start browsing jobs and save the ones you're interested in
          </p>
          <button
            onClick={() => navigate("/jobseeker/find-jobs")}
            className="mt-6 px-8 py-3 bg-gradient-to-r from-blue-600 to-cyan-600 text-white rounded-xl font-semibold hover:shadow-lg transition-all"
          >
            Find Jobs
          </button>
        </div>
      )}

      {/* Job Cards */}
      {filteredJobs.length > 0 && (
        <div className="space-y-4">
          {filteredJobs.map((job) => (
            <div
              key={job._id}
              className="bg-white rounded-2xl border border-slate-200 hover:border-cyan-300 hover:shadow-lg transition-all p-6"
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex items-start gap-4 flex-1 min-w-0">
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
                    <h3 className="text-lg font-bold text-slate-900 truncate">{job.title}</h3>
                    <div className="flex items-center gap-3 text-sm text-slate-600 flex-wrap mt-1">
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
                    </div>
                    <div className="flex items-center gap-2 mt-2 flex-wrap">
                      {job.type && (
                        <span className="px-2 py-0.5 bg-blue-100 text-blue-700 rounded-full text-xs font-semibold capitalize">
                          {job.type}
                        </span>
                      )}
                      <span className="px-2 py-0.5 bg-slate-100 text-slate-600 rounded-full text-xs font-medium">
                        {job.source || "JSearch"}
                      </span>
                      <span className="text-xs text-slate-400 flex items-center gap-1">
                        <Clock size={12} />
                        Saved {formatDate(job.createdAt)}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-2 flex-shrink-0">
                  <button
                    onClick={() => handleApply(job)}
                    className="px-4 py-2 bg-gradient-to-r from-emerald-600 to-green-600 text-white rounded-xl font-semibold text-sm hover:shadow-lg transition-all flex items-center gap-1"
                  >
                    <ExternalLink size={14} /> Apply
                  </button>
                  {job.source === "JSearch" && (
                    <button
                      onClick={() => navigate(`/jobseeker/job/${encodeURIComponent(job.jobId)}`)}
                      className="px-4 py-2 bg-white border border-slate-300 rounded-xl font-semibold text-sm text-slate-700 hover:border-cyan-300 transition-all flex items-center gap-1"
                    >
                      <Briefcase size={14} /> Details
                    </button>
                  )}
                  <button
                    onClick={() => handleRemove(job._id)}
                    disabled={removing === job._id}
                    className="p-2 hover:bg-red-50 rounded-lg transition-all text-slate-400 hover:text-red-500"
                    title="Remove from saved"
                  >
                    {removing === job._id ? (
                      <Loader size={18} className="animate-spin" />
                    ) : (
                      <Trash2 size={18} />
                    )}
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* No search results */}
      {savedJobs.length > 0 && filteredJobs.length === 0 && searchTerm && (
        <div className="text-center py-12 bg-white rounded-2xl border border-slate-200">
          <BookmarkX className="mx-auto text-slate-300" size={48} />
          <p className="text-slate-600 mt-3 font-medium">No saved jobs match "{searchTerm}"</p>
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

export default SavedJobs;
