import React, { useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import axios from "axios";
import {
  Home,
  Users,
  Briefcase,
  AlertTriangle,
  Brain,
  CreditCard,
  FileText,
  Settings,
  Clock,
  Menu,
  ChevronDown,
  ChevronRight,
  Shield,
  Send,
  LogOut,
  X,
} from "lucide-react";

interface AdminLayoutProps {
  children: React.ReactNode;
  title?: string;
  subtitle?: string;
  badge?: number;
  headerExtra?: React.ReactNode;
}

const AdminLayout: React.FC<AdminLayoutProps> = ({ children, title, subtitle, badge, headerExtra }) => {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [expandedMenus, setExpandedMenus] = useState<Record<string, boolean>>({ users: true, analytics: true });
  const [showAnnouncementModal, setShowAnnouncementModal] = useState(false);
  const [announcementTitle, setAnnouncementTitle] = useState("");
  const [announcementMessage, setAnnouncementMessage] = useState("");
  const [announcementTarget, setAnnouncementTarget] = useState("all");
  const [sending, setSending] = useState(false);
  const [sendResult, setSendResult] = useState<string | null>(null);
  const navigate = useNavigate();
  const location = useLocation();
  const { logout } = useAuth();
  const API_URL = import.meta.env.VITE_API_URL || "http://localhost:3000";

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  const handleSendAnnouncement = async () => {
    if (!announcementTitle.trim() || !announcementMessage.trim()) return;
    try {
      setSending(true);
      const token = localStorage.getItem("token");
      const res = await axios.post(
        `${API_URL}/api/admin/announcement`,
        { title: announcementTitle, message: announcementMessage, targets: announcementTarget },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setSendResult(res.data.message || "Announcement sent!");
      setAnnouncementTitle("");
      setAnnouncementMessage("");
      setTimeout(() => {
        setShowAnnouncementModal(false);
        setSendResult(null);
      }, 2000);
    } catch {
      setSendResult("Failed to send announcement");
    } finally {
      setSending(false);
    }
  };

  const toggleMenu = (menu: string) => {
    setExpandedMenus((prev) => ({ ...prev, [menu]: !prev[menu] }));
  };

  const isActive = (path: string) => location.pathname === path;
  const isActivePrefix = (prefix: string) => location.pathname.startsWith(prefix);

  const menuItems = [
    { icon: Home, label: "Dashboard", path: "/admin/dashboard" },
    {
      icon: Users,
      label: "Users",
      expandable: true,
      key: "users",
      submenu: [
        { label: "All Users", path: "/admin/users" },
        { label: "Job Seekers", path: "/admin/users?role=jobseeker" },
        { label: "HR Recruiters", path: "/admin/users?role=hr" },
      ],
    },
    { icon: Briefcase, label: "Job Posts", path: "/admin/jobs" },
    { icon: AlertTriangle, label: "Anomaly Reports", path: "/admin/anomalies", badge: badge },
    {
      icon: Brain,
      label: "AI Analytics",
      expandable: true,
      key: "analytics",
      submenu: [
        { label: "Usage Stats", path: "/admin/analytics" },
        { label: "Anomaly Trends", path: "/admin/anomalies" },
      ],
    },
    { icon: CreditCard, label: "Payments", path: "/admin/payments" },
    { icon: FileText, label: "Premium Plans", path: "/admin/premium" },
    { icon: Settings, label: "Settings", path: "/admin/settings" },
    { icon: Clock, label: "Logs", path: "/admin/logs" },
  ];

  return (
    <div className="flex h-screen bg-slate-50">
      {/* Sidebar */}
      <aside
        className={`${
          sidebarOpen ? "w-64" : "w-20"
        } bg-gradient-to-b from-slate-900 via-blue-900 to-slate-900 text-white transition-all duration-300 flex flex-col overflow-y-auto`}
      >
        <div className="p-4 flex items-center justify-between border-b border-white/10 sticky top-0 bg-slate-900 z-10">
          {sidebarOpen && (
            <div className="flex items-center gap-2">
              <Shield className="text-cyan-400" size={28} />
              <div>
                <p className="font-bold text-lg">VeriResume</p>
                <p className="text-xs text-cyan-400">Admin Portal</p>
              </div>
            </div>
          )}
          <button onClick={() => setSidebarOpen(!sidebarOpen)} className="p-2 hover:bg-white/10 rounded-lg">
            <Menu size={20} />
          </button>
        </div>

        <nav className="flex-1 p-4 space-y-1">
          {menuItems.map((item, idx) => (
            <div key={idx}>
              {item.expandable ? (
                <>
                  <button
                    onClick={() => toggleMenu(item.key!)}
                    className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all hover:bg-white/10 text-slate-300 hover:text-white ${
                      isActivePrefix(`/admin/${item.key === "users" ? "users" : "analytics"}`)
                        ? "bg-white/10 text-white"
                        : ""
                    }`}
                  >
                    <item.icon size={20} />
                    {sidebarOpen && (
                      <>
                        <span className="flex-1 text-left">{item.label}</span>
                        <ChevronDown
                          size={16}
                          className={`transition-transform ${expandedMenus[item.key!] ? "rotate-180" : ""}`}
                        />
                      </>
                    )}
                  </button>
                  {sidebarOpen && expandedMenus[item.key!] && item.submenu && (
                    <div className="ml-4 mt-1 space-y-1">
                      {item.submenu.map((sub, subIdx) => (
                        <button
                          key={subIdx}
                          onClick={() => navigate(sub.path)}
                          className="w-full flex items-center gap-3 px-4 py-2 rounded-lg text-sm text-slate-400 hover:text-white hover:bg-white/5 transition-all text-left"
                        >
                          <ChevronRight size={14} />
                          {sub.label}
                        </button>
                      ))}
                    </div>
                  )}
                </>
              ) : (
                <button
                  onClick={() => item.path && navigate(item.path)}
                  className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${
                    isActive(item.path || "")
                      ? "bg-cyan-500 text-white shadow-lg"
                      : "hover:bg-white/10 text-slate-300 hover:text-white"
                  }`}
                >
                  <item.icon size={20} />
                  {sidebarOpen && (
                    <>
                      <span className="flex-1 text-left">{item.label}</span>
                      {item.badge !== undefined && item.badge > 0 && (
                        <span className="bg-red-500 text-white text-xs px-2 py-1 rounded-full">{item.badge}</span>
                      )}
                    </>
                  )}
                </button>
              )}
            </div>
          ))}
        </nav>

        {sidebarOpen && (
          <div className="p-4 border-t border-white/10 space-y-3">
            <button
              onClick={() => setShowAnnouncementModal(true)}
              className="w-full flex items-center gap-2 px-4 py-3 bg-gradient-to-r from-cyan-600 to-blue-600 rounded-xl hover:from-cyan-700 hover:to-blue-700 transition-all"
            >
              <Send size={18} />
              <span className="text-sm font-semibold">Send Announcement</span>
            </button>
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
        {title && (
          <header className="bg-white border-b border-slate-200 sticky top-0 z-10">
            <div className="px-8 py-4">
              <div className="flex items-center justify-between">
                <div>
                  <h1 className="text-2xl font-bold text-slate-900">{title}</h1>
                  {subtitle && <p className="text-slate-600">{subtitle}</p>}
                </div>
                {headerExtra}
              </div>
            </div>
          </header>
        )}
        <main className="p-8">{children}</main>
      </div>

      {/* Announcement Modal */}
      {showAnnouncementModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full shadow-xl">
            <div className="flex items-center justify-between p-6 border-b border-slate-200">
              <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
                <Send size={20} className="text-cyan-600" />
                Send Announcement
              </h2>
              <button
                onClick={() => { setShowAnnouncementModal(false); setSendResult(null); }}
                className="text-slate-400 hover:text-slate-600"
              >
                <X size={24} />
              </button>
            </div>
            <div className="p-6 space-y-4">
              {sendResult ? (
                <div className={`text-center py-8 ${sendResult.includes("Failed") ? "text-red-600" : "text-green-600"}`}>
                  <p className="text-lg font-bold">{sendResult}</p>
                </div>
              ) : (
                <>
                  <div>
                    <label className="text-sm font-semibold text-slate-700 block mb-2">Send To</label>
                    <select
                      value={announcementTarget}
                      onChange={(e) => setAnnouncementTarget(e.target.value)}
                      className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:ring-2 focus:ring-cyan-300 focus:border-cyan-400 outline-none text-sm"
                    >
                      <option value="all">All Users (HR + Job Seekers)</option>
                      <option value="hr">HR Recruiters Only</option>
                      <option value="jobseeker">Job Seekers Only</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-sm font-semibold text-slate-700 block mb-2">Title</label>
                    <input
                      type="text"
                      value={announcementTitle}
                      onChange={(e) => setAnnouncementTitle(e.target.value)}
                      placeholder="Announcement title..."
                      className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:ring-2 focus:ring-cyan-300 focus:border-cyan-400 outline-none text-sm"
                    />
                  </div>
                  <div>
                    <label className="text-sm font-semibold text-slate-700 block mb-2">Message</label>
                    <textarea
                      value={announcementMessage}
                      onChange={(e) => setAnnouncementMessage(e.target.value)}
                      placeholder="Write your announcement message..."
                      rows={4}
                      className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:ring-2 focus:ring-cyan-300 focus:border-cyan-400 outline-none text-sm resize-none"
                    />
                  </div>
                  <button
                    onClick={handleSendAnnouncement}
                    disabled={sending || !announcementTitle.trim() || !announcementMessage.trim()}
                    className="w-full py-3 bg-gradient-to-r from-cyan-600 to-blue-600 text-white rounded-xl font-semibold hover:from-cyan-700 hover:to-blue-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                  >
                    <Send size={16} />
                    {sending ? "Sending..." : "Send Announcement"}
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminLayout;
