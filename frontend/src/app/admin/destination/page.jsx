"use client";

import React, { useState, useEffect, useRef, useMemo } from "react";
import { useRouter } from "next/navigation";
import axios from "axios";
import { 
  Search, Download, Save, 
  ChevronDown, ChevronUp, Check, ArrowLeft,
  Info, Filter, ArrowUpDown, Globe, Sparkles,
  RotateCcw, Award, TrendingUp, CheckSquare, Zap
} from "lucide-react";

// 🌟 Import all destinations
import { allDestinations } from "@/data/destinationData";

// --- Algorithm Constants ---
const USER_PROFILES = {
  balanced: { name: "Balanced", weights: { data: 0.5, voice: 0.4, sms: 0.1 } },
  data_only: { name: "Data Only", weights: { data: 1.0, voice: 0.0, sms: 0.0 } },
  call_data: { name: "Call + Data", weights: { data: 0.7, voice: 0.3, sms: 0.0 } },
  call_data_sms: { name: "Call + Data + Message", weights: { data: 0.6, voice: 0.3, sms: 0.1 } }
};

const SATURATION_TARGETS = {
  DATA_TARGET: 3.0,   // GB/day
  VOICE_TARGET: 45.0, // Mins/day
  SMS_TARGET: 10.0    // SMS/day
};

const UNLIMITED_VALUES = {
  DATA: 5.0,   // GB/day
  VOICE: 100.0, // Mins/day
  SMS: 50.0    // SMS/day
};

// --- Algorithm Calculator for Admin Schema ---
const calculateAdminPlanScores = (plan, editState, profileKey) => {
  const profile = USER_PROFILES[profileKey] || USER_PROFILES.balanced;
  const { data: w_data, voice: w_voice, sms: w_sms } = profile.weights;

  const validity = Math.max(1, parseInt(plan.productValidityDays || 0, 10) || 1);

  // 1. Base Cost (Fixed baseline so scoring remains consistent)
  const basePrice = Math.max(0, parseFloat(plan.productBasePrice || 0));
  const baseDailyCost = basePrice / validity;

  // 2. Retail/Display Calculations (for UI preview only)
  const multiplier = parseFloat(editState?.custom_multiplier) || 1;
  const subtotal = basePrice * multiplier;
  const calculatedDelta = Math.min(subtotal * 0.025, 4);
  const finalPrice = subtotal > 0 ? subtotal + calculatedDelta : basePrice;

  // Step 1: Normalize Daily Allowances
  const isUnlimitedData = plan.productDataType === "unlimited";
  const rawDataGb = parseFloat(plan.productDataAllowance || 0);
  const normalizedDataGb = (plan.dataAllowanceUnit || "").toLowerCase() === "mb" ? rawDataGb / 1024 : rawDataGb;
  const dailyData = isUnlimitedData ? UNLIMITED_VALUES.DATA : normalizedDataGb / validity;

  const hasVoice = plan.productVoice === "Yes" || parseInt(plan.productVoiceMinutes || 0, 10) > 0;
  const isUnlimitedVoice = plan.productVoice === "Unlimited";
  const rawVoiceMins = parseInt(plan.productVoiceMinutes || 0, 10);
  const dailyVoice = isUnlimitedVoice ? UNLIMITED_VALUES.VOICE : (hasVoice ? rawVoiceMins / validity : 0);

  const hasSms = plan.productSms === "Yes" || parseInt(plan.productSmsCount || 0, 10) > 0;
  const isUnlimitedSms = plan.productSms === "Unlimited";
  const rawSmsCount = parseInt(plan.productSmsCount || 0, 10);
  const dailySms = isUnlimitedSms ? UNLIMITED_VALUES.SMS : (hasSms ? rawSmsCount / validity : 0);

  // Step 2: Compute Single-Attribute Utility Scores (S_i)
  const sData = Math.min(1.0, dailyData / SATURATION_TARGETS.DATA_TARGET);
  const sVoice = Math.min(1.0, dailyVoice / SATURATION_TARGETS.VOICE_TARGET);
  const sSms = Math.min(1.0, dailySms / SATURATION_TARGETS.SMS_TARGET);

  // Step 3: Compute Value Score (Utility Match)
  const valueScore = (w_data * sData) + (w_voice * sVoice) + (w_sms * sSms);
  const matchPercentage = Math.round(valueScore * 100);

  // Step 4: Compute VFM Score using baseDailyCost (Prevents Ranking Shifts)
  const vfmScore = baseDailyCost > 0 ? valueScore / baseDailyCost : 0;

  return {
    ...plan,
    dailyCost: baseDailyCost,
    valueScore,
    matchPercentage,
    vfmScore,
    calculatedFinalPrice: finalPrice
  };
};

