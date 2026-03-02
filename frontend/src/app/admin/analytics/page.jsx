"use client";

import { Users, CardSim, DollarSign, TrendingUp, MapPin, Calendar } from "lucide-react";
import { useState } from "react";

export default function AnalyticsDashboard() {
  const [timeframe, setTimeframe] = useState("Monthly"); // Daily, Weekly, Monthly, Yearly

  // --- Mock Data ---
  const stats = {
    revenue: "$12,450.00",
    profit: "$3,112.50", // Added from my side: Crucial to track your actual commission!
    activeUsers: "1,248",
    simsSold: "3,842",
  };

  const topCountries = [
    { name: "Japan", flag: "🇯🇵", sales: 845, percentage: 85 },
    { name: "United States", flag: "🇺🇸", sales: 620, percentage: 65 },
    { name: "France", flag: "🇫🇷", sales: 410, percentage: 45 },
    { name: "Thailand", flag: "🇹🇭", sales: 380, percentage: 40 },
  ];

  const salesByType = [
    { type: "Type1", sales: 2100, color: "bg-[#3a7d71]" },
    { type: "Type2", sales: 1200, color: "bg-[#ec5b13]" },
    { type: "Type3", sales: 542, color: "bg-blue-500" },
    { type: "Type4", sales: 736, color: "bg-blue-500" },
  ];

  return (
    <div className="p-6 lg:p-10 max-w-7xl mx-auto">
      
      {/* Header & Filters */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Platform Analytics</h1>
          <p className="text-slate-500 mt-1">Track your eSIM sales, commissions, and user activity.</p>
        </div>
        
        <div className="flex bg-white rounded-lg p-1 border border-gray-200 shadow-sm">
          {["Daily", "Weekly", "Monthly", "Yearly"].map((tf) => (
            <button
              key={tf}
              onClick={() => setTimeframe(tf)}
              className={`px-4 py-2 rounded-md text-sm font-semibold transition-all ${
                timeframe === tf ? "bg-[#3a7d71] text-white shadow" : "text-gray-500 hover:text-slate-800"
              }`}
            >
              {tf}
            </button>
          ))}
        </div>
      </div>

      {/* Top Metric Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <MetricCard title="Total Revenue" value={stats.revenue} icon={<DollarSign />} color="text-emerald-600" bg="bg-emerald-100" />
        <MetricCard title="Your Profit (Commission)" value={stats.profit} icon={<TrendingUp />} color="text-[#ec5b13]" bg="bg-orange-100" />
        <MetricCard title="Active eSIM Users" value={stats.activeUsers} icon={<Users />} color="text-blue-600" bg="bg-blue-100" />
        <MetricCard title="Total SIMs Sold" value={stats.simsSold} icon={<CardSim />} color="text-purple-600" bg="bg-purple-100" />
      </div>

      {/* Charts / Data Breakdown Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
        
        {/* Sales by SIM Type */}
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
          <h2 className="text-lg font-bold text-slate-800 mb-6 flex items-center gap-2">
            <CardSim size={20} className="text-[#3a7d71]" /> Sales by SIM Type ({timeframe})
          </h2>
          <div className="space-y-6">
            {salesByType.map((item) => (
              <div key={item.type}>
                <div className="flex justify-between text-sm font-semibold mb-2">
                  <span className="text-slate-700">{item.type}</span>
                  <span className="text-slate-900">{item.sales} sold</span>
                </div>
                <div className="w-full bg-gray-100 rounded-full h-3">
                  <div className={`${item.color} h-3 rounded-full`} style={{ width: `${(item.sales / 4578) * 100}%` }}></div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Top Performing Countries */}
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
          <h2 className="text-lg font-bold text-slate-800 mb-6 flex items-center gap-2">
            <MapPin size={20} className="text-[#ec5b13]" /> Top Destinations
          </h2>
          <div className="space-y-5">
            {topCountries.map((country) => (
              <div key={country.name} className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <span className="text-2xl bg-gray-50 p-2 rounded-lg">{country.flag}</span>
                  <span className="font-semibold text-slate-700">{country.name}</span>
                </div>
                <div className="flex items-center gap-4 w-1/2">
                  <div className="w-full bg-gray-100 rounded-full h-2 hidden sm:block">
                    <div className="bg-[#3a7d71] h-2 rounded-full" style={{ width: `${country.percentage}%` }}></div>
                  </div>
                  <span className="text-sm font-bold text-slate-900">{country.sales}</span>
                </div>
              </div>
            ))}
          </div>
        </div>

      </div>

      {/* Best Selling Month insight (Added as requested) */}
      {/* <div className="bg-[#e8f4f1] border border-[#3a7d71]/20 p-6 rounded-2xl flex items-center justify-between">
        <div>
          <h3 className="text-[#2b6157] font-bold text-lg flex items-center gap-2">
            <Calendar size={20} /> Peak Season Insight
          </h3>
          <p className="text-[#3a7d71] mt-1 font-medium">Historically, your highest sales occur in <strong className="text-slate-900">July</strong> (Summer Travel) with 1,200+ sales.</p>
        </div>
        <TrendingUp size={40} className="text-[#3a7d71] opacity-50 hidden sm:block" />
      </div> */}

    </div>
  );
}

// Reusable Metric Card Component
function MetricCard({ title, value, icon, color, bg }) {
  return (
    <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex items-center gap-4">
      <div className={`w-14 h-14 ${bg} ${color} rounded-2xl flex items-center justify-center text-2xl`}>
        {icon}
      </div>
      <div>
        <p className="text-sm font-semibold text-slate-500 mb-1">{title}</p>
        <p className="text-2xl font-bold text-slate-900">{value}</p>
      </div>
    </div>
  );
}