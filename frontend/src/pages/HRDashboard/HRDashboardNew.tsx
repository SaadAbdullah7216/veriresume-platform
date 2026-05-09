import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import axios from "axios";
import {
  Home,
  Upload,
  BarChart2,
  AlertTriangle,
  FileText,
  Menu,
  LogOut,
  Loader,
  CheckCircle,
  XCircle,
  TrendingUp,
  Shield,
  Brain,
  Plus,
  Briefcase,
  Edit2,
  Trash2,
  Search,
  Clock,
  MapPin,
  DollarSign,
  Send,
  X,
  Eye,
} from "lucide-react";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:3000";

interface Resume {
  _id: string;
  originalFile: string;
  originalFileName?: string;
  parsedData: {
    name: string;
    email: string;
    phone: string;
    skills: string[];
    experience: any[];
    education: any[];
  };
  aiAnalysis: {
    atsScore: number;
  };
  decisionStatus?: string;
  decisionReason?: string;
  atsThresholdUsed?: number;
  lastScreeningDate?: string;
  lastScreeningJobId?: { _id: string; title: string; company: string } | null;
  createdAt: string;
  status?: string;
  anomalyDetection?: any;
  matchScore?: number;
  qualityScore?: number;
}

interface AnomalyReport {
  _id: string;
  resume: {
    _id: string;
    parsedData: {
      name: string;
      email: string;
    };
  };
  riskScore: number;
  riskLevel: string;
  indicators: string[];
  duplicates: string[];
  status: string;
  createdAt: string;
}

interface Match {
  _id: string;
  resume: {
    _id: string;
    originalFile?: string;
    originalFileName?: string;
    parsedData: {
      name: string;
      email: string;
      phone: string;
    };
  };
  matchScore: number;
  rank: number;
  strengths: string[];
  weaknesses: string[];
}

interface Job {
  _id: string;
  title: string;
  company: string;
  location: string;
  type: string;
  salary: string;
  description: string;
  requirements: string[];
  responsibilities: string[];
  benefits: string[];
  status: string;
  applicants: number;
  postedBy: string;
  createdAt: string;
  updatedAt: string;
}

interface ReceivedApplication {
  _id: string;
  jobSeeker: { _id: string; name: string; email: string };
  job: { _id: string; title: string; company: string; location: string; type: string };
  resume: {
    _id: string;
    originalFile?: string;
    originalFileName?: string;
    parsedData?: { name?: string; email?: string; skills?: string[] };
    aiAnalysis?: { atsScore?: number };
    decisionStatus?: string;
  };
  status: string;
  matchScore: number;
  appliedAt: string;
  updatedAt: string;
}

