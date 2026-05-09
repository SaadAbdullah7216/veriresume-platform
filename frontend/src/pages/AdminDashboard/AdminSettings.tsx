import { useState } from "react";
import AdminLayout from "./AdminLayout";
import { Save, Shield, Database, Globe } from "lucide-react";

const AdminSettings = () => {
  const [settings, setSettings] = useState({
    siteName: "VeriResume",
    adminEmail: "admin@veriresume.com",
    maxResumeSize: "10",
    enableAnomaly: true,
    enableNotifications: true,
    maintenanceMode: false,
    autoApproveUsers: true,
  });

  const [saved, setSaved] = useState(false);

  const handleSave = () => {
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const Toggle = ({ value, onChange }: { value: boolean; onChange: () => void }) => (
    <button
      onClick={onChange}
      className={`relative w-12 h-6 rounded-full transition-all ${value ? "bg-cyan-500" : "bg-slate-300"}`}
    >
      <div
        className={`absolute top-0.5 w-5 h-5 rounded-full bg-white shadow transition-all ${value ? "left-6" : "left-0.5"}`}
      />
    </button>
  );

  return (
    <AdminLayout
      title="Settings"
      subtitle="System configuration and preferences"
      headerExtra={
        <button
          onClick={handleSave}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl font-semibold text-sm transition-all ${
            saved ? "bg-green-100 text-green-700 border border-green-200" : "bg-cyan-600 text-white hover:bg-cyan-700"
          }`}
        >
          <Save size={16} />
          {saved ? "Saved!" : "Save Changes"}
        </button>
      }
    >
      <div className="space-y-6">
        {/* General Settings */}
        <div className="bg-white rounded-2xl border border-slate-200 p-6">
          <h3 className="text-lg font-bold text-slate-900 mb-5 flex items-center gap-2">
            <Globe size={20} className="text-cyan-600" />
            General Settings
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <div>
              <label className="text-sm font-semibold text-slate-700 block mb-2">Site Name</label>
              <input
                type="text"
                value={settings.siteName}
                onChange={(e) => setSettings({ ...settings, siteName: e.target.value })}
                className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:ring-2 focus:ring-cyan-300 focus:border-cyan-400 outline-none text-sm"
              />
            </div>
            <div>
              <label className="text-sm font-semibold text-slate-700 block mb-2">Admin Email</label>
              <input
                type="email"
                value={settings.adminEmail}
                onChange={(e) => setSettings({ ...settings, adminEmail: e.target.value })}
                className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:ring-2 focus:ring-cyan-300 focus:border-cyan-400 outline-none text-sm"
              />
            </div>
            <div>
              <label className="text-sm font-semibold text-slate-700 block mb-2">Max Resume Size (MB)</label>
              <input
                type="number"
                value={settings.maxResumeSize}
                onChange={(e) => setSettings({ ...settings, maxResumeSize: e.target.value })}
                className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:ring-2 focus:ring-cyan-300 focus:border-cyan-400 outline-none text-sm"
              />
            </div>
          </div>
        </div>

        {/* Security & System */}
        <div className="bg-white rounded-2xl border border-slate-200 p-6">
          <h3 className="text-lg font-bold text-slate-900 mb-5 flex items-center gap-2">
            <Shield size={20} className="text-cyan-600" />
            Security & System
          </h3>
          <div className="space-y-5">
            {[
              { label: "Anomaly Detection", desc: "Automatically detect suspicious resume content", key: "enableAnomaly" as const },
              { label: "Email Notifications", desc: "Send email notifications for important events", key: "enableNotifications" as const },
              { label: "Auto-approve Users", desc: "Automatically approve new user registrations", key: "autoApproveUsers" as const },
            ].map((item) => (
              <div key={item.key} className="flex items-center justify-between py-3 border-b border-slate-100 last:border-0">
                <div>
                  <p className="font-semibold text-slate-900 text-sm">{item.label}</p>
                  <p className="text-slate-500 text-xs mt-0.5">{item.desc}</p>
                </div>
                <Toggle value={settings[item.key]} onChange={() => setSettings({ ...settings, [item.key]: !settings[item.key] })} />
              </div>
            ))}
          </div>
        </div>

        {/* Database */}
        <div className="bg-white rounded-2xl border border-slate-200 p-6">
          <h3 className="text-lg font-bold text-slate-900 mb-4 flex items-center gap-2">
            <Database size={20} className="text-cyan-600" />
            Database Info
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {[
              { label: "Database", value: "MongoDB Atlas" },
              { label: "Status", value: "Connected" },
              { label: "Region", value: "Auto" },
            ].map((item) => (
              <div key={item.label} className="bg-slate-50 rounded-xl p-4 text-center">
                <p className="text-xs text-slate-500 font-semibold">{item.label}</p>
                <p className="text-sm font-bold text-slate-900 mt-1">{item.value}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </AdminLayout>
  );
};

export default AdminSettings;
