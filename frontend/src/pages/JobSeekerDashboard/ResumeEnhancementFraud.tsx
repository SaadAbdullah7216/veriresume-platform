import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import DashboardLayout from "./DashboardLayout";
import axios from "axios";
import {
  ShieldCheck,
  AlertTriangle,
  CheckCircle,
  XCircle,
  FileText,
  Loader,
  Zap,
  BookOpen,
  Target,
  Search,
  TrendingUp,
  ArrowRight,
  Lightbulb,
  Eye,
  Award,
  RefreshCw,
  ChevronDown,
  ChevronUp,
  Type,
  Layout,
  Key,
  AlertCircle,
  Info,
} from "lucide-react";

const API_URL =
  import.meta.env.VITE_API_URL ||
  import.meta.env.VITE_API_BASE_URL ||
  "http://localhost:3000";

/* ─── colour helpers ─── */
const scoreColor = (s: number) =>
  s >= 80 ? "text-green-600" : s >= 60 ? "text-yellow-600" : "text-red-600";
const scoreBg = (s: number) =>
  s >= 80
    ? "bg-green-100 border-green-300"
    : s >= 60
    ? "bg-yellow-100 border-yellow-300"
    : "bg-red-100 border-red-300";
const riskColor = (r: string) => {
  switch (r) {
    case "none":
      return "text-green-700 bg-green-100";
    case "low":
      return "text-blue-700 bg-blue-100";
    case "medium":
      return "text-yellow-700 bg-yellow-100";
    case "high":
      return "text-red-700 bg-red-100";
    default:
      return "text-gray-700 bg-gray-100";
  }
};

/* ─── tiny accordion ─── */
const Section = ({
  title,
  icon: Icon,
  children,
  defaultOpen = true,
  badge,
}: {
  title: string;
  icon: any;
  children: React.ReactNode;
  defaultOpen?: boolean;
  badge?: React.ReactNode;
}) => {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
      <button
        onClick={() => setOpen((o) => !o)}
        className="w-full flex items-center gap-3 px-6 py-4 text-left hover:bg-slate-50 transition"
      >
        <Icon className="text-cyan-600 shrink-0" size={20} />
        <span className="font-semibold text-slate-800 flex-1">{title}</span>
        {badge}
        {open ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
      </button>
      {open && <div className="px-6 pb-5">{children}</div>}
    </div>
  );
};

/* ─── circular gauge ─── */
const ScoreGauge = ({ score, label, size = 100 }: { score: number; label: string; size?: number }) => {
  const r = (size - 12) / 2;
  const c = 2 * Math.PI * r;
  const offset = c - (score / 100) * c;
  const colour = score >= 80 ? "#22c55e" : score >= 60 ? "#eab308" : "#ef4444";
  return (
    <div className="flex flex-col items-center gap-1">
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="#e2e8f0" strokeWidth={10} />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke={colour}
          strokeWidth={10}
          strokeLinecap="round"
          strokeDasharray={c}
          strokeDashoffset={offset}
          style={{ transition: "stroke-dashoffset 0.8s ease" }}
        />
      </svg>
      <span className={`text-2xl font-bold -mt-16 ${scoreColor(score)}`}>{score}</span>
      <span className="text-xs text-slate-500 mt-5">{label}</span>
    </div>
  );
};

/* ════════════════════════════════════════════════════════════════════ */

