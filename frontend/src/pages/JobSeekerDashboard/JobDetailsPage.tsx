import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import DashboardLayout from "./DashboardLayout";
import axios from "axios";
import {
  Loader,
  AlertCircle,
  ArrowLeft,
  ExternalLink,
  MapPin,
  DollarSign,
  Clock,
  Briefcase,
  BookmarkPlus,
  BookmarkCheck,
  Globe,
  CheckCircle,
} from "lucide-react";

const API_URL =
  import.meta.env.VITE_API_URL ||
  import.meta.env.VITE_API_BASE_URL ||
  "http://localhost:3000";

interface JobDetail {
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
  isRemote?: boolean;
  qualifications?: string[];
  responsibilities?: string[];
  benefits?: string[];
  companyType?: string;
  companyWebsite?: string;
}

const JobDetailsPage = () => {
  const { jobId } = useParams<{ jobId: string }>();
  const navigate = useNavigate();
  const [job, setJob] = useState<JobDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [isSaved, setIsSaved] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (jobId) {
      fetchJobDetails(decodeURIComponent(jobId));
      checkIfSaved(decodeURIComponent(jobId));
    }
  }, [jobId]);

  const fetchJobDetails = async (id: string) => {
    setLoading(true);
    setError("");
    try {
      const token = localStorage.getItem("token");
      const response = await axios.get(`${API_URL}/api/jsearch/details/${encodeURIComponent(id)}`, {
        headers: { Authorization: `Bearer ${token}` },
        timeout: 15000,
      });

      if (response.data.success) {
        setJob(response.data.data);
      } else {
        setError(response.data.error || "Failed to load job details");
      }
    } catch (err: any) {
      console.error("Job details error:", err);
      setError(err.response?.data?.error || "Failed to load job details");
    } finally {
      setLoading(false);
    }
  };

  const checkIfSaved = async (id: string) => {
    try {
      const token = localStorage.getItem("token");
      const response = await axios.get(`${API_URL}/api/jobseeker/saved-jobs`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (response.data.success) {
        const saved = response.data.data.some((j: any) => j.jobId === id);
        setIsSaved(saved);
      }
    } catch {
      // ignore
    }
  };

  const handleToggleSave = async () => {
    if (!job) return;
    const token = localStorage.getItem("token");
    setSaving(true);

    try {
      if (isSaved) {
        const response = await axios.get(`${API_URL}/api/jobseeker/saved-jobs`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        const savedJob = response.data.data?.find((j: any) => j.jobId === job.id);
        if (savedJob) {
          await axios.delete(`${API_URL}/api/jobseeker/saved-jobs/${savedJob._id}`, {
            headers: { Authorization: `Bearer ${token}` },
          });
          setIsSaved(false);
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
            applyUrl: job.applyUrl,
            logo: job.logo,
            source: "JSearch",
            postedDate: job.postedDate,
          },
          { headers: { Authorization: `Bearer ${token}` } }
        );
        setIsSaved(true);
      }
    } catch (err) {
      console.error("Toggle save error:", err);
    } finally {
      setSaving(false);
    }
  };

  const getApplyLink = () => {
    const rawLink = job?.applyUrl || (job as any)?.job_apply_link || (job as any)?.url || (job as any)?.link || (job as any)?.apply_url || "#";
    if (!rawLink || rawLink === "#") return "#";
    
    let applyLink = rawLink.trim();
    if (!applyLink.startsWith('http://') && !applyLink.startsWith('https://')) {
      if (applyLink.startsWith('//')) {
        applyLink = 'https:' + applyLink;
      } else if (applyLink.includes('.') && !applyLink.includes(' ')) {
        applyLink = 'https://' + applyLink;
      }
    }
    return applyLink;
  };


  const formatDate = (dateStr: string) => {
    try {
      const date = new Date(dateStr);
      if (isNaN(date.getTime())) return dateStr || "";
      return date.toLocaleDateString("en-US", {
        year: "numeric",
        month: "long",
        day: "numeric",
      });
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

  if (loading) {
    return (
      <DashboardLayout title="Job Details" subtitle="Loading...">
        <div className="flex items-center justify-center py-20">
          <div className="text-center">
            <Loader className="w-12 h-12 animate-spin text-cyan-600 mx-auto mb-4" />
            <p className="text-slate-600">Loading job details...</p>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  if (error || !job) {
    return (
      <DashboardLayout title="Job Details" subtitle="Error loading job">
        <div className="text-center py-20">
          <AlertCircle className="w-16 h-16 text-red-300 mx-auto mb-4" />
          <p className="text-red-600 font-semibold mb-4">{error || "Job not found"}</p>
          <button
            onClick={() => navigate("/jobseeker/find-jobs")}
            className="px-6 py-2 bg-gradient-to-r from-blue-600 to-cyan-600 text-white rounded-xl font-semibold hover:shadow-lg transition-all"
          >
            Back to Find Jobs
          </button>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout title="Job Details" subtitle={job.title}>
      {/* Back Button */}
      <button
        onClick={() => navigate(-1)}
        className="flex items-center gap-2 text-slate-600 hover:text-cyan-600 font-semibold mb-6 transition-all"
      >
        <ArrowLeft size={18} />
        Back to Jobs
      </button>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Job Header */}
          <div className="bg-white rounded-2xl p-8 shadow-lg border border-slate-200">
            <div className="flex items-start gap-6 mb-6">
              {job.logo ? (
                <img
                  src={job.logo}
                  alt={job.company}
                  className="w-20 h-20 rounded-2xl object-contain bg-slate-50 p-2 border border-slate-200"
                  onError={(e) => {
                    (e.target as HTMLImageElement).style.display = "none";
                  }}
                />
              ) : (
                <div className="w-20 h-20 bg-gradient-to-br from-slate-700 to-slate-900 rounded-2xl flex items-center justify-center text-white font-bold text-2xl flex-shrink-0">
                  {job.company?.charAt(0) || "J"}
                </div>
              )}
              <div className="flex-1">
                <h1 className="text-2xl md:text-3xl font-bold text-slate-900 mb-2">{job.title}</h1>
                <p className="text-lg font-medium text-slate-600 mb-1">{job.company}</p>
                <p className="text-slate-500">{job.location}</p>
                <div className="flex flex-wrap items-center gap-2 mt-3">
                  <span className="px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-sm font-semibold capitalize">
                    {job.type?.replace(/_/g, " ") || "Full-time"}
                  </span>
                  {job.isRemote && (
                    <span className="px-3 py-1 bg-green-100 text-green-700 rounded-full text-sm font-semibold">
                      Remote
                    </span>
                  )}
                  {job.salary && job.salary !== "Not specified" && (
                    <span className="px-3 py-1 bg-emerald-100 text-emerald-700 rounded-full text-sm font-semibold">
                      {job.salary}
                    </span>
                  )}
                  {job.postedDate && (
                    <span className="px-3 py-1 bg-slate-100 text-slate-600 rounded-full text-sm font-semibold">
                      {formatDate(job.postedDate)}
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex items-center gap-3 border-t border-slate-200 pt-6">
              <a
                href={getApplyLink()}
                target="_blank"
                rel="noopener noreferrer"
                className="flex-1 flex items-center justify-center gap-2 py-3 bg-gradient-to-r from-emerald-600 to-green-600 text-white rounded-xl font-bold hover:shadow-lg transition-all text-base cursor-pointer z-10"
              >
                <ExternalLink size={20} />
                Apply Now
              </a>
              <button
                onClick={handleToggleSave}
                disabled={saving}
                className={`px-6 py-3 rounded-xl font-semibold transition-all flex items-center gap-2 ${
                  isSaved
                    ? "bg-cyan-50 text-cyan-700 border border-cyan-300"
                    : "bg-white text-slate-700 border border-slate-300 hover:border-cyan-300"
                }`}
              >
                {saving ? (
                  <Loader size={18} className="animate-spin" />
                ) : isSaved ? (
                  <BookmarkCheck size={18} className="fill-current" />
                ) : (
                  <BookmarkPlus size={18} />
                )}
                {isSaved ? "Saved" : "Save Job"}
              </button>
            </div>
          </div>

          {/* Description */}
          <div className="bg-white rounded-2xl p-8 shadow-lg border border-slate-200">
            <h2 className="text-xl font-bold text-slate-900 mb-4">Job Description</h2>
            <div className="text-slate-700 leading-relaxed whitespace-pre-line text-sm">
              {cleanDescription(job.description)}
            </div>
          </div>

          {/* Qualifications */}
          {job.qualifications && job.qualifications.length > 0 && (
            <div className="bg-white rounded-2xl p-8 shadow-lg border border-slate-200">
              <h2 className="text-xl font-bold text-slate-900 mb-4">Qualifications</h2>
              <ul className="space-y-2">
                {job.qualifications.map((q, i) => (
                  <li key={i} className="flex items-start gap-3 text-sm text-slate-700">
                    <CheckCircle size={16} className="text-blue-500 mt-0.5 flex-shrink-0" />
                    {q}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Responsibilities */}
          {job.responsibilities && job.responsibilities.length > 0 && (
            <div className="bg-white rounded-2xl p-8 shadow-lg border border-slate-200">
              <h2 className="text-xl font-bold text-slate-900 mb-4">Responsibilities</h2>
              <ul className="space-y-2">
                {job.responsibilities.map((r, i) => (
                  <li key={i} className="flex items-start gap-3 text-sm text-slate-700">
                    <Briefcase size={16} className="text-emerald-500 mt-0.5 flex-shrink-0" />
                    {r}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Benefits */}
          {job.benefits && job.benefits.length > 0 && (
            <div className="bg-white rounded-2xl p-8 shadow-lg border border-slate-200">
              <h2 className="text-xl font-bold text-slate-900 mb-4">Benefits</h2>
              <ul className="space-y-2">
                {job.benefits.map((b, i) => (
                  <li key={i} className="flex items-start gap-3 text-sm text-slate-700">
                    <CheckCircle size={16} className="text-amber-500 mt-0.5 flex-shrink-0" />
                    {b}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Quick Info */}
          <div className="bg-white rounded-2xl p-6 shadow-lg border border-slate-200">
            <h3 className="text-lg font-bold text-slate-900 mb-4">Job Details</h3>
            <div className="space-y-4">
              {[
                { icon: Clock, label: "Posted", value: formatDate(job.postedDate) },
                { icon: Briefcase, label: "Job Type", value: job.type?.replace(/_/g, " ") || "Full-time" },
                { icon: DollarSign, label: "Salary", value: job.salary || "Not specified" },
                { icon: MapPin, label: "Location", value: job.location },
                { icon: Globe, label: "Remote", value: job.isRemote ? "Yes" : "No" },
              ].map((item, idx) => (
                <div key={idx} className="flex items-center justify-between pb-3 border-b border-slate-100 last:border-0">
                  <div className="flex items-center gap-2">
                    <item.icon size={16} className="text-slate-400" />
                    <span className="text-sm font-medium text-slate-600">{item.label}</span>
                  </div>
                  <span className="text-sm font-semibold text-slate-900 text-right max-w-[50%] truncate">
                    {item.value}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Company Info */}
          <div className="bg-white rounded-2xl p-6 shadow-lg border border-slate-200">
            <h3 className="text-lg font-bold text-slate-900 mb-4">About Company</h3>
            <div className="flex items-center gap-3 mb-4">
              {job.logo ? (
                <img
                  src={job.logo}
                  alt={job.company}
                  className="w-12 h-12 rounded-xl object-contain bg-slate-50 p-1"
                  onError={(e) => {
                    (e.target as HTMLImageElement).style.display = "none";
                  }}
                />
              ) : (
                <div className="w-12 h-12 bg-gradient-to-br from-slate-700 to-slate-900 rounded-xl flex items-center justify-center text-white font-bold">
                  {job.company?.charAt(0) || "C"}
                </div>
              )}
              <div>
                <h4 className="font-semibold text-slate-900">{job.company}</h4>
                {job.companyType && (
                  <p className="text-slate-500 text-sm capitalize">{job.companyType}</p>
                )}
              </div>
            </div>
            {job.companyWebsite && (
              <a
                href={job.companyWebsite}
                target="_blank"
                rel="noopener noreferrer"
                className="text-cyan-600 hover:text-cyan-700 text-sm font-semibold flex items-center gap-1"
              >
                <Globe size={14} />
                Visit Website
              </a>
            )}
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
};

export default JobDetailsPage;
