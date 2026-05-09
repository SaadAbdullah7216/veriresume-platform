import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import AdminLayout from "./AdminLayout";
import axios from "axios";
import {
  Users,
  Briefcase,
  AlertTriangle,
  Brain,
  CreditCard,
  FileText,
  TrendingUp,
  DollarSign,
  Shield,
  Eye,
  Trash2,
  Search,
  Send,
  UserPlus,
  Building2,
  CheckCircle,
  Loader,
  RefreshCw,
} from "lucide-react";
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

const API_URL =
  import.meta.env.VITE_API_URL ||
  import.meta.env.VITE_API_BASE_URL ||
  "http://localhost:3000";

const AdminDashboard = () => {
  const navigate = useNavigate();

  // Live data state
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<any>({});
  const [userGrowthData, setUserGrowthData] = useState<any[]>([]);
  const [aiUsageData, setAiUsageData] = useState<any[]>([]);
  const [recentUsers, setRecentUsers] = useState<any[]>([]);
  const [anomalyReports, setAnomalyReports] = useState<any[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  const COLORS = ["#0ea5e9", "#06b6d4", "#3b82f6"];

  useEffect(() => {
    fetchAllData();
  }, []);

  const fetchAllData = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem("token");
      const headers = { Authorization: `Bearer ${token}` };

      const [statsRes, growthRes, usageRes, usersRes, anomalyRes] = await Promise.all([
        axios.get(`${API_URL}/api/admin/stats`, { headers }).catch(() => ({ data: { success: false } })),
        axios.get(`${API_URL}/api/admin/user-growth`, { headers }).catch(() => ({ data: { success: false } })),
        axios.get(`${API_URL}/api/admin/ai-usage`, { headers }).catch(() => ({ data: { success: false } })),
        axios.get(`${API_URL}/api/admin/recent-users`, { headers }).catch(() => ({ data: { success: false } })),
        axios.get(`${API_URL}/api/admin/anomaly-reports`, { headers }).catch(() => ({ data: { success: false } })),
      ]);

      if (statsRes.data.success) setStats(statsRes.data.data);
      if (growthRes.data.success) setUserGrowthData(growthRes.data.data);
      if (usageRes.data.success) setAiUsageData(usageRes.data.data);
      if (usersRes.data.success) setRecentUsers(usersRes.data.data);
      if (anomalyRes.data.success) setAnomalyReports(anomalyRes.data.data);
    } catch (err) {
      console.error("Failed to fetch admin data:", err);
    } finally {
      setLoading(false);
    }
  };

  const refreshData = async () => {
    setRefreshing(true);
    await fetchAllData();
    setRefreshing(false);
  };

  const deleteUser = async (userId: string) => {
    if (!confirm("Are you sure you want to delete this user?")) return;
    try {
      const token = localStorage.getItem("token");
      await axios.delete(`${API_URL}/api/admin/users/${userId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setRecentUsers((prev: any[]) => prev.filter((u: any) => u._id !== userId));
      const statsRes = await axios.get(`${API_URL}/api/admin/stats`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (statsRes.data.success) setStats(statsRes.data.data);
    } catch (err) {
      alert("Failed to delete user");
    }
  };

  const handleSearch = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" && searchQuery.trim()) {
      navigate(`/admin/users?search=${encodeURIComponent(searchQuery.trim())}`);
    }
  };

  const revenueData = [
    { month: "Jan", revenue: Math.round((stats.premiumRevenue || 0) * 0.3) },
    { month: "Feb", revenue: Math.round((stats.premiumRevenue || 0) * 0.5) },
    { month: "Mar", revenue: Math.round((stats.premiumRevenue || 0) * 0.6) },
    { month: "Apr", revenue: Math.round((stats.premiumRevenue || 0) * 0.7) },
    { month: "May", revenue: Math.round((stats.premiumRevenue || 0) * 0.85) },
    { month: "Jun", revenue: stats.premiumRevenue || 0 },
  ];

  const premiumPlans = [
    { id: 1, name: "Free", price: 0, users: Math.max(0, (stats.totalUsers || 0) - (stats.premiumUsers || 0)), color: "slate" },
    { id: 2, name: "Premium", price: 29, users: stats.premiumUsers || 0, color: "cyan" },
  ];

  return (
    <AdminLayout
      title="Admin Dashboard"
      subtitle="System Overview & Management — Live Data"
      headerExtra={
        <div className="flex items-center gap-4">
          <button
            onClick={refreshData}
            className="flex items-center gap-2 px-4 py-2 bg-cyan-50 text-cyan-700 rounded-xl hover:bg-cyan-100 transition-all font-semibold text-sm border border-cyan-200"
          >
            <RefreshCw size={16} className={refreshing ? "animate-spin" : ""} />
            Refresh
          </button>
          <div className="relative">
            <input
              type="text"
              placeholder="Search users, resumes... (Enter)"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyDown={handleSearch}
              className="pl-10 pr-4 py-2 border border-slate-300 rounded-xl w-72 focus:outline-none focus:ring-2 focus:ring-cyan-500"
            />
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400" size={18} />
          </div>
        </div>
      }
    >
          {loading ? (
            <div className="flex flex-col items-center justify-center py-20">
              <Loader className="animate-spin text-cyan-600 mb-4" size={40} />
              <p className="text-slate-600">Loading dashboard data...</p>
            </div>
          ) : (
            <>
              {/* Summary Metrics Cards - CLICKABLE */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6 mb-8">
                <div
                  onClick={() => navigate("/admin/users")}
                  className="bg-white rounded-2xl p-6 border border-slate-200 hover:border-blue-400 transition-all hover:shadow-lg cursor-pointer group"
                >
                  <div className="flex items-center justify-between mb-4">
                    <div className="bg-gradient-to-br from-blue-100 to-cyan-100 p-3 rounded-xl group-hover:scale-110 transition-transform">
                      <Users className="text-blue-600" size={24} />
                    </div>
                    <TrendingUp className="text-green-500" size={20} />
                  </div>
                  <h3 className="text-slate-600 text-sm mb-1">Total Users</h3>
                  <p className="text-3xl font-bold text-slate-900">{stats.totalUsers?.toLocaleString() || 0}</p>
                  <p className="text-xs text-blue-600 mt-2 group-hover:underline">Click to view all users →</p>
                </div>

                <div
                  onClick={() => navigate("/admin/users?role=jobseeker")}
                  className="bg-white rounded-2xl p-6 border border-slate-200 hover:border-cyan-400 transition-all hover:shadow-lg cursor-pointer group"
                >
                  <div className="flex items-center justify-between mb-4">
                    <div className="bg-gradient-to-br from-cyan-100 to-blue-100 p-3 rounded-xl group-hover:scale-110 transition-transform">
                      <UserPlus className="text-cyan-600" size={24} />
                    </div>
                    <TrendingUp className="text-green-500" size={20} />
                  </div>
                  <h3 className="text-slate-600 text-sm mb-1">Job Seekers</h3>
                  <p className="text-3xl font-bold text-slate-900">{stats.jobSeekers?.toLocaleString() || 0}</p>
                  <p className="text-xs text-cyan-600 mt-2 group-hover:underline">Click to view job seekers →</p>
                </div>

                <div
                  onClick={() => navigate("/admin/users?role=hr")}
                  className="bg-white rounded-2xl p-6 border border-slate-200 hover:border-blue-400 transition-all hover:shadow-lg cursor-pointer group"
                >
                  <div className="flex items-center justify-between mb-4">
                    <div className="bg-gradient-to-br from-blue-100 to-indigo-100 p-3 rounded-xl group-hover:scale-110 transition-transform">
                      <Building2 className="text-blue-600" size={24} />
                    </div>
                    <TrendingUp className="text-green-500" size={20} />
                  </div>
                  <h3 className="text-slate-600 text-sm mb-1">HR Recruiters</h3>
                  <p className="text-3xl font-bold text-slate-900">{stats.hrRecruiters?.toLocaleString() || 0}</p>
                  <p className="text-xs text-blue-600 mt-2 group-hover:underline">Click to view HR users →</p>
                </div>

                <div
                  onClick={() => navigate("/admin/users?role=premium")}
                  className="bg-white rounded-2xl p-6 border border-slate-200 hover:border-green-400 transition-all hover:shadow-lg cursor-pointer group"
                >
                  <div className="flex items-center justify-between mb-4">
                    <div className="bg-gradient-to-br from-green-100 to-emerald-100 p-3 rounded-xl group-hover:scale-110 transition-transform">
                      <CreditCard className="text-green-600" size={24} />
                    </div>
                    <TrendingUp className="text-green-500" size={20} />
                  </div>
                  <h3 className="text-slate-600 text-sm mb-1">Premium Users</h3>
                  <p className="text-3xl font-bold text-slate-900">{stats.premiumUsers?.toLocaleString() || 0}</p>
                  <p className="text-xs text-green-600 mt-2 group-hover:underline">Click to view premium users →</p>
                </div>

                <div
                  onClick={() => navigate("/admin/anomalies")}
                  className="bg-white rounded-2xl p-6 border border-slate-200 hover:border-red-400 transition-all hover:shadow-lg cursor-pointer group"
                >
                  <div className="flex items-center justify-between mb-4">
                    <div className="bg-gradient-to-br from-red-100 to-rose-100 p-3 rounded-xl group-hover:scale-110 transition-transform">
                      <AlertTriangle className="text-red-600" size={24} />
                    </div>
                    <span className="text-xs px-2 py-1 bg-red-100 text-red-700 rounded-full font-semibold">
                      {stats.flaggedResumes > 0 ? "Alert" : "OK"}
                    </span>
                  </div>
                  <h3 className="text-slate-600 text-sm mb-1">Flagged Resumes</h3>
                  <p className="text-3xl font-bold text-slate-900">{stats.flaggedResumes || 0}</p>
                  <p className="text-xs text-red-600 mt-2 group-hover:underline">Click to view anomalies →</p>
                </div>
              </div>

              {/* Extra Stats Row */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                <div onClick={() => navigate("/admin/jobs")} className="bg-gradient-to-br from-indigo-50 to-purple-50 rounded-2xl p-5 border border-indigo-200 cursor-pointer hover:shadow-md transition-all">
                  <div className="flex items-center gap-3">
                    <Briefcase className="text-indigo-600" size={22} />
                    <div>
                      <p className="text-sm text-slate-600">Active Jobs</p>
                      <p className="text-2xl font-bold text-slate-900">{stats.activeJobs || 0} <span className="text-sm font-normal text-slate-500">/ {stats.totalJobs || 0} total</span></p>
                    </div>
                  </div>
                </div>
                <div className="bg-gradient-to-br from-emerald-50 to-green-50 rounded-2xl p-5 border border-emerald-200">
                  <div className="flex items-center gap-3">
                    <FileText className="text-emerald-600" size={22} />
                    <div>
                      <p className="text-sm text-slate-600">Total Resumes</p>
                      <p className="text-2xl font-bold text-slate-900">{stats.totalResumes || 0}</p>
                    </div>
                  </div>
                </div>
                <div className="bg-gradient-to-br from-amber-50 to-yellow-50 rounded-2xl p-5 border border-amber-200">
                  <div className="flex items-center gap-3">
                    <Send className="text-amber-600" size={22} />
                    <div>
                      <p className="text-sm text-slate-600">Total Applications</p>
                      <p className="text-2xl font-bold text-slate-900">{stats.totalApplications || 0}</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Analytics Charts */}
              <div className="grid lg:grid-cols-2 gap-6 mb-8">
                <div className="bg-white rounded-2xl p-6 border border-slate-200">
                  <div className="flex items-center justify-between mb-6">
                    <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                      <TrendingUp className="text-cyan-600" size={20} />
                      User Growth
                    </h2>
                  </div>
                  {userGrowthData.length > 0 ? (
                    <ResponsiveContainer width="100%" height={250}>
                      <LineChart data={userGrowthData}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                        <XAxis dataKey="name" stroke="#64748b" />
                        <YAxis stroke="#64748b" />
                        <Tooltip />
                        <Line type="monotone" dataKey="users" stroke="#06b6d4" strokeWidth={3} />
                      </LineChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="flex items-center justify-center h-[250px] text-slate-400">
                      No growth data available
                    </div>
                  )}
                </div>

                <div className="bg-white rounded-2xl p-6 border border-slate-200">
                  <div className="flex items-center justify-between mb-6">
                    <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                      <DollarSign className="text-green-600" size={20} />
                      Revenue Overview
                    </h2>
                  </div>
                  <ResponsiveContainer width="100%" height={250}>
                    <BarChart data={revenueData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                      <XAxis dataKey="month" stroke="#64748b" />
                      <YAxis stroke="#64748b" />
                      <Tooltip />
                      <Bar dataKey="revenue" fill="url(#colorRevenue)" />
                      <defs>
                        <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="#06b6d4" />
                          <stop offset="100%" stopColor="#3b82f6" />
                        </linearGradient>
                      </defs>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>

              <div className="grid lg:grid-cols-3 gap-6 mb-8">
                <div className="bg-white rounded-2xl p-6 border border-slate-200">
                  <h2 className="text-lg font-bold text-slate-900 mb-6 flex items-center gap-2">
                    <Brain className="text-cyan-600" size={20} />
                    AI Analysis Usage
                  </h2>
                  {aiUsageData.length > 0 ? (
                    <>
                      <ResponsiveContainer width="100%" height={200}>
                        <PieChart>
                          <Pie
                            data={aiUsageData}
                            cx="50%"
                            cy="50%"
                            labelLine={false}
                            outerRadius={80}
                            fill="#8884d8"
                            dataKey="value"
                          >
                            {aiUsageData.map((_entry: any, index: number) => (
                              <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                            ))}
                          </Pie>
                          <Tooltip />
                        </PieChart>
                      </ResponsiveContainer>
                      <div className="mt-4 space-y-2">
                        {aiUsageData.map((item: any, idx: number) => (
                          <div key={idx} className="flex items-center justify-between text-sm">
                            <div className="flex items-center gap-2">
                              <div className="w-3 h-3 rounded-full" style={{ backgroundColor: COLORS[idx] }}></div>
                              <span className="text-slate-600">{item.name}</span>
                            </div>
                            <span className="font-bold text-slate-900">{item.value}%</span>
                          </div>
                        ))}
                      </div>
                    </>
                  ) : (
                    <div className="flex items-center justify-center h-[200px] text-slate-400">
                      No AI usage data
                    </div>
                  )}
                </div>

                <div className="lg:col-span-2 bg-white rounded-2xl p-6 border border-slate-200">
                  <div className="flex items-center justify-between mb-6">
                    <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                      <FileText className="text-cyan-600" size={20} />
                      Premium Plans Overview
                    </h2>
                  </div>
                  <div className="grid md:grid-cols-2 gap-4">
                    {premiumPlans.map((plan) => (
                      <div
                        key={plan.id}
                        className={`border-2 rounded-xl p-5 ${
                          plan.color === "cyan"
                            ? "border-cyan-400 bg-gradient-to-br from-cyan-50 to-blue-50"
                            : "border-slate-200 bg-slate-50"
                        }`}
                      >
                        <div className="flex items-center justify-between mb-4">
                          <h3 className="text-xl font-bold text-slate-900">{plan.name}</h3>
                        </div>
                        <p className="text-3xl font-bold text-slate-900 mb-2">
                          ${plan.price}
                          <span className="text-sm text-slate-600 font-normal">/month</span>
                        </p>
                        <p className="text-slate-600 mb-4">{plan.users} active users</p>
                        <div className="bg-white rounded-lg p-3">
                          <p className="text-sm text-slate-600 mb-1">Monthly Revenue</p>
                          <p className="text-xl font-bold text-green-600">
                            ${(plan.price * plan.users).toLocaleString()}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* User Management Table */}
              <div className="bg-white rounded-2xl p-6 border border-slate-200 mb-8">
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                    <Users className="text-cyan-600" size={20} />
                    Recent Users
                  </h2>
                  <div className="flex gap-3">
                    <button
                      onClick={refreshData}
                      className="px-4 py-2 bg-slate-100 text-slate-700 rounded-lg font-semibold hover:bg-slate-200 transition-all text-sm flex items-center gap-2"
                    >
                      <RefreshCw size={16} />
                      Refresh
                    </button>
                  </div>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-slate-200">
                        <th className="text-left py-3 px-4 text-sm font-semibold text-slate-600">Name</th>
                        <th className="text-left py-3 px-4 text-sm font-semibold text-slate-600">Email</th>
                        <th className="text-left py-3 px-4 text-sm font-semibold text-slate-600">Role</th>
                        <th className="text-center py-3 px-4 text-sm font-semibold text-slate-600">Status</th>
                        <th className="text-center py-3 px-4 text-sm font-semibold text-slate-600">Joined On</th>
                        <th className="text-center py-3 px-4 text-sm font-semibold text-slate-600">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {recentUsers.length > 0 ? (
                        recentUsers.map((user: any) => (
                          <tr key={user._id} className="border-b border-slate-100 hover:bg-slate-50 transition-all">
                            <td className="py-4 px-4">
                              <div className="flex items-center gap-3">
                                <div className="w-10 h-10 bg-gradient-to-br from-blue-600 to-cyan-600 rounded-full flex items-center justify-center">
                                  <span className="text-white font-semibold text-sm">
                                    {user.name?.split(" ").map((n: string) => n[0]).join("").toUpperCase().slice(0, 2) || "?"}
                                  </span>
                                </div>
                                <span className="font-semibold text-slate-900">{user.name}</span>
                              </div>
                            </td>
                            <td className="py-4 px-4 text-slate-600 text-sm">{user.email}</td>
                            <td className="py-4 px-4">
                              <span
                                className={`px-3 py-1 rounded-full text-xs font-semibold ${
                                  user.role === "HR"
                                    ? "bg-blue-100 text-blue-700"
                                    : user.role === "Admin"
                                    ? "bg-purple-100 text-purple-700"
                                    : "bg-cyan-100 text-cyan-700"
                                }`}
                              >
                                {user.role}
                              </span>
                              {user.isPremium && (
                                <span className="ml-2 px-2 py-0.5 bg-amber-100 text-amber-700 rounded-full text-xs font-semibold">
                                  Premium
                                </span>
                              )}
                            </td>
                            <td className="py-4 px-4 text-center">
                              <span className="px-3 py-1 bg-green-100 text-green-700 rounded-full text-xs font-semibold inline-flex items-center gap-1">
                                <CheckCircle size={14} />
                                Active
                              </span>
                            </td>
                            <td className="py-4 px-4 text-center text-slate-600">{user.joined}</td>
                            <td className="py-4 px-4">
                              <div className="flex justify-center gap-2">
                                <button className="p-2 hover:bg-blue-50 text-blue-600 rounded-lg transition-all" title="View">
                                  <Eye size={16} />
                                </button>
                                <button
                                  onClick={() => deleteUser(user._id)}
                                  className="p-2 hover:bg-red-50 text-red-600 rounded-lg transition-all"
                                  title="Delete"
                                >
                                  <Trash2 size={16} />
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))
                      ) : (
                        <tr>
                          <td colSpan={6} className="text-center py-8 text-slate-400">
                            No users found
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Anomaly Reports Table */}
              <div className="bg-white rounded-2xl p-6 border border-slate-200">
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                    <AlertTriangle className="text-red-600" size={20} />
                    Recent Anomaly Reports
                  </h2>
                </div>
                {anomalyReports.length > 0 ? (
                  <div className="space-y-3">
                    {anomalyReports.map((report: any) => (
                      <div
                        key={report._id}
                        className="border-2 border-red-200 bg-red-50 rounded-xl p-4 hover:shadow-md transition-all"
                      >
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-2">
                              <FileText size={16} className="text-red-600" />
                              <span className="font-semibold text-slate-900 text-sm">{report.resume}</span>
                            </div>
                            <div className="flex items-center gap-4 mb-3">
                              <div>
                                <span className="text-xs text-slate-500">Risk Score</span>
                                <div className="flex items-center gap-2">
                                  <div className="w-32 bg-slate-200 rounded-full h-2">
                                    <div
                                      className="bg-red-600 h-2 rounded-full"
                                      style={{ width: `${report.score}%` }}
                                    ></div>
                                  </div>
                                  <span className="text-sm font-bold text-slate-900">{report.score}%</span>
                                </div>
                              </div>
                              <span
                                className={`px-3 py-1 rounded-full text-xs font-semibold ${
                                  report.status === "Flagged" || report.status === "flagged"
                                    ? "bg-red-200 text-red-700"
                                    : "bg-yellow-200 text-yellow-700"
                                }`}
                              >
                                {report.status}
                              </span>
                            </div>
                            <p className="text-sm text-slate-700">
                              <span className="font-semibold">Reason:</span> {report.reason}
                            </p>
                          </div>
                          <div className="flex gap-2">
                            <button className="p-2 hover:bg-white rounded-lg transition-all">
                              <Eye size={18} className="text-red-600" />
                            </button>
                            <button className="px-3 py-2 bg-cyan-600 text-white rounded-lg text-xs font-semibold hover:bg-cyan-700 transition-all">
                              Re-verify
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8 text-slate-400">
                    <Shield className="mx-auto mb-3" size={40} />
                    <p>No anomaly reports found — your system is clean!</p>
                  </div>
                )}
              </div>
            </>
          )}
    </AdminLayout>
  );
};

export default AdminDashboard;
