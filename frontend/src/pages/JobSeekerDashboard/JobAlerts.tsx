import { useState, useEffect } from "react";
import DashboardLayout from "./DashboardLayout";
import axios from "axios";
import {
  Loader,
  AlertCircle,
  Plus,
  Trash2,
  Edit2,
  ToggleLeft,
  ToggleRight,
  MapPin,
  Clock,
  BellRing,
  X,
  Save,
} from "lucide-react";

const API_URL =
  import.meta.env.VITE_API_URL ||
  import.meta.env.VITE_API_BASE_URL ||
  "http://localhost:3000";

interface JobAlertItem {
  _id: string;
  keyword: string;
  location: string;
  jobType: string;
  frequency: string;
  isActive: boolean;
  matchCount: number;
  createdAt: string;
  updatedAt: string;
}

const JobAlerts = () => {
  const [alerts, setAlerts] = useState<JobAlertItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<string | null>(null);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [toggling, setToggling] = useState<string | null>(null);

  // Form state
  const [formKeyword, setFormKeyword] = useState("");
  const [formLocation, setFormLocation] = useState("");
  const [formJobType, setFormJobType] = useState("all");
  const [formFrequency, setFormFrequency] = useState("daily");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchAlerts();
  }, []);

  const fetchAlerts = async () => {
    setLoading(true);
    setError("");
    try {
      const token = localStorage.getItem("token");
      const response = await axios.get(`${API_URL}/api/jobseeker/job-alerts`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (response.data.success) {
        setAlerts(response.data.data || []);
      }
    } catch (err: any) {
      setError("Failed to load job alerts");
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setFormKeyword("");
    setFormLocation("");
    setFormJobType("all");
    setFormFrequency("daily");
    setEditing(null);
    setShowForm(false);
  };

  const handleEditAlert = (alert: JobAlertItem) => {
    setFormKeyword(alert.keyword);
    setFormLocation(alert.location);
    setFormJobType(alert.jobType);
    setFormFrequency(alert.frequency);
    setEditing(alert._id);
    setShowForm(true);
  };

  const handleSubmit = async () => {
    if (!formKeyword.trim()) return;

    setSaving(true);
    try {
      const token = localStorage.getItem("token");
      const payload = {
        keyword: formKeyword.trim(),
        location: formLocation.trim(),
        jobType: formJobType,
        frequency: formFrequency,
      };

      if (editing) {
        // Update existing
        const response = await axios.put(
          `${API_URL}/api/jobseeker/job-alerts/${editing}`,
          payload,
          { headers: { Authorization: `Bearer ${token}` } }
        );
        if (response.data.success) {
          setAlerts((prev) =>
            prev.map((a) => (a._id === editing ? response.data.data : a))
          );
        }
      } else {
        // Create new
        const response = await axios.post(
          `${API_URL}/api/jobseeker/job-alerts`,
          payload,
          { headers: { Authorization: `Bearer ${token}` } }
        );
        if (response.data.success) {
          setAlerts((prev) => [response.data.data, ...prev]);
        }
      }
      resetForm();
    } catch (err: any) {
      console.error("Save alert error:", err);
      setError("Failed to save alert");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    setDeleting(id);
    try {
      const token = localStorage.getItem("token");
      await axios.delete(`${API_URL}/api/jobseeker/job-alerts/${id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setAlerts((prev) => prev.filter((a) => a._id !== id));
    } catch (err: any) {
      console.error("Delete alert error:", err);
    } finally {
      setDeleting(null);
    }
  };

  const handleToggle = async (alert: JobAlertItem) => {
    setToggling(alert._id);
    try {
      const token = localStorage.getItem("token");
      const response = await axios.put(
        `${API_URL}/api/jobseeker/job-alerts/${alert._id}`,
        { ...alert, isActive: !alert.isActive },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      if (response.data.success) {
        setAlerts((prev) =>
          prev.map((a) => (a._id === alert._id ? response.data.data : a))
        );
      }
    } catch (err: any) {
      console.error("Toggle alert error:", err);
    } finally {
      setToggling(null);
    }
  };

  const formatDate = (dateStr: string) => {
    try {
      const date = new Date(dateStr);
      if (isNaN(date.getTime())) return "";
      return date.toLocaleDateString("en-US", {
        year: "numeric",
        month: "short",
        day: "numeric",
      });
    } catch {
      return "";
    }
  };

  const getFrequencyBadge = (freq: string) => {
    switch (freq) {
      case "instant":
        return { label: "Instant", color: "bg-red-100 text-red-700" };
      case "daily":
        return { label: "Daily", color: "bg-blue-100 text-blue-700" };
      case "weekly":
        return { label: "Weekly", color: "bg-purple-100 text-purple-700" };
      default:
        return { label: freq, color: "bg-slate-100 text-slate-700" };
    }
  };

  if (loading) {
    return (
      <DashboardLayout title="Job Alerts" subtitle="Get notified about new jobs">
        <div className="flex items-center justify-center py-20">
          <div className="text-center">
            <Loader className="w-12 h-12 animate-spin text-cyan-600 mx-auto mb-4" />
            <p className="text-slate-600">Loading job alerts...</p>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout title="Job Alerts" subtitle="Set up alerts to get notified about new job postings">
      {error && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-xl flex items-center text-red-700">
          <AlertCircle className="w-5 h-5 mr-3" />
          {error}
          <button onClick={() => setError("")} className="ml-auto text-red-500 hover:text-red-700 font-bold">
            <X size={18} />
          </button>
        </div>
      )}

      {/* Create Alert Button */}
      {!showForm && (
        <button
          onClick={() => setShowForm(true)}
          className="mb-6 px-6 py-3 bg-gradient-to-r from-blue-600 to-cyan-600 text-white rounded-xl font-semibold hover:shadow-lg transition-all flex items-center gap-2"
        >
          <Plus size={18} />
          Create New Alert
        </button>
      )}

      {/* Alert Form */}
      {showForm && (
        <div className="bg-white rounded-2xl p-6 shadow-lg border border-slate-200 mb-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-bold text-slate-900">
              {editing ? "Edit Alert" : "Create New Alert"}
            </h3>
            <button onClick={resetForm} className="p-2 hover:bg-slate-100 rounded-lg">
              <X size={18} className="text-slate-500" />
            </button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-semibold text-slate-600 mb-1 block">Keyword *</label>
              <input
                type="text"
                placeholder="e.g., Software Engineer, Data Scientist"
                value={formKeyword}
                onChange={(e) => setFormKeyword(e.target.value)}
                className="w-full px-4 py-2.5 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-cyan-500 text-sm"
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-slate-600 mb-1 block">Location</label>
              <input
                type="text"
                placeholder="e.g., New York, Remote"
                value={formLocation}
                onChange={(e) => setFormLocation(e.target.value)}
                className="w-full px-4 py-2.5 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-cyan-500 text-sm"
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-slate-600 mb-1 block">Job Type</label>
              <select
                value={formJobType}
                onChange={(e) => setFormJobType(e.target.value)}
                className="w-full px-4 py-2.5 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-cyan-500 text-sm"
              >
                <option value="all">All Types</option>
                <option value="Full-time">Full-time</option>
                <option value="Part-time">Part-time</option>
                <option value="Contract">Contract</option>
                <option value="Remote">Remote</option>
                <option value="Internship">Internship</option>
              </select>
            </div>
            <div>
              <label className="text-xs font-semibold text-slate-600 mb-1 block">Frequency</label>
              <select
                value={formFrequency}
                onChange={(e) => setFormFrequency(e.target.value)}
                className="w-full px-4 py-2.5 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-cyan-500 text-sm"
              >
                <option value="instant">Instant</option>
                <option value="daily">Daily</option>
                <option value="weekly">Weekly</option>
              </select>
            </div>
          </div>
          <div className="flex items-center gap-3 mt-4">
            <button
              onClick={handleSubmit}
              disabled={saving || !formKeyword.trim()}
              className="px-6 py-2.5 bg-gradient-to-r from-blue-600 to-cyan-600 text-white rounded-xl font-semibold hover:shadow-lg transition-all disabled:opacity-50 flex items-center gap-2"
            >
              {saving ? <Loader size={16} className="animate-spin" /> : <Save size={16} />}
              {editing ? "Update Alert" : "Create Alert"}
            </button>
            <button
              onClick={resetForm}
              className="px-6 py-2.5 bg-white border border-slate-300 rounded-xl font-semibold text-slate-600 hover:bg-slate-50 transition-all"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Empty State */}
      {alerts.length === 0 && !showForm && (
        <div className="text-center py-16 bg-white rounded-2xl border border-slate-200">
          <BellRing className="mx-auto text-slate-300" size={56} />
          <p className="text-slate-700 text-lg mt-4 font-semibold">No job alerts yet</p>
          <p className="text-slate-500 mt-2 max-w-md mx-auto">
            Create alerts to get notified when new jobs matching your criteria are posted
          </p>
        </div>
      )}

      {/* Alert Cards */}
      {alerts.length > 0 && (
        <div className="space-y-4">
          {alerts.map((alert) => {
            const freqBadge = getFrequencyBadge(alert.frequency);

            return (
              <div
                key={alert._id}
                className={`bg-white rounded-2xl border p-6 transition-all ${
                  alert.isActive
                    ? "border-slate-200 hover:border-cyan-300 hover:shadow-lg"
                    : "border-slate-200 opacity-60"
                }`}
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2 flex-wrap">
                      <h3 className="text-lg font-bold text-slate-900">{alert.keyword}</h3>
                      <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${freqBadge.color}`}>
                        {freqBadge.label}
                      </span>
                      {alert.jobType !== "all" && (
                        <span className="px-2 py-0.5 bg-blue-100 text-blue-700 rounded-full text-xs font-semibold">
                          {alert.jobType}
                        </span>
                      )}
                      {!alert.isActive && (
                        <span className="px-2 py-0.5 bg-slate-200 text-slate-500 rounded-full text-xs font-semibold">
                          Paused
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-4 text-sm text-slate-600 flex-wrap">
                      {alert.location && (
                        <span className="flex items-center gap-1">
                          <MapPin size={14} className="text-slate-400" />
                          {alert.location}
                        </span>
                      )}
                      <span className="flex items-center gap-1">
                        <Clock size={14} className="text-slate-400" />
                        Created {formatDate(alert.createdAt)}
                      </span>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <button
                      onClick={() => handleToggle(alert)}
                      disabled={toggling === alert._id}
                      className="p-2 hover:bg-slate-100 rounded-lg transition-all"
                      title={alert.isActive ? "Pause alert" : "Activate alert"}
                    >
                      {toggling === alert._id ? (
                        <Loader size={20} className="animate-spin text-slate-400" />
                      ) : alert.isActive ? (
                        <ToggleRight size={24} className="text-cyan-600" />
                      ) : (
                        <ToggleLeft size={24} className="text-slate-400" />
                      )}
                    </button>
                    <button
                      onClick={() => handleEditAlert(alert)}
                      className="p-2 hover:bg-blue-50 rounded-lg transition-all text-slate-400 hover:text-blue-600"
                      title="Edit alert"
                    >
                      <Edit2 size={18} />
                    </button>
                    <button
                      onClick={() => handleDelete(alert._id)}
                      disabled={deleting === alert._id}
                      className="p-2 hover:bg-red-50 rounded-lg transition-all text-slate-400 hover:text-red-500"
                      title="Delete alert"
                    >
                      {deleting === alert._id ? (
                        <Loader size={18} className="animate-spin" />
                      ) : (
                        <Trash2 size={18} />
                      )}
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </DashboardLayout>
  );
};

export default JobAlerts;
