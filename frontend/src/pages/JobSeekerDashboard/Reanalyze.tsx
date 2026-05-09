import { useState } from "react";
import { useNavigate } from "react-router-dom";
// useAuth import removed
import axios from "axios";
import {
  RefreshCw,
  ArrowLeft,
  FileText,
  Zap,
// Loader removed
  CheckCircle,
  AlertCircle,
  TrendingUp,
  Target,
  Brain,
  Sparkles,
  Award,
  Star,
  Clock,
} from "lucide-react";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:3000";

interface ReanalyzeOptions {
  targetRole?: string;
  industry?: string;
  focusAreas: string[];
  optimizeFor: "ats" | "readability" | "keywords" | "comprehensive";
}

const Reanalyze = () => {
  const [analyzing, setAnalyzing] = useState(false);
  const [complete, setComplete] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState("");
  const [result, setResult] = useState<any>(null);
  const navigate = useNavigate();

  const [options, setOptions] = useState<ReanalyzeOptions>({
    targetRole: "",
    industry: "",
    focusAreas: [],
    optimizeFor: "comprehensive",
  });

  const focusAreaOptions = [
    { id: "skills", label: "Skills & Competencies", icon: Star },
    { id: "experience", label: "Work Experience", icon: Award },
    { id: "education", label: "Education & Certifications", icon: Brain },
    { id: "keywords", label: "Industry Keywords", icon: Target },
    { id: "formatting", label: "Formatting & Structure", icon: FileText },
    { id: "achievements", label: "Achievements & Impact", icon: TrendingUp },
  ];

  const handleReanalyze = async () => {
    if (!options.targetRole && !options.industry && options.focusAreas.length === 0) {
      setError("Please select at least one option to continue");
      return;
    }

    setAnalyzing(true);
    setError("");
    setProgress(0);

    // Simulate progress
    const progressInterval = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 90) return prev;
        return prev + 10;
      });
    }, 500);

    try {
      const token = localStorage.getItem("token");
      const response = await axios.post(
        `${API_URL}/api/resume/reanalyze`,
        options,
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      clearInterval(progressInterval);
      setProgress(100);
      setResult(response.data);
      setComplete(true);
    } catch (err: any) {
      clearInterval(progressInterval);
      setError(err.response?.data?.message || "Failed to reanalyze resume");
      setAnalyzing(false);
    }
  };

  const toggleFocusArea = (areaId: string) => {
    setOptions({
      ...options,
      focusAreas: options.focusAreas.includes(areaId)
        ? options.focusAreas.filter((id) => id !== areaId)
        : [...options.focusAreas, areaId],
    });
  };

  if (complete && result) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 p-6">
        <div className="max-w-4xl mx-auto">
          <div className="bg-white rounded-2xl shadow-lg p-12 text-center">
            <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
              <CheckCircle className="w-12 h-12 text-green-600" />
            </div>
            <h2 className="text-3xl font-bold text-gray-900 mb-4">
              Reanalysis Complete!
            </h2>
            <p className="text-gray-600 mb-8">
              Your resume has been successfully reanalyzed with updated insights
            </p>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
              <div className="p-6 bg-blue-50 rounded-xl">
                <div className="text-3xl font-bold text-blue-600 mb-2">
                  {result.score}%
                </div>
                <p className="text-gray-600">New Overall Score</p>
              </div>
              <div className="p-6 bg-green-50 rounded-xl">
                <div className="text-3xl font-bold text-green-600 mb-2">
                  {result.improvements}
                </div>
                <p className="text-gray-600">Improvements Found</p>
              </div>
              <div className="p-6 bg-purple-50 rounded-xl">
                <div className="text-3xl font-bold text-purple-600 mb-2">
                  {result.suggestions}
                </div>
                <p className="text-gray-600">New Suggestions</p>
              </div>
            </div>

            <div className="flex gap-4 justify-center">
              <button
                onClick={() => navigate("/jobseeker/analysis")}
                className="px-6 py-3 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-xl hover:shadow-lg transition-all font-semibold"
              >
                View Full Analysis
              </button>
              <button
                onClick={() => navigate("/jobseeker/dashboard")}
                className="px-6 py-3 bg-white border-2 border-gray-300 text-gray-700 rounded-xl hover:bg-gray-50 transition-all font-semibold"
              >
                Back to Dashboard
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 p-6">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <button
            onClick={() => navigate("/jobseeker/dashboard")}
            className="flex items-center text-gray-600 hover:text-gray-900 mb-4 transition-colors"
          >
            <ArrowLeft className="w-5 h-5 mr-2" />
            Back to Dashboard
          </button>
          <h1 className="text-4xl font-bold text-gray-900 mb-2 flex items-center">
            <RefreshCw className="w-10 h-10 mr-3 text-blue-600" />
            Re-analyze Resume
          </h1>
          <p className="text-gray-600">
            Get fresh insights and updated recommendations for your resume
          </p>
        </div>

        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-xl flex items-center text-red-700">
            <AlertCircle className="w-5 h-5 mr-3" />
            {error}
          </div>
        )}

        {analyzing ? (
          <div className="bg-white rounded-2xl shadow-lg p-12">
            <div className="text-center">
              <div className="w-20 h-20 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-6">
                <Brain className="w-10 h-10 text-blue-600 animate-pulse" />
              </div>
              <h3 className="text-2xl font-bold text-gray-900 mb-2">
                Analyzing Your Resume
              </h3>
              <p className="text-gray-600 mb-8">
                Our AI is processing your resume with the selected options...
              </p>

              {/* Progress Bar */}
              <div className="w-full bg-gray-200 rounded-full h-4 mb-4">
                <div
                  className="bg-gradient-to-r from-blue-600 to-purple-600 h-4 rounded-full transition-all duration-500"
                  style={{ width: `${progress}%` }}
                />
              </div>
              <p className="text-sm text-gray-600">{progress}% Complete</p>

              {/* Analysis Steps */}
              <div className="mt-8 space-y-4">
                <div
                  className={`flex items-center p-4 rounded-xl ${
                    progress >= 25 ? "bg-green-50" : "bg-gray-50"
                  }`}
                >
                  <CheckCircle
                    className={`w-5 h-5 mr-3 ${
                      progress >= 25 ? "text-green-600" : "text-gray-400"
                    }`}
                  />
                  <span className="text-gray-700">Extracting content...</span>
                </div>
                <div
                  className={`flex items-center p-4 rounded-xl ${
                    progress >= 50 ? "bg-green-50" : "bg-gray-50"
                  }`}
                >
                  <CheckCircle
                    className={`w-5 h-5 mr-3 ${
                      progress >= 50 ? "text-green-600" : "text-gray-400"
                    }`}
                  />
                  <span className="text-gray-700">Analyzing structure...</span>
                </div>
                <div
                  className={`flex items-center p-4 rounded-xl ${
                    progress >= 75 ? "bg-green-50" : "bg-gray-50"
                  }`}
                >
                  <CheckCircle
                    className={`w-5 h-5 mr-3 ${
                      progress >= 75 ? "text-green-600" : "text-gray-400"
                    }`}
                  />
                  <span className="text-gray-700">
                    Generating recommendations...
                  </span>
                </div>
                <div
                  className={`flex items-center p-4 rounded-xl ${
                    progress >= 100 ? "bg-green-50" : "bg-gray-50"
                  }`}
                >
                  <CheckCircle
                    className={`w-5 h-5 mr-3 ${
                      progress >= 100 ? "text-green-600" : "text-gray-400"
                    }`}
                  />
                  <span className="text-gray-700">Finalizing results...</span>
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="space-y-6">
            {/* Target Role */}
            <div className="bg-white rounded-2xl shadow-lg p-6">
              <div className="flex items-center mb-4">
                <div className="p-3 bg-blue-100 rounded-xl mr-4">
                  <Target className="w-6 h-6 text-blue-600" />
                </div>
                <div>
                  <h3 className="text-xl font-bold text-gray-900">
                    Target Role (Optional)
                  </h3>
                  <p className="text-sm text-gray-600">
                    Optimize your resume for a specific position
                  </p>
                </div>
              </div>
              <input
                type="text"
                value={options.targetRole}
                onChange={(e) =>
                  setOptions({ ...options, targetRole: e.target.value })
                }
                placeholder="e.g., Senior Software Engineer"
                className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            {/* Industry */}
            <div className="bg-white rounded-2xl shadow-lg p-6">
              <div className="flex items-center mb-4">
                <div className="p-3 bg-purple-100 rounded-xl mr-4">
                  <Sparkles className="w-6 h-6 text-purple-600" />
                </div>
                <div>
                  <h3 className="text-xl font-bold text-gray-900">
                    Industry (Optional)
                  </h3>
                  <p className="text-sm text-gray-600">
                    Tailor keywords for your target industry
                  </p>
                </div>
              </div>
              <select
                value={options.industry}
                onChange={(e) =>
                  setOptions({ ...options, industry: e.target.value })
                }
                className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent appearance-none"
              >
                <option value="">Select an industry</option>
                <option value="technology">Technology</option>
                <option value="finance">Finance</option>
                <option value="healthcare">Healthcare</option>
                <option value="education">Education</option>
                <option value="marketing">Marketing</option>
                <option value="sales">Sales</option>
                <option value="manufacturing">Manufacturing</option>
                <option value="retail">Retail</option>
                <option value="other">Other</option>
              </select>
            </div>

            {/* Focus Areas */}
            <div className="bg-white rounded-2xl shadow-lg p-6">
              <div className="flex items-center mb-6">
                <div className="p-3 bg-green-100 rounded-xl mr-4">
                  <Zap className="w-6 h-6 text-green-600" />
                </div>
                <div>
                  <h3 className="text-xl font-bold text-gray-900">
                    Focus Areas
                  </h3>
                  <p className="text-sm text-gray-600">
                    Select specific areas to analyze in detail
                  </p>
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {focusAreaOptions.map((area) => {
                  const Icon = area.icon;
                  const isSelected = options.focusAreas.includes(area.id);
                  return (
                    <button
                      key={area.id}
                      onClick={() => toggleFocusArea(area.id)}
                      className={`p-4 rounded-xl border-2 transition-all text-left ${
                        isSelected
                          ? "border-blue-600 bg-blue-50"
                          : "border-gray-200 hover:border-gray-300"
                      }`}
                    >
                      <div className="flex items-center">
                        <div
                          className={`p-2 rounded-lg mr-3 ${
                            isSelected ? "bg-blue-100" : "bg-gray-100"
                          }`}
                        >
                          <Icon
                            className={`w-5 h-5 ${
                              isSelected ? "text-blue-600" : "text-gray-600"
                            }`}
                          />
                        </div>
                        <span
                          className={`font-semibold ${
                            isSelected ? "text-blue-900" : "text-gray-900"
                          }`}
                        >
                          {area.label}
                        </span>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Optimization Type */}
            <div className="bg-white rounded-2xl shadow-lg p-6">
              <div className="flex items-center mb-6">
                <div className="p-3 bg-yellow-100 rounded-xl mr-4">
                  <Award className="w-6 h-6 text-yellow-600" />
                </div>
                <div>
                  <h3 className="text-xl font-bold text-gray-900">
                    Optimization Type
                  </h3>
                  <p className="text-sm text-gray-600">
                    Choose what to prioritize in the analysis
                  </p>
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {[
                  {
                    value: "ats",
                    label: "ATS Optimization",
                    desc: "Focus on passing Applicant Tracking Systems",
                  },
                  {
                    value: "readability",
                    label: "Readability",
                    desc: "Improve clarity and human readability",
                  },
                  {
                    value: "keywords",
                    label: "Keywords",
                    desc: "Maximize relevant industry keywords",
                  },
                  {
                    value: "comprehensive",
                    label: "Comprehensive",
                    desc: "Balanced analysis of all aspects",
                  },
                ].map((type) => (
                  <button
                    key={type.value}
                    onClick={() =>
                      setOptions({
                        ...options,
                        optimizeFor: type.value as any,
                      })
                    }
                    className={`p-4 rounded-xl border-2 transition-all text-left ${
                      options.optimizeFor === type.value
                        ? "border-yellow-600 bg-yellow-50"
                        : "border-gray-200 hover:border-gray-300"
                    }`}
                  >
                    <h4
                      className={`font-semibold mb-1 ${
                        options.optimizeFor === type.value
                          ? "text-yellow-900"
                          : "text-gray-900"
                      }`}
                    >
                      {type.label}
                    </h4>
                    <p className="text-sm text-gray-600">{type.desc}</p>
                  </button>
                ))}
              </div>
            </div>

            {/* Action Button */}
            <button
              onClick={handleReanalyze}
              className="w-full py-4 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-xl hover:shadow-lg transition-all font-semibold text-lg flex items-center justify-center"
            >
              <RefreshCw className="w-6 h-6 mr-2" />
              Start Re-analysis
            </button>

            {/* Info */}
            <div className="bg-blue-50 rounded-xl p-6 border border-blue-200">
              <div className="flex items-start">
                <Clock className="w-5 h-5 text-blue-600 mr-3 mt-0.5 flex-shrink-0" />
                <div>
                  <h4 className="font-semibold text-blue-900 mb-1">
                    Analysis Time
                  </h4>
                  <p className="text-sm text-blue-700">
                    The re-analysis process typically takes 30-60 seconds. You'll
                    receive updated insights and recommendations based on your
                    selections.
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Reanalyze;
