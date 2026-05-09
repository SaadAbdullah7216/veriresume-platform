import { useNavigate } from "react-router-dom";
import { XCircle, ArrowLeft, CreditCard } from "lucide-react";

const PaymentCancel = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-gradient-to-br from-red-50 via-white to-gray-50 flex items-center justify-center p-6">
      <div className="bg-white rounded-3xl shadow-2xl p-12 max-w-md w-full text-center">
        <div className="inline-flex items-center justify-center p-4 bg-red-100 rounded-full mb-6">
          <XCircle className="w-16 h-16 text-red-500" />
        </div>
        <h2 className="text-3xl font-bold text-gray-900 mb-3">
          Payment Cancelled
        </h2>
        <p className="text-gray-600 mb-8">
          Your payment was not completed. No charges were made. You can try again
          anytime.
        </p>
        <div className="space-y-3">
          <button
            onClick={() => navigate("/jobseeker/premium")}
            className="w-full py-4 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-xl font-bold hover:from-blue-700 hover:to-purple-700 transition-all text-lg"
          >
            <CreditCard className="w-5 h-5 inline mr-2" />
            Try Again
          </button>
          <button
            onClick={() => navigate("/jobseeker/dashboard")}
            className="w-full py-4 bg-gray-100 text-gray-600 rounded-xl font-semibold hover:bg-gray-200 transition-all"
          >
            <ArrowLeft className="w-5 h-5 inline mr-2" />
            Back to Dashboard
          </button>
        </div>
      </div>
    </div>
  );
};

export default PaymentCancel;
