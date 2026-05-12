import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
// useAuth import removed
import axios from "axios";
import {
  Briefcase,
  ArrowLeft,
  MapPin,
  DollarSign,
  Clock,
  ExternalLink,
  Filter,
  Search,
  TrendingUp,
  Building,
  Users,
  Star,
  Loader,
  Heart,
} from "lucide-react";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:3000";

interface Job {
  _id: string;
  title: string;
  company: string;
  location: string;
  companyLogoUrl?: string;
  companyDescription?: string;
  companyWebsite?: string;
  companyLocation?: string;
  salary?: string;
  type?: string;
  experience?: string;
  description: string;
  requirements?: string[];
  matchScore: number;
  postedDate?: string;
  industry?: string;
  applied?: boolean;
  saved?: boolean;
}

const JobRecommendations = () => {
  const [jobs, setJobs] = useState<Job[]>([]);
  const [filteredJobs, setFilteredJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState(true);
  const [hasResume, setHasResume] = useState(false);
  const [savedJobMap, setSavedJobMap] = useState<Record<string, string>>({});
  const [searchTerm, setSearchTerm] = useState("");
  const [filterType, setFilterType] = useState("all");
  const [sortBy, setSortBy] = useState("match");
  const navigate = useNavigate();

  useEffect(() => {
    fetchJobs();
  }, []);

  useEffect(() => {
    filterAndSortJobs();
  }, [jobs, searchTerm, filterType, sortBy]);

  const fetchSavedJobs = async (token: string) => {
    try {
      const response = await axios.get(`${API_URL}/api/jobseeker/saved-jobs`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const savedMap: Record<string, string> = {};
      (response.data.data || []).forEach((saved: any) => {
        if (saved.jobId) savedMap[saved.jobId] = saved._id;
      });
      setSavedJobMap(savedMap);
      setJobs((prev) => prev.map((job) => ({ ...job, saved: !!savedMap[job._id] })));
    } catch (err: any) {
      console.error("Failed to load saved jobs:", err.response?.data?.message || err.message);
    }
  };

  const fetchJobs = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem("token");
      if (!token) {
        setHasResume(false);
        setJobs([]);
        return;
      }
      const resumeResponse = await axios.get(`${API_URL}/api/jobseeker/my-resumes`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      const resumes = resumeResponse.data?.data?.resumes || [];
      if (resumes.length === 0) {
        setHasResume(false);
        setSavedJobMap({});
        setJobs([]);
        return;
      }

      const latestResume = resumes[0];
      setHasResume(true);

      const jobsResponse = await axios.get(`${API_URL}/api/jobs/active`, {
        params: { resumeId: latestResume._id },
        headers: { Authorization: `Bearer ${token}` },
      });

      const portalJobs = jobsResponse.data?.data?.jobs || [];
      const normalizedJobs = portalJobs.map((job: any) => ({
        ...job,
        matchScore: job.matchScore || 0,
        applied: false,
        saved: false,
      }));

      setJobs(normalizedJobs);
      await fetchSavedJobs(token);
    } catch (err: any) {
      console.error(err.response?.data?.message || "Failed to load jobs");
    } finally {
      setLoading(false);
    }
  };

  const filterAndSortJobs = () => {
    let filtered = [...jobs];

    // Apply search
    if (searchTerm) {
      filtered = filtered.filter(
        (job) =>
          job.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
          job.company.toLowerCase().includes(searchTerm.toLowerCase()) ||
          job.location.toLowerCase().includes(searchTerm.toLowerCase()) ||
          job.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
          job.companyDescription?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // Apply filter
    if (filterType !== "all") {
      filtered = filtered.filter((job) => job.type === filterType);
    }

    // Apply sort
    filtered.sort((a, b) => {
      if (sortBy === "match") return (b.matchScore || 0) - (a.matchScore || 0);
      if (sortBy === "recent") {
        const dateA = a.postedDate ? new Date(a.postedDate).getTime() : 0;
        const dateB = b.postedDate ? new Date(b.postedDate).getTime() : 0;
        return dateB - dateA;
      }
      return 0;
    });

    setFilteredJobs(filtered);
  };

  const handleSaveJob = async (job: Job) => {
    try {
      const token = localStorage.getItem("token");
      const existingSavedId = savedJobMap[job._id];

      if (existingSavedId) {
        await axios.delete(`${API_URL}/api/jobseeker/saved-jobs/${existingSavedId}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        setSavedJobMap((prev) => {
          const next = { ...prev };
          delete next[job._id];
          return next;
        });
        setJobs((prev) => prev.map((j) => (j._id === job._id ? { ...j, saved: false } : j)));
        return;
      }

      const response = await axios.post(
        `${API_URL}/api/jobseeker/saved-jobs`,
        {
          jobId: job._id,
          title: job.title,
          company: job.company,
          location: job.location,
          type: job.type || "Full-time",
          salary: job.salary || "Not specified",
          description: job.description || "",
          applyUrl: "#",
          logo: job.companyLogoUrl || null,
          source: "Portal",
          postedDate: job.postedDate || "",
        },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      const savedId = response.data?.data?._id;
      setSavedJobMap((prev) => ({ ...prev, [job._id]: savedId }));
      setJobs((prev) => prev.map((j) => (j._id === job._id ? { ...j, saved: true } : j)));
    } catch (err: any) {
      console.error("Failed to save job:", err.response?.data?.message || err.message);
    }
  };

  const handleApplyJob = async (jobId: string) => {
    try {
      const token = localStorage.getItem("token");
      await axios.post(
        `${API_URL}/api/jobs/${jobId}/apply`,
        {},
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );
      setJobs((prev) => prev.map((job) => (job._id === jobId ? { ...job, applied: true } : job)));
    } catch (err: any) {
      console.error("Failed to apply:", err.response?.data?.message || err.message);
    }
  };

  const getMatchColor = (score: number) => {
    if (score >= 80) return "text-green-600 bg-green-100";
    if (score >= 60) return "text-yellow-600 bg-yellow-100";
    return "text-red-600 bg-red-100";
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 flex items-center justify-center">
        <div className="text-center">
          <Loader className="w-12 h-12 animate-spin text-blue-600 mx-auto mb-4" />
          <p className="text-gray-600">Loading job recommendations...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <button
            onClick={() => navigate("/jobseeker/dashboard")}
            className="flex items-center text-gray-600 hover:text-gray-900 mb-4 transition-colors"
          >
            <ArrowLeft className="w-5 h-5 mr-2" />
            Back to Dashboard
          </button>
          <h1 className="text-4xl font-bold text-gray-900 mb-2">
            Job Recommendations
          </h1>
          <p className="text-gray-600">
            AI-powered job matches based on your resume and preferences
          </p>
        </div>

        {!hasResume ? (
          <div className="bg-white rounded-2xl shadow-lg p-12 text-center">
            <Briefcase className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-gray-900 mb-2">
              Upload a Resume to Get Recommendations
            </h3>
            <p className="text-gray-600 mb-6">
              We will analyze your resume and recommend the best matching jobs.
            </p>
            <button
              onClick={() => navigate("/jobseeker/upload")}
              className="px-6 py-3 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-xl font-semibold hover:shadow-lg"
            >
              Upload Resume
            </button>
          </div>
        ) : (
          <>
            {/* Search and Filters */}
            <div className="bg-white rounded-2xl shadow-lg p-6 mb-8">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {/* Search */}
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <input
                    type="text"
                    placeholder="Search jobs, companies, locations..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>

                {/* Filter */}
                <div className="relative">
                  <Filter className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <select
                    value={filterType}
                    onChange={(e) => setFilterType(e.target.value)}
                    className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent appearance-none"
                  >
                    <option value="all">All Job Types</option>
                    <option value="Full-time">Full-time</option>
                    <option value="Part-time">Part-time</option>
                    <option value="Contract">Contract</option>
                    <option value="Remote">Remote</option>
                  </select>
                </div>

                {/* Sort */}
                <div className="relative">
                  <TrendingUp className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <select
                    value={sortBy}
                    onChange={(e) => setSortBy(e.target.value)}
                    className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent appearance-none"
                  >
                    <option value="match">Best Match</option>
                    <option value="recent">Most Recent</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Results Count */}
            <div className="mb-6">
              <p className="text-gray-600">
                Showing <span className="font-semibold">{filteredJobs.length}</span>{" "}
                job{filteredJobs.length !== 1 ? "s" : ""}
              </p>
            </div>

            {/* Job Cards */}
            <div className="space-y-6">
              {filteredJobs.map((job) => (
                <div
                  key={job._id}
                  className="bg-white rounded-2xl shadow-lg hover:shadow-xl transition-all overflow-hidden border border-gray-100"
                >
                  <div className="p-6">
                    {/* Header */}
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          {job.companyLogoUrl ? (
                            <img
                              src={job.companyLogoUrl}
                              alt={job.company}
                              className="w-10 h-10 rounded-lg object-cover border border-gray-200"
                            />
                          ) : (
                            <div className="w-10 h-10 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
                              <Building className="w-5 h-5" />
                            </div>
                          )}
                          <h3 className="text-2xl font-bold text-gray-900">
                            {job.title}
                          </h3>
                          <span
                            className={`px-3 py-1 rounded-full text-sm font-semibold ${getMatchColor(
                              job.matchScore
                            )}`}
                          >
                            {job.matchScore}% Match
                          </span>
                        </div>
                        <div className="flex items-center gap-4 text-gray-600">
                          <div className="flex items-center">
                            <Building className="w-4 h-4 mr-2" />
                            {job.company}
                          </div>
                          <div className="flex items-center">
                            <MapPin className="w-4 h-4 mr-2" />
                            {job.location}
                          </div>
                        </div>
                      </div>
                      <button
                        onClick={() => handleSaveJob(job)}
                        className={`p-3 rounded-xl transition-all ${
                          job.saved
                            ? "bg-red-100 text-red-600"
                            : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                        }`}
                      >
                        <Heart
                          className={`w-5 h-5 ${job.saved ? "fill-current" : ""}`}
                        />
                      </button>
                    </div>

                    {/* Details */}
                    <div className="flex flex-wrap gap-4 mb-4">
                      {job.salary && (
                        <div className="flex items-center text-gray-600">
                          <DollarSign className="w-4 h-4 mr-2" />
                          {job.salary}
                        </div>
                      )}
                      {job.type && (
                        <div className="flex items-center text-gray-600">
                          <Briefcase className="w-4 h-4 mr-2" />
                          {job.type}
                        </div>
                      )}
                      {job.experience && (
                        <div className="flex items-center text-gray-600">
                          <Users className="w-4 h-4 mr-2" />
                          {job.experience}
                        </div>
                      )}
                      {job.postedDate && (
                        <div className="flex items-center text-gray-600">
                          <Clock className="w-4 h-4 mr-2" />
                          {new Date(job.postedDate).toLocaleDateString()}
                        </div>
                      )}
                    </div>

                    {/* Description */}
                    <p className="text-gray-700 mb-4 line-clamp-2">
                      {job.description || "No description provided."}
                    </p>

                    {/* Requirements */}
                    {job.requirements && job.requirements.length > 0 && (
                      <div className="mb-4">
                        <p className="text-sm font-semibold text-gray-900 mb-2">
                          Key Requirements:
                        </p>
                        <div className="flex flex-wrap gap-2">
                          {job.requirements.slice(0, 5).map((req, index) => (
                            <span
                              key={index}
                              className="px-3 py-1 bg-blue-50 text-blue-700 rounded-full text-sm border border-blue-200"
                            >
                              {req}
                            </span>
                          ))}
                          {job.requirements.length > 5 && (
                            <span className="px-3 py-1 bg-gray-100 text-gray-600 rounded-full text-sm">
                              +{job.requirements.length - 5} more
                            </span>
                          )}
                        </div>
                      </div>
                    )}

                    {/* Actions */}
                    <div className="flex gap-3">
                      <button
                        onClick={() => handleApplyJob(job._id)}
                        disabled={job.applied}
                        className={`flex-1 py-3 rounded-xl font-semibold transition-all ${
                          job.applied
                            ? "bg-green-100 text-green-700 cursor-not-allowed"
                            : "bg-gradient-to-r from-blue-600 to-purple-600 text-white hover:shadow-lg"
                        }`}
                      >
                        {job.applied ? (
                          <>
                            <Star className="w-5 h-5 inline mr-2" />
                            Applied
                          </>
                        ) : (
                          "Apply Now"
                        )}
                      </button>
                      <button className="px-6 py-3 border-2 border-gray-300 text-gray-700 rounded-xl hover:bg-gray-50 transition-all font-semibold">
                        <ExternalLink className="w-5 h-5 inline mr-2" />
                        View Details
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {filteredJobs.length === 0 && (
              <div className="bg-white rounded-2xl shadow-lg p-12 text-center">
                <Briefcase className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                <h3 className="text-xl font-semibold text-gray-900 mb-2">
                  No Jobs Found
                </h3>
                <p className="text-gray-600">
                  Try adjusting your search criteria or check back later for new matches.
                </p>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default JobRecommendations;