export default function AdminPlanControlPage() {
  const router = useRouter();
  const adminToken = typeof window !== 'undefined' ? localStorage.getItem("adminToken") : null;

  // --- COUNTRY DROPDOWN STATES ---
  const [countryCode, setCountryCode] = useState(allDestinations[0]?.destinationID || "US-1");
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [countrySearchQuery, setCountrySearchQuery] = useState("");
  const dropdownRef = useRef(null);

  // --- PLAN STATES ---
  const [plans, setPlans] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [autoReleaseMultiplier,setAutoReleaseMultiplier] = useState(1.2)
  // --- BULK EDITING STATES ---
  const [editedPlans, setEditedPlans] = useState({});
  const [isSaving, setIsSaving] = useState(false);
  
  // --- FILTER & SORT STATES ---
  const [planSearchQuery, setPlanSearchQuery] = useState("");
  const [filterStatus, setFilterStatus] = useState("all"); 
  const [filterDataType, setFilterDataType] = useState("all"); 
  const [filterFeatures, setFilterFeatures] = useState("all"); 
  const [filterValidity, setFilterValidity] = useState("all");
  const [filterSimType, setFilterSimType] = useState("all"); 
  
  const [sortPrice, setSortPrice] = useState("default"); 
  const [sortValidity, setSortValidity] = useState("default"); 

  // --- RECOMMENDER ENGINE STATES ---
  const [isRecommendationActive, setIsRecommendationActive] = useState(false);
  const [algoProfile, setAlgoProfile] = useState("balanced");
  const [algoPlanCount, setAlgoPlanCount] = useState(10);
  const [algoMinDays, setAlgoMinDays] = useState(1);
  const [algoMaxDays, setAlgoMaxDays] = useState(30);
  const [algoServiceType, setAlgoServiceType] = useState("all");

  // --- UI STATES ---
  const [expandedPlanId, setExpandedPlanId] = useState(null);

  const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:7000/api";

  // Handle outside click for dropdown
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // --- 1. GET DATA ---
  const fetchPlans = async () => {
    if (!countryCode) return;
    try {
      setLoading(true);
      setError(null);
      const res = await axios.get(`${API_BASE}/admin/plan-control?country_code=${countryCode}`, {
        headers: { Authorization: `Bearer ${adminToken}` }
      });
      if (res.data?.data?.plans) {
        setPlans(res.data.data.plans);
        
        // 🌟 Initialize bulk editing state
        const initialEdits = {};
        res.data.data.plans.forEach(p => {
          initialEdits[p.productID] = {
            plan_id: p.productID,
            is_active: p.is_configured ? (p.control?.is_active ?? false) : false,
            custom_multiplier: p.is_configured ? (p.control?.custom_multiplier || "") : "",
            priority: p.is_configured ? (p.control?.priority ?? 10) : 10
          };
        });
        setEditedPlans(initialEdits);
      }
    } catch (err) {
      console.error("Failed to fetch plans:", err);
      setError("Failed to load plans from the server.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPlans();
    setPlanSearchQuery("");
    setFilterStatus("all");
    setExpandedPlanId(null);
    setIsRecommendationActive(false);
  }, [countryCode]);

  // --- 2. HANDLE LOCAL EDITS ---
  const handleEdit = (planId, field, value) => {
    setEditedPlans(prev => ({
      ...prev,
      [planId]: {
        ...prev[planId],
        [field]: value
      }
    }));
  };

  // --- 3. BULK SAVE (POST) ---
  const handleBulkSave = async () => {
    setIsSaving(true);
    
    const plansArray = Object.values(editedPlans).map(p => ({
      plan_id: p.plan_id,
      is_active: p.is_active,
      custom_multiplier: p.is_active && p.custom_multiplier ? parseFloat(p.custom_multiplier) : null,
      priority: p.priority || 10
    }));

    try {
      const res = await axios.post(`${API_BASE}/admin/plan-control/add`, 
        { 
          country_code: countryCode,
          plans: plansArray 
        }, 
        {
          headers: { Authorization: `Bearer ${adminToken}` }
        }
      );
      
      if (res.data.status === 200 || res.data.success || res.status === 200) {
        alert("Pricing updated successfully!");
        fetchPlans();
      } else {
        alert("Error: " + (res.data.message || "Failed to update"));
      }
    } catch (err) {
      const errorMessage = err.response?.data?.message || "Failed to save updates.";
      alert(errorMessage);
    } finally {
      setIsSaving(false);
    }
  };

  // --- 4. EXPORT CSV ---
  const handleExportCSV = () => {
    if (plans.length === 0) return alert("No plans to export");

    const csvRows = [];
    const headers = [
      "productID", "productName", "productBasePrice", "productCurrency", 
      "productValidityDays", "productDataAllowance", "productDataType", "operatorName", 
      "is_active", "custom_multiplier", "final_price"
    ];
    csvRows.push(headers.join(","));

    plans.forEach(plan => {
      const editState = editedPlans[plan.productID] || {};
      const basePrice = parseFloat(plan.productBasePrice || 0);
      const multiplier = parseFloat(editState.custom_multiplier) || 1;
      const subtotal = basePrice * multiplier;
      const calculatedDelta = Math.min(subtotal * 0.025, 4); 
      const finalPrice = subtotal > 0 ? (subtotal + calculatedDelta).toFixed(2) : "0.00";
      
      const row = [
        `"${plan.productID || ""}"`,
        `"${plan.productName || ""}"`,
        `"${plan.productBasePrice || ""}"`,
        `"${plan.productCurrency || ""}"`,
        `"${plan.productValidityDays || ""}"`,
        `"${plan.productDataAllowance || ""}"`,
        `"${plan.productDataType || ""}"`,
        `"${plan.operatorName || ""}"`,
        `"${editState.is_active || false}"`,
        `"${multiplier}"`,
        `"${finalPrice}"`
      ];
      csvRows.push(row.join(","));
    });

    const csvContent = "data:text/csv;charset=utf-8," + csvRows.join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `plans_${countryCode}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // --- 5. ALGORITHMIC PROCESSING ---
 const recommendedPlans = useMemo(() => {
  if (!isRecommendationActive) return [];

  return plans
    .map(p => calculateAdminPlanScores(p, editedPlans[p.productID], algoProfile))
    .filter(p => p.valueScore >= 0.35)
    .filter(p => {
      const days = parseInt(p.productValidityDays || 0, 10);
      const matchesValidity = days >= Number(algoMinDays) && days <= Number(algoMaxDays);
      if (!matchesValidity) return false;

      const isUnlimited = p.productDataType === "unlimited";
      const hasVoice = p.productVoice === "Yes" || parseInt(p.productVoiceMinutes || 0, 10) > 0;
      const hasSms = p.productSms === "Yes" || parseInt(p.productSmsCount || 0, 10) > 0;

      if (algoServiceType === "unlimited") return isUnlimited;
      if (algoServiceType === "data") return !hasVoice && !hasSms && !isUnlimited;
      if (algoServiceType === "combo") return hasVoice || hasSms;
      return true;
    })
    .sort((a, b) => b.vfmScore - a.vfmScore)
    .slice(0, Number(algoPlanCount));
}, [plans, isRecommendationActive, algoProfile, algoMinDays, algoMaxDays, algoServiceType, algoPlanCount]);

  // --- 6. APPLY FILTERS & SORTING ---
  const standardFilteredPlans = useMemo(() => {
    return [...plans]
      .filter(p => {
        const matchesSearch = (p.productName || "").toLowerCase().includes(planSearchQuery.toLowerCase()) || 
                              (p.productID || "").toLowerCase().includes(planSearchQuery.toLowerCase());
        
        let matchesStatus = true;
        if (filterStatus === "added") matchesStatus = p.is_configured;
        if (filterStatus === "not_added") matchesStatus = !p.is_configured;
        if (filterStatus === "released") matchesStatus = p.is_configured && p.control?.is_active === true;
        if (filterStatus === "unreleased") matchesStatus = p.is_configured && p.control?.is_active === false;

        let matchesData = true;
        if (filterDataType === "unlimited") matchesData = p.productDataType === "unlimited";
        if (filterDataType === "fixed") matchesData = p.productDataType !== "unlimited";

        let matchesFeatures = true;
        const hasVoice = p.productVoice === 'Yes' || parseInt(p.productVoiceMinutes || 0, 10) > 0;
        if (filterFeatures === "data_only") matchesFeatures = !hasVoice;
        if (filterFeatures === "with_voice") matchesFeatures = hasVoice;

        let matchesValidity = true;
        const days = parseInt(p.productValidityDays || 0, 10);
        if (filterValidity === "short") matchesValidity = days >= 1 && days <= 7;
        if (filterValidity === "medium") matchesValidity = days >= 8 && days <= 15;
        if (filterValidity === "long") matchesValidity = days >= 16 && days <= 30;
        if (filterValidity === "extended") matchesValidity = days > 30;

        let matchesSimType = true;
        const typeNum = parseInt(p.productType || 0, 10);
        if (filterSimType === "1_2") matchesSimType = typeNum >= 1 && typeNum <= 2;
        if (filterSimType === "3_5") matchesSimType = typeNum >= 3 && typeNum <= 5;

        return matchesSearch && matchesStatus && matchesData && matchesFeatures && matchesValidity && matchesSimType;
      })
      .sort((a, b) => {
        if (sortPrice === "default" && sortValidity === "default") return 0;

        const multA = parseFloat(editedPlans[a.productID]?.custom_multiplier) || 1;
        const multB = parseFloat(editedPlans[b.productID]?.custom_multiplier) || 1;
        const priceA = parseFloat(a.productBasePrice || 0) * multA;
        const priceB = parseFloat(b.productBasePrice || 0) * multB;

        const valA = parseInt(a.productValidityDays || 0, 10);
        const valB = parseInt(b.productValidityDays || 0, 10);

        if (sortPrice !== "default") {
          if (priceA !== priceB) return sortPrice === "asc" ? priceA - priceB : priceB - priceA;
        }
        
        if (sortValidity !== "default") {
          if (valA !== valB) return sortValidity === "asc" ? valA - valB : valB - valA;
        }

        return 0;
      });
  }, [plans, planSearchQuery, filterStatus, filterDataType, filterFeatures, filterValidity, filterSimType, sortPrice, sortValidity, editedPlans]);

  const processedPlans = isRecommendationActive ? recommendedPlans : standardFilteredPlans;

  // --- 7. AUTO-RELEASE TOP RECOMMENDED PLANS ---
 const handleBulkReleaseTopPlans = async (autoSave = false) => {
  if (!recommendedPlans || recommendedPlans.length === 0) {
    alert("No recommended plans available to release.");
    return;
  }

  const selectedMultiplier = parseFloat(autoReleaseMultiplier) || 1.2;

  // 1. Update local state with the chosen multiplier
  let updatedState = {};
  setEditedPlans((prev) => {
    const updated = { ...prev };

    recommendedPlans.forEach((p) => {
      const planId = p.productID || p.id || p.plan_id;
      if (!planId) return;

      const existingEdit = updated[planId] || {};

      updated[planId] = {
        ...existingEdit,
        plan_id: planId,
        is_active: true,
        custom_multiplier: String(selectedMultiplier),
        priority: existingEdit.priority ?? p.control?.priority ?? 10,
      };
    });

    updatedState = updated;
    return updated;
  });

  // 2. Persist to database
  if (autoSave) {
    setIsSaving(true);
    try {
      const plansArray = Object.values(updatedState).map((p) => ({
        plan_id: p.plan_id,
        is_active: Boolean(p.is_active),
        custom_multiplier: p.is_active && p.custom_multiplier ? parseFloat(p.custom_multiplier) : null,
        priority: p.priority || 10,
      }));

      const res = await axios.post(
        `${API_BASE}/admin/plan-control/add`,
        {
          country_code: countryCode,
          plans: plansArray,
        },
        {
          headers: { Authorization: `Bearer ${adminToken}` },
        }
      );

      if (res.data.status === 200 || res.data.success || res.status === 200) {
        alert(`Successfully released and saved top ${recommendedPlans.length} plans with ${selectedMultiplier}x multiplier!`);
        fetchPlans();
      } else {
        alert("Error: " + (res.data.message || "Failed to save"));
      }
    } catch (err) {
      console.error("Auto-release save failed:", err);
      alert(err.response?.data?.message || "Failed to save released plans to database.");
    } finally {
      setIsSaving(false);
    }
  }
};

  // Country Dropdown Helpers
  const filteredDestinations = allDestinations.filter(dest =>
    dest.destinationName.toLowerCase().includes(countrySearchQuery.toLowerCase()) ||
    dest.isoCode.toLowerCase().includes(countrySearchQuery.toLowerCase())
  );
  const selectedDestination = allDestinations.find(d => d.destinationID === countryCode);

  return (
    <div className="min-h-screen bg-gray-50 p-4 md:p-8 font-sans pb-20">
      <div className="max-w-[1400px] mx-auto">
        
        {/* Header & Controls */}
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-200 mb-6">
          <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6 mb-6">
            
            {/* Title & Country Selector */}
            <div>
              <button onClick={() => router.back()} className="text-gray-400 hover:text-blue-600 flex items-center text-sm font-bold mb-3 transition-colors cursor-pointer">
                <ArrowLeft className="h-4 w-4 mr-1" /> Back to Dashboard
              </button>
              
              <div className="flex flex-col md:flex-row items-start md:items-end gap-4">
                <h1 className="text-2xl md:text-3xl font-bold text-gray-900">
                  Customer Plan Management
                </h1>
                
                {/* Searchable Country Dropdown */}
                <div className="flex items-center gap-3 bg-gray-50 p-2 rounded-xl border border-gray-200 shadow-sm relative" ref={dropdownRef}>
                  <Globe className="text-[#077770] ml-2" size={20}/>
                  <button 
                    onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                    className="flex items-center justify-between gap-3 bg-transparent border-none font-bold text-slate-800 outline-none pr-2 cursor-pointer py-1 min-w-[200px]"
                  >
                    <span>
                      {selectedDestination ? `${selectedDestination.destinationName} (${selectedDestination.isoCode})` : "Select Destination"}
                    </span>
                    <ChevronDown size={16} className={`text-slate-500 transition-transform ${isDropdownOpen ? 'rotate-180' : ''}`} />
                  </button>

                  {isDropdownOpen && (
                    <div className="absolute top-[110%] left-0 w-full min-w-[280px] bg-white border border-slate-200 rounded-xl shadow-xl z-50 overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200">
                      <div className="p-2 border-b border-slate-100 bg-slate-50 flex items-center gap-2">
                        <Search size={16} className="text-slate-400 ml-2 shrink-0" />
                        <input 
                          type="text" 
                          placeholder="Search country or code..." 
                          value={countrySearchQuery}
                          onChange={(e) => setCountrySearchQuery(e.target.value)}
                          className="w-full bg-transparent border-none outline-none text-sm p-1 text-slate-700 font-medium"
                          autoFocus
                        />
                      </div>
                      <div className="max-h-60 overflow-y-auto p-1.5 custom-scrollbar">
                        {filteredDestinations.length > 0 ? (
                          filteredDestinations.map(dest => (
                            <button
                              key={dest.destinationID}
                              onClick={() => {
                                setCountryCode(dest.destinationID);
                                setIsDropdownOpen(false);
                                setCountrySearchQuery("");
                              }}
                              className={`w-full text-left px-3 py-2.5 rounded-lg text-sm flex items-center justify-between transition-colors cursor-pointer ${
                                countryCode === dest.destinationID 
                                ? "bg-teal-50 text-[#077770] font-bold" 
                                : "text-slate-700 font-medium hover:bg-slate-100"
                              }`}
                            >
                              <span>{dest.destinationName} <span className={countryCode === dest.destinationID ? "text-teal-600/70" : "text-slate-400"}>({dest.isoCode})</span></span>
                              {countryCode === dest.destinationID && <Check size={16} />}
                            </button>
                          ))
                        ) : (
                          <div className="px-3 py-6 text-center text-sm text-slate-500 font-medium">
                            No destinations found.
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Export CSV */}
            <button 
              onClick={handleExportCSV}
              className="flex items-center justify-center gap-2 bg-emerald-50 text-emerald-700 border border-emerald-200 px-5 py-2.5 rounded-xl text-sm font-bold hover:bg-emerald-100 transition-colors shrink-0 shadow-sm cursor-pointer"
            >
              <Download className="h-4 w-4" /> Export Catalog
            </button>
          </div>

          {/* RECOMMENDER ENGINE FORM SECTION FOR ADMIN */}
          <div className="mb-6 p-5 bg-gradient-to-r from-teal-50/50 via-slate-50 to-blue-50/50 border border-teal-100 rounded-xl">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pb-3 mb-4 border-b border-teal-100/60">
              <div className="flex items-center gap-2">
                <div className="p-1.5 bg-[#077770] text-white rounded-lg shadow-sm">
                  <Sparkles size={16} />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-800">Admin Recommender &amp; Quick-Release Engine</h3>
                  <p className="text-xs text-slate-500">Rank catalog by Value Score &amp; VFM efficiency to quickly identify and activate top customer plans</p>
                </div>
              </div>
              {isRecommendationActive && (
                <button
                  onClick={() => setIsRecommendationActive(false)}
                  className="flex items-center gap-1 text-xs font-bold text-slate-500 hover:text-red-600 transition-colors cursor-pointer"
                >
                  <RotateCcw size={13} />View All
                </button>
              )}
            </div>

            <form 
              onSubmit={(e) => {
                e.preventDefault();
                setIsRecommendationActive(true);
              }}
              className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 items-end"
            >
              <div>
                <label className="block text-[11px] font-bold text-slate-600 uppercase tracking-wider mb-1.5">Customer Persona</label>
                <select
                  value={algoProfile}
                  onChange={(e) => setAlgoProfile(e.target.value)}
                  className="w-full bg-white border border-slate-200 text-slate-800 text-xs font-semibold rounded-lg p-2 outline-none focus:ring-2 focus:ring-teal-500 cursor-pointer shadow-sm"
                >
                  <option value="balanced">Balanced (50% Data, 40% Voice, 10% SMS)</option>
                  <option value="data_only">Data Only (100% Data)</option>
                  <option value="call_data">Call + Data (70% Data, 30% Voice)</option>
                  <option value="call_data_sms">Call + Data + Message (60% Data, 30% Voice, 10% SMS)</option>
                </select>
              </div>

              <div>
                <div className="flex justify-between items-center mb-1.5">
                  <label className="text-[11px] font-bold text-slate-600 uppercase tracking-wider">Top Limit</label>
                  <span className="text-[11px] font-extrabold text-[#077770] bg-teal-100/70 px-1.5 py-0.5 rounded">Top {algoPlanCount}</span>
                </div>
                <input
                  type="range"
                  min="3"
                  max="30"
                  step="1"
                  value={algoPlanCount}
                  onChange={(e) => setAlgoPlanCount(Number(e.target.value))}
                  className="w-full accent-[#077770] cursor-pointer"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-600 uppercase tracking-wider mb-1.5">Validity (Days)</label>
                <div className="flex items-center gap-1.5">
                  <input
                    type="number"
                    min="1"
                    max={algoMaxDays}
                    value={algoMinDays}
                    onChange={(e) => setAlgoMinDays(Math.max(1, Number(e.target.value)))}
                    placeholder="Min"
                    className="w-full bg-white border border-slate-200 text-slate-800 text-xs font-semibold rounded-lg p-2 text-center outline-none focus:ring-2 focus:ring-teal-500 shadow-sm"
                  />
                  <span className="text-slate-400 font-bold">-</span>
                  <input
                    type="number"
                    min={algoMinDays}
                    value={algoMaxDays}
                    onChange={(e) => setAlgoMaxDays(Math.max(Number(algoMinDays), Number(e.target.value)))}
                    placeholder="Max"
                    className="w-full bg-white border border-slate-200 text-slate-800 text-xs font-semibold rounded-lg p-2 text-center outline-none focus:ring-2 focus:ring-teal-500 shadow-sm"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-600 uppercase tracking-wider mb-1.5">Service Type</label>
                <select
                  value={algoServiceType}
                  onChange={(e) => setAlgoServiceType(e.target.value)}
                  className="w-full bg-white border border-slate-200 text-slate-800 text-xs font-semibold rounded-lg p-2 outline-none focus:ring-2 focus:ring-teal-500 cursor-pointer shadow-sm"
                >
                  <option value="all">All Types</option>
                  <option value="unlimited">Unlimited Data</option>
                  <option value="data">Data Only</option>
                  <option value="combo">Combo (Voice/SMS)</option>
                </select>
              </div>

              <div>
                <button
                  type="submit"
                  className="w-full py-2 bg-[#077770] text-white font-bold text-xs rounded-lg shadow-sm hover:bg-[#065f59] active:scale-95 transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <Sparkles size={14} /> Calculate Top Plans
                </button>
              </div>
            </form>
          </div>

          {/* Standard Filters & Sort Bar (Visible when Recommender is not overriding) */}
          {!isRecommendationActive && (
            <div className="flex flex-col lg:flex-row items-center gap-3 bg-gray-50 p-3 rounded-xl border border-gray-100 flex-wrap">
              
              {/* Search */}
              <div className="relative w-full lg:w-64 shrink-0">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                <input 
                  type="text" 
                  placeholder="Search Plan Name/ID..." 
                  value={planSearchQuery}
                  onChange={(e) => setPlanSearchQuery(e.target.value)}
                  className="w-full pl-9 pr-4 py-2 bg-white border border-gray-200 rounded-lg text-sm font-medium focus:ring-2 focus:ring-blue-500 outline-none transition-shadow"
                />
              </div>

              <div className="h-6 w-px bg-gray-300 hidden lg:block mx-1"></div>

              {/* Filters */}
              <div className="flex flex-wrap items-center gap-2 w-full lg:w-auto flex-1">
                <div className="flex items-center gap-2 w-full sm:w-auto">
                  <Filter className="h-4 w-4 text-gray-400 shrink-0" />
                  <select 
                    value={filterStatus}
                    onChange={(e) => setFilterStatus(e.target.value)}
                    className="w-full sm:w-auto bg-white border border-gray-200 text-gray-700 text-sm rounded-lg focus:ring-blue-500 block p-2 outline-none cursor-pointer"
                  >
                    <option value="all">All Status</option>
                    <option value="added">Configured</option>
                    <option value="not_added">Not Added</option>
                    <option value="released">Released</option>
                    <option value="unreleased">Unreleased</option>
                  </select>
                </div>

                <select 
                  value={filterSimType}
                  onChange={(e) => setFilterSimType(e.target.value)}
                  className="w-full sm:w-auto bg-white border border-gray-200 text-gray-700 text-sm rounded-lg focus:ring-blue-500 block p-2 outline-none cursor-pointer"
                >
                  <option value="all">All SIM Types</option>
                  <option value="1_2">Type 1 to 2</option>
                  <option value="3_5">Type 3 to 5</option>
                </select>

                <select 
                  value={filterDataType}
                  onChange={(e) => setFilterDataType(e.target.value)}
                  className="w-full sm:w-auto bg-white border border-gray-200 text-gray-700 text-sm rounded-lg focus:ring-blue-500 block p-2 outline-none cursor-pointer"
                >
                  <option value="all">All Data</option>
                  <option value="unlimited">Unlimited Data</option>
                  <option value="fixed">Fixed Data</option>
                </select>

                <select 
                  value={filterFeatures}
                  onChange={(e) => setFilterFeatures(e.target.value)}
                  className="w-full sm:w-auto bg-white border border-gray-200 text-gray-700 text-sm rounded-lg focus:ring-blue-500 block p-2 outline-none cursor-pointer"
                >
                  <option value="all">All Features</option>
                  <option value="data_only">Data Only</option>
                  <option value="with_voice">Includes Voice</option>
                </select>

                <select 
                  value={filterValidity}
                  onChange={(e) => setFilterValidity(e.target.value)}
                  className="w-full sm:w-auto bg-white border border-gray-200 text-gray-700 text-sm rounded-lg focus:ring-blue-500 block p-2 outline-none cursor-pointer"
                >
                  <option value="all">All Durations</option>
                  <option value="short">1 - 7 Days</option>
                  <option value="medium">8 - 15 Days</option>
                  <option value="long">16 - 30 Days</option>
                  <option value="extended">31+ Days</option>
                </select>
              </div>

              <div className="h-6 w-px bg-gray-300 hidden lg:block mx-1"></div>

              {/* Sorts */}
              <div className="flex flex-wrap sm:flex-nowrap items-center gap-2 w-full lg:w-auto shrink-0">
                <ArrowUpDown className="h-4 w-4 text-gray-400 shrink-0" />
                
                <select 
                  value={sortPrice}
                  onChange={(e) => {
                    setSortPrice(e.target.value);
                    setSortValidity("default");
                  }}
                  className="w-full sm:w-auto bg-white border border-gray-200 text-gray-700 text-sm font-semibold rounded-lg focus:ring-blue-500 block p-2 outline-none cursor-pointer"
                >
                  <option value="default">Sort Price: Default</option>
                  <option value="asc">Price: Low to High</option>
                  <option value="desc">Price: High to Low</option>
                </select>

                <select 
                  value={sortValidity}
                  onChange={(e) => {
                    setSortValidity(e.target.value);
                    setSortPrice("default");
                  }}
                  className="w-full sm:w-auto bg-white border border-gray-200 text-gray-700 text-sm font-semibold rounded-lg focus:ring-blue-500 block p-2 outline-none cursor-pointer"
                >
                  <option value="default">Sort Validity: Default</option>
                  <option value="asc">Validity: Short to Long</option>
                  <option value="desc">Validity: Long to Short</option>
                </select>
              </div>

            </div>
          )}
          
        </div>

        {/* --- TABLE CONTAINER --- */}
        <div className="bg-white border border-gray-200 rounded-2xl shadow-sm overflow-hidden">
          
          {/* Header Action Bar */}
          <div className="p-5 bg-slate-50 border-b border-gray-200 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div className="flex items-center gap-2">
              <span className="text-sm font-semibold text-gray-600">
                Showing {processedPlans.length} plans for {countryCode}
              </span>
              {isRecommendationActive && (
                
                <span className="bg-amber-100 text-amber-800 text-xs px-2.5 py-0.5 rounded-full font-bold flex items-center gap-1">
                  <Award size={13} /> Algorithm Rank Mode (Beta)
                </span>
                
              )}
            </div>

            <div className="flex items-center gap-2 w-full sm:w-auto">
              {isRecommendationActive && (
  <div className="flex items-center gap-2 bg-amber-50 border border-amber-200 p-1.5 rounded-xl">
    {/* Multiplier Input Box */}
    <div className="flex items-center gap-1.5 pl-2">
      <span className="text-[11px] font-bold text-amber-900 uppercase">Rate:</span>
      <div className="relative flex items-center">
        <input
          type="number"
          step="0.1"
          min="1"
          max="10"
          value={autoReleaseMultiplier}
          onChange={(e) => setAutoReleaseMultiplier(e.target.value)}
          className="w-16 px-2 py-1.5 bg-white border border-amber-300 rounded-lg text-xs font-black text-center text-slate-900 outline-none focus:ring-2 focus:ring-amber-500 shadow-sm"
          placeholder="1.5"
        />
        <span className="text-xs font-bold text-amber-800 ml-1">x</span>
      </div>
    </div>

    {/* Auto-Release Button */}
    <button
      type="button"
      onClick={() => handleBulkReleaseTopPlans(true)}
      disabled={isSaving}
      className="bg-amber-500 text-white px-4 py-2 rounded-lg font-bold text-xs flex items-center justify-center gap-1.5 hover:bg-amber-600 active:scale-95 transition-all shadow-sm cursor-pointer disabled:opacity-50"
    >
      <CheckSquare size={15} />
      {isSaving ? "Releasing..." : `Auto-Release Top ${processedPlans.length} Plans`}
    </button>
  </div>
)}
              
              <button 
                onClick={handleBulkSave} 
                disabled={isSaving}
                className="flex-1 sm:flex-initial bg-[#077770] text-white px-6 py-2.5 rounded-xl font-bold flex items-center justify-center gap-2 hover:bg-[#065f59] disabled:opacity-50 transition-all shadow-sm shadow-teal-500/20 cursor-pointer"
              >
                <Save size={18} /> {isSaving ? "Saving..." : "Save All Changes"}
              </button>
            </div>
          </div>

          {loading ? (
            <div className="p-10 text-center text-gray-500 font-bold text-lg animate-pulse flex flex-col items-center">
              <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mb-3"></div>
              Loading catalog...
            </div>
          ) : error ? (
            <div className="p-10 text-center text-red-500 font-bold">{error}</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm text-gray-600 min-w-[1200px]">
                <thead className="bg-white border-b border-gray-200 text-slate-500 font-bold uppercase text-xs tracking-wider">
                  <tr>
                    <th className="px-4 py-4 w-10"></th>
                    <th className="px-4 py-4">Product Info</th>
                    <th className="px-4 py-4">Attributes</th>
                    {isRecommendationActive && (
                      <th className="px-4 py-4 bg-teal-50/70 text-[#077770] border-l border-teal-100">Algorithmic Fit</th>
                    )}
                    <th className="px-4 py-4 bg-gray-50 border-l border-gray-100">Base Price</th>
                    <th className="px-4 py-4 bg-orange-50 border-l border-orange-100 text-center">Released</th>
                    <th className="px-4 py-4 bg-orange-50 border-r border-orange-100 text-center">Multiplier</th>
                    <th className="px-4 py-4 bg-purple-50 text-purple-700">Delta Fee</th>
                    <th className="px-4 py-4 bg-blue-50 text-blue-700 text-right">Final Price</th>
                    <th className="px-4 py-4 bg-emerald-50 text-emerald-700 text-right">Profit Margin</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {processedPlans.map((plan, index) => {
                    
                    const editState = editedPlans[plan.productID] || {};
                    const isExpanded = expandedPlanId === plan.productID;
                    
                    // 🌟 Real-time Calculations
                    const basePrice = parseFloat(plan.productBasePrice || 0);
                    const multiplier = parseFloat(editState.custom_multiplier) || 0;
                    
                    const subtotal = basePrice * multiplier;
                    const calculatedDelta = Math.min(subtotal * 0.025, 4); // 2.5% capped at $4
                    
                    const finalPrice = subtotal > 0 ? (subtotal + calculatedDelta) : 0;
                    const profitMargin = subtotal > 0 ? (subtotal - basePrice) : 0;

                    const isTopDeal = isRecommendationActive && index === 0;
                    const isCostEffective = isRecommendationActive && index > 0 && index < 3;

                    return (
                      <React.Fragment key={plan.productID}>
                        {/* MAIN ROW */}
                        <tr className={`hover:bg-slate-50 transition-colors ${isExpanded ? 'bg-slate-50' : ''} ${isTopDeal ? 'bg-amber-50/30' : ''}`}>
                          
                          {/* Expand Icon */}
                          <td className="px-4 py-4">
                            <button 
                              onClick={() => setExpandedPlanId(isExpanded ? null : plan.productID)}
                              className="text-gray-400 hover:text-blue-600 bg-gray-100 hover:bg-blue-100 p-1.5 rounded-full transition-colors cursor-pointer"
                            >
                              {isExpanded ? <ChevronUp size={16}/> : <ChevronDown size={16}/>}
                            </button>
                          </td>

                          {/* Product Info with RED TYPE BADGE */}
                          <td className="px-4 py-4">
                            <div className="font-bold text-gray-900 mb-1 flex items-center flex-wrap gap-2">
                              {plan.productName}
                              <span className="text-[10px] font-extrabold tracking-wider text-red-700 bg-red-100 border border-red-200 px-2 py-0.5 rounded-md uppercase shrink-0">
                                Type {plan.productType}
                              </span>
                              {isTopDeal && (
                                <span className="text-[10px] font-extrabold tracking-wider text-amber-800 bg-amber-100 border border-amber-300 px-2 py-0.5 rounded-md uppercase shrink-0 flex items-center gap-1">
                                  <Award size={10} /> Rank #1 Best Deal
                                </span>
                              )}
                              {isCostEffective && (
                                <span className="text-[10px] font-extrabold tracking-wider text-blue-700 bg-blue-100 border border-blue-200 px-2 py-0.5 rounded-md uppercase shrink-0 flex items-center gap-1">
                                  <TrendingUp size={10} /> Rank #{index + 1}
                                </span>
                              )}
                            </div>
                            <div className="text-xs text-gray-500 font-mono bg-gray-100 inline-block px-2 py-0.5 rounded mt-1">{plan.productID}</div>
                          </td>

                          {/* Attributes */}
                          <td className="px-4 py-4 font-medium text-gray-700">
                            <span className={
                              plan.productDataType === "unlimited" ? "text-emerald-600 font-bold" : 
                              plan.productDataType === "daily" ? "text-blue-600 font-bold" : 
                              "text-orange-600 font-bold"
                            }>
                              {plan.productDataType === "unlimited" 
                                ? "Unlimited" 
                                : `${plan.productDataAllowance}${plan.dataAllowanceUnit} ${plan.productDataType === "daily" ? "Daily" : "Total"}`}
                            </span>
                            {' '} <br /> Validity: {plan.productValidityDays} Days<br />
                            
                            <span className="text-gray-500 text-xs">Voice:</span>{' '} 
                            {plan.productVoice === 'Yes' || plan.productVoiceMinutes > 0 ? `${plan.productVoiceMinutes} Mins` : 'None'}
                          </td>

                          {/* Algorithmic Fit / Match % Column (When active) */}
                          {isRecommendationActive && (
                            <td className="px-4 py-4 bg-teal-50/40 border-l border-teal-100">
                              <div className="flex items-center justify-between text-xs font-bold mb-1">
                                {/* <span className="text-teal-900">{plan.matchPercentage}% Fit</span> */}
                                <span className="text-[16px] font-bold text-brand font-mono">VFM: {plan.vfmScore.toFixed(3)}</span>
                              </div>
                              {/* <div className="w-full bg-teal-100 h-1.5 rounded-full overflow-hidden">
                                <div 
                                  className="bg-[#077770] h-full rounded-full" 
                                  style={{ width: `${plan.matchPercentage}%` }}
                                />
                              </div> */}
                              <span className="text-[16px] text-secondary font-bold block mt-1">
                                ${plan.dailyCost.toFixed(2)}/day
                              </span>
                            </td>
                          )}

                          {/* Base Price (Gray) */}
                          <td className="px-4 py-4 font-bold text-slate-500 bg-gray-50/50 border-l border-gray-100">
                            {plan.productCurrency} {basePrice.toFixed(2)}
                          </td>

                          {/* Released Checkbox (Orange) */}
                          <td className="px-4 py-4 bg-orange-50/30 border-l border-orange-100 text-center">
                            <label className="relative inline-flex items-center cursor-pointer">
                              <input 
                                type="checkbox" 
                                className="sr-only peer"
                                checked={editState.is_active || false}
                                onChange={(e) => handleEdit(plan.productID, "is_active", e.target.checked)}
                              />
                              <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#ec5b13]"></div>
                            </label>
                          </td>

                          {/* Multiplier Column (Orange) */}
                          <td className="px-4 py-4 text-center bg-orange-50/30 border-r border-orange-100">
                            <input 
                              type="number"
                              step="0.1"
                              min="1"
                              disabled={!editState.is_active}
                              value={editState.custom_multiplier}
                              onChange={(e) => handleEdit(plan.productID, "custom_multiplier", e.target.value)}
                              onBlur={(e) => {
                                const val = parseFloat(e.target.value);
                                if (isNaN(val) || val < 1) {
                                  handleEdit(plan.productID, "custom_multiplier", 1);
                                }
                              }}
                              placeholder="e.g. 1.5"
                              className="w-20 px-2 py-1.5 border border-orange-300 bg-white rounded-md text-center text-gray-900 font-bold focus:ring-2 focus:ring-orange-500 outline-none shadow-sm disabled:bg-slate-100 disabled:text-slate-400 disabled:border-slate-200 transition-all"
                            />
                          </td>

                          {/* Calculated Delta (Purple) */}
                          <td className="px-4 py-4 text-sm font-bold text-purple-700 bg-purple-50/30">
                            ${calculatedDelta.toFixed(2)}
                          </td>

                          {/* Final Price (Blue) */}
                          <td className="px-4 py-4 text-right font-extrabold text-blue-700 text-base bg-blue-50/30 border-l border-blue-100">
                            CAD {finalPrice.toFixed(2)}
                          </td>
                          
                          {/* Profit Margin (Green) */}
                          <td className="px-4 py-4 text-right font-extrabold text-emerald-600 text-base bg-emerald-50/30 border-l border-emerald-100">
                            CAD {profitMargin.toFixed(2)}
                          </td>

                        </tr>

                        {/* EXPANDED DETAILS ROW */}
                        {isExpanded && (
                          <tr>
                            <td colSpan={isRecommendationActive ? "10" : "9"} className="bg-slate-50 border-b border-gray-200 p-0">
                              <div className="px-10 py-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 animate-in fade-in slide-in-from-top-2 duration-200">
                                
                                <div>
                                  <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2 flex items-center gap-1"><Info size={14}/> Network Specs</h4>
                                  <ul className="space-y-1 text-sm text-gray-700 font-medium">
                                    <li><span className="text-gray-500">Operator:</span> {plan.operatorName || 'N/A'}</li>
                                    <li><span className="text-gray-500">Voice:</span> {plan.productVoice === 'Yes' || plan.productVoiceMinutes > 0 ? `${plan.productVoiceMinutes} Mins` : 'None'}</li>
                                    <li><span className="text-gray-500">SMS:</span> {plan.productSms === 'Yes' || plan.productSms > 0 ? `${plan.productSmsCount} SMS` : 'None'}</li>
                                  </ul>
                                </div>

                                <div>
                                  <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Plan Identifiers</h4>
                                  <ul className="space-y-1 text-sm text-gray-700 font-medium">
                                    <li><span className="text-gray-500">SKU:</span> {plan.productSku}</li>
                                    <li><span className="text-gray-500">Type ID:</span> {plan.productType}</li>
                                    <li><span className="text-gray-500">Local SIM:</span> {plan.local === 'true' ? `Yes (${plan.localCountry})` : 'No'}</li>
                                  </ul>
                                </div>

                                <div className="lg:col-span-2">
                                  <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Supported Destinations ({plan.destinations?.length || 0})</h4>
                                  <div className="flex flex-wrap gap-1.5">
                                    {plan.destinations && plan.destinations.map((dest, i) => (
                                      <span key={i} className="bg-white border border-gray-200 text-gray-600 text-xs px-2 py-1 rounded shadow-sm">
                                        {dest}
                                      </span>
                                    ))}
                                    {(!plan.destinations || plan.destinations.length === 0) && <span className="text-sm text-gray-500">No destinations listed.</span>}
                                  </div>
                                </div>
                                
                              </div>
                            </td>
                          </tr>
                        )}
                      </React.Fragment>
                    );
                  })}

                  {processedPlans.length === 0 && (
                    <tr>
                      <td colSpan={isRecommendationActive ? "10" : "9"} className="px-6 py-12 text-center text-gray-500 font-medium">
                        No plans found matching your search, filters, or algorithmic requirements.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}