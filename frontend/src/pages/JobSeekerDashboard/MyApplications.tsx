import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import DashboardLayout from "./DashboardLayout";
import axios from "axios";
import {
  FileText,
  MapPin,
  Clock,
  CheckCircle,
  XCircle,
  Loader,
  AlertCircle,
  Filter,
  Building2,
  Calendar,
  Star,
  PartyPopper,
  Eye,
  ChevronRight,
} from "lucide-react";

const API_URL =
  import.meta.env.VITE_API_URL ||
  import.meta.env.VITE_API_BASE_URL ||
  "http://localhost:3000";

interface Application {
  _id: string;
  job: {
    _id: string;
    title: string;
    company: string;
    location: string;
    type: string;
    salary?: string;
    experience?: string;
    status: string;
    postedDate?: string;
  };
  hr: {
    _id: string;
    name: string;
    email: string;
    company?: string;
  };
  resume?: {
    _id: string;
    originalFileName?: string;
    parsedData?: { name?: string; skills?: string[] };
    aiAnalysis?: { atsScore?: number; overallScore?: number };
    createdAt?: string;
  };
  status: string;
  matchScore: number;
  appliedAt: string;
  updatedAt: string;
  statusHistory: { status: string; changedAt: string; note?: string }[];
}

const statusConfig: Record<string, { label: string; color: string; bg: string; border: string; icon: any }> = {
  pending: { label: "Pending", color: "text-amber-700", bg: "bg-amber-50", border: "border-amber-200", icon: Clock },
  reviewing: { label: "Reviewing", color: "text-blue-700", bg: "bg-blue-50", border: "border-blue-200", icon: Eye },
  shortlisted: { label: "Shortlisted", color: "text-purple-700", bg: "bg-purple-50", border: "border-purple-200", icon: Star },
  interview_scheduled: { label: "Interview Scheduled", color: "text-cyan-700", bg: "bg-cyan-50", border: "border-cyan-200", icon: Calendar },
  selected: { label: "Selected", color: "text-green-700", bg: "bg-green-50", border: "border-green-200", icon: CheckCircle },
  rejected: { label: "Rejected", color: "text-red-700", bg: "bg-red-50", border: "border-red-200", icon: XCircle },
};

