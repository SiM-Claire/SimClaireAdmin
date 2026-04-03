"use client";

import { Users, CreditCard as CardSim, DollarSign, TrendingUp, MapPin, Activity, Wallet, Lock, Receipt } from "lucide-react";
import { useState, useEffect } from "react";
import axios from "axios";
import { useRouter } from "next/navigation";

// Helper to format currency dynamically based on API response
const formatCurrency = (amount, currencyCode = 'USD') => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: currencyCode,
  }).format(amount || 0);
};

// Helper to extract the ISO code from strings like "AU-1" and grab the flag
const getFlagUrl = (destination) => {
  if (!destination) return "https://flagcdn.com/w80/un.png";
  const isoCode = destination.split('-')[0].toLowerCase();
  return `https://flagcdn.com/w80/${isoCode}.png`;
};

// Helper to assign brand colors to different SIM types
const getTypeColor = (type) => {
  const t = type.toLowerCase();
  if (t.includes("1")) return "bg-brand";
  if (t.includes("2")) return "bg-secondary";
  if (t.includes("3")) return "bg-blue-500";
  if (t.includes("4")) return "bg-purple-500";
  return "bg-slate-800";
};

export default function AnalyticsDashboard() {
  const router = useRouter()
  const adminToken = localStorage.getItem("adminToken");
  const [filter, setFilter] = useState("all");
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // State for Wallet Balances
  const [balanceData, setBalanceData] = useState(null);

  const filterOptions = [
    { label: "All Time", value: "all" },
    { label: "Daily", value: "daily" },
    { label: "Weekly", value: "weekly" },
    { label: "Monthly", value: "monthly" },
    { label: "Yearly", value: "yearly" }
  ];

  // Fetch Wallet Balance (Runs once on mount, independent of time filters)
  useEffect(() => {
    const fetchBalance = async () => {
      try {
        const res = await axios.get(`${process.env.NEXT_PUBLIC_API_URL}/admin/get/balance`,  {
  headers: {
    Authorization: `Bearer ${adminToken}` // 🌟 Pass the token to the backend
  }});
        setBalanceData(res.data.data);
      } catch (err) {
        router.push("/admin/login")
        console.error("Failed to fetch admin balance:", err);
      }
    };
    fetchBalance();
  }, []);

  // Fetch Analytics Data (Runs whenever the filter changes)
  useEffect(() => {
    const fetchAnalytics = async () => {
      setLoading(true);
      setError("");
      try {
        const res = await axios.get(`${process.env.NEXT_PUBLIC_API_URL}/admin/analytics/overview?filter=${filter}`, {
  headers: {
    Authorization: `Bearer ${adminToken}` // 🌟 Pass the token to the backend
  }});
        setData(res.data.data);
      } catch (err) {
        router.push("/admin/login")
        console.error("Failed to fetch analytics:", err);
        setError("Failed to load analytics data.");
      } finally {
        setLoading(false);
      }
    };

    fetchAnalytics();
  }, [filter]);

  return (
    <div className="p-6 lg:p-10 max-w-7xl mx-auto font-sans pb-24">

      {/* Header */}
      <div className="mb-6">
        <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">Platform Analytics</h1>
        <p className="text-slate-500 mt-1 font-medium">Track your eSIM sales, revenue, and active users.</p>
      </div>

      {/* 🌟 UPDATED: Smaller Live Wallet Balances */}
      {balanceData && (
        <div className="flex flex-col sm:flex-row gap-4 mb-10">
          <div className="w-full sm:w-72">
            <WalletCard
              title="Available Balance"
              value={formatCurrency(balanceData.availableBalance, balanceData.currency)}
              icon={<Wallet size={20} className="text-white" />}
              gradient="bg-gradient-to-r from-slate-900 to-slate-800"
            />
          </div>
          <div className="w-full sm:w-72">
            <WalletCard
              title="Reserved Balance"
              value={formatCurrency(balanceData.reservedBalance, balanceData.currency)}
              icon={<Lock size={20} className="text-white" />}
              gradient="bg-gradient-to-r from-[#ec5b13] to-[#d94a0e]"
            />
          </div>
          {/* 🌟 NEW: Company Cost Card */}
          <div className="w-full sm:w-72">
            <WalletCard
              title="Company Cost"
              value={formatCurrency(data.total_revenue - data.total_profit, 'USD')}
              icon={<Receipt size={20} className="text-white" />}
              gradient="bg-gradient-to-r from-rose-500 to-rose-600"
            /></div>
        </div>
      )}

      {/* Filters */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
        <h2 className="text-xl font-bold text-slate-800">Performance Metrics</h2>

        <div className="flex bg-white rounded-xl p-1.5 border border-slate-200 shadow-sm overflow-x-auto max-w-full [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
          {filterOptions.map((opt) => (
            <button
              key={opt.value}
              onClick={() => setFilter(opt.value)}
              className={`px-4 py-2 rounded-lg text-sm font-bold transition-all whitespace-nowrap ${filter === opt.value
                  ? "bg-slate-900 text-white shadow-md"
                  : "text-slate-500 hover:text-slate-900 hover:bg-slate-50"
                }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="flex flex-col items-center justify-center py-20 bg-white rounded-[2rem] border border-slate-200 shadow-sm">
          <div className="w-10 h-10 border-4 border-[#ec5b13] border-t-transparent rounded-full animate-spin mb-4"></div>
          <p className="text-slate-500 font-bold">Calculating metrics...</p>
        </div>
      ) : error ? (
        <div className="bg-red-50 text-red-600 p-6 rounded-2xl border border-red-100 text-center font-bold">
          {error}
        </div>
      ) : data ? (
        <>
          {/* 🌟 UPDATED: Top Metric Cards (Now 5 items) */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-4 gap-4 lg:gap-6 mb-8">
            <MetricCard
              title="Total Revenue"
              value={formatCurrency(data.total_revenue, 'USD')}
              icon={<DollarSign size={24} />}
              color="text-emerald-600"
              bg="bg-emerald-100"
            />

            <MetricCard
              title="Total Profit"
              value={formatCurrency(data.total_profit, 'USD')}
              icon={<TrendingUp size={24} />}
              color="text-[#ec5b13]"
              bg="bg-[#ec5b13]/10"
            />
            <MetricCard
              title="Active Users"
              value={new Intl.NumberFormat().format(data.active_users || 0)}
              icon={<Users size={24} />}
              color="text-blue-600"
              bg="bg-blue-100"
            />
            <MetricCard
              title="Total SIMs Sold"
              value={new Intl.NumberFormat().format(data.total_sims_sold || 0)}
              icon={<CardSim size={24} />}
              color="text-purple-600"
              bg="bg-purple-100"
            />
          </div>

          {/* Charts / Data Breakdown Row */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">

            {/* Sales by SIM Type */}
            <div className="bg-white p-6 md:p-8 rounded-[2rem] shadow-sm border border-slate-200">
              <div className="flex items-center justify-between mb-8 border-b border-slate-100 pb-4">
                <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
                  <Activity size={20} className="text-[#ec5b13]" /> Sales by SIM Type
                </h2>
                {data.top_sim_type && (
                  <span className="text-xs font-bold bg-[#ec5b13]/10 text-[#ec5b13] px-3 py-1 rounded-lg">
                    Top: {data.top_sim_type.sim_label}
                  </span>
                )}
              </div>

              {data.sim_sales_breakdown?.length > 0 ? (
                <div className="space-y-6">
                  {data.sim_sales_breakdown.map((item) => {
                    const percentage = data.total_sims_sold > 0
                      ? ((item.total_sold / data.total_sims_sold) * 100).toFixed(1)
                      : 0;

                    return (
                      <div key={item.sim_label} className="group">
                        <div className="flex justify-between text-sm font-bold mb-2">
                          <span className="text-slate-700">{item.sim_label}</span>
                          <span className="text-slate-900">{item.total_sold} sold <span className="text-slate-400 font-medium ml-1">({percentage}%)</span></span>
                        </div>
                        <div className="w-full bg-slate-100 rounded-full h-3 overflow-hidden">
                          <div
                            className={`${getTypeColor(item.sim_label)} h-3 rounded-full transition-all duration-1000 ease-out`}
                            style={{ width: `${percentage}%` }}
                          ></div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="text-center py-10 text-slate-500 font-medium">No SIM data available for this period.</div>
              )}
            </div>

            {/* Top Performing Countries */}
            <div className="bg-white p-6 md:p-8 rounded-[2rem] shadow-sm border border-slate-200">
              <h2 className="text-xl font-bold text-slate-900 mb-8 flex items-center gap-2 border-b border-slate-100 pb-4">
                <MapPin size={20} className="text-blue-500" /> Top Destinations
              </h2>

              {data.top_destinations?.length > 0 ? (
                <div className="space-y-6">
                  {data.top_destinations.map((country) => {
                    const percentage = data.total_sims_sold > 0
                      ? ((country.total_sold / data.total_sims_sold) * 100).toFixed(1)
                      : 0;

                    return (
                      <div key={country.destination} className="flex items-center justify-between group">
                        <div className="flex items-center gap-4 w-1/2">
                          <div className="w-10 h-10 rounded-full overflow-hidden border border-slate-200 shrink-0 bg-slate-50">
                            <img src={getFlagUrl(country.destination)} alt={country.destination} className="w-full h-full object-cover" />
                          </div>
                          <span className="font-bold text-slate-700 truncate">{country.destination}</span>
                        </div>

                        <div className="flex items-center justify-end gap-4 w-1/2">
                          <div className="w-full bg-slate-100 rounded-full h-2 hidden sm:block overflow-hidden">
                            <div className="bg-blue-500 h-2 rounded-full transition-all duration-1000 ease-out" style={{ width: `${percentage}%` }}></div>
                          </div>
                          <span className="text-sm font-bold text-slate-900 shrink-0">{country.total_sold} <span className="text-slate-400 font-medium text-xs ml-0.5">sold</span></span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="text-center py-10 text-slate-500 font-medium">No destination data available for this period.</div>
              )}
            </div>

          </div>
        </>
      ) : null}

    </div>
  );
}

// 🌟 UPDATED: Smaller Wallet Card component
function WalletCard({ title, value, icon, gradient }) {
  return (
    <div className={`p-4 sm:p-5 rounded-2xl shadow-md border border-transparent text-white flex items-center gap-4 hover:shadow-lg transition-all ${gradient}`}>
      <div className="w-10 h-10 sm:w-12 sm:h-12 bg-white/20 rounded-xl flex items-center justify-center shrink-0 shadow-inner">
        {icon}
      </div>
      <div className="min-w-0">
        <p className="text-[10px] font-bold text-white/80 uppercase tracking-widest mb-0.5 truncate">{title}</p>
        <p className="text-xl sm:text-2xl font-black truncate tracking-tight">{value}</p>
      </div>
    </div>
  );
}

// Reusable Metric Card Component for standard analytics
function MetricCard({ title, value, icon, color, bg }) {
  return (
    <div className="bg-white p-5 lg:p-6 rounded-[1.5rem] shadow-sm border border-slate-200 flex items-center gap-4 hover:shadow-md transition-shadow">
      <div className={`w-12 h-12 lg:w-14 lg:h-14 ${bg} ${color} rounded-2xl flex items-center justify-center shrink-0`}>
        {icon}
      </div>
      <div className="min-w-0">
        <p className="text-[11px] lg:text-xs font-bold text-slate-400 uppercase tracking-wider mb-1 truncate">{title}</p>
        <p className="text-xl lg:text-2xl font-extrabold text-slate-900 truncate">{value}</p>
      </div>
    </div>
  );
}