const HRDashboardNew = () => {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [activeSection, setActiveSection] = useState("dashboard");
  const navigate = useNavigate();
  const { user, logout } = useAuth();

  // State
  const [resumes, setResumes] = useState<Resume[]>([]);
  const [anomalyReports, setAnomalyReports] = useState<AnomalyReport[]>([]);
  const [rankings, setRankings] = useState<Match[]>([]);
  const [jobs, setJobs] = useState<Job[]>([]);
  const [receivedApplications, setReceivedApplications] = useState<ReceivedApplication[]>([]);
  const [appStatusFilter, setAppStatusFilter] = useState<string>("all");
  const [jobDescription, setJobDescription] = useState("");
  const [selectedJob, setSelectedJob] = useState<string>("");
  const [selectedResumes, setSelectedResumes] = useState<string[]>([]);
  const [uploadingResumes, setUploadingResumes] = useState(false);
  const [, setDetectingAnomalies] = useState(false);
  const [rankingResumes, setRankingResumes] = useState(false);
  const [runningAIScreening, setRunningAIScreening] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [showJobModal, setShowJobModal] = useState(false);
  const [editingJob, setEditingJob] = useState<Job | null>(null);
  const [resumeFilter, setResumeFilter] = useState<"all" | "verified" | "shortlisted" | "needs_review" | "rejected" | "flagged">("all");
  const [jobFilter, setJobFilter] = useState<"all" | "active">("all");
  const [showResultsModal, setShowResultsModal] = useState(false);
  const [screeningResults, setScreeningResults] = useState<any>(null);
  const [selectedCandidate, setSelectedCandidate] = useState<any>(null);
  const [selectedAnomalyReport, setSelectedAnomalyReport] = useState<AnomalyReport | null>(null);
  const [selectedAnomalyResume, setSelectedAnomalyResume] = useState<Resume | null>(null);
  const [showCandidateDetail, setShowCandidateDetail] = useState(false);
  const [viewerFile, setViewerFile] = useState<string | null>(null);
  const [viewerTitle, setViewerTitle] = useState<string>("");
  const [showThresholdModal, setShowThresholdModal] = useState(false);
  const [atsThreshold, setAtsThreshold] = useState(60);
  const [anomalyThreshold, setAnomalyThreshold] = useState(30);
  const [matchThreshold, setMatchThreshold] = useState(50);

  // Job Form State
  const [jobForm, setJobForm] = useState({
    title: "",
    company: "",
    location: "",
    type: "full-time",
    salary: "",
    description: "",
    requirements: [] as string[],
    responsibilities: [] as string[],
    benefits: [] as string[],
    status: "active",
  });

  const [tempRequirement, setTempRequirement] = useState("");
  const [tempResponsibility, setTempResponsibility] = useState("");
  const [tempBenefit, setTempBenefit] = useState("");

  // Prevent back button from going to login page
  useEffect(() => {
    // Replace current history entry to prevent going back to login
    window.history.pushState(null, '', window.location.href);
    
    const handlePopState = () => {
      // When back button is pressed, stay on dashboard
      window.history.pushState(null, '', window.location.href);
      // Optionally, you can show a confirmation dialog
      // or navigate to the dashboard section
      setActiveSection("dashboard");
    };

    window.addEventListener('popstate', handlePopState);

    return () => {
      window.removeEventListener('popstate', handlePopState);
    };
  }, []);

  useEffect(() => {
    // Suppress unused warnings
    if (false) {
      console.log(handleBulkDeleteResumes, handleJobDescriptionUpload, handleRunAIScreening, detectAnomalies);
    }
    fetchResumes();
    fetchAnomalyReports();
    fetchJobs();
    fetchReceivedApplications();
  }, []);

  const fetchReceivedApplications = async () => {
    try {
      const token = localStorage.getItem("token");
      const response = await axios.get(`${API_URL}/api/hr/applications`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (response.data.success) {
        setReceivedApplications(response.data.data || []);
      }
    } catch (error) {
      console.error("Error fetching applications:", error);
    }
  };

  const updateApplicationStatus = async (appId: string, status: string) => {
    try {
      const token = localStorage.getItem("token");
      await axios.put(
        `${API_URL}/api/hr/applications/${appId}/status`,
        { status },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      fetchReceivedApplications();
    } catch (error) {
      console.error("Error updating application status:", error);
    }
  };

  const fetchResumes = async () => {
    try {
      const token = localStorage.getItem("token");
      const response = await axios.get(`${API_URL}/api/hr/all-resumes`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (response.data.success) {
        // Deduplicate resumes by _id to prevent React duplicate key warnings
        const seen = new Set<string>();
        const unique = (response.data.data as Resume[]).filter((r: Resume) => {
          if (seen.has(r._id)) return false;
          seen.add(r._id);
          return true;
        });
        setResumes(unique);
      }
    } catch (error) {
      console.error("Error fetching resumes:", error);
    }
  };

  const fetchAnomalyReports = async () => {
    try {
      const token = localStorage.getItem("token");
      const response = await axios.get(`${API_URL}/api/hr/anomaly-reports`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (response.data.success) {
        setAnomalyReports(response.data.data);
      }
    } catch (error) {
      console.error("Error fetching anomaly reports:", error);
    }
  };

  const fetchJobs = async () => {
    try {
      const token = localStorage.getItem("token");
      const response = await axios.get(`${API_URL}/api/hr/jobs`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (response.data.success) {
        setJobs(response.data.data || []);
      }
    } catch (error) {
      console.error("Error fetching jobs:", error);
      setJobs([]);
    }
  };

  // Job Management Functions
  const handleJobFormChange = (field: string, value: any) => {
    setJobForm((prev) => ({ ...prev, [field]: value }));
  };

  const addToArray = (field: "requirements" | "responsibilities" | "benefits", value: string) => {
    if (!value.trim()) return;
    setJobForm((prev) => ({
      ...prev,
      [field]: [...prev[field], value.trim()],
    }));
    if (field === "requirements") setTempRequirement("");
    if (field === "responsibilities") setTempResponsibility("");
    if (field === "benefits") setTempBenefit("");
  };

  const removeFromArray = (
    field: "requirements" | "responsibilities" | "benefits",
    index: number
  ) => {
    setJobForm((prev) => ({
      ...prev,
      [field]: prev[field].filter((_, i) => i !== index),
    }));
  };

  const resetJobForm = () => {
    setJobForm({
      title: "",
      company: "",
      location: "",
      type: "full-time",
      salary: "",
      description: "",
      requirements: [],
      responsibilities: [],
      benefits: [],
      status: "active",
    });
    setTempRequirement("");
    setTempResponsibility("");
    setTempBenefit("");
    setEditingJob(null);
  };

  const openJobModal = (job?: Job) => {
    if (job) {
      setEditingJob(job);
      setJobForm({
        title: job.title,
        company: job.company,
        location: job.location,
        type: job.type,
        salary: job.salary,
        description: job.description,
        requirements: job.requirements || [],
        responsibilities: job.responsibilities || [],
        benefits: job.benefits || [],
        status: job.status,
      });
    } else {
      resetJobForm();
    }
    setShowJobModal(true);
  };

  const closeJobModal = () => {
    setShowJobModal(false);
    resetJobForm();
  };

  const handlePostJob = async () => {
    if (!jobForm.title || !jobForm.company || !jobForm.description) {
      alert("Please fill in all required fields (Title, Company, Description)");
      return;
    }

    try {
      const token = localStorage.getItem("token");
      const url = editingJob
        ? `${API_URL}/api/hr/jobs/${editingJob._id}`
        : `${API_URL}/api/hr/jobs`;
      const method = editingJob ? "put" : "post";

      const response = await axios[method](url, jobForm, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (response.data.success) {
        alert(editingJob ? "Job updated successfully!" : "Job posted successfully!");
        await fetchJobs();
        closeJobModal();
        setActiveSection("jobs");
      }
    } catch (error: any) {
      console.error("Job posting error:", error);
      alert(error.response?.data?.error || "Failed to post job");
    }
  };

  const handleDeleteJob = async (jobId: string) => {
    if (!confirm("Are you sure you want to delete this job?")) return;

    try {
      const token = localStorage.getItem("token");
      const response = await axios.delete(`${API_URL}/api/hr/jobs/${jobId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (response.data.success) {
        alert("Job deleted successfully!");
        await fetchJobs();
      }
    } catch (error: any) {
      console.error("Job deletion error:", error);
      alert(error.response?.data?.error || "Failed to delete job");
    }
  };

  const handleDeleteResume = async (resumeId: string) => {
    if (!confirm("Are you sure you want to delete this resume?")) return;

    try {
      const token = localStorage.getItem("token");
      const response = await axios.delete(`${API_URL}/api/hr/resumes/${resumeId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (response.data.success) {
        alert("Resume deleted successfully!");
        await fetchResumes();
        // Remove from selected if it was selected
        setSelectedResumes(prev => prev.filter(id => id !== resumeId));
      }
    } catch (error: any) {
      console.error("Resume deletion error:", error);
      alert(error.response?.data?.error || "Failed to delete resume");
    }
  };

  const handleBulkDeleteResumes = async () => {
    if (selectedResumes.length === 0) {
      alert("Please select resumes to delete");
      return;
    }

    if (!confirm(`Are you sure you want to delete ${selectedResumes.length} selected resume(s)? This action cannot be undone.`)) {
      return;
    }

    try {
      const token = localStorage.getItem("token");
      let deletedCount = 0;
      let failedCount = 0;

      // Delete each selected resume
      for (const resumeId of selectedResumes) {
        try {
          const response = await axios.delete(`${API_URL}/api/hr/resumes/${resumeId}`, {
            headers: { Authorization: `Bearer ${token}` },
          });

          if (response.data.success) {
            deletedCount++;
          } else {
            failedCount++;
          }
        } catch (error) {
          console.error(`Failed to delete resume ${resumeId}:`, error);
          failedCount++;
        }
      }

      // Show result
      if (deletedCount > 0) {
        alert(`✅ Successfully deleted ${deletedCount} resume(s)${failedCount > 0 ? `. Failed: ${failedCount}` : ''}`);
        await fetchResumes();
        setSelectedResumes([]); // Clear selection
      } else {
        alert("❌ Failed to delete resumes. Please try again.");
      }
    } catch (error: any) {
      console.error("Bulk deletion error:", error);
      alert(error.response?.data?.error || "Failed to delete resumes");
    }
  };

  const handleDeleteAllResumes = async () => {
    if (resumes.length === 0) {
      alert("No resumes available to delete");
      return;
    }

    if (!confirm("Are you sure you want to delete ALL resumes (including job seeker resumes)? This action cannot be undone.")) {
      return;
    }

    try {
      const token = localStorage.getItem("token");
      const response = await axios.post(
        `${API_URL}/api/hr/resumes/delete-all`,
        { includeApplications: true },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      if (response.data.success) {
        alert("✅ All resumes deleted successfully");
        setSelectedResumes([]);
        await fetchResumes();
        await fetchReceivedApplications();
      } else {
        alert(response.data.error || "Failed to delete all resumes");
      }
    } catch (error: any) {
      console.error("Delete all resumes error:", error);
      alert(error.response?.data?.error || "Failed to delete all resumes");
    }
  };

  const handleJobDescriptionUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target?.result as string;
      setJobDescription(text);
      setActiveSection("ranking");
    };
    reader.readAsText(file);
  };

  const handleMultipleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files || files.length === 0) return;

    const formData = new FormData();
    Array.from(files).forEach((file) => {
      formData.append("resumes", file);
    });

    setUploadingResumes(true);

    try {
      const token = localStorage.getItem("token");
      console.log(`📤 Uploading ${files.length} resume(s)...`);
      
      const response = await axios.post(
        `${API_URL}/api/hr/upload-resumes`,
        formData,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "multipart/form-data",
          },
          timeout: 30000, // 30 seconds for upload only
        }
      );

      console.log('✅ Upload complete:', response.data);

      if (response.data.success) {
        const { successful } = response.data.data;
        
        alert(
          `✅ ${successful} resume(s) uploaded successfully!\n\n` +
          `Next steps:\n` +
          `1. Go to "Upload Job Description" to add job details\n` +
          `2. Click "Run AI Screening" to analyze resumes\n` +
          `3. View results in "Candidate Ranking" and "Anomaly Detection"`
        );
        
        await fetchResumes();
        setActiveSection("screening");
      }
    } catch (error: any) {
      console.error("❌ Upload error:", error);
      console.error("Error details:", {
        message: error.message,
        response: error.response?.data,
        status: error.response?.status,
        code: error.code
      });
      
      let errorMessage = "Failed to upload resumes\n\n";
      
      if (error.code === 'ECONNABORTED' || error.message.includes('timeout')) {
        errorMessage += "⏱️ Upload timeout. Try uploading fewer files.";
      } else if (error.response?.status === 413) {
        errorMessage += "📦 Files too large! Maximum: 10MB per file.";
      } else if (error.response?.status === 500) {
        errorMessage += `🔧 Server error: ${error.response?.data?.error || 'Unknown'}`;
      } else {
        errorMessage += error.response?.data?.error || error.message || "Unknown error";
      }
      
      alert(errorMessage);
    } finally {
      setUploadingResumes(false);
      event.target.value = ''; // Reset file input
    }
  };

  const handleRunAIScreening = async () => {
    // Check if job description is provided
    if (!jobDescription.trim()) {
      alert("⚠️ Please enter a job description first!\n\nJob description helps AI rank candidates accurately.");
      return;
    }

    // Determine which resumes to process
    const resumesToProcess = selectedResumes.length > 0 
      ? resumes.filter(r => selectedResumes.includes(r._id))  // Allow reprocessing selected resumes
      : resumes.filter(r => r.aiAnalysis.atsScore === 0);     // Only process pending when no selection

    if (resumesToProcess.length === 0) {
      alert("⚠️ No resumes to analyze!\n\nPlease select resumes to process.");
      return;
    }

    // Show threshold selection modal first
    setShowThresholdModal(true);

    try {
      const token = localStorage.getItem("token");
      console.log(`🤖 Running AI Screening on ${resumesToProcess.length} resume(s)...`);
      console.log(`   selectedResumes IDs:`, selectedResumes);
      console.log(`   Sending to API:`, { 
        jobDescription: jobDescription ? 'PROVIDED' : 'NOT PROVIDED',
        resumeIds: selectedResumes.length > 0 ? selectedResumes : undefined
      });
      
      // Log threshold values being sent
      console.log('🔍 THRESHOLD DEBUG INFO:');
      console.log(`   atsThreshold: ${atsThreshold}`);
      console.log(`   anomalyThreshold: ${anomalyThreshold}`);
      console.log(`   matchThreshold: ${matchThreshold}`);

      const response = await axios.post(
        `${API_URL}/api/hr/run-ai-screening`,
        { 
          jobDescription,
          resumeIds: selectedResumes.length > 0 ? selectedResumes : undefined,
          atsThreshold,
          anomalyThreshold,
          matchThreshold,
          jobId: selectedJob || undefined
        },
        {
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
          timeout: 300000, // 5 minutes for AI processing
        }
      );

      console.log('✅ AI Screening complete:', response.data);
      console.log('📊 Response decision statuses:', response.data.data?.processed?.map((r: any) => ({ name: r.name, ats: r.atsScore, decision: r.decisionStatus })));

      if (response.data.success) {
        const { processed, errors, successful, failed, ranked } = response.data.data;
        
        // Save results for modal display
        setScreeningResults({
          processed,
          successful,
          failed,
          errors,
          ranked
        });
        
        // Refresh data FIRST before showing results
        await fetchResumes();
        await fetchAnomalyReports();
        
        // Show results modal instead of alert
        setShowResultsModal(true);
        
        // Clear selections and stay on screening to see results
        setSelectedResumes([]);
      }
    } catch (error: any) {
      console.error("❌ AI Screening error:", error);
      console.error("Error details:", {
        status: error.response?.status,
        data: error.response?.data,
        message: error.message,
        code: error.code
      });
      
      let errorMessage = "❌ Failed to run AI screening\n\n";
      
      if (error.code === 'ECONNABORTED' || error.message.includes('timeout')) {
        errorMessage += "⏱️ Processing timeout. The AI service might be slow.\n";
        errorMessage += "Try again or check if Python service is running.";
      } else if (error.response?.status === 503) {
        errorMessage += "🔌 AI Service Not Available\n\n";
        errorMessage += error.response?.data?.error || "Python AI service is not running.";
        errorMessage += "\n\nPlease ensure Python service is running on port 5001.";
        errorMessage += "\n\nCheck the PowerShell window with 'Python AI Service' title.";
      } else if (error.response?.status === 400) {
        errorMessage += error.response?.data?.error || "No pending resumes found";
      } else if (error.response?.status === 500) {
        errorMessage += `🔧 Server error: ${error.response?.data?.error || 'Unknown'}`;
        if (error.response?.data?.details) {
          errorMessage += `\n\nDetails: ${error.response.data.details}`;
        }
      } else if (error.response?.data?.error) {
        errorMessage += error.response.data.error;
      } else {
        errorMessage += error.message || "Unknown error";
      }
      
      alert(errorMessage);
    } finally {
      setRunningAIScreening(false);
    }
  };

  const startScreeningWithThresholds = async () => {
    setShowThresholdModal(false);
    const resumesToProcess = selectedResumes.length > 0 
      ? resumes.filter(r => selectedResumes.includes(r._id!))
      : resumes.filter(r => r.status === 'pending');

    if (resumesToProcess.length === 0) {
      alert("⚠️ No resumes to analyze!");
      return;
    }

    setRunningAIScreening(true);

    try {
      const token = localStorage.getItem("token");
      console.log(`🤖 Running AI Screening with thresholds:`, {
        atsThreshold,
        anomalyThreshold,
        matchThreshold,
        resumeCount: resumesToProcess.length
      });
      
      const response = await axios.post(
        `${API_URL}/api/hr/run-ai-screening`,
        { 
          jobDescription,
          resumeIds: selectedResumes.length > 0 ? selectedResumes : undefined,
          atsThreshold,
          anomalyThreshold,
          matchThreshold,
          jobId: selectedJob || undefined
        },
        {
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
          timeout: 300000,
        }
      );

      console.log('✅ AI Screening complete:', response.data);

      if (response.data.success) {
        const { processed, errors, successful, failed, ranked } = response.data.data;
        
        setScreeningResults({
          processed,
          successful,
          failed,
          errors,
          ranked
        });
        
        await fetchResumes();
        await fetchAnomalyReports();
        
        setShowResultsModal(true);
        setSelectedResumes([]);
      }
    } catch (error: any) {
      console.error("❌ AI Screening error:", error);
      
      let errorMessage = "❌ Failed to run AI screening\n\n";
      
      if (error.code === 'ECONNABORTED' || error.message.includes('timeout')) {
        errorMessage += "⏱️ Processing timeout. Try again or check if Python service is running.";
      } else if (error.response?.status === 503) {
        errorMessage += "🔌 AI Service Not Available\n\nPython AI service is not running on port 5001.";
      } else if (error.response?.status === 400) {
        errorMessage += error.response?.data?.error || "No pending resumes found";
      } else if (error.response?.status === 500) {
        errorMessage += `🔧 Server error: ${error.response?.data?.error || 'Unknown'}`;
      } else if (error.response?.data?.error) {
        errorMessage += error.response.data.error;
      } else {
        errorMessage += error.message || "Unknown error";
      }
      
      alert(errorMessage);
    } finally {
      setRunningAIScreening(false);
    }
  };

  const detectAnomalies = async () => {
    if (selectedResumes.length === 0) {
      alert("Please select at least one resume");
      return;
    }

    setDetectingAnomalies(true);

    try {
      const token = localStorage.getItem("token");
      const response = await axios.post(
        `${API_URL}/api/hr/detect-anomalies`,
        { resumeIds: selectedResumes },
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      if (response.data.success) {
        alert("Anomaly detection completed!");
        await fetchAnomalyReports();
        setActiveSection("anomalies");
        setSelectedResumes([]);
      }
    } catch (error: any) {
      console.error("Anomaly detection error:", error);
      alert(error.response?.data?.error || "Failed to detect anomalies");
    } finally {
      setDetectingAnomalies(false);
    }
  };

  const rankResumes = async () => {
    if (!jobDescription.trim()) {
      alert("Please enter a job description");
      return;
    }

    if (selectedResumes.length === 0) {
      alert("Please select at least one resume");
      return;
    }

    setRankingResumes(true);

    try {
      const token = localStorage.getItem("token");
      const response = await axios.post(
        `${API_URL}/api/hr/rank-resumes`,
        {
          jobDescription: jobDescription,
          resumeIds: selectedResumes,
          jobId: selectedJob || undefined,
        },
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      if (response.data.success) {
        setRankings(response.data.data.rankings);
        setActiveSection("ranking");
        setSelectedResumes([]);
      }
    } catch (error: any) {
      console.error("Ranking error:", error);
      alert(error.response?.data?.error || "Failed to rank resumes");
    } finally {
      setRankingResumes(false);
    }
  };

  const toggleResumeSelection = (resumeId: string) => {
    setSelectedResumes((prev) =>
      prev.includes(resumeId)
        ? prev.filter((id) => id !== resumeId)
        : [...prev, resumeId]
    );
  };

  const selectAllResumes = () => {
    if (selectedResumes.length === resumes.length) {
      setSelectedResumes([]);
    } else {
      setSelectedResumes(resumes.map((r) => r._id));
    }
  };

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  const menuItems = [
    { icon: Home, label: "Dashboard", section: "dashboard" },
    { icon: Plus, label: "Post Job", section: "post-job" },
    { icon: Briefcase, label: "All Jobs", section: "jobs" },
    { icon: Send, label: "Applications", section: "applications" },
    { icon: Upload, label: "Upload Resumes", section: "upload" },
    { icon: FileText, label: "Resume Screening", section: "screening" },
    { icon: BarChart2, label: "Candidate Ranking", section: "ranking" },
  ];

  const openResumeViewer = (filename: string | undefined, title?: string) => {
    if (!filename) return;
    setViewerFile(filename);
    setViewerTitle(title || "Resume");
  };

  // Compute latest screening batch: resumes screened within 10 minutes of the most recent screening
  const latestScreeningIds = (() => {
    const screened = resumes.filter(r => r.lastScreeningDate);
    if (screened.length === 0) return new Set<string>();
    const maxTs = Math.max(...screened.map(r => new Date(r.lastScreeningDate!).getTime()));
    const BATCH_WINDOW = 10 * 60 * 1000; // 10 minutes
    return new Set(screened.filter(r => maxTs - new Date(r.lastScreeningDate!).getTime() <= BATCH_WINDOW).map(r => r._id));
  })();

  const renderDashboard = () => (
    <div className="space-y-6">
      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <button
          onClick={() => {
            setResumeFilter("all");
            setActiveSection("screening");
          }}
          className="bg-white rounded-2xl p-6 border border-slate-200 hover:shadow-lg transition-all text-left cursor-pointer"
        >
          <div className="flex items-center justify-between mb-4">
            <div className="bg-gradient-to-br from-blue-100 to-cyan-100 p-3 rounded-xl">
              <FileText className="text-blue-600" size={24} />
            </div>
            <span className="text-3xl font-bold text-slate-900">{resumes.length}</span>
          </div>
          <h3 className="text-slate-600">Total Resumes</h3>
        </button>

        <button
          onClick={() => {
            setResumeFilter("verified");
            setActiveSection("screening");
          }}
          className="bg-white rounded-2xl p-6 border border-slate-200 hover:shadow-lg transition-all text-left cursor-pointer"
        >
          <div className="flex items-center justify-between mb-4">
            <div className="bg-gradient-to-br from-green-100 to-emerald-100 p-3 rounded-xl">
              <CheckCircle className="text-green-600" size={24} />
            </div>
            <span className="text-3xl font-bold text-slate-900">
              {resumes.filter((r) => latestScreeningIds.has(r._id) && anomalyReports.some(ar => ar.resume && ar.resume._id === r._id && ar.status === "cleared")).length}
            </span>
          </div>
          <h3 className="text-slate-600">Verified Resumes</h3>
          <p className="text-xs text-slate-400 mt-1">Latest screening</p>
        </button>

        <button
          onClick={() => {
            setResumeFilter("shortlisted");
            setActiveSection("screening");
          }}
          className="bg-white rounded-2xl p-6 border border-slate-200 hover:shadow-lg transition-all text-left cursor-pointer"
        >
          <div className="flex items-center justify-between mb-4">
            <div className="bg-gradient-to-br from-blue-100 to-cyan-100 p-3 rounded-xl">
              <CheckCircle className="text-blue-600" size={24} />
            </div>
            <span className="text-3xl font-bold text-slate-900">
              {resumes.filter((r) => latestScreeningIds.has(r._id) && r.decisionStatus === 'SHORTLISTED').length}
            </span>
          </div>
          <h3 className="text-slate-600">Shortlisted Resumes</h3>
          <p className="text-xs text-slate-400 mt-1">Latest screening</p>
        </button>

        <button
          onClick={() => {
            setResumeFilter("rejected");
            setActiveSection("screening");
          }}
          className="bg-white rounded-2xl p-6 border border-slate-200 hover:shadow-lg transition-all text-left cursor-pointer"
        >
          <div className="flex items-center justify-between mb-4">
            <div className="bg-gradient-to-br from-orange-100 to-red-100 p-3 rounded-xl">
              <XCircle className="text-red-700" size={24} />
            </div>
            <span className="text-3xl font-bold text-slate-900">
              {resumes.filter((r) => latestScreeningIds.has(r._id) && r.decisionStatus === 'REJECTED').length}
            </span>
          </div>
          <h3 className="text-slate-600">Rejected Resumes</h3>
          <p className="text-xs text-slate-400 mt-1">Latest screening</p>
        </button>
      </div>

      {/* Quick Actions */}
      <div className="bg-white rounded-2xl p-6 border border-slate-200">
        <h2 className="text-xl font-bold text-slate-900 mb-4">Quick Actions</h2>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <button
            onClick={() => setActiveSection("post-job")}
            className="p-4 border-2 border-dashed border-slate-300 rounded-xl hover:border-purple-400 hover:bg-purple-50 transition-all text-center"
          >
            <Plus className="mx-auto mb-2 text-purple-600" size={32} />
            <p className="font-semibold text-slate-900">Post New Job</p>
            <p className="text-sm text-slate-500">Create job posting</p>
          </button>

          <button
            onClick={() => setActiveSection("upload")}
            className="p-4 border-2 border-dashed border-slate-300 rounded-xl hover:border-cyan-400 hover:bg-cyan-50 transition-all text-center"
          >
            <Upload className="mx-auto mb-2 text-cyan-600" size={32} />
            <p className="font-semibold text-slate-900">Upload Resumes</p>
            <p className="text-sm text-slate-500">Upload multiple resumes</p>
          </button>

          <button
            onClick={() => setActiveSection("screening")}
            className="p-4 border-2 border-dashed border-slate-300 rounded-xl hover:border-green-400 hover:bg-green-50 transition-all text-center"
          >
            <Shield className="mx-auto mb-2 text-green-600" size={32} />
            <p className="font-semibold text-slate-900">Detect Anomalies</p>
            <p className="text-sm text-slate-500">Check for anomaly indicators</p>
          </button>

          <button
            onClick={() => setActiveSection("ranking")}
            className="p-4 border-2 border-dashed border-slate-300 rounded-xl hover:border-orange-400 hover:bg-orange-50 transition-all text-center"
          >
            <BarChart2 className="mx-auto mb-2 text-orange-600" size={32} />
            <p className="font-semibold text-slate-900">Rank Candidates</p>
            <p className="text-sm text-slate-500">Rank against job description</p>
          </button>
        </div>
      </div>

      {/* Recent Jobs */}
      {jobs.length > 0 && (
        <div className="bg-white rounded-2xl p-6 border border-slate-200">
          <h2 className="text-xl font-bold text-slate-900 mb-4">Recent Job Postings</h2>
          <div className="space-y-3">
            {jobs.slice(0, 5).map((job) => (
              <div
                key={job._id}
                className="p-4 border border-slate-200 rounded-xl hover:shadow-md transition-all flex items-center justify-between"
              >
                <div className="flex items-center gap-4">
                  <div className="bg-gradient-to-br from-blue-100 to-cyan-100 p-3 rounded-xl">
                    <Briefcase className="text-blue-600" size={20} />
                  </div>
                  <div>
                    <p className="font-bold text-slate-900">{job.title}</p>
                    <p className="text-sm text-slate-600">{job.company} • {job.location}</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-sm text-slate-600">{job.applicants || 0} applicants</p>
                  <span
                    className={`inline-block px-3 py-1 rounded-full text-xs font-semibold ${
                      job.status === "active"
                        ? "bg-green-100 text-green-700"
                        : "bg-slate-100 text-slate-600"
                    }`}
                  >
                    {job.status}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );

  const renderPostJob = () => (
    <div className="max-w-4xl mx-auto">
      <div className="bg-white rounded-2xl p-8 border border-slate-200">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-2xl font-bold text-slate-900">Post New Job</h2>
            <p className="text-slate-600">Fill in the job details</p>
          </div>
          <button
            onClick={() => openJobModal()}
            className="bg-gradient-to-r from-purple-600 to-pink-600 text-white px-6 py-3 rounded-xl hover:shadow-lg transition-all flex items-center gap-2"
          >
            <Plus size={20} />
            Create Job Posting
          </button>
        </div>
      </div>
    </div>
  );

  const renderJobs = () => {
    // Filter jobs based on jobFilter state
    const filteredJobs = jobFilter === "active" 
      ? jobs.filter(job => job.status === "active")
      : jobs;

    return (
      <div className="space-y-6">
        {/* Filter Tabs */}
        <div className="bg-white rounded-2xl p-6 border border-slate-200">
          <div className="flex items-center gap-2 mb-4">
            <button
              onClick={() => setJobFilter("all")}
              className={`px-4 py-2 rounded-lg transition-all ${
                jobFilter === "all"
                  ? "bg-purple-600 text-white"
                  : "bg-slate-100 text-slate-600 hover:bg-slate-200"
              }`}
            >
              All Jobs ({jobs.length})
            </button>
            <button
              onClick={() => setJobFilter("active")}
              className={`px-4 py-2 rounded-lg transition-all ${
                jobFilter === "active"
                  ? "bg-green-600 text-white"
                  : "bg-slate-100 text-slate-600 hover:bg-slate-200"
              }`}
            >
              Active Jobs ({jobs.filter(j => j.status === "active").length})
            </button>
          </div>
        </div>

        {/* Header */}
        <div className="bg-white rounded-2xl p-6 border border-slate-200">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-2xl font-bold text-slate-900">
                {jobFilter === "active" ? "Active Jobs" : "All Jobs"}
              </h2>
              <p className="text-slate-600">{filteredJobs.length} job postings</p>
            </div>
            <button
              onClick={() => openJobModal()}
              className="bg-gradient-to-r from-purple-600 to-pink-600 text-white px-6 py-3 rounded-xl hover:shadow-lg transition-all flex items-center gap-2"
            >
              <Plus size={20} />
              Post New Job
            </button>
          </div>

          {/* Search */}
          <div className="relative">
            <Search className="absolute left-4 top-3.5 text-slate-400" size={20} />
            <input
              type="text"
              placeholder="Search jobs..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-12 pr-4 py-3 border border-slate-300 rounded-xl focus:outline-none focus:border-cyan-500"
            />
          </div>
        </div>

        {/* Jobs List */}
        {filteredJobs.length === 0 ? (
          <div className="text-center py-12 bg-white rounded-2xl border border-slate-200">
            <Briefcase className="mx-auto text-slate-400 mb-4" size={48} />
            <p className="text-slate-600 mb-4">
              {jobFilter === "active" ? "No active jobs found" : "No jobs posted yet"}
            </p>
            <button
              onClick={() => openJobModal()}
              className="bg-gradient-to-r from-purple-600 to-pink-600 text-white px-6 py-2 rounded-xl"
            >
              Post Your First Job
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4">
            {filteredJobs
              .filter((job) =>
                job.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                job.company.toLowerCase().includes(searchTerm.toLowerCase())
              )
              .map((job) => (
              <div
                key={job._id}
                className="bg-white rounded-2xl p-6 border border-slate-200 hover:shadow-lg transition-all"
              >
                <div className="flex items-start justify-between mb-4">
                  <div className="flex-1">
                    <h3 className="text-xl font-bold text-slate-900 mb-2">{job.title}</h3>
                    <div className="flex flex-wrap gap-3 text-sm text-slate-600 mb-3">
                      <span className="flex items-center gap-1">
                        <Briefcase size={16} />
                        {job.company}
                      </span>
                      <span className="flex items-center gap-1">
                        <MapPin size={16} />
                        {job.location}
                      </span>
                      <span className="flex items-center gap-1">
                        <Clock size={16} />
                        {job.type}
                      </span>
                      {job.salary && (
                        <span className="flex items-center gap-1">
                          <DollarSign size={16} />
                          {job.salary}
                        </span>
                      )}
                    </div>
                    <p className="text-slate-700 mb-3 line-clamp-2">{job.description}</p>
                    <div className="flex items-center gap-2">
                      <span
                        className={`px-3 py-1 rounded-full text-xs font-semibold ${
                          job.status === "active"
                            ? "bg-green-100 text-green-700"
                            : "bg-slate-100 text-slate-600"
                        }`}
                      >
                        {job.status}
                      </span>
                      <span className="text-sm text-slate-600">
                        {job.applicants || 0} applicants
                      </span>
                      <span className="text-sm text-slate-500">
                        • Posted {new Date(job.createdAt).toLocaleDateString()}
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 ml-4">
                    <button
                      onClick={() => openJobModal(job)}
                      className="p-2 hover:bg-blue-50 text-blue-600 rounded-lg transition-all"
                      title="Edit"
                    >
                      <Edit2 size={18} />
                    </button>
                    <button
                      onClick={() => handleDeleteJob(job._id)}
                      className="p-2 hover:bg-red-50 text-red-600 rounded-lg transition-all"
                      title="Delete"
                    >
                      <Trash2 size={18} />
                    </button>
                  </div>
                </div>
              </div>
            ))}
        </div>
      )}
    </div>
    );
  };

  const renderUpload = () => {
    const pendingResumes = resumes.filter(r => r.aiAnalysis.atsScore === 0);
    
    return (
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Upload Section */}
        <div className="bg-white rounded-2xl p-8 border border-slate-200">
          <div className="text-center mb-8">
            <div className="bg-gradient-to-br from-blue-100 to-cyan-100 w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <Upload className="text-blue-600" size={32} />
            </div>
            <h2 className="text-2xl font-bold text-slate-900 mb-2">Upload Multiple Resumes</h2>
            <p className="text-slate-600">Upload PDF or DOCX files (max 10MB each)</p>
          </div>

          <div className="border-2 border-dashed border-slate-300 rounded-2xl p-12 text-center hover:border-cyan-400 transition-all">
            <input
              type="file"
              id="resumesUpload"
              accept=".pdf,.docx"
              multiple
              onChange={handleMultipleFileUpload}
              className="hidden"
              disabled={uploadingResumes}
            />
            <label htmlFor="resumesUpload" className="cursor-pointer inline-block">
              {uploadingResumes ? (
                <>
                  <Loader className="animate-spin mx-auto mb-4 text-cyan-600" size={48} />
                  <p className="text-slate-600">Uploading resumes...</p>
                </>
              ) : (
                <>
                  <Upload className="mx-auto mb-4 text-slate-400" size={48} />
                  <p className="text-lg font-semibold text-slate-900 mb-2">
                    Click to upload or drag and drop
                  </p>
                  <p className="text-sm text-slate-500">Multiple PDF or DOCX files (max 10MB each)</p>
                </>
              )}
            </label>
          </div>
        </div>

        {/* All Uploaded Resumes Display */}
        {resumes.length > 0 && (
          <div className="bg-white rounded-2xl p-6 border border-slate-200">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-xl font-bold text-slate-900">
                  All Uploaded Resumes ({resumes.length})
                </h3>
                <p className="text-sm text-slate-600 mt-1">
                  Pending: {pendingResumes.length} | Analyzed: {resumes.length - pendingResumes.length}
                </p>
              </div>
              <button
                onClick={() => setActiveSection("screening")}
                className="px-4 py-2 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-all text-sm"
              >
                Go to Resume Screening
              </button>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-h-96 overflow-y-auto">
              {resumes.map((resume, index) => {
                const isPending = resume.aiAnalysis.atsScore === 0;
                return (
                  <div
                    key={resume._id}
                    className="flex items-center gap-3 p-3 border border-slate-200 rounded-xl hover:bg-slate-50 transition-all"
                  >
                    <div className="flex-shrink-0 w-10 h-10 bg-gradient-to-br from-blue-500 to-cyan-500 text-white rounded-full flex items-center justify-center font-semibold">
                      {index + 1}
                    </div>
                    <FileText className="text-blue-600 flex-shrink-0" size={20} />
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-slate-900 truncate">
                        {resume.originalFileName || resume.originalFile}
                      </p>
                      <div className="flex items-center gap-2 mt-1">
                        {isPending ? (
                          <span className="text-xs px-2 py-0.5 rounded-full bg-amber-100 text-amber-700">
                            Pending
                          </span>
                        ) : (
                          <span className="text-xs px-2 py-0.5 rounded-full bg-green-100 text-green-700">
                            Analyzed
                          </span>
                        )}
                        <span className="text-xs text-slate-500">
                          {new Date(resume.createdAt).toLocaleDateString()}
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    );
  };

  const renderScreening = () => {
    // Filter resumes based on resumeFilter state
    let filteredResumes = resumes;
    
    if (resumeFilter === "verified") {
      // Show only resumes from the latest screening that have been cleared (not flagged)
      const verifiedResumeIds = anomalyReports
        .filter(fr => fr.resume && fr.status === "cleared" && latestScreeningIds.has(fr.resume._id))
        .map(fr => fr.resume._id);
      filteredResumes = resumes.filter(r => latestScreeningIds.has(r._id) && verifiedResumeIds.includes(r._id));
    } else if (resumeFilter === "shortlisted") {
      // Show only resumes from the latest screening that are SHORTLISTED
      filteredResumes = resumes.filter(r => latestScreeningIds.has(r._id) && r.decisionStatus === 'SHORTLISTED');
    } else if (resumeFilter === "needs_review") {
      // Show only resumes from the latest screening that need review
      filteredResumes = resumes.filter(r => latestScreeningIds.has(r._id) && r.decisionStatus === 'NEEDS_REVIEW');
    } else if (resumeFilter === "rejected") {
      // Show only resumes from the latest screening that are REJECTED
      filteredResumes = resumes.filter(r => latestScreeningIds.has(r._id) && r.decisionStatus === 'REJECTED');
    } else if (resumeFilter === "flagged") {
      // Show only resumes that have been flagged
      const flaggedResumeIds = anomalyReports
        .filter(fr => fr.resume && fr.status === "flagged")
        .map(fr => fr.resume._id);
      filteredResumes = resumes.filter(r => flaggedResumeIds.includes(r._id));
    }

    // Separate pending and processed resumes
    const pendingResumes = filteredResumes.filter(r => r.aiAnalysis.atsScore === 0);
    const processedResumes = filteredResumes.filter(r => r.aiAnalysis.atsScore > 0);

    return (
      <div className="space-y-6">
        {/* Section Title */}
        <div className="bg-white rounded-2xl p-6 border border-slate-200">
          <h2 className="text-2xl font-bold text-slate-900 mb-2">Resume Screening</h2>
          <p className="text-slate-600">Select uploaded resumes for screening. View screening results below.</p>
        </div>

        {/* Latest screening filter banner */}
        {(resumeFilter === "verified" || resumeFilter === "shortlisted" || resumeFilter === "rejected") && (
          <div className="bg-blue-50 border border-blue-200 rounded-xl px-5 py-3 flex items-center justify-between">
            <p className="text-sm text-blue-800 font-medium">
              Showing <span className="font-bold capitalize">{resumeFilter}</span> resumes from the latest screening
              {latestScreeningIds.size > 0 && <span className="text-blue-600"> ({latestScreeningIds.size} resumes in batch)</span>}
            </p>
            <button
              onClick={() => setResumeFilter("all")}
              className="text-xs text-blue-600 hover:text-blue-800 underline font-semibold"
            >
              Show all
            </button>
          </div>
        )}

        {/* Resume List */}
        {resumes.length === 0 ? (
          <div className="text-center py-12 bg-white rounded-2xl border border-slate-200">
            <FileText className="mx-auto text-slate-400 mb-4" size={48} />
            <p className="text-slate-600 mb-4">No resumes uploaded yet</p>
            <button
              onClick={() => setActiveSection("upload")}
              className="bg-gradient-to-r from-blue-600 to-cyan-600 text-white px-6 py-2 rounded-xl hover:shadow-lg transition-all"
            >
              Upload Resumes
            </button>
          </div>
        ) : (
          <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
            <div className="p-6 border-b border-slate-200">
              <h3 className="text-lg font-bold text-slate-900 mb-4">Select Resumes for Screening</h3>
              <p className="text-sm text-slate-600 mb-4">
                Total: {filteredResumes.length} | Pending Analysis: {pendingResumes.length} | Already Screened: {processedResumes.length}
              </p>
              <div className="flex items-center gap-3">
                <button
                  onClick={selectAllResumes}
                  disabled={resumes.length === 0}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl transition-all disabled:opacity-50"
                >
                  {selectedResumes.length === resumes.length ? "Deselect All" : "Select All"}
                </button>
                <button
                  onClick={handleDeleteAllResumes}
                  disabled={resumes.length === 0}
                  className="px-4 py-2 bg-red-50 hover:bg-red-100 text-red-700 rounded-xl transition-all disabled:opacity-50"
                >
                  Delete All
                </button>
              </div>
            </div>
            <table className="w-full">
              <thead className="bg-slate-50 border-b border-slate-200">
                <tr>
                  <th className="px-6 py-4 text-left">
                    <input
                      type="checkbox"
                      checked={resumes.length > 0 && selectedResumes.length === resumes.length}
                      onChange={selectAllResumes}
                      className="w-4 h-4"
                    />
                  </th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-slate-900">File Name</th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-slate-900">Name</th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-slate-900">Email</th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-slate-900">Skills</th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-slate-900">Status</th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-slate-900">ATS Score</th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-slate-900">Screened For</th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-slate-900">Uploaded</th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-slate-900">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {filteredResumes.map((resume) => {
                  const isPending = resume.aiAnalysis.atsScore === 0;
                  return (
                    <tr
                      key={resume._id}
                      className={`hover:bg-slate-50 transition-all ${
                        selectedResumes.includes(resume._id) ? "bg-cyan-50" : ""
                      }`}
                    >
                      <td className="px-6 py-4">
                        <input
                          type="checkbox"
                          checked={selectedResumes.includes(resume._id)}
                          onChange={() => toggleResumeSelection(resume._id)}
                          className="w-4 h-4"
                        />
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          <FileText className="text-slate-400" size={16} />
                          <span className="text-sm font-medium text-slate-700">
                            {resume.originalFileName || resume.originalFile}
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-4 font-medium text-slate-900">
                        {resume.parsedData?.name || (isPending ? "Pending..." : "Unknown")}
                      </td>
                      <td className="px-6 py-4 text-slate-600">
                        {resume.parsedData?.email || (isPending ? "—" : "N/A")}
                      </td>
                      <td className="px-6 py-4">
                        {resume.parsedData?.skills && resume.parsedData.skills.length > 0 ? (
                          <div className="flex flex-wrap gap-1">
                            {resume.parsedData.skills.slice(0, 3).map((skill, idx) => (
                              <span
                                key={idx}
                                className="px-2 py-1 bg-blue-100 text-blue-700 rounded text-xs"
                              >
                                {skill}
                              </span>
                            ))}
                            {resume.parsedData.skills.length > 3 && (
                              <span className="px-2 py-1 bg-slate-100 text-slate-600 rounded text-xs">
                                +{resume.parsedData.skills.length - 3}
                              </span>
                            )}
                          </div>
                        ) : (
                          <span className="text-sm text-slate-400">{isPending ? "—" : "N/A"}</span>
                        )}
                      </td>
                      <td className="px-6 py-4">
                        {isPending ? (
                          <span className="px-3 py-1 rounded-full text-xs font-semibold bg-amber-100 text-amber-700">
                            Pending Analysis
                          </span>
                        ) : (
                          <span className="px-3 py-1 rounded-full text-xs font-semibold bg-green-100 text-green-700">
                            Screened
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-4">
                        {isPending ? (
                          <span className="text-sm text-slate-400">—</span>
                        ) : (
                          <span
                            className={`px-3 py-1 rounded-full text-sm font-semibold ${
                              resume.aiAnalysis.atsScore >= 80
                                ? "bg-green-100 text-green-700"
                                : resume.aiAnalysis.atsScore >= 60
                                ? "bg-yellow-100 text-yellow-700"
                                : "bg-red-100 text-red-700"
                            }`}
                          >
                            {resume.aiAnalysis.atsScore}%
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-4">
                        {isPending ? (
                          <span className="text-sm text-slate-400">—</span>
                        ) : resume.lastScreeningJobId ? (
                          <span className="text-sm font-medium text-purple-700 bg-purple-50 px-2 py-1 rounded-lg border border-purple-200">
                            {(resume.lastScreeningJobId as any).title || "Unknown Job"}
                          </span>
                        ) : (
                          <span className="text-sm text-slate-400">N/A</span>
                        )}
                      </td>
                      <td className="px-6 py-4 text-sm text-slate-600">
                        {new Date(resume.createdAt).toLocaleDateString()}
                      </td>
                      <td className="px-6 py-4">
                        <button
                          onClick={() => handleDeleteResume(resume._id)}
                          className="text-red-600 hover:text-red-800 hover:bg-red-50 p-2 rounded-lg transition-colors"
                          title="Delete resume"
                        >
                          <Trash2 size={18} />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Job Selection & AI Screening Section */}
        {selectedResumes.length > 0 && (
          <div className="bg-white rounded-2xl p-6 border border-slate-200">
            <h3 className="text-lg font-bold text-slate-900 mb-4">
              Run Screening for Selected Resumes ({selectedResumes.length})
            </h3>
            
            <div className="space-y-4">
              {/* Job Selection */}
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2">
                  Select Posted Job <span className="text-red-500">*</span>
                </label>
                <select
                  value={selectedJob}
                  onChange={(e) => {
                    setSelectedJob(e.target.value);
                    // Auto-fill job description when job is selected
                    const job = jobs.find(j => j._id === e.target.value);
                    if (job) {
                      const fullDescription = `${job.title} - ${job.company}\n\nLocation: ${job.location}\nType: ${job.type}\nSalary: ${job.salary}\n\nDescription:\n${job.description}\n\nRequirements:\n${job.requirements.map((r, i) => `${i + 1}. ${r}`).join('\n')}\n\nResponsibilities:\n${job.responsibilities.map((r, i) => `${i + 1}. ${r}`).join('\n')}\n\nBenefits:\n${job.benefits.map((b, i) => `${i + 1}. ${b}`).join('\n')}`;
                      setJobDescription(fullDescription);
                    }
                  }}
                  className="w-full px-4 py-3 border border-slate-300 rounded-xl focus:outline-none focus:border-purple-500"
                  disabled={runningAIScreening}
                >
                  <option value="">-- Select a Job Position --</option>
                  {jobs.map(job => (
                    <option key={job._id} value={job._id}>
                      {job.title} - {job.company} ({job.location})
                    </option>
                  ))}
                </select>
                <p className="text-xs text-slate-500 mt-1">
                  💡 Resumes will be screened according to this job position
                </p>
              </div>

              {/* Selected Job Display (Read-only, no textarea) */}
              {selectedJob && (
                <div className="p-4 bg-gradient-to-r from-purple-50 to-pink-50 rounded-xl border border-purple-200">
                  <p className="text-sm font-semibold text-purple-900 mb-1">
                    Selected Job: {jobs.find(j => j._id === selectedJob)?.title}
                  </p>
                  <p className="text-xs text-purple-700">
                    {jobs.find(j => j._id === selectedJob)?.company} • {jobs.find(j => j._id === selectedJob)?.location}
                  </p>
                </div>
              )}

              {/* Run AI Screening Button */}
              <button
                onClick={() => setShowThresholdModal(true)}
                disabled={runningAIScreening || !selectedJob || !jobDescription.trim()}
                className={`w-full py-4 rounded-xl font-semibold text-white transition-all flex items-center justify-center gap-3 ${
                  runningAIScreening || !selectedJob || !jobDescription.trim()
                    ? 'bg-slate-300 cursor-not-allowed'
                    : 'bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 shadow-lg hover:shadow-xl'
                }`}
              >
                {runningAIScreening ? (
                  <>
                    <Loader className="animate-spin" size={20} />
                    <span>Running Screening...</span>
                  </>
                ) : (
                  <>
                    <Brain size={20} />
                    <span>Run Screening ({selectedResumes.length} resumes)</span>
                  </>
                )}
              </button>
            </div>
          </div>
        )}
      </div>
    );
  };

  const renderRanking = () => {
    // Get processed resumes (those with ATS scores)
    const processedResumes = resumes.filter(r => r.aiAnalysis.atsScore > 0);

    return (
    <div className="space-y-6">
      {/* Job Selection */}
      <div className="bg-white rounded-2xl p-6 border border-slate-200">
        <h2 className="text-xl font-bold text-slate-900 mb-4">Select Job for Candidate Ranking</h2>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-2">
              Posted Job <span className="text-red-500">*</span>
            </label>
            <select
              value={selectedJob}
              onChange={(e) => {
                setSelectedJob(e.target.value);
                // Auto-fill job description when job is selected
                const job = jobs.find(j => j._id === e.target.value);
                if (job) {
                  const fullDescription = `${job.title} - ${job.company}\n\nLocation: ${job.location}\nType: ${job.type}\nSalary: ${job.salary}\n\nDescription:\n${job.description}\n\nRequirements:\n${job.requirements.map((r, i) => `${i + 1}. ${r}`).join('\n')}\n\nResponsibilities:\n${job.responsibilities.map((r, i) => `${i + 1}. ${r}`).join('\n')}\n\nBenefits:\n${job.benefits.map((b, i) => `${i + 1}. ${b}`).join('\n')}`;
                  setJobDescription(fullDescription);
                  // Auto-select all processed resumes for ranking
                  setSelectedResumes(processedResumes.map(r => r._id));
                }
              }}
              className="w-full px-4 py-3 border border-slate-300 rounded-xl focus:outline-none focus:border-purple-500"
              disabled={rankingResumes}
            >
              <option value="">-- Select a Job Position --</option>
              {jobs.map(job => (
                <option key={job._id} value={job._id}>
                  {job.title} - {job.company} ({job.location})
                </option>
              ))}
            </select>
            <p className="text-xs text-slate-500 mt-1">
              💡 Candidates will be ranked for this specific job position
            </p>
          </div>

          {selectedJob && (
            <div className="p-4 bg-gradient-to-r from-purple-50 to-pink-50 rounded-xl border border-purple-200">
              <p className="text-sm font-semibold text-purple-900 mb-1">
                Selected Job: {jobs.find(j => j._id === selectedJob)?.title}
              </p>
              <p className="text-xs text-purple-700">
                {jobs.find(j => j._id === selectedJob)?.company} • {jobs.find(j => j._id === selectedJob)?.location}
              </p>
            </div>
          )}
        </div>

        <div className="flex items-center justify-between mt-4">
          <div className="flex items-center gap-3">
            <p className="text-sm text-slate-600">
              {selectedResumes.length} resumes selected for ranking
            </p>
            {processedResumes.length > 0 && (
              <button
                onClick={() => {
                  if (selectedResumes.length === processedResumes.length) {
                    setSelectedResumes([]);
                  } else {
                    setSelectedResumes(processedResumes.map(r => r._id));
                  }
                }}
                className="px-3 py-1 text-xs bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg transition-all"
              >
                {selectedResumes.length === processedResumes.length ? "Deselect All" : "Select All"}
              </button>
            )}
          </div>
          <button
            onClick={rankResumes}
            disabled={rankingResumes || selectedResumes.length === 0 || !selectedJob}
            className="px-6 py-2 bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-xl hover:shadow-lg transition-all disabled:opacity-50 flex items-center gap-2"
          >
            {rankingResumes ? (
              <>
                <Loader className="animate-spin" size={18} />
                Ranking...
              </>
            ) : (
              <>
                <BarChart2 size={18} />
                Rank Candidates
              </>
            )}
          </button>
        </div>
      </div>

      {/* Rankings Display */}
      {rankings.length > 0 && (
        <div className="bg-white rounded-2xl p-6 border border-slate-200">
          <h2 className="text-xl font-bold text-slate-900 mb-4">Top Candidates</h2>
          <div className="space-y-4">
            {rankings
              .sort((a, b) => a.rank - b.rank)
              .map((match, idx) => (
                <div
                  key={match._id}
                  className="p-4 border border-slate-200 rounded-xl hover:shadow-lg transition-all"
                >
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-4">
                      <div
                        className={`w-12 h-12 rounded-full flex items-center justify-center font-bold text-lg ${
                          idx === 0
                            ? "bg-gradient-to-br from-yellow-400 to-orange-500 text-white"
                            : idx === 1
                            ? "bg-gradient-to-br from-slate-300 to-slate-400 text-white"
                            : idx === 2
                            ? "bg-gradient-to-br from-orange-300 to-orange-400 text-white"
                            : "bg-slate-100 text-slate-700"
                        }`}
                      >
                        #{match.rank}
                      </div>
                      <div>
                        <button
                          onClick={() => openResumeViewer(match.resume?.originalFile, match.resume?.parsedData?.name)}
                          className="font-bold text-lg text-blue-700 hover:text-blue-900 hover:underline flex items-center gap-1 cursor-pointer"
                          title="Click to view resume"
                        >
                          {match.resume?.parsedData?.name || "Unknown"}
                          <Eye size={15} className="text-blue-400" />
                        </button>
                        <p className="text-sm text-slate-600">{match.resume?.parsedData?.email || "N/A"}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-3xl font-bold text-cyan-600">
                        {match.matchScore.toFixed(1)}%
                      </p>
                      <p className="text-sm text-slate-500">Match Score</p>
                    </div>
                  </div>

                  {match.strengths.length > 0 && (
                    <div className="mb-2">
                      <p className="text-sm font-semibold text-green-700 mb-1 flex items-center gap-2">
                        <TrendingUp size={16} />
                        Strengths
                      </p>
                      <div className="flex flex-wrap gap-2">
                        {match.strengths.map((strength, idx) => (
                          <span
                            key={idx}
                            className="px-3 py-1 bg-green-100 text-green-700 rounded-full text-sm"
                          >
                            {strength}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  {match.weaknesses.length > 0 && (
                    <div>
                      <p className="text-sm font-semibold text-red-700 mb-1 flex items-center gap-2">
                        <AlertTriangle size={16} />
                        Areas for Improvement
                      </p>
                      <div className="flex flex-wrap gap-2">
                        {match.weaknesses.map((weakness, idx) => (
                          <span
                            key={idx}
                            className="px-3 py-1 bg-red-100 text-red-700 rounded-full text-sm"
                          >
                            {weakness}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              ))}
          </div>
        </div>
      )}

      {/* Screened Results Section */}
      {processedResumes.length > 0 && (
        <div className="bg-white rounded-2xl p-6 border border-slate-200">
          <h3 className="text-lg font-bold text-slate-900 mb-4">
            Available Candidates to Rank ({processedResumes.length} screened)
          </h3>
          <div className="bg-gradient-to-r from-green-50 to-cyan-50 rounded-xl p-4 mb-4 border border-green-200">
            <p className="text-sm text-green-800">
              ✓ These resumes have been analyzed and screened. Select them below to rank for a job position.
            </p>
          </div>
          <table className="w-full">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                <th className="px-6 py-4 text-left">
                  <input
                    type="checkbox"
                    checked={processedResumes.length > 0 && processedResumes.every(r => selectedResumes.includes(r._id))}
                    onChange={() => {
                      if (processedResumes.every(r => selectedResumes.includes(r._id))) {
                        setSelectedResumes([]);
                      } else {
                        setSelectedResumes(processedResumes.map(r => r._id));
                      }
                    }}
                    className="w-4 h-4"
                  />
                </th>
                <th className="px-6 py-4 text-left text-sm font-semibold text-slate-900">Candidate Name</th>
                <th className="px-6 py-4 text-left text-sm font-semibold text-slate-900">Email</th>
                <th className="px-6 py-4 text-left text-sm font-semibold text-slate-900">ATS Score</th>
                <th className="px-6 py-4 text-left text-sm font-semibold text-slate-900">Grade</th>
                <th className="px-6 py-4 text-left text-sm font-semibold text-slate-900">Skills Match</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {processedResumes
                .sort((a, b) => b.aiAnalysis.atsScore - a.aiAnalysis.atsScore)
                .map((resume) => (
                <tr key={resume._id} className={`hover:bg-slate-50 transition-all ${selectedResumes.includes(resume._id) ? 'bg-purple-50' : ''}`}>
                  <td className="px-6 py-4">
                    <input
                      type="checkbox"
                      checked={selectedResumes.includes(resume._id)}
                      onChange={() => toggleResumeSelection(resume._id)}
                      className="w-4 h-4"
                    />
                  </td>
                  <td className="px-6 py-4 font-medium text-slate-900">
                    <button
                      onClick={() => openResumeViewer(resume.originalFile, resume.parsedData?.name)}
                      className="text-left font-medium text-blue-700 hover:text-blue-900 hover:underline flex items-center gap-1 cursor-pointer"
                      title="Click to view resume"
                    >
                      {resume.parsedData?.name || "Unknown"}
                      <Eye size={14} className="text-blue-400" />
                    </button>
                  </td>
                  <td className="px-6 py-4 text-slate-600">
                    {resume.parsedData?.email || "N/A"}
                  </td>
                  <td className="px-6 py-4">
                    <span
                      className={`px-3 py-1 rounded-full text-sm font-semibold ${
                        resume.aiAnalysis.atsScore >= 80
                          ? "bg-green-100 text-green-700"
                          : resume.aiAnalysis.atsScore >= 60
                          ? "bg-yellow-100 text-yellow-700"
                          : "bg-red-100 text-red-700"
                      }`}
                    >
                      {resume.aiAnalysis.atsScore}%
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    {resume.aiAnalysis.atsScore >= 80 ? (
                      <span className="text-green-700 font-semibold">Excellent</span>
                    ) : resume.aiAnalysis.atsScore >= 60 ? (
                      <span className="text-yellow-700 font-semibold">Good</span>
                    ) : (
                      <span className="text-red-700 font-semibold">Poor</span>
                    )}
                  </td>
                  <td className="px-6 py-4">
                    {resume.parsedData?.skills && resume.parsedData.skills.length > 0 ? (
                      <div className="flex flex-wrap gap-1">
                        {resume.parsedData.skills.slice(0, 2).map((skill, idx) => (
                          <span
                            key={idx}
                            className="px-2 py-1 bg-blue-100 text-blue-700 rounded text-xs"
                          >
                            {skill}
                          </span>
                        ))}
                        {resume.parsedData.skills.length > 2 && (
                          <span className="px-2 py-1 bg-slate-100 text-slate-600 rounded text-xs">
                            +{resume.parsedData.skills.length - 2}
                          </span>
                        )}
                      </div>
                    ) : (
                      <span className="text-slate-400 text-sm">N/A</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Show screening section if no rankings yet */}
      {rankings.length === 0 && (
        <div className="bg-white rounded-2xl p-6 border border-slate-200">
          <h3 className="text-lg font-semibold text-slate-900 mb-4">Select Resumes to Rank</h3>
          <p className="text-slate-600 mb-4">
            Go to Resume Screening to select candidates for ranking
          </p>
          <button
            onClick={() => setActiveSection("screening")}
            className="bg-gradient-to-r from-blue-600 to-cyan-600 text-white px-6 py-2 rounded-xl"
          >
            Go to Screening
          </button>
        </div>
      )}
    </div>
    );
  };

  const renderApplications = () => {
    const statusColors: Record<string, { label: string; bg: string; text: string; border: string }> = {
      pending: { label: "Pending", bg: "bg-amber-50", text: "text-amber-700", border: "border-amber-200" },
      reviewing: { label: "Reviewing", bg: "bg-blue-50", text: "text-blue-700", border: "border-blue-200" },
      shortlisted: { label: "Shortlisted", bg: "bg-purple-50", text: "text-purple-700", border: "border-purple-200" },
      interview_scheduled: { label: "Interview", bg: "bg-cyan-50", text: "text-cyan-700", border: "border-cyan-200" },
      selected: { label: "Selected", bg: "bg-green-50", text: "text-green-700", border: "border-green-200" },
      rejected: { label: "Rejected", bg: "bg-red-50", text: "text-red-700", border: "border-red-200" },
    };

    const statuses = ["all", "pending", "reviewing", "shortlisted", "interview_scheduled", "selected", "rejected"];
    const filteredApps = appStatusFilter === "all"
      ? receivedApplications
      : receivedApplications.filter((a) => a.status === appStatusFilter);

    // Group applications by jobSeeker to deduplicate resumes
    const grouped: Record<string, { seeker: ReceivedApplication["jobSeeker"]; resume: ReceivedApplication["resume"]; applications: ReceivedApplication[] }> = {};
    filteredApps.forEach((app) => {
      const key = app.jobSeeker?._id || app._id;
      if (!grouped[key]) {
        grouped[key] = { seeker: app.jobSeeker, resume: app.resume, applications: [] };
      }
      grouped[key].applications.push(app);
    });
    const groupedEntries = Object.values(grouped);

    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-bold text-slate-900">
            Job Applications Received
            <span className="ml-3 text-base font-semibold text-slate-500">
              ({receivedApplications.length} applications from {Object.keys(grouped).length} candidates)
            </span>
          </h2>
          <button
            onClick={() => fetchReceivedApplications()}
            className="px-4 py-2 bg-blue-600 text-white rounded-xl text-sm font-semibold hover:bg-blue-700 transition-all"
          >
            Refresh
          </button>
        </div>

        {/* Filter Tabs */}
        <div className="bg-white rounded-2xl p-4 border border-slate-200">
          <div className="flex flex-wrap gap-2">
            {statuses.map((s) => {
              const config = s === "all" ? null : statusColors[s];
              const count = s === "all" ? receivedApplications.length : receivedApplications.filter((a) => a.status === s).length;
              return (
                <button
                  key={s}
                  onClick={() => setAppStatusFilter(s)}
                  className={`px-4 py-2 rounded-xl text-sm font-semibold transition-all flex items-center gap-2 ${
                    appStatusFilter === s
                      ? "bg-blue-600 text-white"
                      : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                  }`}
                >
                  {s === "all" ? "All" : config?.label || s}
                  <span className={`px-2 py-0.5 rounded-full text-xs ${appStatusFilter === s ? "bg-white/20 text-white" : "bg-slate-200 text-slate-700"}`}>
                    {count}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {receivedApplications.length === 0 ? (
          <div className="text-center py-16 bg-white rounded-2xl border border-slate-200">
            <Send className="mx-auto text-slate-300" size={56} />
            <p className="text-slate-700 text-lg mt-4 font-semibold">No applications received yet</p>
            <p className="text-slate-500 mt-2">Job seekers will apply to your posted jobs and their applications will appear here.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {groupedEntries.map((group) => {
              const { seeker, resume, applications: apps } = group;
              const latestApp = apps[0];
              return (
                <div key={seeker?._id || latestApp._id} className="bg-white rounded-2xl border border-slate-200 hover:shadow-lg transition-all p-6">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      {/* Applicant Name */}
                      <div className="flex items-center gap-3 mb-3 flex-wrap">
                        <h3 className="text-lg font-bold text-slate-900">
                          {seeker?.name || "Unknown Applicant"}
                        </h3>
                        <span className="text-sm text-slate-500">{seeker?.email}</span>
                        <span className="px-2 py-0.5 bg-cyan-50 text-cyan-700 rounded-full text-xs font-bold border border-cyan-200">
                          {apps.length} {apps.length === 1 ? "application" : "applications"}
                        </span>
                      </div>

                      {/* Jobs Applied For - Each with VR prefix */}
                      <div className="space-y-2 mb-3">
                        {apps.map((app) => {
                          const config = statusColors[app.status] || statusColors.pending;
                          return (
                            <div key={app._id} className="flex items-center gap-3 flex-wrap">
                              <div className="flex items-center gap-2">
                                <span className="px-2 py-1 bg-gradient-to-r from-blue-600 to-cyan-600 text-white rounded-lg text-xs font-bold">
                                  VR
                                </span>
                                <Briefcase size={14} className="text-cyan-600" />
                                <span className="text-sm font-semibold text-slate-800">
                                  {app.job?.title || "Unknown Job"}
                                </span>
                                {app.job?.company && (
                                  <span className="text-xs text-slate-500">at {app.job.company}</span>
                                )}
                              </div>
                              <span className={`px-2 py-0.5 rounded-full text-xs font-bold border ${config.bg} ${config.text} ${config.border}`}>
                                {config.label}
                              </span>
                              {app.matchScore > 0 && (
                                <span className={`text-xs font-bold ${app.matchScore >= 70 ? "text-green-600" : app.matchScore >= 40 ? "text-amber-600" : "text-red-600"}`}>
                                  Match: {app.matchScore}%
                                </span>
                              )}
                              <span className="text-xs text-slate-400">
                                {new Date(app.appliedAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                              </span>
                              {/* Per-application status update */}
                              <select
                                value={app.status}
                                onChange={(e) => updateApplicationStatus(app._id, e.target.value)}
                                className="ml-auto px-2 py-1 border border-slate-200 rounded-lg text-xs font-semibold bg-white focus:ring-1 focus:ring-blue-500 focus:outline-none"
                              >
                                <option value="pending">Pending</option>
                                <option value="reviewing">Reviewing</option>
                                <option value="shortlisted">Shortlisted</option>
                                <option value="interview_scheduled">Interview</option>
                                <option value="selected">Selected</option>
                                <option value="rejected">Rejected</option>
                              </select>
                            </div>
                          );
                        })}
                      </div>

                      {/* Single Resume File (deduplicated) */}
                      {resume && (
                        <div className="flex items-center gap-3 px-3 py-2 bg-slate-50 rounded-xl border border-slate-200">
                          <FileText size={14} className="text-blue-600 flex-shrink-0" />
                          <span className="text-sm font-medium text-slate-700">
                            {resume.originalFileName || resume.parsedData?.name || "Resume"}
                          </span>
                          {resume.aiAnalysis?.atsScore != null && (
                            <span className="px-2 py-0.5 bg-blue-50 text-blue-700 rounded-full text-xs font-semibold border border-blue-200">
                              ATS: {resume.aiAnalysis.atsScore}%
                            </span>
                          )}
                          {resume.parsedData?.skills && resume.parsedData.skills.length > 0 && (
                            <div className="flex gap-1 flex-wrap">
                              {resume.parsedData.skills.slice(0, 4).map((skill, i) => (
                                <span key={i} className="px-2 py-0.5 bg-green-50 text-green-700 rounded text-xs border border-green-200">
                                  {skill}
                                </span>
                              ))}
                              {resume.parsedData.skills.length > 4 && (
                                <span className="text-xs text-slate-400">+{resume.parsedData.skills.length - 4}</span>
                              )}
                            </div>
                          )}
                          {/* View Resume Button */}
                          {resume.originalFile && (
                            <button
                              onClick={() => openResumeViewer((resume as any).originalFile, (resume as any).parsedData?.name)}
                              className="ml-auto flex items-center gap-1 px-3 py-1 bg-blue-600 text-white rounded-lg text-xs font-semibold hover:bg-blue-700 transition-all"
                            >
                              <Eye size={12} />
                              View
                            </button>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    );
  };

  const renderAnomalies = () => {
    // Get resumes that have anomaly reports (flagged or with indicators)
    const resumeIdsWithAnomalies = new Set(anomalyReports.map(r => r.resume?._id));
    const resumesWithAnomalies = resumes.filter(r => resumeIdsWithAnomalies.has(r._id) || r.anomalyDetection?.hasAnomalies);
    
    return (
    <div className="space-y-6">
      {/* Summary stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-2xl p-5 border border-slate-200">
          <p className="text-sm text-slate-600">Total Screened</p>
          <p className="text-3xl font-bold text-slate-900">{resumes.filter(r => r.aiAnalysis?.atsScore > 0).length}</p>
        </div>
        <div className="bg-red-50 rounded-2xl p-5 border border-red-200">
          <p className="text-sm text-red-600">Flagged</p>
          <p className="text-3xl font-bold text-red-700">{anomalyReports.filter(r => r.status === "flagged").length}</p>
        </div>
        <div className="bg-green-50 rounded-2xl p-5 border border-green-200">
          <p className="text-sm text-green-600">Cleared</p>
          <p className="text-3xl font-bold text-green-700">{anomalyReports.filter(r => r.status === "cleared").length}</p>
        </div>
        <div className="bg-amber-50 rounded-2xl p-5 border border-amber-200">
          <p className="text-sm text-amber-600">Pending</p>
          <p className="text-3xl font-bold text-amber-700">{anomalyReports.filter(r => r.status === "pending").length}</p>
        </div>
      </div>

      {/* Anomaly Detection Results */}
      {resumesWithAnomalies.length > 0 && (
        <div className="bg-white rounded-2xl p-6 border border-slate-200">
          <h2 className="text-2xl font-bold text-slate-900 mb-4">Resumes with Anomalies Detected</h2>
          <div className="bg-red-50 rounded-xl p-4 mb-4 border border-red-200">
            <p className="text-sm text-red-800">
              ⚠️ Below are resumes where anomalies were detected during screening. Click any row to see full details.
            </p>
          </div>
          <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                <th className="px-4 py-4 text-left text-sm font-semibold text-slate-900">Candidate Name</th>
                <th className="px-4 py-4 text-left text-sm font-semibold text-slate-900">Email</th>
                <th className="px-4 py-4 text-left text-sm font-semibold text-slate-900">ATS Score</th>
                <th className="px-4 py-4 text-left text-sm font-semibold text-slate-900">Anomaly Risk</th>
                <th className="px-4 py-4 text-left text-sm font-semibold text-slate-900">Anomalies Found</th>
                <th className="px-4 py-4 text-left text-sm font-semibold text-slate-900">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {resumesWithAnomalies.map((resume) => {
                const anomalyReport = anomalyReports.find(r => r.resume && r.resume._id === resume._id);
                return (
                  <tr
                    key={resume._id}
                    className="hover:bg-blue-50 transition-all cursor-pointer border-l-4 border-l-transparent hover:border-l-blue-500"
                    onClick={() => {
                      setSelectedAnomalyResume(resume);
                      setSelectedAnomalyReport(anomalyReport || null);
                    }}
                  >
                    <td className="px-4 py-4 font-medium text-slate-900">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          openResumeViewer(resume.originalFile, resume.parsedData?.name);
                        }}
                        className="text-left font-medium text-blue-700 hover:text-blue-900 hover:underline flex items-center gap-1 cursor-pointer"
                        title="Click to view resume"
                      >
                        {resume.parsedData?.name || "Unknown"}
                        <Eye size={14} className="text-blue-400" />
                      </button>
                    </td>
                    <td className="px-4 py-4 text-slate-600">
                      {resume.parsedData?.email || "N/A"}
                    </td>
                    <td className="px-4 py-4">
                      <span
                        className={`px-3 py-1 rounded-full text-sm font-semibold ${
                          resume.aiAnalysis.atsScore >= 80
                            ? "bg-green-100 text-green-700"
                            : resume.aiAnalysis.atsScore >= 60
                            ? "bg-yellow-100 text-yellow-700"
                            : "bg-red-100 text-red-700"
                        }`}
                      >
                        {resume.aiAnalysis.atsScore}%
                      </span>
                    </td>
                    <td className="px-4 py-4">
                      {anomalyReport ? (
                        <span
                          className={`px-3 py-1 rounded-full text-sm font-semibold ${
                            anomalyReport.riskScore > 50
                              ? "bg-red-100 text-red-700"
                              : anomalyReport.riskScore > 25
                              ? "bg-yellow-100 text-yellow-700"
                              : "bg-green-100 text-green-700"
                          }`}
                        >
                          {anomalyReport.riskScore}% - {anomalyReport.riskLevel || "Low"}
                        </span>
                      ) : (
                        <span className="px-3 py-1 rounded-full text-sm font-semibold bg-slate-100 text-slate-500">
                          Not analyzed
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-4">
                      {anomalyReport && anomalyReport.indicators.length > 0 ? (
                        <div className="flex flex-wrap gap-1 max-w-xs">
                          {anomalyReport.indicators.slice(0, 3).map((indicator: string, idx: number) => (
                            <span key={idx} className="px-2 py-0.5 bg-red-100 text-red-700 rounded text-xs font-medium truncate max-w-[180px]" title={indicator}>
                              {indicator.length > 30 ? indicator.slice(0, 30) + '…' : indicator}
                            </span>
                          ))}
                          {anomalyReport.indicators.length > 3 && (
                            <span className="px-2 py-0.5 bg-slate-100 text-slate-600 rounded text-xs font-medium">
                              +{anomalyReport.indicators.length - 3} more
                            </span>
                          )}
                        </div>
                      ) : (
                        <span className="text-slate-400 text-sm">No anomalies</span>
                      )}
                    </td>
                    <td className="px-4 py-4">
                      {anomalyReport ? (
                        <span
                          className={`px-3 py-1 rounded-full text-xs font-semibold ${
                            anomalyReport.status === "flagged"
                              ? "bg-red-100 text-red-700"
                              : anomalyReport.status === "pending"
                              ? "bg-amber-100 text-amber-700"
                              : "bg-green-100 text-green-700"
                          }`}
                        >
                          {anomalyReport.status === "flagged" ? "⚠️ Flagged" : anomalyReport.status === "pending" ? "⏳ Pending" : "✓ Cleared"}
                        </span>
                      ) : (
                        <span className="text-slate-400 text-sm">—</span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          </div>
        </div>
      )}

      <div className="bg-white rounded-2xl p-6 border border-slate-200">
        <h2 className="text-2xl font-bold text-slate-900 mb-4">Anomaly Detection Reports</h2>

        {anomalyReports.length === 0 ? (
          <div className="text-center py-12">
            <Shield className="mx-auto text-slate-400 mb-4" size={48} />
            <p className="text-slate-600 mb-4">No anomaly reports generated yet</p>
            <button
              onClick={() => setActiveSection("screening")}
              className="bg-gradient-to-r from-blue-600 to-cyan-600 text-white px-6 py-2 rounded-xl"
            >
              Run Anomaly Detection
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            {anomalyReports
              .sort((a, b) => b.riskScore - a.riskScore)
              .map((report) => (
              <div
                key={report._id}
                className={`p-6 rounded-xl border-2 ${
                  report.status === "flagged"
                    ? "border-red-300 bg-red-50"
                    : "border-green-300 bg-green-50"
                }`}
              >
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <p className="font-bold text-lg text-slate-900">
                      {report.resume.parsedData.name}
                    </p>
                    <p className="text-sm text-slate-600">{report.resume.parsedData.email}</p>
                  </div>
                  <div className="text-right">
                    <div className="flex items-center gap-2 mb-1">
                      {report.status === "flagged" ? (
                        <XCircle className="text-red-600" size={24} />
                      ) : (
                        <CheckCircle className="text-green-600" size={24} />
                      )}
                      <span
                        className={`font-bold text-2xl ${
                          report.riskScore > 50 ? "text-red-600" : "text-green-600"
                        }`}
                      >
                        {report.riskScore}%
                      </span>
                    </div>
                    <p className="text-sm font-semibold text-slate-600">
                      Risk Level: {report.riskLevel}
                    </p>
                  </div>
                </div>

                {report.indicators.length > 0 && (
                  <div className="mb-3">
                    <p className="text-sm font-semibold text-slate-900 mb-2">
                      Anomaly Indicators:
                    </p>
                    <div className="space-y-1">
                      {report.indicators.map((indicator, idx) => (
                        <div
                          key={idx}
                          className="px-3 py-2 bg-white rounded-lg text-sm text-slate-700 border border-slate-200"
                        >
                          • {indicator}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {report.duplicates.length > 0 && (
                  <div>
                    <p className="text-sm font-semibold text-red-700 mb-2">
                      Potential Duplicates Found:
                    </p>
                    <div className="space-y-1">
                      {report.duplicates.map((dup, idx) => (
                        <div
                          key={idx}
                          className="px-3 py-2 bg-red-100 rounded-lg text-sm text-red-700"
                        >
                          {dup}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Anomaly Details Dialog */}
      {selectedAnomalyResume && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[9999] p-4 isolate">
          <div className="bg-white rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-white border-b border-slate-200 p-6 flex items-center justify-between">
              <h2 className="text-2xl font-bold text-slate-900">Anomaly Details</h2>
              <button
                onClick={() => {
                  setSelectedAnomalyResume(null);
                  setSelectedAnomalyReport(null);
                }}
                className="text-slate-400 hover:text-slate-600 transition-colors"
              >
                <X size={24} />
              </button>
            </div>

            <div className="p-6 space-y-6">
              {/* Candidate Info */}
              <div className="border border-slate-200 rounded-xl p-4">
                <h3 className="text-lg font-semibold text-slate-900 mb-3">Candidate Information</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-slate-600">Name</p>
                    <p className="font-semibold text-slate-900">{selectedAnomalyResume.parsedData?.name || "Unknown"}</p>
                  </div>
                  <div>
                    <p className="text-sm text-slate-600">Email</p>
                    <p className="font-semibold text-slate-900">{selectedAnomalyResume.parsedData?.email || "N/A"}</p>
                  </div>
                </div>
              </div>

              {/* Check if anomaly data exists */}
              {selectedAnomalyReport ? (
                <>
                  {/* Risk Assessment */}
                  <div className={`rounded-xl p-4 ${selectedAnomalyReport.status === "flagged" ? "border-2 border-red-300 bg-red-50" : "border-2 border-green-300 bg-green-50"}`}>
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="text-lg font-semibold text-slate-900">Risk Assessment</h3>
                      <div className="flex items-center gap-2">
                        {selectedAnomalyReport.status === "flagged" ? (
                          <XCircle className="text-red-600" size={32} />
                        ) : (
                          <CheckCircle className="text-green-600" size={32} />
                        )}
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <p className="text-sm text-slate-600">Risk Score</p>
                        <p className={`text-3xl font-bold ${selectedAnomalyReport.riskScore > 50 ? "text-red-600" : "text-green-600"}`}>
                          {selectedAnomalyReport.riskScore}%
                        </p>
                      </div>
                      <div>
                        <p className="text-sm text-slate-600">Risk Level</p>
                        <p className="text-xl font-semibold text-slate-900">{selectedAnomalyReport.riskLevel}</p>
                      </div>
                    </div>
                    <div className="mt-4">
                      <p className="text-sm text-slate-600">Status</p>
                      <span className={`inline-block px-4 py-2 rounded-full font-semibold text-sm ${
                        selectedAnomalyReport.status === "flagged"
                          ? "bg-red-200 text-red-700"
                          : "bg-green-200 text-green-700"
                      }`}>
                        {selectedAnomalyReport.status === "flagged" ? "⚠️ Flagged" : "✓ Cleared"}
                      </span>
                    </div>
                  </div>

                  {/* Anomaly Indicators - Issues Found */}
                  {selectedAnomalyReport.indicators.length > 0 && (
                    <div className="border border-red-300 rounded-xl p-4 bg-red-50">
                      <h3 className="text-lg font-semibold text-red-700 mb-4 flex items-center gap-2">
                        <AlertTriangle size={20} />
                        Issues Found ({selectedAnomalyReport.indicators.length})
                      </h3>
                      <div className="space-y-3">
                        {selectedAnomalyReport.indicators.map((indicator, idx) => (
                          <div
                            key={idx}
                            className="px-4 py-3 bg-white border border-red-200 rounded-lg text-sm text-red-700 flex items-start gap-3"
                          >
                            <div className="flex-shrink-0 mt-0.5">
                              <div className="flex items-center justify-center h-5 w-5 rounded-full bg-red-500 text-white text-xs font-bold">
                                !
                              </div>
                            </div>
                            <span className="flex-1">{indicator}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Duplicate Detection */}
                  {selectedAnomalyReport.duplicates.length > 0 && (
                    <div className="border border-red-300 rounded-xl p-4 bg-red-50">
                      <h3 className="text-lg font-semibold text-red-700 mb-4 flex items-center gap-2">
                        <XCircle size={20} />
                        Potential Duplicates
                      </h3>
                      <div className="space-y-3">
                        {selectedAnomalyReport.duplicates.map((dup, idx) => (
                          <div
                            key={idx}
                            className="px-4 py-3 bg-white border border-red-200 rounded-lg text-sm text-red-700 flex items-start gap-3"
                          >
                            <XCircle size={18} className="flex-shrink-0 mt-0.5" />
                            <span>{dup}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {selectedAnomalyReport.indicators.length === 0 && selectedAnomalyReport.duplicates.length === 0 && (
                    <div className="border border-green-300 rounded-xl p-6 bg-green-50">
                      <div className="flex items-center justify-center gap-3">
                        <CheckCircle className="text-green-600" size={32} />
                        <p className="text-center text-green-700 font-semibold text-lg">✓ No anomalies detected</p>
                      </div>
                    </div>
                  )}
                </>
              ) : (
                /* No anomaly data yet */
                <div className="border border-blue-300 rounded-xl p-6 bg-blue-50">
                  <div className="flex items-center gap-3 mb-3">
                    <Brain className="text-blue-600" size={24} />
                    <h3 className="text-lg font-semibold text-blue-900">Anomaly Detection Not Run</h3>
                  </div>
                  <p className="text-blue-800 mb-4">
                    Anomaly detection analysis has not been performed for this resume yet.
                  </p>
                  <button
                    onClick={() => {
                      setSelectedAnomalyResume(null);
                      setSelectedAnomalyReport(null);
                      setActiveSection("screening");
                    }}
                    className="bg-blue-600 text-white px-4 py-2 rounded-lg font-semibold hover:bg-blue-700 transition-colors"
                  >
                    Run Anomaly Detection
                  </button>
                </div>
              )}
            </div>

            <div className="border-t border-slate-200 p-6 flex gap-3 justify-end bg-slate-50">
              <button
                onClick={() => {
                  setSelectedAnomalyResume(null);
                  setSelectedAnomalyReport(null);
                }}
                className="px-6 py-2 bg-slate-200 text-slate-700 rounded-xl font-semibold hover:bg-slate-300 transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
    );
  };

  const renderJobModal = () => {
    if (!showJobModal) return null;

    return (
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[9999] p-4 isolate">
        <div className="bg-white rounded-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto shadow-2xl">
          <div className="sticky top-0 bg-white border-b border-slate-200 p-6 flex items-center justify-between">
            <h2 className="text-2xl font-bold text-slate-900">
              {editingJob ? "Edit Job" : "Post New Job"}
            </h2>
            <button
              onClick={closeJobModal}
              className="p-2 hover:bg-slate-100 rounded-lg transition-all"
            >
              <X size={24} />
            </button>
          </div>

          <div className="p-6 space-y-6">
            {/* Basic Information */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-semibold text-slate-900 mb-2">
                  Job Title *
                </label>
                <input
                  type="text"
                  value={jobForm.title}
                  onChange={(e) => handleJobFormChange("title", e.target.value)}
                  className="w-full px-4 py-3 border border-slate-300 rounded-xl focus:outline-none focus:border-cyan-500"
                  placeholder="e.g., Senior Software Engineer"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-slate-900 mb-2">
                  Company *
                </label>
                <input
                  type="text"
                  value={jobForm.company}
                  onChange={(e) => handleJobFormChange("company", e.target.value)}
                  className="w-full px-4 py-3 border border-slate-300 rounded-xl focus:outline-none focus:border-cyan-500"
                  placeholder="e.g., Tech Corp"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-slate-900 mb-2">
                  Location
                </label>
                <input
                  type="text"
                  value={jobForm.location}
                  onChange={(e) => handleJobFormChange("location", e.target.value)}
                  className="w-full px-4 py-3 border border-slate-300 rounded-xl focus:outline-none focus:border-cyan-500"
                  placeholder="e.g., Remote, New York, NY"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-slate-900 mb-2">
                  Job Type
                </label>
                <select
                  value={jobForm.type}
                  onChange={(e) => handleJobFormChange("type", e.target.value)}
                  className="w-full px-4 py-3 border border-slate-300 rounded-xl focus:outline-none focus:border-cyan-500"
                >
                  <option value="full-time">Full-time</option>
                  <option value="part-time">Part-time</option>
                  <option value="contract">Contract</option>
                  <option value="internship">Internship</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-semibold text-slate-900 mb-2">Salary</label>
                <input
                  type="text"
                  value={jobForm.salary}
                  onChange={(e) => handleJobFormChange("salary", e.target.value)}
                  className="w-full px-4 py-3 border border-slate-300 rounded-xl focus:outline-none focus:border-cyan-500"
                  placeholder="e.g., $80,000 - $120,000"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-slate-900 mb-2">Status</label>
                <select
                  value={jobForm.status}
                  onChange={(e) => handleJobFormChange("status", e.target.value)}
                  className="w-full px-4 py-3 border border-slate-300 rounded-xl focus:outline-none focus:border-cyan-500"
                >
                  <option value="active">Active</option>
                  <option value="closed">Closed</option>
                  <option value="draft">Draft</option>
                </select>
              </div>
            </div>

            {/* Job Description */}
            <div>
              <label className="block text-sm font-semibold text-slate-900 mb-2">
                Job Description *
              </label>
              <textarea
                value={jobForm.description}
                onChange={(e) => handleJobFormChange("description", e.target.value)}
                className="w-full h-32 px-4 py-3 border border-slate-300 rounded-xl focus:outline-none focus:border-cyan-500 resize-none"
                placeholder="Describe the role, responsibilities, and requirements..."
              />
            </div>

            {/* Requirements */}
            <div>
              <label className="block text-sm font-semibold text-slate-900 mb-2">
                Requirements
              </label>
              <div className="flex gap-2 mb-2">
                <input
                  type="text"
                  value={tempRequirement}
                  onChange={(e) => setTempRequirement(e.target.value)}
                  onKeyPress={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      addToArray("requirements", tempRequirement);
                    }
                  }}
                  className="flex-1 px-4 py-2 border border-slate-300 rounded-xl focus:outline-none focus:border-cyan-500"
                  placeholder="Add a requirement..."
                />
                <button
                  onClick={() => addToArray("requirements", tempRequirement)}
                  className="px-4 py-2 bg-cyan-600 text-white rounded-xl hover:bg-cyan-700 transition-all"
                >
                  Add
                </button>
              </div>
              <div className="flex flex-wrap gap-2">
                {jobForm.requirements.map((req, idx) => (
                  <span
                    key={idx}
                    className="px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-sm flex items-center gap-2"
                  >
                    {req}
                    <button
                      onClick={() => removeFromArray("requirements", idx)}
                      className="hover:text-blue-900"
                    >
                      <X size={14} />
                    </button>
                  </span>
                ))}
              </div>
            </div>

            {/* Responsibilities */}
            <div>
              <label className="block text-sm font-semibold text-slate-900 mb-2">
                Responsibilities
              </label>
              <div className="flex gap-2 mb-2">
                <input
                  type="text"
                  value={tempResponsibility}
                  onChange={(e) => setTempResponsibility(e.target.value)}
                  onKeyPress={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      addToArray("responsibilities", tempResponsibility);
                    }
                  }}
                  className="flex-1 px-4 py-2 border border-slate-300 rounded-xl focus:outline-none focus:border-cyan-500"
                  placeholder="Add a responsibility..."
                />
                <button
                  onClick={() => addToArray("responsibilities", tempResponsibility)}
                  className="px-4 py-2 bg-cyan-600 text-white rounded-xl hover:bg-cyan-700 transition-all"
                >
                  Add
                </button>
              </div>
              <div className="flex flex-wrap gap-2">
                {jobForm.responsibilities.map((resp, idx) => (
                  <span
                    key={idx}
                    className="px-3 py-1 bg-green-100 text-green-700 rounded-full text-sm flex items-center gap-2"
                  >
                    {resp}
                    <button
                      onClick={() => removeFromArray("responsibilities", idx)}
                      className="hover:text-green-900"
                    >
                      <X size={14} />
                    </button>
                  </span>
                ))}
              </div>
            </div>

            {/* Benefits */}
            <div>
              <label className="block text-sm font-semibold text-slate-900 mb-2">Benefits</label>
              <div className="flex gap-2 mb-2">
                <input
                  type="text"
                  value={tempBenefit}
                  onChange={(e) => setTempBenefit(e.target.value)}
                  onKeyPress={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      addToArray("benefits", tempBenefit);
                    }
                  }}
                  className="flex-1 px-4 py-2 border border-slate-300 rounded-xl focus:outline-none focus:border-cyan-500"
                  placeholder="Add a benefit..."
                />
                <button
                  onClick={() => addToArray("benefits", tempBenefit)}
                  className="px-4 py-2 bg-cyan-600 text-white rounded-xl hover:bg-cyan-700 transition-all"
                >
                  Add
                </button>
              </div>
              <div className="flex flex-wrap gap-2">
                {jobForm.benefits.map((benefit, idx) => (
                  <span
                    key={idx}
                    className="px-3 py-1 bg-purple-100 text-purple-700 rounded-full text-sm flex items-center gap-2"
                  >
                    {benefit}
                    <button
                      onClick={() => removeFromArray("benefits", idx)}
                      className="hover:text-purple-900"
                    >
                      <X size={14} />
                    </button>
                  </span>
                ))}
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="sticky bottom-0 bg-white border-t border-slate-200 p-6 flex items-center justify-end gap-4">
            <button
              onClick={closeJobModal}
              className="px-6 py-3 border border-slate-300 text-slate-700 rounded-xl hover:bg-slate-50 transition-all"
            >
              Cancel
            </button>
            <button
              onClick={handlePostJob}
              className="px-6 py-3 bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-xl hover:shadow-lg transition-all flex items-center gap-2"
            >
              <Send size={18} />
              {editingJob ? "Update Job" : "Post Job"}
            </button>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="flex h-screen bg-slate-50">
      {/* AI Screening Results Modal */}
      {showResultsModal && screeningResults && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[9999] p-4 isolate">
          <div className="bg-white rounded-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto shadow-2xl">
            {/* Header */}
            <div className="sticky top-0 bg-gradient-to-r from-green-600 to-emerald-600 text-white p-6 rounded-t-2xl z-10">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <CheckCircle size={32} />
                  <div>
                    <h2 className="text-2xl font-bold">AI Screening Complete!</h2>
                    <p className="text-green-100">
                      Job: <span className="font-semibold">{jobs.find(j => j._id === selectedJob)?.title || 'Unknown'}</span>
                    </p>
                    <p className="text-green-100">
                      Successfully processed {screeningResults.successful} of {screeningResults.successful + screeningResults.failed} resumes
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setShowResultsModal(false)}
                  className="p-2 hover:bg-white/20 rounded-lg transition-all"
                >
                  <X size={24} />
                </button>
              </div>
            </div>

            {/* Results Body */}
            <div className="p-6 space-y-6">
              {/* All Candidates Sorted by ATS Score */}
              {screeningResults.ranked && screeningResults.processed.length > 0 && (
                <div>
                  <h3 className="text-xl font-bold text-slate-900 mb-4 flex items-center gap-2">
                    📊 All Candidates (Sorted by ATS Score)
                  </h3>
                  
                  {/* Summary Stats - Dynamic based on selected threshold */}
                  <div className="grid grid-cols-4 gap-3 mb-4">
                    <div className="bg-gradient-to-br from-green-50 to-emerald-50 border border-green-200 rounded-lg p-3">
                      <p className="text-2xl font-bold text-green-600">{screeningResults.processed.filter((r: any) => r.atsScore >= atsThreshold).length}</p>
                      <p className="text-xs text-green-700">High Score (≥{atsThreshold}%)</p>
                    </div>
                    <div className="bg-gradient-to-br from-blue-50 to-cyan-50 border border-blue-200 rounded-lg p-3">
                      <p className="text-2xl font-bold text-blue-600">{screeningResults.processed.filter((r: any) => r.atsScore >= (atsThreshold - 10) && r.atsScore < atsThreshold).length}</p>
                      <p className="text-xs text-blue-700">Needs Review ({atsThreshold - 10}-{atsThreshold}%)</p>
                    </div>
                    <div className="bg-gradient-to-br from-amber-50 to-orange-50 border border-amber-200 rounded-lg p-3">
                      <p className="text-2xl font-bold text-amber-600">{screeningResults.processed.filter((r: any) => r.atsScore < (atsThreshold - 10)).length}</p>
                      <p className="text-xs text-amber-700">Rejected (Below {atsThreshold - 10}%)</p>
                    </div>
                    <div className="bg-gradient-to-br from-purple-50 to-pink-50 border border-purple-200 rounded-lg p-3">
                      <p className="text-2xl font-bold text-purple-600">{screeningResults.processed.length}</p>
                      <p className="text-xs text-purple-700">Total Candidates</p>
                    </div>
                  </div>

                  {/* Table Header */}
                  <div className="overflow-x-auto mb-4">
                    <table className="w-full">
                      <thead>
                        <tr className="bg-slate-100 border-b-2 border-slate-300">
                          <th className="text-left px-4 py-3 font-bold text-slate-700">Rank</th>
                          <th className="text-left px-4 py-3 font-bold text-slate-700">Candidate Name</th>
                          <th className="text-left px-4 py-3 font-bold text-slate-700">Email</th>
                          <th className="text-center px-4 py-3 font-bold text-slate-700">ATS Score</th>
                          <th className="text-center px-4 py-3 font-bold text-slate-700">Anomalies</th>
                          <th className="text-center px-4 py-3 font-bold text-slate-700">Decision</th>
                        </tr>
                      </thead>
                      <tbody>
                        {screeningResults.processed
                          .slice()
                          .sort((a: any, b: any) => (b.atsScore || 0) - (a.atsScore || 0))
                          .map((resume: any, index: number) => {
                            const rank = index + 1;
                            const atsScore = resume.atsScore || 0;
                            const anomalyCount = resume.anomalyCount || 0;
                            const anomalySeverity = resume.anomalySeverity || 'none';
                            
                            const getRankColor = (score: number) => {
                              if (score >= 75) return 'bg-green-100 text-green-700 border border-green-300';
                              if (score >= 60) return 'bg-blue-100 text-blue-700 border border-blue-300';
                              if (score >= 45) return 'bg-amber-100 text-amber-700 border border-amber-300';
                              return 'bg-red-100 text-red-700 border border-red-300';
                            };

                            const getAnomalyBadge = (severity: string, count: number) => {
                              if (count === 0) return { class: 'bg-green-100 text-green-700', label: 'Clean' };
                              if (severity === 'high') return { class: 'bg-red-100 text-red-700', label: `${count} (HIGH)` };
                              if (severity === 'medium') return { class: 'bg-amber-100 text-amber-700', label: `${count} (MED)` };
                              return { class: 'bg-blue-100 text-blue-700', label: `${count} (LOW)` };
                            };
                            
                            const getMedalEmoji = (rank: number) => {
                              if (rank === 1) return '🥇';
                              if (rank === 2) return '🥈';
                              if (rank === 3) return '🥉';
                              return rank <= 10 ? '⭐' : '👤';
                            };

                            const anomalyBadge = getAnomalyBadge(anomalySeverity, anomalyCount);

                            return (
                              <tr 
                                key={index} 
                                className="border-b hover:bg-slate-50 transition-colors cursor-pointer"
                                onClick={() => {
                                  setSelectedCandidate(resume);
                                  setShowCandidateDetail(true);
                                }}
                              >
                                <td className="px-4 py-3">
                                  <span className="text-2xl font-bold">{getMedalEmoji(rank)}</span>
                                  <p className="font-bold text-lg text-slate-900">#{rank}</p>
                                </td>
                                <td className="px-4 py-3">
                                  <p className="font-semibold text-slate-900">{resume.name || 'Unknown'}</p>
                                </td>
                                <td className="px-4 py-3 text-slate-600 text-sm">{resume.email || 'N/A'}</td>
                                <td className="px-4 py-3 text-center">
                                  <div className={`inline-block px-3 py-1 rounded-lg font-bold transition-all ${
                                    atsScore >= atsThreshold 
                                      ? 'bg-green-500 text-white shadow-lg ring-2 ring-green-300 scale-105' 
                                      : getRankColor(atsScore)
                                  }`}>
                                    {atsScore >= atsThreshold && '✅ '}
                                    {atsScore}%
                                  </div>
                                </td>
                                <td className="px-4 py-3 text-center">
                                  <span className={`px-2 py-1 rounded text-xs font-bold ${anomalyBadge.class}`}>
                                    {anomalyBadge.label}
                                  </span>
                                </td>
                                <td className="px-4 py-3 text-center">
                                  {resume.decisionStatus === 'SHORTLISTED' && (
                                    <span className="px-3 py-1 rounded-full text-xs font-bold inline-flex items-center gap-1 bg-green-100 text-green-700 border border-green-300">
                                      ✅ Shortlisted
                                    </span>
                                  )}
                                  {resume.decisionStatus === 'SHORTLISTED_WITH_FLAG' && (
                                    <span className="px-3 py-1 rounded-full text-xs font-bold inline-flex items-center gap-1 bg-orange-100 text-orange-700 border border-orange-300">
                                      ⚠️ Flagged
                                    </span>
                                  )}
                                  {resume.decisionStatus === 'NEEDS_REVIEW' && (
                                    <span className="px-3 py-1 rounded-full text-xs font-bold inline-flex items-center gap-1 bg-amber-100 text-amber-700 border border-amber-300">
                                      🔍 Under Review
                                    </span>
                                  )}
                                  {resume.decisionStatus === 'REJECTED' && (
                                    <span className="px-3 py-1 rounded-full text-xs font-bold inline-flex items-center gap-1 bg-red-100 text-red-700 border border-red-300">
                                      ❌ Rejected
                                    </span>
                                  )}
                                  {!resume.decisionStatus && (
                                    <span className="px-3 py-1 rounded-full text-xs font-bold inline-flex items-center gap-1 bg-slate-100 text-slate-700 border border-slate-300">
                                      ⏳ Pending
                                    </span>
                                  )}
                                </td>
                              </tr>
                            );
                          })}
                      </tbody>
                    </table>
                  </div>

                  {/* Legend */}
                  <div className="bg-slate-50 border border-slate-200 rounded-xl p-4">
                    <p className="text-sm font-semibold text-slate-700 mb-3">📊 Score Interpretation:</p>
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <p className="font-bold text-slate-800 mb-2">ATS Score = (Match × 70%) + (Quality × 30%)</p>
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <div className="w-4 h-4 bg-green-400 rounded"></div>
                            <span>75%+ → SHORTLIST</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <div className="w-4 h-4 bg-blue-400 rounded"></div>
                            <span>60-75% → REVIEW</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <div className="w-4 h-4 bg-amber-400 rounded"></div>
                            <span>45-60% → CONSIDER</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <div className="w-4 h-4 bg-red-400 rounded"></div>
                            <span>Below 45% → REJECT</span>
                          </div>
                        </div>
                      </div>
                      <div>
                        <p className="font-bold text-slate-800 mb-2">Anomaly Severity:</p>
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <div className="w-4 h-4 bg-red-400 rounded"></div>
                            <span>HIGH - Missing critical info (name, email, phone)</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <div className="w-4 h-4 bg-amber-400 rounded"></div>
                            <span>MEDIUM - Quality issues, duplicates</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <div className="w-4 h-4 bg-blue-400 rounded"></div>
                            <span>LOW - Minor formatting, generic skills</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <div className="w-4 h-4 bg-green-400 rounded"></div>
                            <span>CLEAN - No anomalies detected</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Errors Section */}
              {screeningResults.failed > 0 && screeningResults.errors && screeningResults.errors.length > 0 && (
                <div className="bg-red-50 border border-red-200 rounded-xl p-4">
                  <h3 className="text-lg font-bold text-red-900 mb-2 flex items-center gap-2">
                    <AlertTriangle size={20} />
                    Failed to Process ({screeningResults.failed} resumes)
                  </h3>
                  <div className="space-y-1">
                    {screeningResults.errors.slice(0, 5).map((err: any, idx: number) => (
                      <p key={idx} className="text-sm text-red-700">
                        • {err.fileName || 'Unknown'}: {err.error}
                      </p>
                    ))}
                  </div>
                </div>
              )}

            </div>
          </div>
        </div>
      )}
      
      {/* CANDIDATE DETAIL MODAL */}
      {showCandidateDetail && selectedCandidate && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-[9999] p-4 isolate">
          <div className="bg-white rounded-2xl max-w-3xl w-full max-h-[95vh] overflow-y-auto shadow-2xl">
            {/* Header */}
            <div className="sticky top-0 bg-gradient-to-r from-blue-600 to-cyan-600 text-white p-6 rounded-t-2xl flex items-center justify-between z-10">
              <div>
                <h2 className="text-2xl font-bold">{selectedCandidate.name || 'Candidate'}</h2>
                <p className="text-blue-100">{selectedCandidate.email || 'N/A'}</p>
              </div>
              <button
                onClick={() => setShowCandidateDetail(false)}
                className="p-2 hover:bg-white/20 rounded-lg transition-all"
              >
                <X size={24} />
              </button>
            </div>

            {/* Body */}
            <div className="p-6 space-y-6">
              {/* Contact Information */}
              <section className="bg-slate-50 rounded-lg p-4">
                <h3 className="text-lg font-bold text-slate-900 mb-3">📋 Contact Information</h3>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <p className="text-slate-600 font-medium">Email</p>
                    <p className="text-slate-900 font-semibold">{selectedCandidate.email || 'Not provided'}</p>
                  </div>
                  <div>
                    <p className="text-slate-600 font-medium">Phone</p>
                    <p className="text-slate-900 font-semibold">{selectedCandidate.phone || 'Not provided'}</p>
                  </div>
                </div>
              </section>

              {/* ATS Scoring Breakdown */}
              <section className="bg-gradient-to-br from-blue-50 to-cyan-50 border border-blue-200 rounded-lg p-4">
                <h3 className="text-lg font-bold text-slate-900 mb-4">📊 ATS Score Breakdown</h3>
                <div className="space-y-4">
                  {/* Main ATS Score */}
                  <div className="flex items-center justify-between bg-white p-4 rounded-lg border-2 border-blue-300">
                    <div>
                      <p className="text-slate-600 font-medium">Final ATS Score</p>
                      <p className="text-xs text-slate-500">(Match × 70%) + (Quality × 30%)</p>
                    </div>
                    <div className={`text-3xl font-bold px-6 py-2 rounded-lg ${
                      selectedCandidate.atsScore >= 75 ? 'bg-green-100 text-green-700' :
                      selectedCandidate.atsScore >= 60 ? 'bg-blue-100 text-blue-700' :
                      selectedCandidate.atsScore >= 45 ? 'bg-amber-100 text-amber-700' :
                      'bg-red-100 text-red-700'
                    }`}>
                      {selectedCandidate.atsScore}%
                    </div>
                  </div>

                  {/* Match Score */}
                  <div className="grid grid-cols-2 gap-4">
                    <div className="bg-white p-4 rounded-lg border border-cyan-200">
                      <p className="text-sm text-slate-600 font-medium mb-2">Match Score (70% weight)</p>
                      <div className="flex items-end gap-2">
                        <p className="text-2xl font-bold text-cyan-600">{selectedCandidate.matchScore}%</p>
                        <div className="flex-1 h-8 bg-cyan-100 rounded-lg overflow-hidden">
                          <div 
                            className="h-full bg-gradient-to-r from-cyan-400 to-cyan-600 rounded-lg transition-all"
                            style={{width: `${selectedCandidate.matchScore}%`}}
                          ></div>
                        </div>
                      </div>
                    </div>

                    {/* Quality Score */}
                    <div className="bg-white p-4 rounded-lg border border-purple-200">
                      <p className="text-sm text-slate-600 font-medium mb-2">Quality Score (30% weight)</p>
                      <div className="flex items-end gap-2">
                        <p className="text-2xl font-bold text-purple-600">{selectedCandidate.qualityScore}%</p>
                        <div className="flex-1 h-8 bg-purple-100 rounded-lg overflow-hidden">
                          <div 
                            className="h-full bg-gradient-to-r from-purple-400 to-purple-600 rounded-lg transition-all"
                            style={{width: `${selectedCandidate.qualityScore}%`}}
                          ></div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </section>

              {/* Decision & Recommendation */}
              <section className={`rounded-lg p-4 border-2 ${
                selectedCandidate.decisionStatus === 'SHORTLISTED' ? 'bg-green-50 border-green-300' :
                selectedCandidate.decisionStatus === 'SHORTLISTED_WITH_FLAG' ? 'bg-orange-50 border-orange-300' :
                selectedCandidate.decisionStatus === 'NEEDS_REVIEW' ? 'bg-amber-50 border-amber-300' :
                'bg-red-50 border-red-300'
              }`}>
                <div className="flex items-start gap-4">
                  <div className="text-3xl">
                    {selectedCandidate.decisionStatus === 'SHORTLISTED' ? '✅' :
                     selectedCandidate.decisionStatus === 'SHORTLISTED_WITH_FLAG' ? '⚠️' :
                     selectedCandidate.decisionStatus === 'NEEDS_REVIEW' ? '🔍' :
                     '❌'}
                  </div>
                  <div className="flex-1">
                    <p className={`font-bold text-lg ${
                      selectedCandidate.decisionStatus === 'SHORTLISTED' ? 'text-green-700' :
                      selectedCandidate.decisionStatus === 'SHORTLISTED_WITH_FLAG' ? 'text-orange-700' :
                      selectedCandidate.decisionStatus === 'NEEDS_REVIEW' ? 'text-amber-700' :
                      'text-red-700'
                    }`}>
                      {selectedCandidate.decisionStatus || 'PENDING'}
                    </p>
                    <p className="text-sm text-slate-600 mt-1">{selectedCandidate.reason || 'Standard evaluation'}</p>
                    <p className="text-sm font-medium text-slate-700 mt-2 italic">💡 {selectedCandidate.recommendation || 'Continue with standard process'}</p>
                  </div>
                </div>
              </section>

              {/* Anomalies & Quality Issues */}
              <section className="bg-slate-50 rounded-lg p-4">
                <h3 className="text-lg font-bold text-slate-900 mb-3">🔍 Resume Quality Analysis</h3>
                <div className="space-y-3">
                  {/* Anomaly Weight Summary */}
                  <div className="bg-white p-3 rounded-lg border border-slate-200">
                    <div className="flex items-center justify-between mb-2">
                      <p className="text-sm font-medium text-slate-600">Anomaly Weight</p>
                      <p className={`font-bold px-3 py-1 rounded text-sm ${
                        selectedCandidate.anomalySeverity === 'high' ? 'bg-red-100 text-red-700' :
                        selectedCandidate.anomalySeverity === 'medium' ? 'bg-amber-100 text-amber-700' :
                        selectedCandidate.anomalySeverity === 'low' ? 'bg-blue-100 text-blue-700' :
                        'bg-green-100 text-green-700'
                      }`}>
                        {selectedCandidate.anomalyWeight}/100 ({selectedCandidate.anomalySeverity?.toUpperCase() || 'CLEAN'})
                      </p>
                    </div>
                    <div className="h-2 bg-slate-200 rounded-full overflow-hidden">
                      <div 
                        className={`h-full ${
                          selectedCandidate.anomalySeverity === 'high' ? 'bg-red-500' :
                          selectedCandidate.anomalySeverity === 'medium' ? 'bg-amber-500' :
                          selectedCandidate.anomalySeverity === 'low' ? 'bg-blue-500' :
                          'bg-green-500'
                        }`}
                        style={{width: `${Math.min(selectedCandidate.anomalyWeight, 100)}%`}}
                      ></div>
                    </div>
                  </div>

                  {/* Anomalies List */}
                  {selectedCandidate.anomalies && Object.keys(selectedCandidate.anomalies).length > 0 ? (
                    <div className="bg-white p-3 rounded-lg border border-slate-200">
                      <p className="text-sm font-medium text-slate-700 mb-2">Issues Found ({Object.keys(selectedCandidate.anomalies).length}):</p>
                      <ul className="space-y-1">
                        {Object.entries(selectedCandidate.anomalies).map(([key, value]: [string, any], idx) => (
                          <li key={idx} className="text-sm text-slate-700 flex items-start gap-2">
                            <span className="text-lg">
                              {value?.severity === 'high' ? '🔴' :
                               value?.severity === 'medium' ? '🟡' :
                               '🔵'}
                            </span>
                            <span>{value?.message || key}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  ) : (
                    <div className="bg-green-50 border border-green-200 p-3 rounded-lg">
                      <p className="text-sm font-medium text-green-700">✅ No anomalies detected - Resume is clean</p>
                    </div>
                  )}
                </div>
              </section>

              {/* Skills Analysis */}
              <section className="bg-slate-50 rounded-lg p-4">
                <h3 className="text-lg font-bold text-slate-900 mb-3">💼 Skills Analysis</h3>
                <div className="grid grid-cols-2 gap-4">
                  {/* Matched Skills */}
                  <div className="bg-white p-3 rounded-lg border border-green-200">
                    <p className="text-sm font-bold text-green-700 mb-2">✅ Matched Skills ({selectedCandidate.matchedSkills?.length || 0})</p>
                    <div className="flex flex-wrap gap-1">
                      {selectedCandidate.matchedSkills && selectedCandidate.matchedSkills.length > 0 ? (
                        selectedCandidate.matchedSkills.map((skill: string, idx: number) => (
                          <span key={idx} className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded">
                            {skill}
                          </span>
                        ))
                      ) : (
                        <p className="text-xs text-slate-500">None</p>
                      )}
                    </div>
                  </div>

                  {/* Missing Skills */}
                  <div className="bg-white p-3 rounded-lg border border-red-200">
                    <p className="text-sm font-bold text-red-700 mb-2">❌ Missing Skills ({selectedCandidate.missingSkills?.length || 0})</p>
                    <div className="flex flex-wrap gap-1">
                      {selectedCandidate.missingSkills && selectedCandidate.missingSkills.length > 0 ? (
                        selectedCandidate.missingSkills.map((skill: string, idx: number) => (
                          <span key={idx} className="text-xs bg-red-100 text-red-700 px-2 py-1 rounded">
                            {skill}
                          </span>
                        ))
                      ) : (
                        <p className="text-xs text-slate-500">None</p>
                      )}
                    </div>
                  </div>
                </div>

                {/* All Skills */}
                {selectedCandidate.skills && selectedCandidate.skills.length > 0 && (
                  <div className="mt-4 p-3 bg-white rounded-lg border border-slate-200">
                    <p className="text-sm font-medium text-slate-700 mb-2">All Skills Listed ({selectedCandidate.skills.length})</p>
                    <div className="flex flex-wrap gap-1">
                      {selectedCandidate.skills.map((skill: string, idx: number) => (
                        <span key={idx} className="text-xs bg-slate-200 text-slate-700 px-2 py-1 rounded">
                          {skill}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </section>

              {/* Education & Experience */}
              {(selectedCandidate.education?.length > 0 || selectedCandidate.experience?.length > 0) && (
                <section className="bg-slate-50 rounded-lg p-4">
                  <h3 className="text-lg font-bold text-slate-900 mb-3">🎓 Background</h3>
                  <div className="grid grid-cols-2 gap-4">
                    {selectedCandidate.education && selectedCandidate.education.length > 0 && (
                      <div className="bg-white p-3 rounded-lg border border-blue-200">
                        <p className="text-sm font-bold text-blue-700 mb-2">Education</p>
                        <div className="space-y-2 text-sm">
                          {selectedCandidate.education.map((edu: any, idx: number) => (
                            <div key={idx}>
                              <p className="font-medium text-slate-900">{edu.degree || 'Degree'}</p>
                              <p className="text-xs text-slate-600">{edu.institution || 'Institution'}</p>
                              {edu.year && <p className="text-xs text-slate-500">{edu.year}</p>}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {selectedCandidate.experience && selectedCandidate.experience.length > 0 && (
                      <div className="bg-white p-3 rounded-lg border border-purple-200">
                        <p className="text-sm font-bold text-purple-700 mb-2">Experience</p>
                        <div className="space-y-2 text-sm">
                          {selectedCandidate.experience.map((exp: any, idx: number) => (
                            <div key={idx}>
                              <p className="font-medium text-slate-900">{exp.title || 'Position'}</p>
                              <p className="text-xs text-slate-600">{exp.company || 'Company'}</p>
                              {exp.duration && <p className="text-xs text-slate-500">{exp.duration}</p>}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </section>
              )}

              {/* Action Buttons - Decision Making */}
              <div className="pt-4 border-t border-slate-200 space-y-3">
                <p className="text-sm font-semibold text-slate-700">📝 Update Decision Status:</p>
                <div className="grid grid-cols-2 gap-2">
                  {/* Shortlist Button */}
                  <button
                    onClick={() => {
                      setSelectedCandidate({
                        ...selectedCandidate,
                        decisionStatus: 'SHORTLISTED'
                      });
                      setTimeout(() => setShowCandidateDetail(false), 300);
                    }}
                    className={`px-4 py-3 rounded-lg font-semibold transition-all flex items-center justify-center gap-2 ${
                      selectedCandidate.decisionStatus === 'SHORTLISTED'
                        ? 'bg-green-600 text-white shadow-lg ring-2 ring-green-300'
                        : 'bg-green-100 text-green-700 hover:bg-green-200'
                    }`}
                  >
                    ✅ Shortlisted
                  </button>

                  {/* Under Review Button */}
                  <button
                    onClick={() => {
                      setSelectedCandidate({
                        ...selectedCandidate,
                        decisionStatus: 'NEEDS_REVIEW'
                      });
                      setTimeout(() => setShowCandidateDetail(false), 300);
                    }}
                    className={`px-4 py-3 rounded-lg font-semibold transition-all flex items-center justify-center gap-2 ${
                      selectedCandidate.decisionStatus === 'NEEDS_REVIEW'
                        ? 'bg-amber-600 text-white shadow-lg ring-2 ring-amber-300'
                        : 'bg-amber-100 text-amber-700 hover:bg-amber-200'
                    }`}
                  >
                    🔍 Under Review
                  </button>

                  {/* Shortlist with Flag Button */}
                  <button
                    onClick={() => {
                      setSelectedCandidate({
                        ...selectedCandidate,
                        decisionStatus: 'SHORTLISTED_WITH_FLAG'
                      });
                      setTimeout(() => setShowCandidateDetail(false), 300);
                    }}
                    className={`px-4 py-3 rounded-lg font-semibold transition-all flex items-center justify-center gap-2 ${
                      selectedCandidate.decisionStatus === 'SHORTLISTED_WITH_FLAG'
                        ? 'bg-orange-600 text-white shadow-lg ring-2 ring-orange-300'
                        : 'bg-orange-100 text-orange-700 hover:bg-orange-200'
                    }`}
                  >
                    ⚠️ Flagged
                  </button>

                  {/* Reject Button */}
                  <button
                    onClick={() => {
                      setSelectedCandidate({
                        ...selectedCandidate,
                        decisionStatus: 'REJECTED'
                      });
                      setTimeout(() => setShowCandidateDetail(false), 300);
                    }}
                    className={`px-4 py-3 rounded-lg font-semibold transition-all flex items-center justify-center gap-2 ${
                      selectedCandidate.decisionStatus === 'REJECTED'
                        ? 'bg-red-600 text-white shadow-lg ring-2 ring-red-300'
                        : 'bg-red-100 text-red-700 hover:bg-red-200'
                    }`}
                  >
                    ❌ Rejected
                  </button>
                </div>

                {/* Close Button */}
                <button
                  onClick={() => setShowCandidateDetail(false)}
                  className="w-full bg-slate-200 hover:bg-slate-300 text-slate-900 px-4 py-2 rounded-lg font-semibold transition-all"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
      
      {/* Threshold Selection Modal */}
      {showThresholdModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[9999] p-4 isolate">
          <div className="bg-white rounded-2xl w-full max-w-md p-6 space-y-6 max-h-[90vh] overflow-y-auto border-4 border-purple-500 shadow-2xl">
            <div className="flex items-center gap-3 border-b pb-4 bg-gradient-to-r from-purple-100 to-pink-100 p-4 rounded-lg -m-6 mb-4 px-6">
              <span className="text-3xl">⚙️</span>
              <div>
                <h2 className="text-2xl font-bold text-slate-900">AI Screening Thresholds</h2>
                <p className="text-xs text-slate-600 mt-1">Set decision criteria before screening</p>
              </div>
            </div>

            {/* INSTRUCTION BOX */}
            <div className="bg-blue-50 border-l-4 border-blue-500 p-4 rounded">
              <p className="text-sm font-bold text-blue-900">📋 How Decisions Are Made:</p>
              <div className="text-xs text-blue-800 mt-2 space-y-1">
                <p>✅ <strong>SHORTLISTED</strong>: ATS ≥ Your Threshold</p>
                <p>🔍 <strong>NEEDS REVIEW</strong>: ATS within 10% below threshold</p>
                <p>❌ <strong>REJECTED</strong>: ATS more than 10% below threshold</p>
              </div>
            </div>

            {/* ATS Threshold */}
            <div className="space-y-3">
              <label className="block">
                <span className="text-sm font-semibold text-slate-700 mb-2 block">
                  📊 ATS Score Threshold
                </span>
                <p className="text-xs text-slate-600 mb-3">
                  Minimum required ATS score to accept candidate (0-100)
                </p>
                <div className="flex items-center gap-4">
                  <input
                    type="range"
                    min="0"
                    max="100"
                    step="5"
                    value={atsThreshold}
                    onChange={(e) => setAtsThreshold(Number(e.target.value))}
                    className="flex-1 h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer"
                  />
                  <span className="text-lg font-bold text-purple-600 w-12 text-center">{atsThreshold}%</span>
                </div>
                <div className="flex gap-2 mt-2 text-xs">
                  <button
                    onClick={() => setAtsThreshold(40)}
                    className="px-2 py-1 bg-slate-100 hover:bg-slate-200 rounded text-slate-700 font-semibold"
                  >
                    Lenient (40%)
                  </button>
                  <button
                    onClick={() => setAtsThreshold(60)}
                    className="px-2 py-1 bg-purple-100 hover:bg-purple-200 rounded text-purple-700 font-semibold"
                  >
                    Balanced (60%)
                  </button>
                  <button
                    onClick={() => setAtsThreshold(80)}
                    className="px-2 py-1 bg-slate-100 hover:bg-slate-200 rounded text-slate-700 font-semibold"
                  >
                    Strict (80%)
                  </button>
                </div>
              </label>
            </div>

            {/* Anomaly Threshold */}
            <div className="space-y-3">
              <label className="block">
                <span className="text-sm font-semibold text-slate-700 mb-2 block">
                  🔍 Anomaly Threshold (Resume Quality)
                </span>
                <p className="text-xs text-slate-600 mb-3">
                  Maximum allowed resume quality issues (0-100)
                </p>
                <div className="flex items-center gap-4">
                  <input
                    type="range"
                    min="0"
                    max="100"
                    step="5"
                    value={anomalyThreshold}
                    onChange={(e) => setAnomalyThreshold(Number(e.target.value))}
                    className="flex-1 h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer"
                  />
                  <span className="text-lg font-bold text-blue-600 w-12 text-center">{anomalyThreshold}</span>
                </div>
                <div className="flex gap-2 mt-2 text-xs">
                  <button
                    onClick={() => setAnomalyThreshold(20)}
                    className="px-2 py-1 bg-slate-100 hover:bg-slate-200 rounded text-slate-700 font-semibold"
                  >
                    Strict (20)
                  </button>
                  <button
                    onClick={() => setAnomalyThreshold(30)}
                    className="px-2 py-1 bg-blue-100 hover:bg-blue-200 rounded text-blue-700 font-semibold"
                  >
                    Balanced (30)
                  </button>
                  <button
                    onClick={() => setAnomalyThreshold(50)}
                    className="px-2 py-1 bg-slate-100 hover:bg-slate-200 rounded text-slate-700 font-semibold"
                  >
                    Lenient (50)
                  </button>
                </div>
              </label>
            </div>

            {/* Match Threshold */}
            <div className="space-y-3">
              <label className="block">
                <span className="text-sm font-semibold text-slate-700 mb-2 block">
                  💼 Match Threshold (Job Relevance)
                </span>
                <p className="text-xs text-slate-600 mb-3">
                  Minimum required match score (0-100)
                </p>
                <div className="flex items-center gap-4">
                  <input
                    type="range"
                    min="0"
                    max="100"
                    step="5"
                    value={matchThreshold}
                    onChange={(e) => setMatchThreshold(Number(e.target.value))}
                    className="flex-1 h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer"
                  />
                  <span className="text-lg font-bold text-green-600 w-12 text-center">{matchThreshold}%</span>
                </div>
                <div className="flex gap-2 mt-2 text-xs">
                  <button
                    onClick={() => setMatchThreshold(40)}
                    className="px-2 py-1 bg-slate-100 hover:bg-slate-200 rounded text-slate-700 font-semibold"
                  >
                    Lenient (40%)
                  </button>
                  <button
                    onClick={() => setMatchThreshold(50)}
                    className="px-2 py-1 bg-green-100 hover:bg-green-200 rounded text-green-700 font-semibold"
                  >
                    Balanced (50%)
                  </button>
                  <button
                    onClick={() => setMatchThreshold(60)}
                    className="px-2 py-1 bg-slate-100 hover:bg-slate-200 rounded text-slate-700 font-semibold"
                  >
                    Strict (60%)
                  </button>
                </div>
              </label>
            </div>

            {/* Summary */}
            <div className="bg-gradient-to-r from-purple-50 via-blue-50 to-green-50 border-2 border-purple-300 rounded-lg p-4 space-y-3">
              <p className="text-sm font-bold text-slate-900">📊 Your Decision Thresholds:</p>
              <div className="bg-white p-3 rounded space-y-2 border-l-4 border-purple-500">
                <p className="text-xs text-slate-700">
                  <span className="font-bold text-purple-600">{atsThreshold}%</span> ATS Score Threshold
                </p>
                <div className="bg-slate-50 p-2 rounded text-xs space-y-1">
                  <p>✅ ATS ≥ <strong>{atsThreshold}%</strong> → <strong className="text-green-700">SHORTLISTED</strong></p>
                  <p>🔍 ATS ≥ <strong>{atsThreshold - 10}%</strong> → <strong className="text-amber-700">NEEDS REVIEW</strong></p>
                  <p>❌ ATS &lt; <strong>{atsThreshold - 10}%</strong> → <strong className="text-red-700">REJECTED</strong></p>
                </div>
              </div>
              <div className="text-xs text-slate-600 space-y-1">
                <p>📋 Anomaly threshold: <span className="font-bold">{anomalyThreshold}</span></p>
                <p>💼 Job match requirement: <span className="font-bold">{matchThreshold}%</span></p>
              </div>
            </div>

            {/* Buttons */}
            <div className="flex flex-col gap-3 pt-6 border-t-2 border-slate-200">
              <button
                onClick={() => setShowThresholdModal(false)}
                className="px-4 py-2 border-2 border-slate-300 text-slate-700 font-semibold rounded-lg hover:bg-slate-50 transition-all"
              >
                ✕ Cancel
              </button>
              <button
                onClick={startScreeningWithThresholds}
                disabled={runningAIScreening}
                className="px-6 py-4 bg-gradient-to-r from-blue-600 to-emerald-600 text-white font-bold rounded-xl hover:from-blue-700 hover:to-emerald-700 disabled:opacity-50 transition-all shadow-lg hover:shadow-xl text-lg flex items-center justify-center gap-2"
              >
                {runningAIScreening ? (
                  <>
                    <Loader className="animate-spin" size={20} />
                    <span>Screening...</span>
                  </>
                ) : (
                  <>
                    <span>▶️ START SCREENING</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
      
      {renderJobModal()}
      {/* Sidebar */}
      <aside
        className={`${
          sidebarOpen ? "w-64" : "w-20"
        } bg-gradient-to-b from-slate-900 to-blue-900 text-white transition-all duration-300 flex flex-col z-0`}
      >
        <div className="p-4 flex items-center justify-between border-b border-white/10">
          {sidebarOpen && (
            <div className="flex items-center gap-2">
              <Brain className="text-cyan-400" size={28} />
              <span className="font-bold text-xl">VeriResume HR</span>
            </div>
          )}
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="p-2 hover:bg-white/10 rounded-lg"
          >
            <Menu size={20} />
          </button>
        </div>

        <nav className="flex-1 p-4 space-y-2 overflow-y-auto">
          {menuItems.map((item, idx) => (
            <button
              key={idx}
              onClick={() => setActiveSection(item.section)}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${
                activeSection === item.section
                  ? "bg-cyan-500 text-white shadow-lg"
                  : "hover:bg-white/10 text-slate-300 hover:text-white"
              }`}
            >
              <item.icon size={20} />
              {sidebarOpen && <span className="flex-1 text-left">{item.label}</span>}
            </button>
          ))}
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
          <div className="px-8 py-4">
            <h1 className="text-2xl font-bold text-slate-900">
              {menuItems.find((item) => item.section === activeSection)?.label || "Dashboard"}
            </h1>
            <p className="text-slate-600">Welcome back, {user?.name}!</p>
          </div>
        </header>

        {/* Main Content */}
        <main className="p-8">
          {activeSection === "dashboard" && renderDashboard()}
          {activeSection === "post-job" && renderPostJob()}
          {activeSection === "jobs" && renderJobs()}
          {activeSection === "applications" && renderApplications()}
          {activeSection === "upload" && renderUpload()}
          {activeSection === "screening" && renderScreening()}
          {activeSection === "ranking" && renderRanking()}
          {activeSection === "anomalies" && renderAnomalies()}
        </main>
      </div>

      {/* Resume Viewer Modal */}
      {viewerFile && (
        <div className="fixed inset-0 z-[9999] bg-black/75 flex flex-col">
          <div className="bg-white flex items-center justify-between px-6 py-3 border-b border-slate-200 shadow">
            <h2 className="font-bold text-lg text-slate-900 truncate max-w-[60%]">
              {viewerTitle} — Resume
            </h2>
            <div className="flex items-center gap-3">
              <a
                href={`${API_URL}/api/view-file/${viewerFile}`}
                download
                className="px-4 py-1.5 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 transition-all"
              >
                ⬇ Download
              </a>
              <button
                onClick={() => setViewerFile(null)}
                className="p-2 hover:bg-slate-100 rounded-lg transition-all"
                title="Close"
              >
                <X size={20} />
              </button>
            </div>
          </div>
          <div className="flex-1 bg-slate-100 overflow-hidden">
            {viewerFile.toLowerCase().endsWith(".pdf") ? (
              <iframe
                src={`${API_URL}/api/view-file/${viewerFile}`}
                className="w-full h-full border-0"
                title={viewerTitle}
              />
            ) : (
              <div className="flex items-center justify-center h-full flex-col gap-4 text-slate-600">
                <p>This file type cannot be previewed in the browser.</p>
                <a
                  href={`${API_URL}/api/view-file/${viewerFile}`}
                  download
                  className="px-6 py-3 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-all"
                >
                  ⬇ Download Resume
                </a>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default HRDashboardNew;
