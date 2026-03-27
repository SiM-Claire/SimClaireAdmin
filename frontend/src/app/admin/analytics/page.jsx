"use client";

import { Users, CreditCard as CardSim, DollarSign, TrendingUp, MapPin, Calendar, Activity } from "lucide-react";
import { useState, useEffect } from "react";
import axios from "axios";

// Helper to format currency dynamically
const formatCurrency = (amount) => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
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
  if (t.includes("1")) return "bg-brand"; // Using your primary brand color
  if (t.includes("2")) return "bg-tertary"; // Using your secondary color
  if (t.includes("3")) return "bg-blue-500";
  if (t.includes("4")) return "bg-purple-500";
  return "bg-slate-800";
};

export default function AnalyticsDashboard() {
  const [filter, setFilter] = useState("all"); 
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const filterOptions = [
    { label: "All Time", value: "all" },
    { label: "Daily", value: "daily" },
    { label: "Weekly", value: "weekly" },
    { label: "Monthly", value: "monthly" },
    { label: "Yearly", value: "yearly" }
  ];

  // Fetch Analytics Data
  useEffect(() => {
    const fetchAnalytics = async () => {
      setLoading(true);
      setError("");
      try {
        const res = await axios.get(`${process.env.NEXT_PUBLIC_API_URL}/admin/analytics/overview?filter=${filter}`, {
          withCredentials: true 
        });
        setData(res.data.data);
      } catch (err) {
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
      
      {/* Header & Filters */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
        <div>
          <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">Platform Analytics</h1>
          <p className="text-slate-500 mt-1 font-medium">Track your eSIM sales, revenue, and active users.</p>
        </div>
        
        <div className="flex bg-white rounded-xl p-1.5 border border-slate-200 shadow-sm overflow-x-auto max-w-full [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
          {filterOptions.map((opt) => (
            <button
              key={opt.value}
              onClick={() => setFilter(opt.value)}
              className={`px-4 py-2 rounded-lg text-sm font-bold transition-all whitespace-nowrap ${
                filter === opt.value 
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
        <div className="flex flex-col items-center justify-center py-20">
           <div className="w-10 h-10 border-4 border-brand border-t-transparent rounded-full animate-spin mb-4"></div>
           <p className="text-slate-500 font-bold">Calculating metrics...</p>
        </div>
      ) : error ? (
        <div className="bg-red-50 text-red-600 p-6 rounded-2xl border border-red-100 text-center font-bold">
          {error}
        </div>
      ) : data ? (
        <>
          {/* Top Metric Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            <MetricCard 
              title="Total Revenue" 
              value={formatCurrency(data.total_revenue)} 
              icon={<DollarSign size={24} />} 
              color="text-emerald-600" 
              bg="bg-emerald-100" 
            />
            <MetricCard 
              title="Total Profit" 
              value={formatCurrency(data.total_profit)} 
              icon={<TrendingUp size={24} />} 
              color="text-brand" 
              bg="bg-brand/10" 
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
                  <Activity size={20} className="text-brand" /> Sales by SIM Type
                </h2>
                {data.top_sim_type && (
                  <span className="text-xs font-bold bg-brand/10 text-brand px-3 py-1 rounded-lg">
                    Top: {data.top_sim_type.sim_label}
                  </span>
                )}
              </div>
              
              {data.sim_sales_breakdown?.length > 0 ? (
                <div className="space-y-6">
                  {data.sim_sales_breakdown.map((item) => {
                    // Avoid division by zero
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

// Reusable Metric Card Component
function MetricCard({ title, value, icon, color, bg }) {
  return (
    <div className="bg-white p-6 rounded-[1.5rem] shadow-sm border border-slate-200 flex items-center gap-4 hover:shadow-md transition-shadow">
      <div className={`w-14 h-14 ${bg} ${color} rounded-2xl flex items-center justify-center shrink-0`}>
        {icon}
      </div>
      <div className="min-w-0">
        <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1 truncate">{title}</p>
        <p className="text-2xl font-extrabold text-slate-900 truncate">{value}</p>
      </div>
    </div>
  );
}