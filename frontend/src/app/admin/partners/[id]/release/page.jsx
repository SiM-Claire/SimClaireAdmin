"use client";

import React, { useState, useEffect, useMemo } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import axios from "axios";
import {
    ArrowLeft,
    Globe,
    CheckCircle2,
    XCircle,
    AlertTriangle,
    Sparkles,
    RefreshCcw,
    Search,
    BarChart3,
    Sliders,
    ShieldAlert,
    Layers,
    ChevronRight,
    Check,
    X,
    RotateCcw,
} from "lucide-react";
import { allDestinations } from "@/data/destinationData";

export default function PartnerBatchReleasePage() {
    const params = useParams();
    const router = useRouter();
    const partnerAccessId = params?.id;
    const adminToken =
        typeof window !== "undefined" ? localStorage.getItem("adminToken") : null;
    const API_BASE =
        process.env.NEXT_PUBLIC_API_URL || "http://localhost:7000/api";

    // Tab: 'release' or 'report'
    const [activeTab, setActiveTab] = useState("release");

    // Release Modes: 'all' | 'selected' | 'individual'
    const [releaseMode, setReleaseMode] = useState("all");

    // Form inputs
    const [globalMultiplier, setGlobalMultiplier] = useState(2.5);
    const [selectedCountryCodes, setSelectedCountryCodes] = useState([]);
    const [customMultipliers, setCustomMultipliers] = useState({}); // { "JPN-1": 2.8, "USA-1": 3.0 }
    const [countrySearchQuery, setCountrySearchQuery] = useState("");

    // States from Backend
    const [partnerData, setPartnerData] = useState(null);
    const [countryStates, setCountryStates] = useState([]);
    const [reportData, setReportData] = useState(null);
    const [salesFilter, setSalesFilter] = useState("monthly");

    const [isLoading, setIsLoading] = useState(true);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isRefreshingReport, setIsRefreshingReport] = useState(false);
    const [statusMessage, setStatusMessage] = useState(null);

    // --- 1. FETCH INITIAL DATA ---
    const fetchData = async (refreshCatalog = false) => {
        if (!partnerAccessId) return;
        setIsLoading(true);
        setStatusMessage(null);

        try {
            // 1. Fetch current country configuration
            const accessRes = await axios.get(
                `${API_BASE}/admin/partners/${partnerAccessId}/countries`,
                {
                    headers: { Authorization: `Bearer ${adminToken}` },
                },
            );

            if (accessRes.data?.status === 200) {
                setPartnerData(accessRes.data.data.partner);
                setCountryStates(accessRes.data.data.countries || []);
                if (accessRes.data.data.all_countries_default_multiplier) {
                    setGlobalMultiplier(
                        accessRes.data.data.all_countries_default_multiplier,
                    );
                }
            }

            // 2. Fetch Release Report
            await fetchReport(refreshCatalog);
        } catch (err) {
            console.error("Failed to load release state:", err);
            setStatusMessage({
                type: "error",
                text:
                    err.response?.data?.message ||
                    "Failed to load partner country release settings.",
            });
        } finally {
            setIsLoading(false);
        }
    };

    const fetchReport = async (refreshCatalog = false) => {
        try {
            const reportRes = await axios.get(
                `${API_BASE}/admin/partners/${partnerAccessId}/release-report`,
                {
                    headers: { Authorization: `Bearer ${adminToken}` },
                    params: {
                        filter: salesFilter,
                        refresh_catalog: refreshCatalog,
                    },
                },
            );
            if (reportRes.data?.status === 200) {
                setReportData(reportRes.data.data);
            }
        } catch (err) {
            console.error("Failed to fetch release report:", err);
        }
    };

    useEffect(() => {
        fetchData();
    }, [partnerAccessId]);

    useEffect(() => {
        if (partnerAccessId) {
            fetchReport(false);
        }
    }, [salesFilter]);

    // Destination Map Helpers
    const destinationMap = useMemo(() => {
        const map = {};
        allDestinations.forEach((d) => {
            map[d.destinationID] = d;
        });
        return map;
    }, []);

    const filteredDestinationsList = useMemo(() => {
        return allDestinations.filter(
            (d) =>
                d.destinationName
                    .toLowerCase()
                    .includes(countrySearchQuery.toLowerCase()) ||
                d.isoCode.toLowerCase().includes(countrySearchQuery.toLowerCase()) ||
                d.destinationID
                    .toLowerCase()
                    .includes(countrySearchQuery.toLowerCase()),
        );
    }, [countrySearchQuery]);

    // --- 2. EXECUTE BATCH RELEASE ACTIONS ---
    const handleBatchRelease = async (e) => {
        e.preventDefault();
        setIsSubmitting(true);
        setStatusMessage(null);

        let payload = {};

        if (releaseMode === "all") {
            // Release ALL countries with a global multiplier
            payload = {
                countries: "all",
                default_multiplier: parseFloat(globalMultiplier),
            };
        } else if (releaseMode === "selected") {
            // Release Selected countries with a global multiplier
            if (selectedCountryCodes.length === 0) {
                setStatusMessage({
                    type: "error",
                    text: "Please select at least one country to release.",
                });
                setIsSubmitting(false);
                return;
            }
            payload = {
                countries: selectedCountryCodes,
                default_multiplier: parseFloat(globalMultiplier),
            };
        } else if (releaseMode === "individual") {
            // Release Multiple countries with individual multipliers
            if (selectedCountryCodes.length === 0) {
                setStatusMessage({
                    type: "error",
                    text: "Please select at least one country to configure.",
                });
                setIsSubmitting(false);
                return;
            }
            const formattedCountries = selectedCountryCodes.map((code) => ({
                country_code: code,
                default_multiplier: parseFloat(
                    customMultipliers[code] || globalMultiplier,
                ),
            }));
            payload = {
                countries: formattedCountries,
            };
        }

        try {
            const res = await axios.post(
                `${API_BASE}/admin/partners/${partnerAccessId}/countries`,
                payload,
                { headers: { Authorization: `Bearer ${adminToken}` } },
            );

            if (res.data.status === 200) {
                setStatusMessage({
                    type: "success",
                    text:
                        res.data.message || "Partner country access updated successfully!",
                });
                setCountryStates(res.data.data.countries || []);
                fetchReport(true); // update stats
            }
        } catch (err) {
            console.error("Release update failed:", err);
            setStatusMessage({
                type: "error",
                text:
                    err.response?.data?.message ||
                    "Failed to update country release settings.",
            });
        } finally {
            setIsSubmitting(false);
        }
    };

    // Quick Action: Block a specific country
    const handleBlockCountry = async (countryCode) => {
        if (!confirm(`Are you sure you want to block plans for ${countryCode}?`))
            return;
        try {
            const res = await axios.post(
                `${API_BASE}/admin/partners/${partnerAccessId}/countries`,
                { countries: [countryCode], is_released: false },
                { headers: { Authorization: `Bearer ${adminToken}` } },
            );
            if (res.data.status === 200) {
                setCountryStates(res.data.data.countries || []);
                fetchReport(true);
            }
        } catch (err) {
            alert(err.response?.data?.message || "Failed to block country");
        }
    };

    // Quick Action: Reset to inherited "ALL" state
    const handleResetCountry = async (countryCode) => {
        if (
            !confirm(
                `Reset ${countryCode} to inherit default global release settings?`,
            )
        )
            return;
        try {
            const res = await axios.delete(
                `${API_BASE}/admin/partners/${partnerAccessId}/countries/${countryCode}`,
                { headers: { Authorization: `Bearer ${adminToken}` } },
            );
            if (res.data.status === 200) {
                setCountryStates(res.data.data.countries || []);
                fetchReport(true);
            }
        } catch (err) {
            alert(err.response?.data?.message || "Failed to reset country");
        }
    };

    const toggleSelectCountry = (id) => {
        setSelectedCountryCodes((prev) =>
            prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
        );
    };

    const selectAllFiltered = () => {
        const codes = filteredDestinationsList.map((d) => d.destinationID);
        setSelectedCountryCodes(
            Array.from(new Set([...selectedCountryCodes, ...codes])),
        );
    };

    const deselectAllFiltered = () => {
        const codes = new Set(filteredDestinationsList.map((d) => d.destinationID));
        setSelectedCountryCodes((prev) => prev.filter((id) => !codes.has(id)));
    };

    if (isLoading) {
        return (
            <div className="p-8 max-w-7xl mx-auto flex flex-col items-center justify-center min-h-[60vh]">
                <div className="w-10 h-10 border-4 border-[#077770] border-t-transparent rounded-full animate-spin mb-4"></div>
                <p className="text-slate-600 font-bold">
                    Loading partner release settings &amp; reports...
                </p>
            </div>
        );
    }

    return (
        <div className="p-4 md:p-8 max-w-[1400px] mx-auto font-sans pb-24">
            {/* Top Header */}
            <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 mb-6">
                <div>
                    <button
                        onClick={() => router.push("/admin/partners")}
                        className="text-slate-400 hover:text-slate-700 flex items-center text-xs font-bold mb-2 transition-colors cursor-pointer"
                    >
                        <ArrowLeft className="h-4 w-4 mr-1" /> Back to Partners
                    </button>
                    <div className="flex items-center gap-3">
                        <h1 className="text-2xl md:text-3xl font-extrabold text-slate-900">
                            Country Release &amp; Coverage
                        </h1>
                        <span className="bg-teal-100 text-[#077770] text-xs px-2.5 py-1 rounded-full font-bold">
                            {partnerData?.partner_name} (#{partnerAccessId})
                        </span>
                    </div>
                </div>

                {/* Tab Switcher */}
                <div className="flex items-center p-1 bg-slate-200/80 rounded-xl shadow-inner">
                    <button
                        onClick={() => setActiveTab("release")}
                        className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer ${activeTab === "release"
                                ? "bg-white text-[#077770] shadow-sm"
                                : "text-slate-600 hover:text-slate-900"
                            }`}
                    >
                        <Sparkles size={15} /> Batch Release Manager
                    </button>
                    <button
                        onClick={() => setActiveTab("report")}
                        className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer ${activeTab === "report"
                                ? "bg-white text-[#077770] shadow-sm"
                                : "text-slate-600 hover:text-slate-900"
                            }`}
                    >
                        <BarChart3 size={15} /> Release &amp; Sales Report
                    </button>
                </div>
            </div>

            {/* Real-Time Coverage Counters Banner */}
            {reportData && (
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-8">
                    <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
                        <div className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">
                            Release Mode
                        </div>
                        <div className="text-lg font-black text-slate-800">
                            {reportData.country_coverage?.release_mode === "ALL_COUNTRIES"
                                ? "All Countries Live"
                                : reportData.country_coverage?.release_mode ===
                                    "SELECTED_COUNTRIES"
                                    ? "Selected Countries"
                                    : "Per-Plan Only"}
                        </div>
                        <div className="text-[11px] text-slate-500 mt-1">
                            Global Multiplier:{" "}
                            <span className="font-bold text-slate-700">
                                {reportData.country_coverage
                                    ?.all_countries_default_multiplier || globalMultiplier}
                                x
                            </span>
                        </div>
                    </div>

                    <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
                        <div className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">
                            Released Countries
                        </div>
                        <div className="text-2xl font-black text-[#077770]">
                            {reportData.country_coverage?.released_countries}{" "}
                            <span className="text-sm font-semibold text-slate-400">
                                / {reportData.country_coverage?.total_countries}
                            </span>
                        </div>
                        <div className="text-[11px] text-teal-600 font-bold mt-1">
                            {reportData.country_coverage?.release_percentage}% Destination
                            Coverage
                        </div>
                    </div>

                    <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
                        <div className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">
                            Sellable Plans
                        </div>
                        <div className="text-2xl font-black text-blue-600">
                            {reportData.plan_coverage?.released_plans}{" "}
                            <span className="text-sm font-semibold text-slate-400">
                                / {reportData.plan_coverage?.total_plans}
                            </span>
                        </div>
                        <div className="text-[11px] text-blue-500 font-bold mt-1">
                            {reportData.plan_coverage?.release_percentage}% Total Plan
                            Capacity
                        </div>
                    </div>

                    <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
                        <div className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">
                            Plan Overrides
                        </div>
                        <div className="text-2xl font-black text-orange-600">
                            {reportData.plan_coverage?.plan_level_overrides || 0}
                        </div>
                        <div className="text-[11px] text-orange-500 font-semibold mt-1">
                            {reportData.plan_coverage?.plan_level_exclusions || 0} Carved Out
                            / Blocked
                        </div>
                    </div>
                </div>
            )}

            {/* Notifications */}
            {statusMessage && (
                <div
                    className={`p-4 rounded-xl mb-6 font-semibold text-sm flex items-center gap-2 ${statusMessage.type === "success"
                            ? "bg-emerald-50 text-emerald-800 border border-emerald-200"
                            : "bg-red-50 text-red-800 border border-red-200"
                        }`}
                >
                    {statusMessage.type === "success" ? (
                        <CheckCircle2 size={18} />
                    ) : (
                        <AlertTriangle size={18} />
                    )}
                    {statusMessage.text}
                </div>
            )}

            {/* ========================================================================= */}
            {/* TAB 1: BATCH RELEASE MANAGER                                              */}
            {/* ========================================================================= */}
            {activeTab === "release" && (
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    {/* Left Column: Configuration Form */}
                    <div className="lg:col-span-1 bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex flex-col justify-between">
                        <div>
                            <h2 className="text-lg font-black text-slate-900 mb-1 flex items-center gap-2">
                                <Sparkles className="text-[#077770]" size={18} /> One-Click
                                Release Controls
                            </h2>
                            <p className="text-xs text-slate-500 mb-6">
                                Apply multiplier pricing and instantly make catalogs live across
                                whole regions.
                            </p>

                            <form onSubmit={handleBatchRelease} className="space-y-5">
                                {/* Mode Selector */}
                                <div>
                                    <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                                        Release Strategy
                                    </label>
                                    <div className="grid grid-cols-3 gap-2 p-1 bg-slate-100 rounded-xl">
                                        <button
                                            type="button"
                                            onClick={() => setReleaseMode("all")}
                                            className={`py-2 text-xs font-bold rounded-lg transition-all cursor-pointer ${releaseMode === "all"
                                                    ? "bg-white text-[#077770] shadow-sm"
                                                    : "text-slate-600 hover:text-slate-900"
                                                }`}
                                        >
                                            All Countries
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => setReleaseMode("selected")}
                                            className={`py-2 text-xs font-bold rounded-lg transition-all cursor-pointer ${releaseMode === "selected"
                                                    ? "bg-white text-[#077770] shadow-sm"
                                                    : "text-slate-600 hover:text-slate-900"
                                                }`}
                                        >
                                            Selected
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => setReleaseMode("individual")}
                                            className={`py-2 text-xs font-bold rounded-lg transition-all cursor-pointer ${releaseMode === "individual"
                                                    ? "bg-white text-[#077770] shadow-sm"
                                                    : "text-slate-600 hover:text-slate-900"
                                                }`}
                                        >
                                            Custom Rates
                                        </button>
                                    </div>
                                </div>

                                {/* Multiplier Input */}
                                {releaseMode !== "individual" ? (
                                    <div>
                                        <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                                            Default Multiplier (0.5x – 10.0x)
                                        </label>
                                        <div className="relative">
                                            <input
                                                type="number"
                                                step="0.1"
                                                min="0.5"
                                                max="10"
                                                required
                                                value={globalMultiplier}
                                                onChange={(e) => setGlobalMultiplier(e.target.value)}
                                                className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-base font-extrabold text-slate-800 outline-none focus:border-[#077770] focus:ring-2 focus:ring-[#077770]/20 transition-all"
                                                placeholder="e.g. 2.5"
                                            />
                                            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm font-bold text-slate-400">
                                                Multiplier
                                            </span>
                                        </div>
                                        <p className="text-[11px] text-slate-400 mt-1.5">
                                            {releaseMode === "all"
                                                ? "Applied to every destination unless an explicit override exists."
                                                : `Applied to the ${selectedCountryCodes.length} selected countries.`}
                                        </p>
                                    </div>
                                ) : (
                                    <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-800">
                                        <p className="font-bold mb-1">Custom Multiplier Mode</p>
                                        Select countries on the right and adjust each multiplier
                                        individually in the table.
                                    </div>
                                )}

                                {/* Summary Info */}
                                <div className="p-4 bg-slate-50 rounded-xl border border-slate-100 text-xs space-y-1 text-slate-600">
                                    <div className="flex justify-between">
                                        <span>Target Scope:</span>
                                        <span className="font-bold text-slate-800">
                                            {releaseMode === "all"
                                                ? "Entire Catalog (168+ Destinations)"
                                                : `${selectedCountryCodes.length} Destinations Selected`}
                                        </span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span>Rate Model:</span>
                                        <span className="font-bold text-slate-800">
                                            {releaseMode === "individual"
                                                ? "Per-Country Defined"
                                                : `${globalMultiplier}x Global Rate`}
                                        </span>
                                    </div>
                                </div>

                                <button
                                    type="submit"
                                    disabled={isSubmitting}
                                    className="w-full py-3 bg-[#077770] text-white rounded-xl font-bold text-sm hover:bg-[#065f59] active:scale-95 disabled:opacity-50 transition-all shadow-md shadow-teal-700/20 flex items-center justify-center gap-2 cursor-pointer"
                                >
                                    {isSubmitting ? (
                                        <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                                    ) : (
                                        <Check size={18} />
                                    )}
                                    {isSubmitting ? "Applying Changes..." : "Apply Batch Release"}
                                </button>
                            </form>
                        </div>

                        <div className="mt-8 pt-4 border-t border-slate-100 text-[11px] text-slate-400">
                            Note: Explicit plan exclusions and custom multipliers created in
                            the per-plan table will take precedence over batch rules.
                        </div>
                    </div>

                    {/* Right Column: Interactive Destination Matrix */}
                    <div className="lg:col-span-2 bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex flex-col">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 mb-4 border-b border-slate-100">
                            <div>
                                <h3 className="text-base font-bold text-slate-900">
                                    Destination Control Matrix
                                </h3>
                                <p className="text-xs text-slate-500">
                                    Toggle selections, configure custom rates, or unblock
                                    individual countries.
                                </p>
                            </div>

                            {/* Matrix Search */}
                            <div className="relative w-full sm:w-64">
                                <Search
                                    className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
                                    size={15}
                                />
                                <input
                                    type="text"
                                    placeholder="Filter country or code..."
                                    value={countrySearchQuery}
                                    onChange={(e) => setCountrySearchQuery(e.target.value)}
                                    className="w-full pl-9 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-semibold outline-none focus:border-[#077770]"
                                />
                            </div>
                        </div>

                        {/* Quick Select Buttons */}
                        {releaseMode !== "all" && (
                            <div className="flex items-center gap-2 mb-3">
                                <button
                                    type="button"
                                    onClick={selectAllFiltered}
                                    className="text-xs font-bold text-[#077770] hover:underline"
                                >
                                    Select Visible ({filteredDestinationsList.length})
                                </button>
                                <span className="text-slate-300">|</span>
                                <button
                                    type="button"
                                    onClick={deselectAllFiltered}
                                    className="text-xs font-bold text-slate-500 hover:underline"
                                >
                                    Deselect Visible
                                </button>
                                <span className="text-slate-300">|</span>
                                <span className="text-xs text-slate-500 font-semibold">
                                    {selectedCountryCodes.length} selected
                                </span>
                            </div>
                        )}

                        {/* Table */}
                        <div className="overflow-x-auto max-h-[500px] overflow-y-auto custom-scrollbar border border-slate-100 rounded-xl">
                            <table className="w-full text-left text-xs">
                                <thead className="bg-slate-50 sticky top-0 z-10 text-slate-500 font-bold uppercase border-b border-slate-200">
                                    <tr>
                                        {releaseMode !== "all" && <th className="p-3 w-10"></th>}
                                        <th className="p-3">Destination</th>
                                        <th className="p-3">Current Status</th>
                                        <th className="p-3">Effective Multiplier</th>
                                        {releaseMode === "individual" && (
                                            <th className="p-3">Custom Rate</th>
                                        )}
                                        <th className="p-3 text-right">Overrides</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100">
                                    {filteredDestinationsList.map((dest) => {
                                        const isSelected = selectedCountryCodes.includes(
                                            dest.destinationID,
                                        );
                                        const explicitRow = countryStates.find(
                                            (c) => c.country_code === dest.destinationID,
                                        );
                                        const isAllReleased = countryStates.some(
                                            (c) => c.country_code === "ALL" && c.is_released,
                                        );
                                        const isExplicitlyBlocked =
                                            explicitRow && explicitRow.is_released === false;

                                        const isLive = isExplicitlyBlocked
                                            ? false
                                            : (explicitRow?.is_released ?? isAllReleased);
                                        const currentMultiplier =
                                            explicitRow?.default_multiplier ||
                                            (isAllReleased ? globalMultiplier : "N/A");

                                        return (
                                            <tr
                                                key={dest.destinationID}
                                                className={`hover:bg-slate-50 transition-colors ${isSelected ? "bg-teal-50/40" : ""}`}
                                            >
                                                {releaseMode !== "all" && (
                                                    <td className="p-3">
                                                        <input
                                                            type="checkbox"
                                                            checked={isSelected}
                                                            onChange={() =>
                                                                toggleSelectCountry(dest.destinationID)
                                                            }
                                                            className="accent-[#077770] rounded cursor-pointer h-4 w-4"
                                                        />
                                                    </td>
                                                )}
                                                <td className="p-3">
                                                    <div className="font-bold text-slate-800">
                                                        {dest.destinationName}
                                                    </div>
                                                    <div className="text-[10px] text-slate-400 font-mono">
                                                        {dest.destinationID} ({dest.isoCode})
                                                    </div>
                                                </td>
                                                <td className="p-3">
                                                    {isLive ? (
                                                        <span className="bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded-full font-bold text-[10px] inline-flex items-center gap-1">
                                                            <CheckCircle2 size={11} /> Live
                                                        </span>
                                                    ) : (
                                                        <span className="bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full font-bold text-[10px] inline-flex items-center gap-1">
                                                            <XCircle size={11} /> Blocked
                                                        </span>
                                                    )}
                                                </td>
                                                <td className="p-3 font-mono font-bold text-slate-700">
                                                    {currentMultiplier ? `${currentMultiplier}x` : "—"}
                                                    {explicitRow && (
                                                        <span className="text-[9px] text-orange-600 ml-1 font-sans">
                                                            (override)
                                                        </span>
                                                    )}
                                                </td>
                                                {releaseMode === "individual" && (
                                                    <td className="p-3">
                                                        <input
                                                            type="number"
                                                            step="0.1"
                                                            min="0.5"
                                                            max="10"
                                                            disabled={!isSelected}
                                                            value={
                                                                customMultipliers[dest.destinationID] ||
                                                                globalMultiplier
                                                            }
                                                            onChange={(e) => {
                                                                const val = e.target.value;
                                                                setCustomMultipliers((prev) => ({
                                                                    ...prev,
                                                                    [dest.destinationID]: val,
                                                                }));
                                                            }}
                                                            className="w-16 bg-white border border-slate-200 rounded p-1 text-center font-bold text-slate-800 outline-none focus:border-[#077770] disabled:bg-slate-100 disabled:text-slate-400"
                                                        />
                                                    </td>
                                                )}
                                                <td className="p-3 text-right space-x-1">
                                                    {isLive ? (
                                                        <button
                                                            type="button"
                                                            onClick={() =>
                                                                handleBlockCountry(dest.destinationID)
                                                            }
                                                            className="text-red-600 hover:bg-red-50 p-1 rounded font-bold transition-colors cursor-pointer"
                                                            title="Block this country"
                                                        >
                                                            Block
                                                        </button>
                                                    ) : (
                                                        <button
                                                            type="button"
                                                            onClick={() =>
                                                                handleResetCountry(dest.destinationID)
                                                            }
                                                            className="text-teal-600 hover:bg-teal-50 p-1 rounded font-bold transition-colors cursor-pointer"
                                                            title="Reset inheritance"
                                                        >
                                                            Reset
                                                        </button>
                                                    )}
                                                    {explicitRow && (
                                                        <button
                                                            type="button"
                                                            onClick={() =>
                                                                handleResetCountry(dest.destinationID)
                                                            }
                                                            className="text-slate-400 hover:text-slate-700 p-1 rounded transition-colors"
                                                            title="Clear Override"
                                                        >
                                                            <RotateCcw size={13} />
                                                        </button>
                                                    )}
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            )}

            {/* ========================================================================= */}
            {/* TAB 2: RELEASE & SALES REPORT                                             */}
            {/* ========================================================================= */}
            {activeTab === "report" && reportData && (
                <div className="space-y-8">
                    {/* Controls Bar */}
                    <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex flex-col sm:flex-row items-center justify-between gap-4">
                        <div className="flex items-center gap-2">
                            <span className="text-xs font-bold text-slate-500 uppercase">
                                Sales Period:
                            </span>
                            <select
                                value={salesFilter}
                                onChange={(e) => setSalesFilter(e.target.value)}
                                className="bg-slate-50 border border-slate-200 text-xs font-bold text-slate-800 rounded-lg p-2 outline-none focus:border-[#077770]"
                            >
                                <option value="daily">Daily</option>
                                <option value="weekly">Weekly</option>
                                <option value="monthly">Monthly</option>
                                <option value="yearly">Yearly</option>
                                <option value="all">All Time</option>
                            </select>
                        </div>

                        <button
                            onClick={() => {
                                setIsRefreshingReport(true);
                                fetchReport(true).finally(() => setIsRefreshingReport(false));
                            }}
                            disabled={isRefreshingReport}
                            className="flex items-center gap-1.5 text-xs font-bold text-[#077770] hover:text-[#065f59] bg-teal-50 hover:bg-teal-100 px-3 py-1.5 rounded-lg transition-colors cursor-pointer"
                        >
                            <RefreshCcw
                                size={14}
                                className={isRefreshingReport ? "animate-spin" : ""}
                            />
                            Force Catalog Snapshot Refresh
                        </button>
                    </div>

                    {/* Sales Cross-Reference Alerts */}
                    {reportData.sales_insights?.countries_with_sales_but_not_released
                        ?.length > 0 && (
                            <div className="bg-red-50 border border-red-200 p-5 rounded-2xl">
                                <div className="flex items-center gap-2 text-red-800 font-extrabold text-sm mb-2">
                                    <ShieldAlert size={18} /> High-Priority Revenue Alert: Blocked
                                    Countries With Historical Sales
                                </div>
                                <p className="text-xs text-red-700 mb-3">
                                    The following countries generated revenue for this partner in
                                    this period but are currently turned OFF in the catalog:
                                </p>
                                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                                    {reportData.sales_insights.countries_with_sales_but_not_released.map(
                                        (c) => (
                                            <div
                                                key={c.country_code}
                                                className="bg-white p-3 rounded-xl border border-red-200 flex items-center justify-between text-xs"
                                            >
                                                <div>
                                                    <div className="font-bold text-slate-900">
                                                        {c.country_name || c.country_code}
                                                    </div>
                                                    <div className="text-[10px] text-slate-400">
                                                        {c.total_orders} orders • ${c.total_sales?.toFixed(2)}
                                                    </div>
                                                </div>
                                                <button
                                                    onClick={() => handleResetCountry(c.country_code)}
                                                    className="text-xs font-bold text-[#077770] hover:underline"
                                                >
                                                    Unblock
                                                </button>
                                            </div>
                                        ),
                                    )}
                                </div>
                            </div>
                        )}

                    {/* Top Selling Countries Breakdown */}
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                        {/* Sales Insights */}
                        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
                            <h3 className="text-base font-bold text-slate-900 mb-4 flex items-center gap-2">
                                <BarChart3 className="text-[#077770]" size={18} /> Top Selling
                                Destinations
                            </h3>
                            <div className="space-y-3">
                                {reportData.sales_insights?.top_countries?.map((c, i) => (
                                    <div
                                        key={c.country_code}
                                        className="flex items-center justify-between p-3 bg-slate-50 rounded-xl text-xs"
                                    >
                                        <div className="flex items-center gap-3">
                                            <span className="w-5 font-bold text-slate-400">
                                                #{i + 1}
                                            </span>
                                            <div>
                                                <div className="font-bold text-slate-800">
                                                    {c.country_name} ({c.country_code})
                                                </div>
                                                <div className="text-[11px] text-slate-400">
                                                    {c.total_orders} Orders • Last:{" "}
                                                    {new Date(c.last_order_at).toLocaleDateString()}
                                                </div>
                                            </div>
                                        </div>
                                        <div className="text-right">
                                            <div className="font-extrabold text-slate-900">
                                                ${c.total_sales?.toFixed(2)}
                                            </div>
                                            <span
                                                className={`text-[10px] font-bold ${c.is_released ? "text-emerald-600" : "text-red-600"}`}
                                            >
                                                {c.is_released
                                                    ? `${c.released_plans} Plans Live`
                                                    : "Currently Blocked"}
                                            </span>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Unreleased Countries Breakdown */}
                        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
                            <h3 className="text-base font-bold text-slate-900 mb-4 flex items-center gap-2">
                                <AlertTriangle className="text-orange-600" size={18} /> Blocked
                                &amp; Partial Catalogues (
                                {reportData.unreleased?.country_count || 0})
                            </h3>
                            <div className="space-y-3 max-h-[380px] overflow-y-auto custom-scrollbar">
                                {reportData.unreleased?.countries?.map((u) => (
                                    <div
                                        key={u.country_code}
                                        className="flex items-center justify-between p-3 bg-slate-50 rounded-xl text-xs"
                                    >
                                        <div>
                                            <div className="font-bold text-slate-800">
                                                {u.country_name} ({u.country_code})
                                            </div>
                                            <div className="text-[10px] text-slate-400">
                                                Reason:{" "}
                                                <span className="font-semibold text-slate-600">
                                                    {u.reason}
                                                </span>
                                            </div>
                                        </div>
                                        <div className="text-right">
                                            <span
                                                className={`text-[10px] font-extrabold px-2 py-0.5 rounded-full ${u.status === "PARTIAL"
                                                        ? "bg-amber-100 text-amber-800"
                                                        : "bg-red-100 text-red-800"
                                                    }`}
                                            >
                                                {u.unreleased_plans} Plans Excluded
                                            </span>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
