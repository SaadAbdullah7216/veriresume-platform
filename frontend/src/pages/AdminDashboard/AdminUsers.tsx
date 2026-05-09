import { useState, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import AdminLayout from "./AdminLayout";
import axios from "axios";
import {
  Users,
  Search,
  Trash2,
  Building2,
  CheckCircle,
  XCircle,
  Loader,
  RefreshCw,
  Crown,
  Mail,
  Shield,
  UserPlus,
} from "lucide-react";

const API_URL = import.meta.env.VITE_API_URL || import.meta.env.VITE_API_BASE_URL || "http://localhost:3000";

interface UserItem {
  _id: string;
  name: string;
  email: string;
  role: string;
  roleLabel: string;
  company: string;
  isPremium: boolean;
  isEmailVerified: boolean;
  joined: string;
}

const AdminUsers = () => {
  const [searchParams] = useSearchParams();
  const initialRole = searchParams.get("role") || "all";
  const [users, setUsers] = useState<UserItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [roleFilter, setRoleFilter] = useState(initialRole);
  const [total, setTotal] = useState(0);
  const [deleting, setDeleting] = useState<string | null>(null);

  const filters = [
    { key: "all", label: "All Users", icon: Users },
    { key: "jobseeker", label: "Job Seekers", icon: UserPlus },
    { key: "hr", label: "HR Recruiters", icon: Building2 },
    { key: "premium", label: "Premium Users", icon: Crown },
    { key: "admin", label: "Admins", icon: Shield },
  ];

  useEffect(() => {
    fetchUsers();
  }, [roleFilter]);

  useEffect(() => {
    const role = searchParams.get("role");
    if (role) setRoleFilter(role);
  }, [searchParams]);

  const fetchUsers = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem("token");
      const params: any = {};
      if (roleFilter === "premium") {
        params.premium = "true";
      } else if (roleFilter !== "all") {
        params.role = roleFilter;
      }
      if (searchTerm) params.search = searchTerm;

      const res = await axios.get(`${API_URL}/api/admin/users`, {
        headers: { Authorization: `Bearer ${token}` },
        params,
      });
      if (res.data.success) {
        setUsers(res.data.data || []);
        setTotal(res.data.total || 0);
      }
    } catch (err) {
      console.error("Failed to fetch users:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    fetchUsers();
  };

  const deleteUser = async (userId: string) => {
    if (!confirm("Are you sure you want to delete this user? This will also delete their resumes and applications.")) return;
    try {
      setDeleting(userId);
      const token = localStorage.getItem("token");
      await axios.delete(`${API_URL}/api/admin/users/${userId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setUsers((prev) => prev.filter((u) => u._id !== userId));
      setTotal((prev) => prev - 1);
    } catch {
      alert("Failed to delete user");
    } finally {
      setDeleting(null);
    }
  };

  const getRoleBadge = (role: string) => {
    switch (role) {
      case "hr":
        return "bg-blue-100 text-blue-700 border-blue-200";
      case "admin":
        return "bg-purple-100 text-purple-700 border-purple-200";
      default:
        return "bg-cyan-100 text-cyan-700 border-cyan-200";
    }
  };

  const getInitialColor = (role: string) => {
    switch (role) {
      case "hr":
        return "from-blue-600 to-indigo-600";
      case "admin":
        return "from-purple-600 to-indigo-600";
      default:
        return "from-cyan-600 to-blue-600";
    }
  };

  const filteredUsers = searchTerm
    ? users.filter(
        (u) =>
          u.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
          u.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
          (u.company && u.company.toLowerCase().includes(searchTerm.toLowerCase()))
      )
    : users;

  return (
    <AdminLayout
      title="User Management"
      subtitle={`Manage all platform users — ${total} total`}
      headerExtra={
        <button
          onClick={fetchUsers}
          className="flex items-center gap-2 px-4 py-2 bg-cyan-50 text-cyan-700 rounded-xl hover:bg-cyan-100 transition-all font-semibold text-sm border border-cyan-200"
        >
          <RefreshCw size={16} />
          Refresh
        </button>
      }
    >
      {/* Filters */}
      <div className="bg-white rounded-2xl p-4 border border-slate-200 mb-6">
        <div className="flex flex-col md:flex-row gap-4">
          <form onSubmit={handleSearch} className="relative flex-1">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
            <input
              type="text"
              placeholder="Search by name, email, or company..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-12 pr-4 py-3 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-cyan-500 text-sm"
            />
          </form>
          <div className="flex gap-2 flex-wrap">
            {filters.map((f) => {
              const Icon = f.icon;
              return (
                <button
                  key={f.key}
                  onClick={() => setRoleFilter(f.key)}
                  className={`px-4 py-2 rounded-xl text-sm font-semibold transition-all flex items-center gap-2 ${
                    roleFilter === f.key
                      ? "bg-cyan-600 text-white shadow-lg"
                      : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                  }`}
                >
                  <Icon size={14} />
                  {f.label}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {loading ? (
        <div className="flex flex-col items-center justify-center py-20">
          <Loader className="animate-spin text-cyan-600 mb-4" size={40} />
          <p className="text-slate-600">Loading users...</p>
        </div>
      ) : filteredUsers.length === 0 ? (
        <div className="text-center py-16 bg-white rounded-2xl border border-slate-200">
          <Users className="mx-auto text-slate-300" size={56} />
          <p className="text-slate-700 text-lg mt-4 font-semibold">No users found</p>
          <p className="text-slate-500 mt-2">
            {searchTerm ? `No results for "${searchTerm}"` : "No users match the selected filter."}
          </p>
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200">
                  <th className="text-left py-4 px-6 text-sm font-semibold text-slate-600">User</th>
                  <th className="text-left py-4 px-6 text-sm font-semibold text-slate-600">Email</th>
                  <th className="text-center py-4 px-6 text-sm font-semibold text-slate-600">Role</th>
                  <th className="text-center py-4 px-6 text-sm font-semibold text-slate-600">Status</th>
                  <th className="text-center py-4 px-6 text-sm font-semibold text-slate-600">Joined</th>
                  <th className="text-center py-4 px-6 text-sm font-semibold text-slate-600">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredUsers.map((user) => (
                  <tr key={user._id} className="border-b border-slate-100 hover:bg-slate-50 transition-all">
                    <td className="py-4 px-6">
                      <div className="flex items-center gap-3">
                        <div
                          className={`w-10 h-10 bg-gradient-to-br ${getInitialColor(user.role)} rounded-full flex items-center justify-center flex-shrink-0`}
                        >
                          <span className="text-white font-semibold text-sm">
                            {user.name
                              ?.split(" ")
                              .map((n: string) => n[0])
                              .join("")
                              .toUpperCase()
                              .slice(0, 2) || "?"}
                          </span>
                        </div>
                        <div>
                          <span className="font-semibold text-slate-900 flex items-center gap-1">
                            {user.name}
                            {user.isPremium && <Crown size={14} className="text-amber-500" />}
                          </span>
                          {user.company && (
                            <span className="text-xs text-slate-500 flex items-center gap-1">
                              <Building2 size={10} />
                              {user.company}
                            </span>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="py-4 px-6">
                      <span className="text-slate-600 text-sm flex items-center gap-1">
                        <Mail size={12} className="text-slate-400" />
                        {user.email}
                      </span>
                    </td>
                    <td className="py-4 px-6 text-center">
                      <span
                        className={`px-3 py-1 rounded-full text-xs font-semibold border ${getRoleBadge(user.role)}`}
                      >
                        {user.roleLabel}
                      </span>
                    </td>
                    <td className="py-4 px-6 text-center">
                      {user.isEmailVerified ? (
                        <span className="inline-flex items-center gap-1 px-2 py-1 bg-green-100 text-green-700 rounded-full text-xs font-semibold">
                          <CheckCircle size={12} />
                          Verified
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2 py-1 bg-amber-100 text-amber-700 rounded-full text-xs font-semibold">
                          <XCircle size={12} />
                          Unverified
                        </span>
                      )}
                    </td>
                    <td className="py-4 px-6 text-center text-sm text-slate-600">{user.joined}</td>
                    <td className="py-4 px-6 text-center">
                      {user.role !== "admin" && (
                        <button
                          onClick={() => deleteUser(user._id)}
                          disabled={deleting === user._id}
                          className="p-2 hover:bg-red-50 text-red-500 rounded-lg transition-all disabled:opacity-50"
                          title="Delete user"
                        >
                          {deleting === user._id ? (
                            <Loader size={16} className="animate-spin" />
                          ) : (
                            <Trash2 size={16} />
                          )}
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="px-6 py-3 bg-slate-50 border-t border-slate-200 text-sm text-slate-500">
            Showing {filteredUsers.length} of {total} users
          </div>
        </div>
      )}
    </AdminLayout>
  );
};

export default AdminUsers;
