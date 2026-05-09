import React, { useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import {
  Home,
  Upload,
  Brain,
  Briefcase,
  FileText,
  Bell,
  CreditCard,
  Settings,
  Sparkles,
  Menu,
  LogOut,
  Building2,
  Send,
  Search,
  Bookmark,
  Crown,
  Lock,
  CheckCircle,
} from "lucide-react";

interface DashboardLayoutProps {
  children: React.ReactNode;
  title: string;
  subtitle?: string;
}

const DashboardLayout: React.FC<DashboardLayoutProps> = ({ children, title, subtitle }) => {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const navigate = useNavigate();
  const location = useLocation();
  const { user, logout } = useAuth();

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  const isPremium = user?.isPremium;

  const menuItems = [
    { icon: Home, label: "Dashboard", path: "/jobseeker/dashboard" },
    { icon: Upload, label: "Upload Resume", path: "/jobseeker/upload" },
    { icon: Brain, label: "AI Analysis", path: "/jobseeker/analysis" },
    { icon: Briefcase, label: "Job Recommendations", path: "/jobseeker/jobs" },
    { icon: Search, label: "Find Jobs", path: "/jobseeker/find-jobs" },
    { icon: Bookmark, label: "Saved Jobs", path: "/jobseeker/saved-jobs" },
    { icon: Send, label: "My Applications", path: "/jobseeker/applications" },
    { icon: Building2, label: "Companies", path: "/jobseeker/companies" },
    { icon: FileText, label: "Enhanced Resume", path: "/jobseeker/enhanced", premium: true },
    { icon: Sparkles, label: "Enhancement & Fraud", path: "/jobseeker/enhancement-fraud", premium: true },
    { icon: Bell, label: "Notifications", path: "/jobseeker/notifications", badge: 3 },
    { icon: CreditCard, label: "Premium", path: "/jobseeker/premium" },
    { icon: Settings, label: "Profile Settings", path: "/jobseeker/settings" },
  ];

  const isActive = (path: string) => {
    return location.pathname === path || location.pathname === path + "/";
  };

  const userName = user?.name || "User";
  const userInitials = userName.split(" ").map((n: string) => n[0]).join("").toUpperCase().slice(0, 2);

  // Resolve avatar: prefer localStorage cache, then AuthContext
  const apiBase = import.meta.env.VITE_API_URL || import.meta.env.VITE_API_BASE_URL || "http://localhost:3000";
  const savedAvatar = typeof window !== "undefined" ? localStorage.getItem("veriresume_avatar") : null;
  const rawAvatar = savedAvatar || user?.avatar || null;
  const avatarUrl = rawAvatar
    ? rawAvatar.startsWith("http") ? rawAvatar : `${apiBase}${rawAvatar}`
    : null;

  return (
    <div className="flex h-screen bg-slate-50">
      {/* Sidebar */}
      <aside
        className={`${
          sidebarOpen ? "w-64" : "w-20"
        } bg-gradient-to-b from-slate-900 to-blue-900 text-white transition-all duration-300 flex flex-col flex-shrink-0`}
      >
        <div className="p-4 flex items-center justify-between border-b border-white/10">
          {sidebarOpen && (
            <div className="flex items-center gap-2">
              <Brain className="text-cyan-400" size={28} />
              <span className="font-bold text-xl">VeriResume</span>
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
              onClick={() => navigate(item.path)}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${
                isActive(item.path)
                  ? "bg-cyan-500 text-white shadow-lg"
                  : "hover:bg-white/10 text-slate-300 hover:text-white"
              }`}
            >
              <item.icon size={20} />
              {sidebarOpen && (
                <>
                  <span className="flex-1 text-left">{item.label}</span>
                  {item.premium && !isPremium && (
                    <Lock size={14} className="text-amber-400" />
                  )}
                  {item.badge && (
                    <span className="bg-red-500 text-white text-xs px-2 py-1 rounded-full">
                      {item.badge}
                    </span>
                  )}
                </>
              )}
            </button>
          ))}
        </nav>

        {sidebarOpen && (
          <div className="p-4 border-t border-white/10 space-y-3">
            {isPremium ? (
              <div className="bg-gradient-to-br from-amber-600 to-yellow-500 rounded-xl p-4">
                <Crown className="text-white mb-2" size={24} />
                <p className="text-sm font-semibold mb-1">Premium Active</p>
                <p className="text-xs text-amber-100 mb-3 flex items-center gap-1">
                  <CheckCircle size={12} /> All features unlocked
                </p>
                <button
                  onClick={() => navigate("/jobseeker/premium")}
                  className="w-full bg-white text-amber-700 py-2 rounded-lg text-sm font-semibold hover:bg-amber-50 transition-all"
                >
                  Manage Subscription
                </button>
              </div>
            ) : (
              <div className="bg-gradient-to-br from-cyan-600 to-blue-600 rounded-xl p-4">
                <Sparkles className="text-white mb-2" size={24} />
                <p className="text-sm font-semibold mb-1">Upgrade to Premium</p>
                <p className="text-xs text-blue-100 mb-3">
                  Get AI enhancement & more features
                </p>
                <button
                  onClick={() => navigate("/jobseeker/premium")}
                  className="w-full bg-white text-blue-600 py-2 rounded-lg text-sm font-semibold hover:bg-blue-50 transition-all"
                >
                  Upgrade Now
                </button>
              </div>
            )}
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
          <div className="px-8 py-4 flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-slate-900">{title}</h1>
              {subtitle && <p className="text-slate-600">{subtitle}</p>}
            </div>
            <div className="flex items-center gap-4">
              <button
                onClick={() => navigate("/jobseeker/notifications")}
                className="relative p-3 hover:bg-slate-100 rounded-xl transition-all"
              >
                <Bell size={20} className="text-slate-600" />
                <span className="absolute top-1 right-1 bg-red-500 text-white text-xs w-5 h-5 rounded-full flex items-center justify-center">
                  3
                </span>
              </button>
              <button
                onClick={() => navigate("/jobseeker/settings")}
                className="flex items-center gap-3"
              >
                {avatarUrl ? (
                  <img
                    src={avatarUrl}
                    alt={userName}
                    className="w-10 h-10 rounded-full object-cover border-2 border-cyan-300"
                    onError={(e) => {
                      // Fallback to initials if image fails
                      (e.target as HTMLImageElement).style.display = "none";
                      (e.target as HTMLImageElement).nextElementSibling?.classList.remove("hidden");
                    }}
                  />
                ) : null}
                <div className={`w-10 h-10 bg-gradient-to-br from-blue-600 to-cyan-600 rounded-full flex items-center justify-center ${avatarUrl ? "hidden" : ""}`}>
                  <span className="text-white font-semibold">{userInitials}</span>
                </div>
              </button>
            </div>
          </div>
        </header>

        {/* Page Content */}
        <main className="p-8">{children}</main>
      </div>
    </div>
  );
};

export default DashboardLayout;