const ResumeEnhancementFraud = () => {
  const [resumeData, setResumeData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [analysing, setAnalysing] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [jobDesc, setJobDesc] = useState("");
  const [error, setError] = useState("");
  const navigate = useNavigate();
  const { user } = useAuth();

  // Redirect free users to premium page
  useEffect(() => {
    if (user && !user.isPremium) {
      navigate("/jobseeker/premium", { replace: true });
    }
  }, [user, navigate]);

  useEffect(() => {
    fetchResume();
  }, []);

  const fetchResume = async () => {
    try {
      const token = localStorage.getItem("token");
      const res = await axios.get(`${API_URL}/api/jobseeker/my-resumes`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.data.success) {
        const raw = res.data.data;
        const list = Array.isArray(raw) ? raw : raw?.resumes || [];
        if (list.length > 0) setResumeData(list[0]);
      }
    } catch (err: any) {
      console.error("Failed to load resume:", err);
    } finally {
      setLoading(false);
    }
  };

  const runAnalysis = async () => {
    if (!resumeData) return;
    setAnalysing(true);
    setError("");
    setResult(null);
    try {
      const token = localStorage.getItem("token");
      const res = await axios.post(
        `${API_URL}/api/jobseeker/resume-enhancement-fraud`,
        { resumeId: resumeData._id, jobDescription: jobDesc },
        { headers: { Authorization: `Bearer ${token}` }, timeout: 30000 }
      );
      if (res.data.success) {
        setResult(res.data.data);
      } else {
        setError(res.data.error || "Analysis failed");
      }
    } catch (err: any) {
      setError(err?.response?.data?.error || err.message || "Analysis failed");
    } finally {
      setAnalysing(false);
    }
  };

  /* ─── loading / empty states ─── */
  if (loading)
    return (
      <DashboardLayout title="Resume Enhancement & Fraud Detection" subtitle="Module 3 – FE-1, FE-2, FE-3">
        <div className="flex items-center justify-center h-64">
          <Loader className="animate-spin text-cyan-600" size={32} />
        </div>
      </DashboardLayout>
    );

  if (!resumeData)
    return (
      <DashboardLayout title="Resume Enhancement & Fraud Detection" subtitle="Module 3 – FE-1, FE-2, FE-3">
        <div className="text-center py-20 text-slate-500">
          <FileText size={48} className="mx-auto mb-4 text-slate-300" />
          <p className="text-lg font-medium">No resume uploaded yet</p>
          <p className="mt-1 text-sm">Upload a resume first, then come back for analysis.</p>
        </div>
      </DashboardLayout>
    );

  const fe1 = result?.fe1_formatting_grammar;
  const fe2 = result?.fe2_fraud_detection;
  const fe3 = result?.fe3_enhancement;

  return (
    <DashboardLayout title="Resume Enhancement & Fraud Detection" subtitle="Module 3 — Formatting, Fraud & Enhancement Analysis">
      {/* ── top – trigger area ── */}
      <div className="bg-gradient-to-r from-cyan-600 to-blue-700 rounded-2xl p-6 text-white mb-6">
        <div className="flex flex-col md:flex-row items-start md:items-end gap-4">
          <div className="flex-1">
            <h2 className="text-xl font-bold flex items-center gap-2">
              <ShieldCheck size={24} /> Module 3 Analysis
            </h2>
            <p className="text-cyan-100 text-sm mt-1">
              FE-1 Formatting & Grammar · FE-2 Fraud Detection · FE-3 Enhancement Recommendations
            </p>
            <p className="text-xs text-cyan-200 mt-2">
              Resume: <span className="font-medium text-white">{resumeData.parsedData?.name || resumeData.originalFileName}</span>
            </p>
          </div>

          <div className="w-full md:w-80">
            <label className="text-xs text-cyan-100 mb-1 block">Job Description (optional — improves keyword gap analysis)</label>
            <textarea
              rows={2}
              value={jobDesc}
              onChange={(e) => setJobDesc(e.target.value)}
              placeholder="Paste job description here for keyword-gap analysis…"
              className="w-full rounded-lg bg-white/10 border border-white/20 text-white placeholder-cyan-200 text-sm px-3 py-2 focus:outline-none focus:ring-2 focus:ring-white/30"
            />
          </div>

          <button
            onClick={runAnalysis}
            disabled={analysing}
            className="flex items-center gap-2 bg-white text-cyan-700 font-semibold px-6 py-3 rounded-xl shadow hover:bg-cyan-50 transition disabled:opacity-60"
          >
            {analysing ? <Loader className="animate-spin" size={18} /> : <Zap size={18} />}
            {analysing ? "Analysing…" : "Run Analysis"}
          </button>
        </div>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 rounded-xl p-4 mb-6 flex items-center gap-2">
          <XCircle size={18} /> {error}
        </div>
      )}

      {/* ── results ── */}
      {result && (
        <div className="space-y-6">
          {/* ── Overview Scores ── */}
          <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
            <h3 className="text-lg font-bold text-slate-800 mb-4 flex items-center gap-2">
              <TrendingUp size={20} className="text-cyan-600" /> Overview Scores
            </h3>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-4 items-center justify-items-center">
              <ScoreGauge score={result.module3_score || 0} label="Module 3 Overall" size={110} />
              <ScoreGauge score={fe1?.formatting_score || 0} label="Formatting" />
              <ScoreGauge score={fe1?.grammar_score || 0} label="Grammar" />
              <ScoreGauge score={fe1?.keyword_gap_score || 0} label="Keyword Match" />
              <div className="flex flex-col items-center gap-1">
                <span
                  className={`text-sm font-bold uppercase px-4 py-2 rounded-full ${riskColor(
                    fe2?.risk_level || "none"
                  )}`}
                >
                  {fe2?.risk_level || "none"} risk
                </span>
                <span className="text-xs text-slate-500 mt-1">Fraud Score: {fe2?.fraud_score ?? 0}/100</span>
              </div>
            </div>
            {result.executive_summary && (
              <p className="mt-4 text-sm text-slate-600 bg-slate-50 rounded-lg p-3 border border-slate-100">
                <Info size={14} className="inline mr-1 -mt-0.5 text-slate-400" />
                {result.executive_summary}
              </p>
            )}
          </div>

          {/* ════════ FE-1 ════════ */}
          <Section
            title="FE-1: Formatting, Grammar & Keyword Gaps"
            icon={Type}
            badge={
              <span className={`text-xs font-semibold px-2 py-0.5 rounded-full border ${scoreBg(fe1?.overall_fe1_score || 0)}`}>
                {fe1?.overall_fe1_score ?? "–"}/100
              </span>
            }
          >
            {/* Issues */}
            {fe1?.issues?.length > 0 && (
              <div className="mb-4">
                <h4 className="text-sm font-semibold text-slate-700 mb-2 flex items-center gap-1">
                  <AlertTriangle size={14} className="text-yellow-500" /> Issues Found ({fe1.issues.length})
                </h4>
                <ul className="space-y-1">
                  {fe1.issues.map((issue: string, i: number) => (
                    <li key={i} className="flex items-start gap-2 text-sm text-slate-600 bg-yellow-50 rounded-lg px-3 py-2">
                      <AlertCircle size={14} className="text-yellow-500 mt-0.5 shrink-0" />
                      {issue}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Corrective Actions */}
            {fe1?.corrective_actions?.length > 0 && (
              <div className="mb-4">
                <h4 className="text-sm font-semibold text-slate-700 mb-2 flex items-center gap-1">
                  <Lightbulb size={14} className="text-cyan-500" /> Corrective Actions
                </h4>
                <ul className="space-y-1">
                  {fe1.corrective_actions.map((fix: string, i: number) => (
                    <li key={i} className="flex items-start gap-2 text-sm text-slate-600 bg-cyan-50 rounded-lg px-3 py-2">
                      <ArrowRight size={14} className="text-cyan-500 mt-0.5 shrink-0" />
                      {fix}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Sections Found */}
            {fe1?.formatting_details?.sections_found && (
              <div className="mb-4">
                <h4 className="text-sm font-semibold text-slate-700 mb-2 flex items-center gap-1">
                  <Layout size={14} className="text-blue-500" /> Sections Detected
                </h4>
                <div className="flex flex-wrap gap-2">
                  {Object.entries(fe1.formatting_details.sections_found).map(([section, found]: [string, any]) => (
                    <span
                      key={section}
                      className={`text-xs px-3 py-1 rounded-full border ${
                        found ? "bg-green-50 text-green-700 border-green-200" : "bg-red-50 text-red-600 border-red-200"
                      }`}
                    >
                      {found ? <CheckCircle size={12} className="inline mr-1 -mt-0.5" /> : <XCircle size={12} className="inline mr-1 -mt-0.5" />}
                      {section}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Grammar Details */}
            {(fe1?.grammar_details?.action_verb_count != null || fe1?.grammar_details?.metric_count != null) && (
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
                <Stat label="Strong Action Verbs" value={fe1.grammar_details.action_verb_count} />
                <Stat label="Quantifiable Metrics" value={fe1.grammar_details.metric_count} />
                <Stat label="Word Count" value={fe1.formatting_details?.word_count} />
                <Stat label="Keyword Gap Score" value={`${fe1.keyword_gap_score}/100`} />
              </div>
            )}

            {/* Keyword Gap Details */}
            {fe1?.keyword_gap_details && (
              <div>
                {fe1.keyword_gap_details.resume_keywords_found?.length > 0 && (
                  <div className="mb-3">
                    <h4 className="text-sm font-semibold text-slate-700 mb-1 flex items-center gap-1">
                      <Key size={14} className="text-green-500" /> Keywords Found in Resume
                    </h4>
                    <div className="flex flex-wrap gap-1.5">
                      {fe1.keyword_gap_details.resume_keywords_found.map((kw: string) => (
                        <span key={kw} className="text-xs px-2 py-0.5 bg-green-50 text-green-700 rounded border border-green-200">
                          {kw}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
                {fe1.keyword_gap_details.missing_keywords?.length > 0 && (
                  <div>
                    <h4 className="text-sm font-semibold text-slate-700 mb-1 flex items-center gap-1">
                      <Search size={14} className="text-red-500" /> Missing Keywords (from Job Description)
                    </h4>
                    <div className="flex flex-wrap gap-1.5">
                      {fe1.keyword_gap_details.missing_keywords.map((kw: string) => (
                        <span key={kw} className="text-xs px-2 py-0.5 bg-red-50 text-red-600 rounded border border-red-200">
                          {kw}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
                {fe1.keyword_gap_details.detected_domains?.length > 0 && (
                  <div className="mt-3">
                    <h4 className="text-xs text-slate-500 mb-1">Detected Domains</h4>
                    <div className="flex flex-wrap gap-1.5">
                      {fe1.keyword_gap_details.detected_domains.map((d: string) => (
                        <span key={d} className="text-xs px-2 py-0.5 bg-blue-50 text-blue-700 rounded border border-blue-200">
                          {d.replace(/_/g, " ")}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {fe1?.issues?.length === 0 && (
              <p className="text-sm text-green-600 flex items-center gap-1">
                <CheckCircle size={14} /> No formatting or grammar issues detected.
              </p>
            )}
          </Section>

          {/* ════════ FE-2 ════════ */}
          <Section
            title="FE-2: Fraud Detection & Inconsistencies"
            icon={ShieldCheck}
            badge={
              <span className={`text-xs font-bold uppercase px-3 py-0.5 rounded-full ${riskColor(fe2?.risk_level || "none")}`}>
                {fe2?.risk_level || "none"}
              </span>
            }
          >
            <p className="text-sm text-slate-600 mb-3">{fe2?.summary}</p>

            {fe2?.issues?.length > 0 ? (
              <div className="mb-4 space-y-2">
                {fe2.issues.map((issue: any, i: number) => (
                  <div
                    key={i}
                    className={`rounded-lg border px-4 py-3 text-sm ${
                      issue.severity === "high"
                        ? "bg-red-50 border-red-200"
                        : issue.severity === "medium"
                        ? "bg-yellow-50 border-yellow-200"
                        : "bg-blue-50 border-blue-200"
                    }`}
                  >
                    <div className="flex items-center gap-2 font-semibold text-slate-700">
                      {issue.severity === "high" ? (
                        <XCircle size={14} className="text-red-500" />
                      ) : issue.severity === "medium" ? (
                        <AlertTriangle size={14} className="text-yellow-500" />
                      ) : (
                        <Info size={14} className="text-blue-500" />
                      )}
                      <span className="uppercase text-xs tracking-wide">{issue.severity}</span>
                      <span className="text-xs text-slate-400">({issue.type?.replace(/_/g, " ")})</span>
                    </div>
                    <p className="ml-6 text-slate-700 mt-1">{issue.message}</p>
                    {issue.detail && <p className="ml-6 text-xs text-slate-500 mt-0.5">{issue.detail}</p>}
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-green-600 flex items-center gap-1 mb-3">
                <CheckCircle size={14} /> No fraud indicators or inconsistencies detected.
              </p>
            )}

            {fe2?.recommendations?.length > 0 && (
              <div>
                <h4 className="text-sm font-semibold text-slate-700 mb-2 flex items-center gap-1">
                  <Lightbulb size={14} className="text-cyan-500" /> Recommendations
                </h4>
                <ul className="space-y-1">
                  {fe2.recommendations.map((rec: string, i: number) => (
                    <li key={i} className="flex items-start gap-2 text-sm text-slate-600 bg-cyan-50 rounded-lg px-3 py-2">
                      <ArrowRight size={14} className="text-cyan-500 mt-0.5 shrink-0" />
                      {rec}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </Section>

          {/* ════════ FE-3 ════════ */}
          <Section
            title="FE-3: Enhancement Recommendations"
            icon={Award}
            badge={
              <span className={`text-xs font-semibold px-2 py-0.5 rounded-full border ${scoreBg(fe3?.enhancement_score || 0)}`}>
                {fe3?.enhancement_score ?? "–"}/100
              </span>
            }
          >
            {/* Priority Actions */}
            {fe3?.priority_actions?.length > 0 && (
              <div className="mb-5">
                <h4 className="text-sm font-semibold text-slate-700 mb-2 flex items-center gap-1">
                  <Zap size={14} className="text-orange-500" /> Priority Actions
                </h4>
                <ol className="space-y-1.5">
                  {fe3.priority_actions.map((a: string, i: number) => (
                    <li key={i} className="flex items-start gap-2 text-sm text-slate-700 bg-orange-50 rounded-lg px-3 py-2 border border-orange-100">
                      <span className="font-bold text-orange-600 shrink-0">{i + 1}.</span>
                      {a}
                    </li>
                  ))}
                </ol>
              </div>
            )}

            {/* Action Verb Analysis */}
            {fe3?.action_verb_analysis && (
              <div className="mb-5">
                <h4 className="text-sm font-semibold text-slate-700 mb-2 flex items-center gap-1">
                  <BookOpen size={14} className="text-indigo-500" /> Action Verb Analysis
                </h4>

                {fe3.action_verb_analysis.strong_verbs_used?.length > 0 && (
                  <div className="mb-2">
                    <span className="text-xs text-slate-500">Strong verbs used:</span>
                    <div className="flex flex-wrap gap-1.5 mt-1">
                      {fe3.action_verb_analysis.strong_verbs_used.map((v: string) => (
                        <span key={v} className="text-xs px-2 py-0.5 bg-green-50 text-green-700 rounded border border-green-200">
                          {v}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {fe3.action_verb_analysis.weak_verbs_found?.length > 0 && (
                  <div className="mb-2">
                    <span className="text-xs text-slate-500">Weak verbs to replace:</span>
                    <div className="flex flex-wrap gap-1.5 mt-1">
                      {fe3.action_verb_analysis.weak_verbs_found.map((v: string) => (
                        <span key={v} className="text-xs px-2 py-0.5 bg-red-50 text-red-600 rounded border border-red-200">
                          {v}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {fe3.action_verb_analysis.replacement_suggestions?.length > 0 && (
                  <div className="mt-2 space-y-1">
                    {fe3.action_verb_analysis.replacement_suggestions.map((s: any, i: number) => (
                      <div key={i} className="text-xs bg-slate-50 rounded px-3 py-2 border border-slate-100">
                        Replace "<span className="font-semibold text-red-600">{s.replace}</span>" with{" "}
                        {s.with.map((alt: string, j: number) => (
                          <span key={j}>
                            {j > 0 && ", "}
                            <span className="font-semibold text-green-700">{alt}</span>
                          </span>
                        ))}
                      </div>
                    ))}
                  </div>
                )}

                {fe3.action_verb_analysis.verbs_by_category && (
                  <div className="mt-3">
                    <span className="text-xs text-slate-500">Recommended verbs by category:</span>
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2 mt-1">
                      {Object.entries(fe3.action_verb_analysis.verbs_by_category).map(([cat, verbs]: [string, any]) => (
                        <div key={cat} className="bg-indigo-50 rounded-lg px-3 py-2 border border-indigo-100">
                          <span className="text-xs font-semibold text-indigo-700">{cat}</span>
                          <p className="text-xs text-indigo-600 mt-0.5">{verbs.join(", ")}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Summary Recommendations */}
            {fe3?.summary_recommendations && (
              <div className="mb-5">
                <h4 className="text-sm font-semibold text-slate-700 mb-2 flex items-center gap-1">
                  <Eye size={14} className="text-violet-500" /> Professional Summary
                </h4>
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-xs text-slate-500">Status:</span>
                  {fe3.summary_recommendations.has_summary ? (
                    <span className="text-xs text-green-700 bg-green-50 px-2 py-0.5 rounded-full border border-green-200">
                      <CheckCircle size={10} className="inline mr-1" /> Summary present
                    </span>
                  ) : (
                    <span className="text-xs text-red-600 bg-red-50 px-2 py-0.5 rounded-full border border-red-200">
                      <XCircle size={10} className="inline mr-1" /> Missing summary
                    </span>
                  )}
                  {fe3.summary_recommendations.inferred_role && (
                    <span className="text-xs text-blue-700 bg-blue-50 px-2 py-0.5 rounded-full border border-blue-200">
                      {fe3.summary_recommendations.inferred_role}
                    </span>
                  )}
                </div>

                {fe3.summary_recommendations.suggestions?.length > 0 && (
                  <ul className="space-y-1 mb-3">
                    {fe3.summary_recommendations.suggestions.map((s: string, i: number) => (
                      <li key={i} className="text-sm text-slate-600 flex items-start gap-1.5">
                        <ArrowRight size={13} className="text-violet-400 mt-0.5 shrink-0" />
                        {s}
                      </li>
                    ))}
                  </ul>
                )}

                {fe3.summary_recommendations.example_summaries?.length > 0 && (
                  <div>
                    <span className="text-xs text-slate-500">Example summaries you can adapt:</span>
                    <div className="mt-1 space-y-2">
                      {fe3.summary_recommendations.example_summaries.map((ex: string, i: number) => (
                        <div key={i} className="text-sm text-slate-700 border-l-3 border-violet-400 bg-violet-50 rounded-r-lg pl-3 py-2 pr-2">
                          {ex}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* ATS Layout Recommendations */}
            {fe3?.ats_layout_recommendations && (
              <div className="mb-5">
                <h4 className="text-sm font-semibold text-slate-700 mb-2 flex items-center gap-1">
                  <Layout size={14} className="text-teal-500" /> ATS-Friendly Layout
                </h4>

                {fe3.ats_layout_recommendations.ideal_section_order?.length > 0 && (
                  <div className="mb-3">
                    <span className="text-xs text-slate-500">Recommended section order:</span>
                    <div className="flex flex-wrap gap-1.5 mt-1">
                      {fe3.ats_layout_recommendations.ideal_section_order.map((s: string, i: number) => (
                        <span key={s} className="text-xs px-2 py-1 bg-teal-50 text-teal-700 rounded border border-teal-200 flex items-center gap-1">
                          <span className="font-bold text-teal-500">{i + 1}</span> {s}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {fe3.ats_layout_recommendations.current_issues?.length > 0 && (
                  <div className="mb-3">
                    <span className="text-xs text-red-500 font-medium">Current issues:</span>
                    <ul className="mt-1 space-y-1">
                      {fe3.ats_layout_recommendations.current_issues.map((issue: string, i: number) => (
                        <li key={i} className="text-sm text-red-600 flex items-start gap-1.5">
                          <XCircle size={13} className="mt-0.5 shrink-0" /> {issue}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {fe3.ats_layout_recommendations.suggestions?.length > 0 && (
                  <ul className="space-y-1">
                    {fe3.ats_layout_recommendations.suggestions.map((s: string, i: number) => (
                      <li key={i} className="text-sm text-slate-600 flex items-start gap-1.5">
                        <Target size={13} className="text-teal-400 mt-0.5 shrink-0" /> {s}
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            )}

            {/* Content Recommendations */}
            {fe3?.content_recommendations?.suggestions?.length > 0 && (
              <div>
                <h4 className="text-sm font-semibold text-slate-700 mb-2 flex items-center gap-1">
                  <Lightbulb size={14} className="text-amber-500" /> Content Improvements
                </h4>
                <ul className="space-y-1">
                  {fe3.content_recommendations.suggestions.map((s: string, i: number) => (
                    <li key={i} className="text-sm text-slate-600 flex items-start gap-1.5">
                      <ArrowRight size={13} className="text-amber-400 mt-0.5 shrink-0" /> {s}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </Section>

          {/* ── Re-run button ── */}
          <div className="flex justify-center pt-2 pb-8">
            <button
              onClick={runAnalysis}
              disabled={analysing}
              className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-cyan-600 to-blue-600 text-white font-semibold rounded-xl shadow hover:shadow-lg transition disabled:opacity-60"
            >
              <RefreshCw size={18} className={analysing ? "animate-spin" : ""} />
              {analysing ? "Re-Analysing…" : "Re-Run Analysis"}
            </button>
          </div>
        </div>
      )}
    </DashboardLayout>
  );
};

/* small stat card */
const Stat = ({ label, value }: { label: string; value: any }) => (
  <div className="bg-slate-50 rounded-lg p-3 border border-slate-100 text-center">
    <div className="text-lg font-bold text-slate-800">{value ?? "–"}</div>
    <div className="text-xs text-slate-500">{label}</div>
  </div>
);

export default ResumeEnhancementFraud;
