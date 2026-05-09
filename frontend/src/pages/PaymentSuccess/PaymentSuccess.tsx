import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import axios from "axios";
import { CheckCircle, Loader, ArrowRight } from "lucide-react";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:3000";

const PaymentSuccess = () => {
  const [loading, setLoading] = useState(true);
  const [confirmed, setConfirmed] = useState(false);
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { refresh } = useAuth();

  useEffect(() => {
    const verifySubscription = async () => {
      try {
        const token = localStorage.getItem("token");
        const sessionId = searchParams.get("session_id");

        if (sessionId) {
          // Verify directly with Stripe API — no webhook needed
          const verifyRes = await axios.post(
            `${API_URL}/api/subscription/verify-session`,
            { sessionId },
            { headers: { Authorization: `Bearer ${token}` } }
          );
          if (verifyRes.data.isPremium) {
            setConfirmed(true);
          }
        } else {
          // Fallback: just check status
          const res = await axios.get(`${API_URL}/api/subscription/status`, {
            headers: { Authorization: `Bearer ${token}` },
          });
          if (res.data.isPremium) {
            setConfirmed(true);
          }
        }

        // Refresh user context so isPremium updates everywhere
        await refresh();
      } catch (err) {
        console.error("Error verifying subscription:", err);
      } finally {
        setLoading(false);
      }
    };

    const timer = setTimeout(verifySubscription, 1500);
    return () => clearTimeout(timer);
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 via-white to-blue-50 flex items-center justify-center p-6">
      <div className="bg-white rounded-3xl shadow-2xl p-12 max-w-md w-full text-center">
        {loading ? (
          <>
            <Loader className="w-16 h-16 text-blue-600 mx-auto mb-6 animate-spin" />
            <h2 className="text-2xl font-bold text-gray-900 mb-2">
              Confirming your payment...
            </h2>
            <p className="text-gray-600">
              Please wait while we verify your subscription.
            </p>
          </>
        ) : (
          <>
            <div className="inline-flex items-center justify-center p-4 bg-green-100 rounded-full mb-6">
              <CheckCircle className="w-16 h-16 text-green-600" />
            </div>
            <h2 className="text-3xl font-bold text-gray-900 mb-3">
              {confirmed ? "Welcome to Premium!" : "Payment Received!"}
            </h2>
            <p className="text-gray-600 mb-8">
              {confirmed
                ? "Your premium subscription is now active. Enjoy all the premium features!"
                : "Your payment was successful. Your subscription will be activated shortly."}
            </p>
            <button
              onClick={() => navigate("/jobseeker/dashboard")}
              className="w-full py-4 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-xl font-bold hover:from-blue-700 hover:to-purple-700 transition-all text-lg"
            >
              Go to Dashboard
              <ArrowRight className="w-5 h-5 inline ml-2" />
            </button>
          </>
        )}
      </div>
    </div>
  );
};

export default PaymentSuccess;
