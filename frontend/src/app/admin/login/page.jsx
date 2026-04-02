"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import axios from "axios";
import { GoogleOAuthProvider, GoogleLogin } from "@react-oauth/google";
import { ShieldAlert, Activity } from "lucide-react";

export default function AdminLogin() {
  const router = useRouter();
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const handleGoogleSuccess = async (credentialResponse) => {
    setIsLoading(true);
    setError("");

    try {
      // Send the Google idToken to your backend
      const res = await axios.post(`${process.env.NEXT_PUBLIC_API_URL}/auth/google`, {
        idToken: credentialResponse.credential,
      });
      console.log(res.data)

      if (res.data.status === "success" && res.data.token) {
        // Save the backend JWT to localStorage
        localStorage.setItem("adminToken", res.data.token);
        
        // Redirect to the first admin dashboard page
        router.push("/admin/analytics");
      }
    } catch (err) {
      console.error("Admin Login Failed:", err);
      // Handle the 401 or 403 errors from your backend
      if (err.response?.status === 403) {
        setError("Access Denied. Your email is not an authorized Admin.");
      } else {
        setError("Authentication failed. Please try again.");
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    // Wrap the login button in the Provider. Get your Client ID from Google Cloud Console.
    <GoogleOAuthProvider clientId={process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID}>
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-4">
        
        <div className="bg-white p-8 md:p-10 rounded-3xl shadow-xl max-w-md w-full border border-slate-100 text-center">
          
          <div className="w-16 h-16 bg-brand/10 rounded-full flex items-center justify-center text-brand mx-auto mb-6">
            <Activity size={32} />
          </div>
          
          <h1 className="text-2xl font-bold text-slate-900 mb-2">SiM Claire Admin</h1>
          <p className="text-slate-500 font-medium mb-8">Secure portal for authorized personnel only.</p>

          {error && (
            <div className="bg-red-50 text-red-600 p-4 rounded-xl text-sm font-bold flex items-center gap-2 mb-6 text-left">
              <ShieldAlert size={18} className="shrink-0" />
              {error}
            </div>
          )}

          <div className="flex justify-center mb-4">
            {isLoading ? (
              <div className="w-8 h-8 border-4 border-brand border-t-transparent rounded-full animate-spin"></div>
            ) : (
              <GoogleLogin
                onSuccess={handleGoogleSuccess}
                onError={() => setError("Google Login popup closed or failed.")}
                theme="filled_blue"
                size="large"
                shape="rectangular"
                text="continue_with"
              />
            )}
          </div>

          <p className="text-xs text-slate-400 mt-6 font-medium">
            This system is actively monitored. Unauthorized access is prohibited.
          </p>

        </div>
      </div>
    </GoogleOAuthProvider>
  );
}