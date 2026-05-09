import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import DashboardLayout from "./DashboardLayout";
import {
  Upload,
  Brain,
  Briefcase,
  FileText,
  CheckCircle,
  AlertCircle,
  Sparkles,
  ChevronRight,
  Zap,
  BarChart3,
  Globe,
  Loader,
  ExternalLink,
  MapPin,
  TrendingUp,
  Award,
  Crown,
} from "lucide-react";

const API_URL = import.meta.env.VITE_API_URL || import.meta.env.VITE_API_BASE_URL || "http://localhost:3000";

const JobSeekerDashboard = () => {
  const navigate = useNavigate();
  const { user } = useAuth();

  const [resumeData, setResumeData] = useState<any>(null);
  const [matchingJobs, setMatchingJobs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [jobsLoading, setJobsLoading] = useState(false);

  const userName = user?.name || "User";

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      const token = localStorage.getItem("token");
      const response = await fetch(`${API_URL}/api/jobseeker/my-resumes`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await response.json();

      if (data.success && data.data?.resumes?.length > 0) {
        const latestResume = data.data.resumes[0];
        setResumeData(latestResume);

        // Check for cached jobs first (avoid re-fetching)
        const cachedJobs = localStorage.getItem('veriresume_cached_jobs');
        const cachedTimestamp = localStorage.getItem('veriresume_jobs_timestamp');
        const cacheAge = cachedTimestamp ? Date.now() - parseInt(cachedTimestamp) : Infinity;
        
        if (cachedJobs && cacheAge < 30 * 60 * 1000) { // 30 min cache
          try {
            const jobs = JSON.parse(cachedJobs);
            if (jobs.length > 0) {
              setMatchingJobs(jobs);
              return;
            }
          } catch (e) {}
        }
        
        // No valid cache, fetch from API
        fetchMatchingJobs(latestResume._id);
      }
    } catch (err) {
      console.error("Dashboard data error:", err);
    } finally {
      setLoading(false);
    }
  };

  const fetchMatchingJobs = async (resumeId: string) => {
    setJobsLoading(true);
    try {
      const token = localStorage.getItem("token");
      const response = await fetch(`${API_URL}/api/jobseeker/find-matching-jobs`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ resumeId }),
      });
      const data = await response.json();
      if (data.success) {
        const jobs = data.data?.allMatchingJobs || [];
        setMatchingJobs(jobs);
        // Cache results
        localStorage.setItem('veriresume_cached_jobs', JSON.stringify(jobs));
        localStorage.setItem('veriresume_jobs_timestamp', Date.now().toString());
      }
    } catch (err) {
      console.error("Job matching error:", err);
    } finally {
      setJobsLoading(false);
    }
  };

  const analysis = resumeData?.aiAnalysis || resumeData?.completeAnalysis || {};
  const atsScore = analysis.atsScore || analysis.ats_score || 0;
  const grammarScore = analysis.grammarScore || analysis.grammar_score || 0;
  const readabilityScore = analysis.readability || analysis.readability_score || 0;
  const structureScore = analysis.structureScore || analysis.structure_score || 0;
  const overallScore = atsScore
    ? Math.round(atsScore * 0.35 + grammarScore * 0.20 + readabilityScore * 0.20 + structureScore * 0.25)
    : 0;
  const hasResume = !!resumeData;
  const resumeFileName = resumeData?.originalFileName || resumeData?.originalFile || '';
  const skills = resumeData?.parsedData?.skills || [];
  const recommendedKeywords = resumeData?.aiAnalysis?.recommendedKeywords || 
    resumeData?.completeAnalysis?.recommended_keywords || [];
  const weaknesses = analysis.weaknesses || [];
  const suggestions = analysis.suggestions || [];

  if (loading) {
    return (
      <DashboardLayout title="Dashboard" subtitle={`Welcome back, ${userName}!`}>
        <div className="flex items-center justify-center h-96">
          <Loader className="animate-spin text-cyan-600" size={48} />
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout title="Dashboard" subtitle={`Welcome back, ${userName}!`}>
      {/* Upload CTA */}
      <div className="mb-8">
        <div className="bg-gradient-to-r from-cyan-600 to-blue-600 rounded-2xl p-8 text-white flex items-center justify-between shadow-lg">
          <div>
            <h2 className="text-2xl font-bold mb-2 flex items-center gap-2">
              <Upload size={28} />
              {hasResume ? "Resume Uploaded" : "Upload Your Resume"}
            </h2>
            <p className="text-blue-100">
              {hasResume && resumeFileName ? (
                <>
                  <FileText size={16} className="inline mr-1" />
                  <span className="font-semibold">{resumeFileName}</span> — AI analyzed and ready
                </>
              ) : (
                "Get instant ATS compatibility score, AI analysis, and personalized job recommendations"
              )}
            </p>
          </div>
          <button
            onClick={() => navigate("/jobseeker/upload")}
            className="px-8 py-4 bg-white text-cyan-600 rounded-xl font-bold hover:bg-blue-50 transition-all shadow-lg hover:shadow-xl flex items-center gap-2 text-lg whitespace-nowrap ml-4"
          >
            <Upload size={24} />
            {hasResume ? "Upload New" : "Upload Resume"}
          </button>
        </div>
      </div>

      {/* Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <div className="bg-white rounded-2xl p-6 border border-slate-200 hover:border-cyan-400 transition-all hover:shadow-lg">
          <div className="flex items-center justify-between mb-4">
            <div className="bg-gradient-to-br from-blue-100 to-cyan-100 p-3 rounded-xl">
              <FileText className="text-blue-600" size={24} />
            </div>
            <span className="text-3xl font-bold text-slate-900">{hasResume ? overallScore : "--"}</span>
          </div>
          <h3 className="text-slate-600 mb-2">Resume Score</h3>
          <div className="w-full bg-slate-200 rounded-full h-2">
            <div className="bg-gradient-to-r from-blue-600 to-cyan-600 h-2 rounded-full transition-all" style={{ width: `${overallScore}%` }}></div>
          </div>
        </div>

        <div className="bg-white rounded-2xl p-6 border border-slate-200 hover:border-cyan-400 transition-all hover:shadow-lg">
          <div className="flex items-center justify-between mb-4">
            <div className="bg-gradient-to-br from-green-100 to-emerald-100 p-3 rounded-xl">
              <CheckCircle className="text-green-600" size={24} />
            </div>
            {hasResume ? (
              <span className={`text-sm px-3 py-1 rounded-full font-semibold ${
                atsScore >= 70 ? "bg-green-100 text-green-700" : atsScore >= 50 ? "bg-yellow-100 text-yellow-700" : "bg-red-100 text-red-700"
              }`}>
                {atsScore >= 70 ? "Compatible" : atsScore >= 50 ? "Needs Work" : "Low"}
              </span>
            ) : (
              <span className="text-sm px-3 py-1 bg-slate-100 text-slate-500 rounded-full font-semibold">N/A</span>
            )}
          </div>
          <h3 className="text-slate-600 mb-2">ATS Compatibility</h3>
          <p className="text-sm text-slate-500">
            {hasResume ? (atsScore >= 70 ? "Your resume passes ATS systems" : "Improve your resume for ATS") : "Upload resume to check"}
          </p>
        </div>

        <div className="bg-white rounded-2xl p-6 border border-slate-200 hover:border-cyan-400 transition-all hover:shadow-lg cursor-pointer" onClick={() => navigate("/jobseeker/jobs")}>
          <div className="flex items-center justify-between mb-4">
            <div className="bg-gradient-to-br from-cyan-100 to-blue-100 p-3 rounded-xl">
              <Briefcase className="text-cyan-600" size={24} />
            </div>
            <span className="text-3xl font-bold text-slate-900">{matchingJobs.length || "--"}</span>
          </div>
          <h3 className="text-slate-600 mb-2">Job Matches</h3>
          <p className="text-sm text-cyan-600 font-semibold flex items-center gap-1">View all <ChevronRight size={16} /></p>
        </div>

        <div className="bg-gradient-to-br from-amber-50 to-yellow-50 rounded-2xl p-6 border-2 border-amber-200">
          <div className="flex items-center justify-between mb-4">
            <div className="bg-white p-3 rounded-xl">{user?.isPremium ? <Crown className="text-amber-600" size={24} /> : <Sparkles className="text-amber-600" size={24} />}</div>
            <Award className="text-amber-600" size={32} />
          </div>
          <h3 className="text-slate-600 mb-2">Premium Status</h3>
          {user?.isPremium ? (
            <div>
              <p className="text-sm text-amber-700 font-semibold flex items-center gap-1 mb-2"><CheckCircle size={14} /> Active</p>
              <button onClick={() => navigate("/jobseeker/premium")} className="text-sm px-4 py-2 bg-amber-600 text-white rounded-lg font-semibold hover:bg-amber-700 transition-all">
                Manage Plan
              </button>
            </div>
          ) : (
            <button onClick={() => navigate("/jobseeker/premium")} className="text-sm px-4 py-2 bg-amber-600 text-white rounded-lg font-semibold hover:bg-amber-700 transition-all">
              Upgrade Now
            </button>
          )}
        </div>
      </div>

      {/* AI Analysis & Metrics */}
      <div className="grid lg:grid-cols-3 gap-6 mb-8">
        <div className="lg:col-span-2 bg-white rounded-2xl p-6 border border-slate-200">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
              <Brain className="text-cyan-600" size={24} /> AI Resume Analysis
            </h2>
            <button onClick={() => navigate("/jobseeker/analysis")} className="px-4 py-2 bg-cyan-100 text-cyan-700 rounded-lg font-semibold hover:bg-cyan-200 transition-all text-sm">
              View Full Analysis
            </button>
          </div>

          {!hasResume ? (
            <div className="text-center py-12 bg-slate-50 rounded-xl border border-slate-200">
              <FileText className="mx-auto text-slate-300 mb-3" size={48} />
              <p className="text-slate-600 font-semibold mb-2">No Resume Uploaded Yet</p>
              <p className="text-sm text-slate-500 mb-4">Upload your resume to get AI-powered analysis</p>
              <button onClick={() => navigate("/jobseeker/upload")} className="px-6 py-2 bg-cyan-600 text-white rounded-lg font-semibold hover:bg-cyan-700 transition-all">Upload Resume</button>
            </div>
          ) : (
            <>
              <div className="space-y-4">
                {weaknesses.length > 0 ? weaknesses.slice(0, 3).map((item: string, idx: number) => (
                  <div key={idx} className={`flex gap-3 p-4 rounded-xl ${idx === 0 ? "bg-red-50 border border-red-200" : idx === 1 ? "bg-yellow-50 border border-yellow-200" : "bg-blue-50 border border-blue-200"}`}>
                    {idx === 0 ? <AlertCircle className="text-red-600 flex-shrink-0" size={20} /> : idx === 1 ? <AlertCircle className="text-yellow-600 flex-shrink-0" size={20} /> : <Zap className="text-blue-600 flex-shrink-0" size={20} />}
                    <p className="text-slate-700 text-sm">{item}</p>
                  </div>
                )) : suggestions.length > 0 ? suggestions.slice(0, 3).map((item: string, idx: number) => (
                  <div key={idx} className="flex gap-3 p-4 rounded-xl bg-blue-50 border border-blue-200">
                    <Zap className="text-blue-600 flex-shrink-0" size={20} />
                    <p className="text-slate-700 text-sm">{item}</p>
                  </div>
                )) : (
                  <div className="flex gap-3 p-4 rounded-xl bg-green-50 border border-green-200">
                    <CheckCircle className="text-green-600 flex-shrink-0" size={20} />
                    <p className="text-slate-700 text-sm">Your resume looks good! Consider adding more quantifiable achievements.</p>
                  </div>
                )}
              </div>
              <div className="mt-6 p-4 bg-gradient-to-br from-cyan-50 to-blue-50 rounded-xl border border-cyan-200">
                <p className="text-sm font-semibold text-slate-900 mb-2">Pro Tip</p>
                <p className="text-sm text-slate-600">Add quantifiable achievements like "Increased sales by 40%" to boost your score by 15 points!</p>
              </div>
              <button onClick={() => navigate("/jobseeker/enhanced")} className="mt-6 w-full bg-gradient-to-r from-blue-600 to-cyan-600 text-white py-3 rounded-xl font-semibold hover:from-blue-700 hover:to-cyan-700 transition-all flex items-center justify-center gap-2">
                <Sparkles size={20} /> Enhance with AI
              </button>
            </>
          )}
        </div>

        <div className="bg-white rounded-2xl p-6 border border-slate-200">
          <h3 className="text-lg font-bold text-slate-900 mb-6 flex items-center gap-2">
            <BarChart3 className="text-cyan-600" size={20} /> Resume Metrics
          </h3>
          {!hasResume ? (
            <div className="text-center py-12">
              <BarChart3 className="mx-auto text-slate-300 mb-3" size={40} />
              <p className="text-slate-500 text-sm">Upload resume to see metrics</p>
            </div>
          ) : (
            <div className="space-y-6">
              {[
                { label: "Structure", score: structureScore, color: "from-blue-600 to-cyan-600" },
                { label: "Grammar", score: grammarScore, color: "from-green-600 to-emerald-600" },
                { label: "Readability", score: readabilityScore, color: "from-amber-600 to-yellow-600" },
                { label: "ATS Score", score: atsScore, color: "from-cyan-600 to-blue-600" },
              ].map((metric, idx) => (
                <div key={idx}>
                  <div className="flex justify-between text-sm mb-2">
                    <span className="text-slate-600 font-medium">{metric.label}</span>
                    <span className="text-slate-900 font-bold">{metric.score}%</span>
                  </div>
                  <div className="w-full bg-slate-200 rounded-full h-3">
                    <div className={`bg-gradient-to-r ${metric.color} h-3 rounded-full transition-all`} style={{ width: `${metric.score}%` }}></div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Skills */}
      {hasResume && skills.length > 0 && (
        <div className="bg-white rounded-2xl p-6 border border-slate-200 mb-8">
          <h3 className="text-lg font-bold text-slate-900 mb-4 flex items-center gap-2">
            <TrendingUp className="text-cyan-600" size={20} /> Skills Detected
          </h3>
          <div className="flex flex-wrap gap-2">
            {skills.slice(0, 15).map((skill: string, idx: number) => (
              <span key={idx} className="px-4 py-2 bg-gradient-to-r from-cyan-50 to-blue-50 text-cyan-700 rounded-full text-sm font-semibold border border-cyan-200">{skill}</span>
            ))}
          </div>
        </div>
      )}

      {/* Recommended Job Keywords from AI */}
      {hasResume && recommendedKeywords.length > 0 && (
        <div className="bg-white rounded-2xl p-6 border border-slate-200 mb-8">
          <h3 className="text-lg font-bold text-slate-900 mb-2 flex items-center gap-2">
            <Sparkles className="text-amber-500" size={20} /> AI Recommended Keywords
          </h3>
          <p className="text-sm text-slate-500 mb-4">Based on your resume analysis, these keywords best match your profile for job searches</p>
          <div className="flex flex-wrap gap-2">
            {recommendedKeywords.slice(0, 20).map((keyword: string, idx: number) => (
              <span key={idx} className="px-4 py-2 bg-gradient-to-r from-amber-50 to-yellow-50 text-amber-700 rounded-full text-sm font-semibold border border-amber-200">{keyword}</span>
            ))}
          </div>
        </div>
      )}

      {/* Job Matches Preview */}
      <div className="bg-white rounded-2xl p-6 border border-slate-200 mb-8">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
            <Globe className="text-cyan-600" size={24} /> Jobs Matching Your Resume
          </h2>
          <button onClick={() => navigate("/jobseeker/jobs")} className="px-4 py-2 bg-cyan-100 text-cyan-700 rounded-lg font-semibold hover:bg-cyan-200 transition-all text-sm flex items-center gap-1">
            View All <ChevronRight size={16} />
          </button>
        </div>

        {!hasResume ? (
          <div className="text-center py-12 bg-blue-50 rounded-xl border-2 border-blue-200">
            <Upload size={40} className="mx-auto text-blue-400 mb-3" />
            <p className="text-slate-600 font-bold text-lg">No Resume Found</p>
            <button onClick={() => navigate("/jobseeker/upload")} className="mt-4 px-6 py-2 bg-cyan-600 text-white rounded-lg font-semibold hover:bg-cyan-700 transition-all">Upload Your Resume</button>
          </div>
        ) : jobsLoading ? (
          <div className="flex flex-col items-center justify-center py-16 bg-gradient-to-br from-cyan-50 to-blue-50 rounded-xl border-2 border-dashed border-cyan-300">
            <Loader size={50} className="text-cyan-600 animate-spin mb-4" />
            <p className="text-slate-600 font-bold text-lg">Searching jobs across platforms...</p>
          </div>
        ) : matchingJobs.length === 0 ? (
          <div className="text-center py-12 bg-amber-50 rounded-xl border-2 border-amber-200">
            <AlertCircle size={40} className="mx-auto text-amber-500 mb-3" />
            <p className="text-slate-600 font-bold">No jobs found yet</p>
            <button onClick={() => resumeData && fetchMatchingJobs(resumeData._id)} className="mt-4 px-6 py-2 bg-amber-600 text-white rounded-lg font-semibold hover:bg-amber-700 transition-all">Refresh</button>
          </div>
        ) : (() => {
          // Deduplicate jobs by normalized title + company
          const seen = new Set<string>();
          const uniqueJobs = matchingJobs.filter((job: any) => {
            const key = `${(job.title || '').toLowerCase().trim()}|${(job.company || '').toLowerCase().trim()}`;
            if (seen.has(key)) return false;
            seen.add(key);
            return true;
          });
          return (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
            {uniqueJobs.slice(0, 6).map((job: any, idx: number) => {
              const platform = (job.source || job.platform || 'unknown').toLowerCase();
              const platformLabel = platform.charAt(0).toUpperCase() + platform.slice(1);
              const platformColor = platform === 'indeed' ? 'bg-indigo-100 text-indigo-700' :
                platform === 'glassdoor' ? 'bg-emerald-100 text-emerald-700' :
                platform === 'remotive' ? 'bg-blue-100 text-blue-700' :
                platform === 'jobicy' ? 'bg-purple-100 text-purple-700' :
                platform === 'arbeitnow' ? 'bg-teal-100 text-teal-700' :
                platform === 'usajobs' ? 'bg-red-100 text-red-700' : 'bg-slate-100 text-slate-600';
              return (
                <a key={idx} href={job.url || "#"} target="_blank" rel="noopener noreferrer" className="border border-slate-200 rounded-xl p-4 hover:border-cyan-400 hover:shadow-lg transition-all group">
                  <div className="flex items-start justify-between mb-2">
                    <h4 className="font-bold text-slate-900 group-hover:text-cyan-600 text-sm flex-1">{job.title}</h4>
                    <ExternalLink size={14} className="text-slate-400 group-hover:text-cyan-600 flex-shrink-0 ml-2" />
                  </div>
                  <p className="text-slate-600 text-xs mb-2">{job.company}</p>
                  <div className="flex items-center gap-1 text-xs text-slate-500 mb-3">
                    <MapPin size={12} /><span>{job.location}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-xs font-semibold text-cyan-600">{job.matchScore || 0}% Match</span>
                    <span className={`text-xs px-2 py-1 rounded-full font-semibold ${platformColor}`}>{platformLabel}</span>
                  </div>
                </a>
              );
            })}
          </div>
          );
        })()}
      </div>

      {/* Premium CTA */}
      {!user?.isPremium && (
      <div className="bg-gradient-to-br from-blue-900 via-cyan-900 to-blue-900 rounded-2xl p-8 text-white text-center relative overflow-hidden">
        <div className="absolute inset-0 opacity-20">
          <div className="absolute top-0 right-0 w-64 h-64 bg-cyan-400 rounded-full filter blur-3xl"></div>
          <div className="absolute bottom-0 left-0 w-64 h-64 bg-blue-400 rounded-full filter blur-3xl"></div>
        </div>
        <div className="relative">
          <Sparkles className="mx-auto mb-4 text-cyan-300" size={48} />
          <h2 className="text-3xl font-bold mb-3">Upgrade to Premium</h2>
          <p className="text-blue-100 mb-6 text-lg">Get AI-powered resume enhancement, priority job matches, and more</p>
          <button onClick={() => navigate("/jobseeker/premium")} className="bg-cyan-500 hover:bg-cyan-400 text-white px-8 py-4 rounded-xl font-semibold text-lg transition-all shadow-lg">Upgrade Now</button>
        </div>
      </div>
      )}
    </DashboardLayout>
  );
};

export default JobSeekerDashboard;
