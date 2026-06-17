"use client";

import { useState, useEffect } from "react";
import axios from "axios";
import {
    TrendingUp, Users, ShoppingCart, DollarSign,
    Filter, Calendar, Trophy, Building2, Activity,
    CheckCircle2, AlertCircle, Search
} from "lucide-react";

export default function AdminPartnerAnalyticsPage() {
    const [analyticsData, setAnalyticsData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");

    // Filter States
    const [filterType, setFilterType] = useState("monthly"); // 'all', 'monthly', 'custom'
    const [selectedMonth, setSelectedMonth] = useState(() => {
        const d = new Date();
        return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    });
    // Add this state
    const [partnerSearchQuery, setPartnerSearchQuery] = useState("");

    // Add this filtering logic
    const filteredPartnerSales = analyticsData?.partner_sales?.filter(partner => {
        if (!partnerSearchQuery) return true;
        const query = partnerSearchQuery.toLowerCase();
        return (
            partner.partner_name?.toLowerCase().includes(query) ||
            partner.email?.toLowerCase().includes(query)
        );
    }) || [];
    // --- Formatters ---
    const formatCurrency = (amount) => {
        return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'CAD' }).format(amount || 0);
    };

    const formatDate = (dateString) => {
        if (!dateString) return "N/A";
        const date = new Date(dateString);
        if (isNaN(date.getTime())) return dateString;
        return date.toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" });
    };

    const getStatusBadge = (status) => {
        if (status === "ACTIVE") return <span className="bg-green-100 text-green-700 px-2 py-0.5 rounded text-xs font-bold">ACTIVE</span>;
        if (status === "SUSPENDED") return <span className="bg-red-100 text-red-700 px-2 py-0.5 rounded text-xs font-bold">SUSPENDED</span>;
        return <span className="bg-yellow-100 text-yellow-700 px-2 py-0.5 rounded text-xs font-bold">{status}</span>;
    };

    // --- API Fetcher ---
    useEffect(() => {
        const fetchAdminAnalytics = async () => {
            setLoading(true);
            setError("");
            try {
                const adminToken = localStorage.getItem("adminToken");

                // Build Query Parameters dynamically
                let queryUrl = `${process.env.NEXT_PUBLIC_API_URL}/admin/analytics/partners?filter=${filterType}`;
                if (filterType === "monthly") {
                    queryUrl += `&month=${selectedMonth}`;
                }

                const res = await axios.get(queryUrl, {
                    headers: { Authorization: `Bearer ${adminToken}` }
                });
                console.log(res.data)
                // Added broader check for success state
                if (res.data.success || res.data.status === 200 || res.status === 200) {
                    setAnalyticsData(res.data.data);
                } else {
                    setError(res.data.message || "Failed to load analytics data.");
                }
            } catch (err) {
                setError(err.response?.data?.message || "An error occurred while fetching analytics.");
            } finally {
                setLoading(false);
            }
        };

        fetchAdminAnalytics();
    }, [filterType, selectedMonth]);

    return (
        <div className="p-6 font-sans">

            {/* Header & Filters */}
            <div className="flex flex-col md:flex-row md:items-end justify-between mb-8 gap-4">
                <div>
                    <h1 className="text-2xl md:text-3xl font-extrabold text-slate-900 flex items-center gap-2">
                        <Activity className="text-brand" size={28} /> Global Partner Analytics
                    </h1>
                    <p className="text-slate-500 mt-1">Track aggregate sales and performance across all B2B partners.</p>
                </div>

                <div className="flex flex-wrap items-center gap-3 bg-white p-3 rounded-xl border border-slate-200 shadow-sm">
                    <div className="flex items-center gap-2 border-r border-slate-200 pr-3">
                        <Filter size={18} className="text-slate-400" />
                        <select
                            value={filterType}
                            onChange={(e) => setFilterType(e.target.value)}
                            className="bg-transparent text-sm font-bold text-slate-700 outline-none cursor-pointer"
                        >
                            <option value="all">All Time</option>
                            <option value="monthly">Monthly</option>
                        </select>
                    </div>

                    {filterType === "monthly" && (
                        <div className="flex items-center gap-2 pl-1">
                            <input
                                type="month"
                                value={selectedMonth}
                                onChange={(e) => setSelectedMonth(e.target.value)}
                                className="bg-transparent text-sm font-bold text-brand outline-none cursor-pointer"
                            />
                        </div>
                    )}
                </div>
            </div>

            {error && (
                <div className="mb-8 p-4 bg-red-50 border border-red-200 text-red-600 rounded-xl font-semibold flex items-center gap-2">
                    <AlertCircle size={18} /> {error}
                </div>
            )}

            {loading ? (
                <div className="py-20 flex flex-col items-center justify-center">
                    <div className="w-10 h-10 border-4 border-brand border-t-transparent rounded-full animate-spin mb-4"></div>
                    <p className="text-slate-500 font-medium">Crunching partner data...</p>
                </div>
            ) : analyticsData ? (
                <>
                    {/* TOP SUMMARY CARDS (Safely Chained) */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">

                        {/* Total Revenue */}
                        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
                            <div className="flex items-center justify-between mb-4">
                                <div className="w-10 h-10 rounded-full bg-green-100 flex items-center justify-center text-green-600">
                                    <DollarSign size={20} />
                                </div>
                                <span className="text-xs font-bold text-green-600 bg-green-50 px-2 py-1 rounded-md">B2B Revenue</span>
                            </div>
                            <p className="text-sm text-slate-500 font-semibold mb-1">Total Partner Spend</p>
                            <h3 className="text-3xl font-extrabold text-slate-900">
                                {/* 🌟 Safe Chaining Used Here */}
                                {formatCurrency(analyticsData?.summary?.total_partner_sales || 0)}
                            </h3>
                        </div>
                        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
                            <div className="flex items-center justify-between mb-4">
                                <div className="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center text-red-600">
                                    <DollarSign size={20} />
                                </div>
                                <span className="text-xs font-bold text-red-600 bg-red-50 px-2 py-1 rounded-md">B2B Cost</span>
                            </div>
                            <p className="text-sm text-slate-500 font-semibold mb-1">Total Company Cost</p>
                            <h3 className="text-3xl font-extrabold text-slate-900">
                                {/* 🌟 Safe Chaining Used Here */}
                                {formatCurrency(analyticsData?.summary?.total_partner_company_cost
                                    || 0)}
                            </h3>
                        </div>
                        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
                            <div className="flex items-center justify-between mb-4">
                                <div className="w-10 h-10 rounded-full bg-green-100 flex items-center justify-center text-green-600">
                                    <DollarSign size={20} />
                                </div>
                                <span className="text-xs font-bold text-green-600 bg-green-50 px-2 py-1 rounded-md">B2B Profit</span>
                            </div>
                            <p className="text-sm text-slate-500 font-semibold mb-1">Total Company Profit</p>
                            <h3 className="text-3xl font-extrabold text-slate-900">
                                {/* 🌟 Safe Chaining Used Here */}
                                {formatCurrency(analyticsData?.summary?.total_partner_profit
                                    || 0)}
                            </h3>
                        </div>

                        {/* Total Orders */}
                        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
                            <div className="flex items-center justify-between mb-4">
                                <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center text-blue-600">
                                    <ShoppingCart size={20} />
                                </div>
                            </div>
                            <p className="text-sm text-slate-500 font-semibold mb-1">Paid / Total Orders</p>
                            <h3 className="text-3xl font-extrabold text-slate-900">
                                {/* 🌟 Safe Chaining Used Here */}
                                {analyticsData?.summary?.paid_partner_orders || 0} <span className="text-xl text-slate-400">/ {analyticsData?.summary?.total_partner_orders || 0}</span>
                            </h3>
                        </div>

                        {/* Active Partners */}
                        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
                            <div className="flex items-center justify-between mb-4">
                                <div className="w-10 h-10 rounded-full bg-purple-100 flex items-center justify-center text-purple-600">
                                    <Users size={20} />
                                </div>
                            </div>
                            <p className="text-sm text-slate-500 font-semibold mb-1">Partners Generating Sales</p>
                            <h3 className="text-3xl font-extrabold text-slate-900">
                                {/* 🌟 Safe Chaining Used Here */}
                                {analyticsData?.summary?.partners_with_sales || 0} <span className="text-xl text-slate-400">/ {analyticsData?.summary?.total_partners || 0}</span>
                            </h3>
                        </div>


                        {/* Top Partner Spotlight */}
                        <div className="bg-gradient-to-br from-orange-50 to-orange-100 p-6 rounded-2xl border border-orange-200 shadow-sm relative overflow-hidden">
                            <div className="flex items-center justify-between mb-3 relative z-10">
                                <div className="w-10 h-10 rounded-full bg-orange-200 flex items-center justify-center text-orange-700">
                                    <Trophy size={20} />
                                </div>
                                <span className="text-xs font-bold text-orange-700 bg-white px-2 py-1 rounded-md shadow-sm">Top Performer</span>
                            </div>
                            <p className="text-sm text-orange-600/80 font-bold mb-1 relative z-10">
                                {/* 🌟 Safe Chaining Used Here */}
                                {analyticsData?.top_partner ? "Highest Sales" : "No Sales Yet"}
                            </p>
                            <h3 className="text-xl font-extrabold text-orange-900 relative z-10 truncate">
                                {/* 🌟 Safe Chaining Used Here */}
                                {analyticsData?.top_partner?.partner_name || "N/A"}
                            </h3>
                            {analyticsData?.top_partner && (
                                <p className="text-sm font-bold text-orange-700 mt-2 relative z-10">
                                    {formatCurrency(analyticsData.top_partner.total_sales)} ({analyticsData.top_partner.paid_orders} orders)
                                </p>
                            )}
                            <Trophy className="absolute -bottom-4 -right-4 text-orange-200 opacity-40" size={100} />
                        </div>
                    </div>

                    <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">

                        {/* LEFT: PARTNER LEADERBOARD */}
                        <div className="xl:col-span-2 bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden flex flex-col">
                            <div className="p-5 border-b border-slate-100 bg-slate-50/50 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                                <h3 className="font-bold text-slate-900 flex items-center gap-2">
                                    <Building2 className="text-brand" size={18} /> Partner Sales Breakdown
                                </h3>

                                {/* Search Bar UI */}
                                <div className="relative w-full sm:w-72">
                                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                                    <input
                                        type="text"
                                        placeholder="Search by name or email..."
                                        value={partnerSearchQuery}
                                        onChange={(e) => setPartnerSearchQuery(e.target.value)}
                                        className="w-full pl-9 pr-4 py-2 bg-white border border-slate-200 rounded-lg text-sm font-medium focus:outline-none focus:border-brand focus:ring-1 focus:ring-brand transition-all shadow-sm"
                                    />
                                </div>
                            </div>

                            <div className="overflow-x-auto p-4">
                                <table className="w-full text-left border-collapse whitespace-nowrap">
                                    <thead className="text-xs uppercase text-slate-400 font-bold border-b border-slate-100">
                                        <tr>
                                            <th className="pb-3 pl-2">Partner</th>
                                            <th className="pb-3">Status</th>
                                            <th className="pb-3 text-center">Customers</th>
                                            <th className="pb-3 text-center">Paid Orders</th>
                                            <th className="pb-3 text-right">Total Revenue</th>
                                            <th className="pb-3 text-right pr-2">Last Order</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-50">
                                        {filteredPartnerSales.length === 0 ? (
                                            <tr>
                                                <td colSpan="6" className="py-8 text-center text-slate-400">
                                                    {partnerSearchQuery ? "No partners match your search." : "No partner sales found for this period."}
                                                </td>
                                            </tr>
                                        ) : (
                                            filteredPartnerSales.map((partner) => (
                                                <tr key={partner.partner_access_id} className="hover:bg-slate-50/50 transition-colors">
                                                    <td className="py-3 pl-2">
                                                        <p className="font-bold text-slate-800">{partner.partner_name}</p>
                                                        <p className="text-xs text-slate-500">{partner.email}</p>
                                                    </td>
                                                    <td className="py-3">{getStatusBadge(partner.status)}</td>
                                                    <td className="py-3 text-center font-semibold text-slate-600">{partner.total_customers}</td>
                                                    <td className="py-3 text-center">
                                                        <span className="font-bold text-slate-800">{partner.paid_orders}</span>
                                                        <span className="text-xs text-slate-400 ml-1">/ {partner.total_orders}</span>
                                                    </td>
                                                    <td className="py-3 text-right font-extrabold text-green-600">
                                                        {formatCurrency(partner.total_sales)}
                                                    </td>
                                                    <td className="py-3 text-right pr-2 text-xs text-slate-500 font-medium">
                                                        {formatDate(partner.last_order_at)}
                                                    </td>
                                                </tr>
                                            ))
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        </div>

                        {/* RIGHT: TIMELINE / BUCKETS */}
                        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden flex flex-col">
                            <div className="p-5 border-b border-slate-100 bg-slate-50/50">
                                <h3 className="font-bold text-slate-900 flex items-center gap-2">
                                    <TrendingUp className="text-brand" size={18} /> Timeline Overview
                                </h3>
                            </div>
                            <div className="overflow-x-auto p-4">
                                <table className="w-full text-left border-collapse">
                                    <thead className="text-xs uppercase text-slate-400 font-bold border-b border-slate-100">
                                        <tr>
                                            <th className="pb-3 pl-2">Period</th>
                                            <th className="pb-3 text-center">Active</th>
                                            <th className="pb-3 text-right pr-2">Revenue</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-50">
                                        {/* 🌟 Optional Chaining on arrays as well */}
                                        {!analyticsData?.buckets || analyticsData.buckets.length === 0 ? (
                                            <tr><td colSpan="3" className="py-8 text-center text-slate-400">No timeline data.</td></tr>
                                        ) : (
                                            analyticsData.buckets.map((bucket, idx) => (
                                                <tr key={idx} className="hover:bg-slate-50/50 transition-colors">
                                                    <td className="py-3 pl-2 font-bold text-slate-700 flex items-center gap-2">
                                                        <Calendar size={14} className="text-slate-400" />
                                                        {bucket.bucket}
                                                    </td>
                                                    <td className="py-3 text-center text-sm font-semibold text-slate-600">
                                                        {bucket.active_partners} partners
                                                    </td>
                                                    <td className="py-3 text-right pr-2 font-bold text-green-600">
                                                        {formatCurrency(bucket.total_sales)}
                                                    </td>
                                                </tr>
                                            ))
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        </div>

                    </div>
                </>
            ) : null}

        </div>
    );
}