const MyApplications = () => {
  const navigate = useNavigate();
  const [applications, setApplications] = useState<Application[]>([]);
  const [filteredApps, setFilteredApps] = useState<Application[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [activeFilter, setActiveFilter] = useState("all");

  const filters = ["all", "pending", "reviewing", "shortlisted", "interview_scheduled", "selected", "rejected"];

  useEffect(() => {
    fetchApplications();
  }, []);

  useEffect(() => {
    if (activeFilter === "all") {
      setFilteredApps(applications);
    } else {
      setFilteredApps(applications.filter((a) => a.status === activeFilter));
    }
  }, [activeFilter, applications]);

  const fetchApplications = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem("token");
      const response = await axios.get(`${API_URL}/api/jobseeker/my-applications`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (response.data.success) {
        setApplications(response.data.data || []);
      } else {
        setError("Failed to load applications");
      }
    } catch (err: any) {
      setError(err.response?.data?.error || "Failed to load applications");
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  };

  const getStatusCounts = () => {
    const counts: Record<string, number> = { all: applications.length };
    filters.forEach((f) => {
      if (f !== "all") counts[f] = applications.filter((a) => a.status === f).length;
    });
    return counts;
  };

  const statusCounts = getStatusCounts();

  return (
    <DashboardLayout title="My Applications" subtitle="Track your job applications and their status">
      {loading ? (
        <div className="flex flex-col items-center justify-center py-20">
          <Loader className="animate-spin text-cyan-600 mb-4" size={40} />
          <p className="text-slate-600">Loading your applications...</p>
        </div>
      ) : error ? (
        <div className="bg-red-50 border border-red-200 rounded-2xl p-8 text-center">
          <AlertCircle className="mx-auto text-red-400 mb-3" size={40} />
          <p className="text-red-700 font-semibold">{error}</p>
        </div>
      ) : (
        <>
          {/* Status Filter Tabs */}
          <div className="bg-white rounded-2xl p-4 border border-slate-200 mb-6">
            <div className="flex flex-wrap gap-2">
              {filters.map((f) => {
                const config = f === "all" ? null : statusConfig[f];
                const count = statusCounts[f] || 0;
                const label = f === "all" ? "All" : config?.label || f;
                return (
                  <button
                    key={f}
                    onClick={() => setActiveFilter(f)}
                    className={`px-4 py-2 rounded-xl text-sm font-semibold transition-all flex items-center gap-2 ${
                      activeFilter === f
                        ? "bg-cyan-600 text-white shadow-lg"
                        : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                    }`}
                  >
                    {label}
                    <span
                      className={`px-2 py-0.5 rounded-full text-xs ${
                        activeFilter === f ? "bg-white/20 text-white" : "bg-slate-200 text-slate-700"
                      }`}
                    >
                      {count}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Summary Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            <div className="bg-gradient-to-br from-blue-50 to-cyan-50 rounded-2xl p-4 border border-blue-200">
              <p className="text-sm text-slate-600 mb-1">Total Applied</p>
              <p className="text-2xl font-bold text-slate-900">{applications.length}</p>
            </div>
            <div className="bg-gradient-to-br from-amber-50 to-yellow-50 rounded-2xl p-4 border border-amber-200">
              <p className="text-sm text-slate-600 mb-1">Pending</p>
              <p className="text-2xl font-bold text-amber-700">{statusCounts.pending || 0}</p>
            </div>
            <div className="bg-gradient-to-br from-purple-50 to-indigo-50 rounded-2xl p-4 border border-purple-200">
              <p className="text-sm text-slate-600 mb-1">Shortlisted</p>
              <p className="text-2xl font-bold text-purple-700">{statusCounts.shortlisted || 0}</p>
            </div>
            <div className="bg-gradient-to-br from-green-50 to-emerald-50 rounded-2xl p-4 border border-green-200">
              <p className="text-sm text-slate-600 mb-1">Selected</p>
              <p className="text-2xl font-bold text-green-700">{statusCounts.selected || 0}</p>
            </div>
          </div>

          {/* No Applications */}
          {applications.length === 0 && (
            <div className="text-center py-16 bg-white rounded-2xl border border-slate-200">
              <FileText className="mx-auto text-slate-300" size={56} />
              <p className="text-slate-700 text-lg mt-4 font-semibold">No applications yet</p>
              <p className="text-slate-500 mt-2 max-w-md mx-auto">
                Browse job recommendations and apply to start tracking your applications here.
              </p>
              <button
                onClick={() => navigate("/jobseeker/jobs")}
                className="mt-6 px-6 py-3 bg-gradient-to-r from-blue-600 to-cyan-600 text-white rounded-xl font-semibold hover:shadow-lg transition-all"
              >
                Browse Jobs
              </button>
            </div>
          )}

          {/* Application Cards */}
          {filteredApps.length > 0 && (
            <div className="space-y-4">
              {filteredApps.map((app) => {
                const config = statusConfig[app.status] || statusConfig.pending;
                const StatusIcon = config.icon;

                return (
                  <div
                    key={app._id}
                    className={`bg-white rounded-2xl border-2 ${
                      app.status === "selected" ? "border-green-300" : "border-slate-200"
                    } hover:shadow-lg transition-all overflow-hidden`}
                  >
                    {/* Selected Congratulations Banner */}
                    {app.status === "selected" && (
                      <div className="bg-gradient-to-r from-green-500 to-emerald-500 text-white px-6 py-3 flex items-center gap-3">
                        <PartyPopper size={20} />
                        <span className="font-semibold">
                          Congratulations! You've been selected for this position!
                        </span>
                      </div>
                    )}

                    <div className="p-6">
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1 min-w-0">
                          {/* Job Title */}
                          <div className="flex items-center gap-3 mb-2 flex-wrap">
                            <h3 className="text-lg font-bold text-slate-900">{app.job?.title || "Job Unavailable"}</h3>
                            <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold ${config.bg} ${config.color} ${config.border} border`}>
                              <StatusIcon size={12} />
                              {config.label}
                            </span>
                          </div>

                          {/* Company & Details */}
                          <div className="flex flex-wrap items-center gap-3 text-sm text-slate-600 mb-3">
                            <span className="flex items-center gap-1">
                              <Building2 size={14} className="text-slate-400" />
                              {app.job?.company || app.hr?.company || "—"}
                            </span>
                            {app.job?.location && (
                              <span className="flex items-center gap-1">
                                <MapPin size={14} className="text-slate-400" />
                                {app.job.location}
                              </span>
                            )}
                            {app.job?.type && (
                              <span className="px-2 py-0.5 bg-slate-100 text-slate-600 rounded-full text-xs font-medium">
                                {app.job.type}
                              </span>
                            )}
                            {app.job?.salary && (
                              <span className="text-green-700 font-semibold text-xs">{app.job.salary}</span>
                            )}
                          </div>

                          {/* Applied Date & Match Score */}
                          <div className="flex items-center gap-4 text-xs text-slate-500">
                            <span className="flex items-center gap-1">
                              <Calendar size={12} />
                              Applied: {formatDate(app.appliedAt)}
                            </span>
                            {app.matchScore > 0 && (
                              <span className="flex items-center gap-1">
                                <Star size={12} className="text-amber-500" />
                                Match: <strong className="text-slate-700">{app.matchScore}%</strong>
                              </span>
                            )}
                            {app.hr?.name && (
                              <span className="text-slate-400">HR: {app.hr.name}</span>
                            )}
                          </div>

                          {/* Resume Info */}
                          {app.resume && (
                            <div className="mt-3 flex items-center gap-3 px-3 py-2 bg-slate-50 rounded-xl border border-slate-200">
                              <FileText size={14} className="text-cyan-600 flex-shrink-0" />
                              <div className="flex items-center gap-3 text-xs text-slate-600 flex-wrap">
                                <span className="font-semibold text-slate-700">
                                  {app.resume.originalFileName || app.resume.parsedData?.name || "Resume"}
                                </span>
                                {app.resume.aiAnalysis?.atsScore && (
                                  <span className="px-2 py-0.5 bg-blue-50 text-blue-700 rounded-full border border-blue-200 font-semibold">
                                    ATS: {app.resume.aiAnalysis.atsScore}%
                                  </span>
                                )}
                                {app.resume.parsedData?.skills && app.resume.parsedData.skills.length > 0 && (
                                  <span className="text-slate-400">
                                    {app.resume.parsedData.skills.length} skills
                                  </span>
                                )}
                                {app.resume.createdAt && (
                                  <span className="text-slate-400">
                                    Uploaded: {formatDate(app.resume.createdAt)}
                                  </span>
                                )}
                              </div>
                            </div>
                          )}

                          {/* Interview Scheduled Info */}
                          {app.status === "interview_scheduled" && (
                            <div className="mt-3 p-3 bg-cyan-50 border border-cyan-200 rounded-xl">
                              <p className="text-sm text-cyan-800 font-semibold flex items-center gap-2">
                                <Calendar size={14} />
                                Interview has been scheduled. Check your email for details.
                              </p>
                            </div>
                          )}

                          {/* Rejected Info */}
                          {app.status === "rejected" && (
                            <div className="mt-3 p-3 bg-red-50 border border-red-200 rounded-xl">
                              <p className="text-sm text-red-700">
                                Unfortunately, your application was not selected. Keep applying to other positions!
                              </p>
                            </div>
                          )}
                        </div>

                        {/* View Job Button */}
                        <button
                          onClick={() => navigate("/jobseeker/jobs")}
                          className="flex items-center gap-1 px-4 py-2 text-sm font-semibold text-cyan-700 bg-cyan-50 hover:bg-cyan-100 rounded-xl transition-all border border-cyan-200"
                        >
                          View Job <ChevronRight size={14} />
                        </button>
                      </div>

                      {/* Status Timeline */}
                      {app.statusHistory && app.statusHistory.length > 1 && (
                        <div className="mt-4 pt-4 border-t border-slate-100">
                          <p className="text-xs font-semibold text-slate-500 mb-2 uppercase">Status History</p>
                          <div className="flex flex-wrap gap-2">
                            {app.statusHistory.map((h, i) => {
                              const hConfig = statusConfig[h.status] || statusConfig.pending;
                              return (
                                <span key={i} className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs ${hConfig.bg} ${hConfig.color}`}>
                                  {hConfig.label} — {new Date(h.changedAt).toLocaleDateString()}
                                </span>
                              );
                            })}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* No filtered results */}
          {applications.length > 0 && filteredApps.length === 0 && (
            <div className="text-center py-12 bg-white rounded-2xl border border-slate-200">
              <Filter className="mx-auto text-slate-300" size={48} />
              <p className="text-slate-600 mt-3 font-medium">
                No applications with status "{statusConfig[activeFilter]?.label || activeFilter}"
              </p>
              <button
                onClick={() => setActiveFilter("all")}
                className="mt-3 text-cyan-600 hover:text-cyan-700 font-semibold text-sm"
              >
                Show all applications
              </button>
            </div>
          )}
        </>
      )}
    </DashboardLayout>
  );
};

export default MyApplications;
