import { useState, useEffect } from "react";
import AdminLayout from "./AdminLayout";
import axios from "axios";
import {
  Loader,
  RefreshCw,
  BarChart3,
  Brain,
  FileCheck,
  FileSearch,
  TrendingUp,
  Activity,
} from "lucide-react";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  PieChart,
  Pie,
  Cell,
} from "recharts";

const API_URL = import.meta.env.VITE_API_URL || import.meta.env.VITE_API_BASE_URL || "http://localhost:3000";
const COLORS = ["#06b6d4", "#3b82f6", "#8b5cf6", "#f59e0b"];

interface AIUsageData {
  totalAnalyzed: number;
  averageAtsScore: number;
  averageGrammarScore: number;
  averageRelevancyScore: number;
  anomaliesDetected: number;
  analysisResults: {
    low: number;
    medium: number;
    high: number;
    excellent: number;
  };
  anomalyTrends: { month: string; total: number; flagged: number; cleared: number }[];
  usageBreakdown: { name: string; value: number }[];
}

const AdminAnalytics = () => {
  const [data, setData] = useState<AIUsageData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem("token");
      const res = await axios.get(`${API_URL}/api/admin/ai-usage`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.data.success) {
        setData(res.data.data);
      }
    } catch (err) {
      console.error("Failed to fetch analytics:", err);
    } finally {
      setLoading(false);
    }
  };

  const ScoreBar = ({ label, value, color }: { label: string; value: number; color: string }) => (
    <div className="mb-5">
      <div className="flex justify-between items-center mb-2">
        <span className="text-sm font-semibold text-slate-700">{label}</span>
        <span className="text-sm font-bold text-slate-900">{value.toFixed(1)}%</span>
      </div>
      <div className="w-full bg-slate-100 rounded-full h-3.5 overflow-hidden">
        <div className={`h-full rounded-full transition-all duration-700 ${color}`} style={{ width: `${Math.min(value, 100)}%` }} />
      </div>
    </div>
  );

  return (
    <AdminLayout
      title="AI Analytics"
      subtitle="Resume analysis performance and AI usage stats"
      headerExtra={
        <button
          onClick={fetchData}
          className="flex items-center gap-2 px-4 py-2 bg-cyan-50 text-cyan-700 rounded-xl hover:bg-cyan-100 transition-all font-semibold text-sm border border-cyan-200"
        >
          <RefreshCw size={16} />
          Refresh
        </button>
      }
    >
      {loading ? (
        <div className="flex flex-col items-center justify-center py-20">
          <Loader className="animate-spin text-cyan-600 mb-4" size={40} />
          <p className="text-slate-600">Loading analytics...</p>
        </div>
      ) : !data ? (
        <div className="text-center py-16 bg-white rounded-2xl border border-slate-200">
          <BarChart3 className="mx-auto text-slate-300" size={56} />
          <p className="text-slate-700 text-lg mt-4 font-semibold">No analytics data</p>
          <p className="text-slate-500 mt-2">Analytics will appear as resumes get analyzed.</p>
        </div>
      ) : (
        <div className="space-y-6">
          {/* Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
            {[
              { label: "Total Analyzed", value: data.totalAnalyzed, icon: FileCheck, color: "bg-blue-500", bg: "bg-blue-50" },
              { label: "Anomalies Detected", value: data.anomaliesDetected, icon: Activity, color: "bg-red-500", bg: "bg-red-50" },
              { label: "Avg ATS Score", value: `${data.averageAtsScore.toFixed(1)}%`, icon: TrendingUp, color: "bg-green-500", bg: "bg-green-50" },
              { label: "Avg Grammar", value: `${data.averageGrammarScore.toFixed(1)}%`, icon: FileSearch, color: "bg-purple-500", bg: "bg-purple-50" },
            ].map((card) => (
              <div key={card.label} className="bg-white rounded-2xl border border-slate-200 p-6">
                <div className="flex items-center gap-3 mb-3">
                  <div className={`p-2.5 rounded-xl ${card.bg}`}>
                    <card.icon size={20} className={card.color.replace("bg-", "text-")} />
                  </div>
                  <span className="text-sm font-medium text-slate-500">{card.label}</span>
                </div>
                <p className="text-3xl font-bold text-slate-900">{card.value}</p>
              </div>
            ))}
          </div>

          {/* Score Averages */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="bg-white rounded-2xl border border-slate-200 p-6">
              <h3 className="text-lg font-bold text-slate-900 mb-6 flex items-center gap-2">
                <Brain size={20} className="text-cyan-600" />
                Average Scores
              </h3>
              <ScoreBar label="ATS Score" value={data.averageAtsScore} color="bg-blue-500" />
              <ScoreBar label="Grammar Score" value={data.averageGrammarScore} color="bg-green-500" />
              <ScoreBar label="Relevancy Score" value={data.averageRelevancyScore} color="bg-purple-500" />
            </div>

            {/* Score Distribution */}
            <div className="bg-white rounded-2xl border border-slate-200 p-6">
              <h3 className="text-lg font-bold text-slate-900 mb-6 flex items-center gap-2">
                <BarChart3 size={20} className="text-cyan-600" />
                Analysis Quality Distribution
              </h3>
              <div className="grid grid-cols-2 gap-4">
                {[
                  { label: "Low (0-40%)", value: data.analysisResults.low, color: "bg-red-100 text-red-700 border-red-200" },
                  { label: "Medium (40-60%)", value: data.analysisResults.medium, color: "bg-yellow-100 text-yellow-700 border-yellow-200" },
                  { label: "High (60-80%)", value: data.analysisResults.high, color: "bg-blue-100 text-blue-700 border-blue-200" },
                  { label: "Excellent (80-100%)", value: data.analysisResults.excellent, color: "bg-green-100 text-green-700 border-green-200" },
                ].map((item) => (
                  <div key={item.label} className={`rounded-xl border p-4 text-center ${item.color}`}>
                    <p className="text-3xl font-bold">{item.value}</p>
                    <p className="text-xs font-semibold mt-1">{item.label}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Anomaly Trends + Usage Breakdown */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Anomaly Trends Chart */}
            <div className="bg-white rounded-2xl border border-slate-200 p-6">
              <h3 className="text-lg font-bold text-slate-900 mb-6 flex items-center gap-2">
                <Activity size={20} className="text-red-500" />
                Anomaly Trends (Last 6 Months)
              </h3>
              {data.anomalyTrends && data.anomalyTrends.length > 0 ? (
                <ResponsiveContainer width="100%" height={280}>
                  <BarChart data={data.anomalyTrends}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                    <XAxis dataKey="month" stroke="#64748b" />
                    <YAxis stroke="#64748b" allowDecimals={false} />
                    <Tooltip />
                    <Legend />
                    <Bar dataKey="flagged" name="Flagged" fill="#ef4444" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="cleared" name="Cleared" fill="#22c55e" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex items-center justify-center h-[280px] text-slate-400">
                  No anomaly trend data yet
                </div>
              )}
            </div>

            {/* AI Usage Breakdown */}
            <div className="bg-white rounded-2xl border border-slate-200 p-6">
              <h3 className="text-lg font-bold text-slate-900 mb-6 flex items-center gap-2">
                <Brain size={20} className="text-cyan-600" />
                AI Usage Breakdown
              </h3>
              {data.usageBreakdown && data.usageBreakdown.length > 0 ? (
                <>
                  <ResponsiveContainer width="100%" height={200}>
                    <PieChart>
                      <Pie
                        data={data.usageBreakdown}
                        cx="50%"
                        cy="50%"
                        labelLine={false}
                        outerRadius={80}
                        fill="#8884d8"
                        dataKey="value"
                      >
                        {data.usageBreakdown.map((_: any, index: number) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                  <div className="mt-4 space-y-2">
                    {data.usageBreakdown.map((item: any, idx: number) => (
                      <div key={idx} className="flex items-center justify-between text-sm">
                        <div className="flex items-center gap-2">
                          <div className="w-3 h-3 rounded-full" style={{ backgroundColor: COLORS[idx] }}></div>
                          <span className="text-slate-600">{item.name}</span>
                        </div>
                        <span className="font-bold text-slate-900">{item.value}</span>
                      </div>
                    ))}
                  </div>
                </>
              ) : (
                <div className="flex items-center justify-center h-[200px] text-slate-400">
                  No usage data yet
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </AdminLayout>
  );
};

export default AdminAnalytics;
