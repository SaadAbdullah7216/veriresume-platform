import { useEffect, useState } from "react";
import AdminLayout from "./AdminLayout";
import { CreditCard, DollarSign, Users, Loader } from "lucide-react";
import axios from "axios";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:3000";

const AdminPayments = () => {
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({ totalRevenue: 0, activeSubscriptions: 0, premiumUsers: 0 });
  const [subscriptions, setSubscriptions] = useState<any[]>([]);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const token = localStorage.getItem("token");
        const res = await axios.get(`${API_URL}/api/subscription/admin/subscriptions`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        setStats(res.data.stats);
        setSubscriptions(res.data.subscriptions);
      } catch (err) {
        console.error("Failed to fetch subscription data:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  return (
    <AdminLayout title="Payments" subtitle="Payment and subscription management">
      <div className="space-y-6">
        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {[
            { label: "Total Revenue", value: `$${stats.totalRevenue.toFixed(2)}`, icon: DollarSign, bg: "bg-green-50", color: "text-green-600" },
            { label: "Active Subscriptions", value: String(stats.activeSubscriptions), icon: CreditCard, bg: "bg-blue-50", color: "text-blue-600" },
            { label: "Premium Users", value: String(stats.premiumUsers), icon: Users, bg: "bg-purple-50", color: "text-purple-600" },
          ].map((card) => (
            <div key={card.label} className="bg-white rounded-2xl border border-slate-200 p-6">
              <div className="flex items-center gap-3 mb-3">
                <div className={`p-2.5 rounded-xl ${card.bg}`}>
                  <card.icon size={20} className={card.color} />
                </div>
                <span className="text-sm font-medium text-slate-500">{card.label}</span>
              </div>
              <p className="text-3xl font-bold text-slate-900">{loading ? "..." : card.value}</p>
            </div>
          ))}
        </div>

        {loading ? (
          <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center">
            <Loader className="mx-auto text-blue-500 mb-4 animate-spin" size={40} />
            <p className="text-slate-500">Loading subscription data...</p>
          </div>
        ) : subscriptions.length === 0 ? (
          <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center">
            <CreditCard className="mx-auto text-slate-300 mb-4" size={56} />
            <h3 className="text-xl font-bold text-slate-900 mb-2">No Subscriptions Yet</h3>
            <p className="text-slate-500 max-w-md mx-auto">
              Subscription data will appear here once users start subscribing.
            </p>
          </div>
        ) : (
          <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
            <div className="p-6 border-b border-slate-200">
              <h3 className="text-lg font-bold text-slate-900">Recent Subscriptions</h3>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-slate-50">
                  <tr>
                    <th className="text-left p-4 text-sm font-medium text-slate-500">User</th>
                    <th className="text-left p-4 text-sm font-medium text-slate-500">Plan</th>
                    <th className="text-left p-4 text-sm font-medium text-slate-500">Amount</th>
                    <th className="text-left p-4 text-sm font-medium text-slate-500">Status</th>
                    <th className="text-left p-4 text-sm font-medium text-slate-500">Valid Until</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {subscriptions.map((sub: any) => (
                    <tr key={sub._id} className="hover:bg-slate-50">
                      <td className="p-4">
                        <div>
                          <p className="font-medium text-slate-900">{sub.user?.name || "Unknown"}</p>
                          <p className="text-sm text-slate-500">{sub.user?.email || ""}</p>
                        </div>
                      </td>
                      <td className="p-4 text-slate-700 capitalize">{sub.interval || sub.plan}</td>
                      <td className="p-4 text-slate-700">${sub.amount?.toFixed(2) || "0.00"}</td>
                      <td className="p-4">
                        <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${
                          sub.status === "active" ? "bg-green-100 text-green-700" :
                          sub.status === "past_due" ? "bg-yellow-100 text-yellow-700" :
                          "bg-red-100 text-red-700"
                        }`}>
                          {sub.cancelAtPeriodEnd ? "Canceling" : sub.status}
                        </span>
                      </td>
                      <td className="p-4 text-slate-700">
                        {sub.currentPeriodEnd ? new Date(sub.currentPeriodEnd).toLocaleDateString() : "-"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </AdminLayout>
  );
};

export default AdminPayments;
