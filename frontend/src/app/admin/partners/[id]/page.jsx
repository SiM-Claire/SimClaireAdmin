"use client";

import React, { useState, useEffect, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import { 
  ArrowLeft, Save, Globe, Search, ChevronDown, ChevronUp, 
  Check, Info, Tag, MapPin, Filter, ArrowUpDown, EyeOff // 🌟 Added EyeOff icon
} from "lucide-react";
import axios from "axios";

// 🌟 Import all destinations
import { allDestinations } from "@/data/destinationData";

export default function PartnerPlanManager() {
  const { id } = useParams();
  const router = useRouter();
  
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const dropdownRef = useRef(null);
  
  const [countryCode, setCountryCode] = useState(allDestinations[0]?.destinationID || ""); 
  const [data, setData] = useState(null);
  const [editedPlans, setEditedPlans] = useState({});
  const [isSaving, setIsSaving] = useState(false);

  const [expandedRowId, setExpandedRowId] = useState(null);

  // ==========================================
  // 🌟 FILTER & SORT STATES
  // ==========================================
  const [planSearchQuery, setPlanSearchQuery] = useState("");
  const [filterStatus, setFilterStatus] = useState("all");
  const [filterSimType, setFilterSimType] = useState("all");
  const [filterData, setFilterData] = useState("all");
  const [filterFeatures, setFilterFeatures] = useState("all");
  const [filterDurations, setFilterDurations] = useState("all");
  const [sortPrice, setSortPrice] = useState("default");
  const [sortValidity, setSortValidity] = useState("default");

  const [globalMultiplier, setGlobalMultiplier] = useState("1.5");

  // --- API Fetchers ---
  const fetchCountryPlans = async () => {
    if (!countryCode) return;
    try {
      const adminToken = localStorage.getItem("adminToken");
      const res = await axios.get(`${process.env.NEXT_PUBLIC_API_URL}/admin/partners/${id}/plans/${countryCode}`, {
        headers: { Authorization: `Bearer ${adminToken}` }
      });
      
      if (res.data.status === 200) {
        setData(res.data.data);
        console.log(res.data.data)
        const initialEdits = {};
        res.data.data.plans.forEach(p => {
          initialEdits[p.plan_id] = {
            plan_id: p.plan_id,
            is_released: p.partner_release_status || false,
            partner_multiplier: p.partner_multiplier || "",
          };
        });
        setEditedPlans(initialEdits);
      }
    } catch (err) {
      console.error("Failed to fetch plans", err);
    }
  };

  // --- Lifecycles & Listeners ---
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    fetchCountryPlans();
    setExpandedRowId(null); 
  }, [countryCode]);

  // --- Handlers ---
  const handleEdit = (planId, field, value) => {
    setEditedPlans(prev => ({
      ...prev,
      [planId]: {
        ...prev[planId],
        [field]: value
      }
    }));
  };

  const toggleRow = (planId) => {
    setExpandedRowId(expandedRowId === planId ? null : planId);
  };

  const handleBulkSave = async () => {
    setIsSaving(true);
    const plansArray = Object.values(editedPlans).map(p => ({
      plan_id: p.plan_id,
      is_released: p.is_released,
      partner_multiplier: p.is_released ? parseFloat(p.partner_multiplier) : null
    }));

    try {
      const adminToken = localStorage.getItem("adminToken");
      const res = await axios.post(`${process.env.NEXT_PUBLIC_API_URL}/admin/partners/${id}/plans/${countryCode}`, 
        { plans: plansArray }, 
        { headers: { Authorization: `Bearer ${adminToken}` } }
      );
      
      if (res.data.status === 200) {
        alert("Pricing updated successfully!");
        fetchCountryPlans(); 
      } else {
        alert("Error: " + res.data.message);
      }
    } catch (err) {
      const errorMessage = err.response?.data?.message || "Failed to save updates.";
      alert(errorMessage);
    } finally {
      setIsSaving(false);
    }
  };


  // ==========================================
  // 🌟 PROCESSED PLANS (FILTERED & SORTED)
  // ==========================================
  const processedPlans = (data?.plans || [])
    .filter(p => {
      const editState = editedPlans[p.plan_id] || {};
      const raw = p.raw_plan || {};

      const matchesSearch = (p.plan_name || "").toLowerCase().includes(planSearchQuery.toLowerCase()) || 
                            (p.plan_id || "").toLowerCase().includes(planSearchQuery.toLowerCase());
      
      let matchesStatus = true;
      if (filterStatus === "released") matchesStatus = editState.is_released === true;
      if (filterStatus === "hidden") matchesStatus = editState.is_released === false;

      let matchesData = true;
      const dataType = (raw.productDataType || "").toLowerCase();
      if (filterData === "unlimited") matchesData = dataType === "unlimited";
      if (filterData === "fixed") matchesData = dataType !== "unlimited";

      let matchesFeatures = true;
      const hasVoice = raw.productVoice === 'YES' || parseInt(raw.productVoiceMinutes || 0) > 0;
      if (filterFeatures === "data_only") matchesFeatures = !hasVoice;
      if (filterFeatures === "with_voice") matchesFeatures = hasVoice;

      let matchesValidity = true;
      const days = parseInt(p.validity_days || 0, 10);
      if (filterDurations === "short") matchesValidity = days >= 1 && days <= 7;
      if (filterDurations === "medium") matchesValidity = days >= 8 && days <= 15;
      if (filterDurations === "long") matchesValidity = days >= 16 && days <= 30;
      if (filterDurations === "extended") matchesValidity = days > 30;

      let matchesSimType = true;
      const typeNum = parseInt(raw.productType || 0, 10);
      if (filterSimType === "1_2") matchesSimType = typeNum >= 1 && typeNum <= 2;
      if (filterSimType === "3_5") matchesSimType = typeNum >= 3 && typeNum <= 5;

      return matchesSearch && matchesStatus && matchesData && matchesFeatures && matchesValidity && matchesSimType;
    })
    .sort((a, b) => {
      if (sortPrice === "default" && sortValidity === "default") return 0;

      const editStateA = editedPlans[a.plan_id] || {};
      const editStateB = editedPlans[b.plan_id] || {};
      const multA = parseFloat(editStateA.partner_multiplier) || 0;
      const multB = parseFloat(editStateB.partner_multiplier) || 0;
      
      const priceA = parseFloat(a.base_price || 0) * multA;
      const priceB = parseFloat(b.base_price || 0) * multB;

      const valA = parseInt(a.validity_days || 0);
      const valB = parseInt(b.validity_days || 0);

      if (sortPrice !== "default") {
        if (priceA !== priceB) return sortPrice === "asc" ? priceA - priceB : priceB - priceA;
      }
      
      if (sortValidity !== "default") {
        if (valA !== valB) return sortValidity === "asc" ? valA - valB : valB - valA;
      }

      return 0;
    });

  const handleApplyGlobalMultiplier = () => {
    const parsed = parseFloat(globalMultiplier);
    
    if (isNaN(parsed) || parsed < 1) {
      alert("Please enter a valid multiplier (1.0 or greater).");
      return;
    }

    if (processedPlans.length === 0) return;

    const confirmMessage = `Are you sure you want to release all ${processedPlans.length} currently visible plans with a multiplier of ${parsed}x?`;
    if (!window.confirm(confirmMessage)) return;

    setEditedPlans(prev => {
      const nextState = { ...prev };
      
      processedPlans.forEach(p => {
        nextState[p.plan_id] = {
          ...nextState[p.plan_id],
          is_released: true,
          partner_multiplier: parsed
        };
      });
      
      return nextState;
    });
  };

  // 🌟 NEW: Handle hiding all currently visible plans
  const handleHideAllVisible = () => {
    if (processedPlans.length === 0) return;

    const confirmMessage = `Are you sure you want to hide (unrelease) all ${processedPlans.length} currently visible plans?`;
    if (!window.confirm(confirmMessage)) return;

    setEditedPlans(prev => {
      const nextState = { ...prev };
      
      processedPlans.forEach(p => {
        nextState[p.plan_id] = {
          ...nextState[p.plan_id],
          is_released: false
        };
      });
      
      return nextState;
    });
  };

  const filteredDestinations = allDestinations.filter(dest =>
    dest.destinationName.toLowerCase().includes(searchQuery.toLowerCase()) ||
    dest.isoCode.toLowerCase().includes(searchQuery.toLowerCase())
  );
  
  const selectedDestination = allDestinations.find(d => d.destinationID === countryCode);

  return (
    <div className="p-6">
      <button onClick={() => router.back()} className="flex items-center gap-2 text-slate-500 hover:text-slate-800 mb-6 font-semibold transition-colors">
        <ArrowLeft size={16}/> Back to Partners
      </button>

      <div className="flex flex-col md:flex-row justify-between items-start md:items-end mb-8 gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Manage Partner Pricing</h1>
          {data && <p className="text-slate-500">Editing catalog for: <strong className="text-[#077770] text-lg">{data.partner.partner_name}</strong></p>}
        </div>

        <div className="flex items-center gap-3 bg-white p-2 rounded-xl border border-slate-200 shadow-sm relative" ref={dropdownRef}>
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
            <div className="absolute top-[110%] right-0 w-[280px] bg-white border border-slate-200 rounded-xl shadow-xl z-50 overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200">
              <div className="p-2 border-b border-slate-100 bg-slate-50 flex items-center gap-2">
                <Search size={16} className="text-slate-400 ml-2 shrink-0" />
                <input
                  type="text" placeholder="Search country or code..." value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
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
                        setSearchQuery(""); 
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
                    No destinations found matching "{searchQuery}"
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {data && (
        <>
          <div className="bg-slate-50 rounded-xl border border-slate-200 p-3 mb-6 flex flex-col xl:flex-row items-center justify-between gap-4">
            <div className="flex flex-wrap items-center gap-3 w-full xl:w-auto flex-1">
              <div className="relative bg-white border border-slate-200 rounded-lg overflow-hidden flex-1 min-w-[200px] max-w-[300px]">
                <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input 
                  type="text" 
                  placeholder="Search Plan Name/ID..." 
                  value={planSearchQuery}
                  onChange={e => setPlanSearchQuery(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 text-sm outline-none font-medium text-slate-700 placeholder:text-slate-400"
                />
              </div>

              <div className="w-px h-8 bg-slate-200 hidden sm:block mx-1"></div>
              <Filter size={16} className="text-slate-400 hidden sm:block"/>

              <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)} className="bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm font-medium text-slate-700 outline-none cursor-pointer hover:border-slate-300 transition-colors">
                <option value="all">All Status</option>
                <option value="released">Released Only</option>
                <option value="hidden">Hidden Only</option>
              </select>

              <select value={filterSimType} onChange={e => setFilterSimType(e.target.value)} className="bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm font-medium text-slate-700 outline-none cursor-pointer hover:border-slate-300 transition-colors">
                <option value="all">All SIM Types</option>
                <option value="1_2">Type 1-2</option>
                <option value="3_5">Type 3-5 (KYC)</option>
              </select>

              <select value={filterData} onChange={e => setFilterData(e.target.value)} className="bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm font-medium text-slate-700 outline-none cursor-pointer hover:border-slate-300 transition-colors">
                <option value="all">All Data</option>
                <option value="fixed">Fixed Data</option>
                <option value="unlimited">Unlimited Data</option>
              </select>

              <select value={filterFeatures} onChange={e => setFilterFeatures(e.target.value)} className="bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm font-medium text-slate-700 outline-none cursor-pointer hover:border-slate-300 transition-colors">
                <option value="all">All Features</option>
                <option value="data_only">Data Only</option>
                <option value="with_voice">With Voice/SMS</option>
              </select>

              <select value={filterDurations} onChange={e => setFilterDurations(e.target.value)} className="bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm font-medium text-slate-700 outline-none cursor-pointer hover:border-slate-300 transition-colors">
                <option value="all">All Durations</option>
                <option value="short">Short (1-7 Days)</option>
                <option value="medium">Medium (8-15 Days)</option>
                <option value="long">Long (16-30 Days)</option>
                <option value="extended">Extended (30+ Days)</option>
              </select>
            </div>

            <div className="flex items-center gap-3 w-full xl:w-auto xl:border-l xl:border-slate-200 xl:pl-4">
              <ArrowUpDown size={16} className="text-slate-400 hidden sm:block"/>
              <select value={sortPrice} onChange={e => setSortPrice(e.target.value)} className="bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm font-medium text-slate-700 outline-none cursor-pointer hover:border-slate-300 transition-colors flex-1 sm:flex-none">
                <option value="default">Sort Price: Default</option>
                <option value="asc">Price: Low to High</option>
                <option value="desc">Price: High to Low</option>
              </select>
              <select value={sortValidity} onChange={e => setSortValidity(e.target.value)} className="bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm font-medium text-slate-700 outline-none cursor-pointer hover:border-slate-300 transition-colors flex-1 sm:flex-none">
                <option value="default">Sort Validity: Default</option>
                <option value="asc">Validity: Short to Long</option>
                <option value="desc">Validity: Long to Short</option>
              </select>
            </div>
          </div>


          <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
            <div className="p-5 bg-slate-50 border-b border-slate-200 flex flex-col xl:flex-row justify-between items-start xl:items-center gap-4">
              <span className="text-sm font-semibold text-slate-600">Showing {processedPlans.length} plans for {countryCode}</span>
              
              <div className="flex flex-wrap items-center gap-3 w-full xl:w-auto">
                
                {/* 🌟 NEW: Hide All Visible Button */}
                <button 
                  onClick={handleHideAllVisible}
                  disabled={processedPlans.length === 0}
                  className="bg-white text-rose-600 border border-rose-200 px-4 h-10 rounded-xl text-sm font-bold flex items-center gap-2 hover:bg-rose-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  <EyeOff size={16} /> Hide All
                </button>

                <div className="flex items-center bg-white border border-slate-200 rounded-xl overflow-hidden h-10 shadow-sm w-full md:w-auto">
                  <span className="px-3 text-xs font-bold text-slate-500 bg-slate-100 border-r border-slate-200 h-full flex items-center">
                    GLOBAL MULTIPLIER
                  </span>
                  <input 
                    type="number" 
                    step="0.1" 
                    min="1"
                    value={globalMultiplier}
                    onChange={(e) => setGlobalMultiplier(e.target.value)}
                    className="w-20 px-3 py-2 text-sm font-bold text-slate-800 outline-none"
                    placeholder="1.0"
                  />
                  <button 
                    onClick={handleApplyGlobalMultiplier}
                    disabled={processedPlans.length === 0}
                    className="bg-indigo-600 text-white px-4 h-full text-sm font-bold hover:bg-indigo-700 disabled:bg-slate-300 disabled:cursor-not-allowed transition-colors"
                  >
                    Apply to List
                  </button>
                </div>

                <button 
                  onClick={handleBulkSave} disabled={isSaving}
                  className="bg-[#077770] text-white px-6 py-2 rounded-xl font-bold flex items-center justify-center gap-2 hover:bg-[#065f59] disabled:opacity-50 transition-all shadow-sm shadow-teal-500/20 h-10 w-full md:w-auto"
                >
                  <Save size={18} /> {isSaving ? "Saving..." : "Save All Changes"}
                </button>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse min-w-[1000px]">
                <thead className="bg-white border-b border-slate-200 text-slate-500 text-xs uppercase tracking-wider font-bold">
                  <tr>
                    <th className="p-4 w-12 text-center"></th>
                    <th className="p-4">Plan Name</th>
                    <th className="p-4">Data & Val.</th>
                    <th className="p-4 text-center">Public Status</th>
                    <th className="p-4 bg-gray-50 border-l border-gray-200">Base Price</th>
                    <th className="p-4 bg-orange-50 border-l border-orange-100 text-center">Released</th>
                    <th className="p-4 bg-orange-50 border-r border-orange-100">Multiplier</th>
                    <th className="p-4 bg-purple-50 text-purple-700">Delta Fee</th>
                    <th className="p-4 bg-blue-50 text-blue-700">Final Price</th>
                    <th className="p-4 bg-emerald-50 text-emerald-700">Your Profit</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {processedPlans.length === 0 ? (
                    <tr>
                      <td colSpan="10" className="p-8 text-center text-slate-500 font-medium">
                        No plans match your current filters.
                      </td>
                    </tr>
                  ) : (
                    processedPlans.map(p => {
                      const editState = editedPlans[p.plan_id] || {};
                      const isExpanded = expandedRowId === p.plan_id;
                      
                      const basePrice = parseFloat(p.base_price) || 0;
                      const multiplier = parseFloat(editState.partner_multiplier) || 0;
                      const subtotal = basePrice * multiplier;
                      const calculatedDelta = Math.min(subtotal * 0.025, 4); 
                      const finalPrice = subtotal > 0 ? (subtotal + calculatedDelta) : 0;
                      const profit = subtotal > 0 ? (subtotal - basePrice) : 0;

                      const raw = p.raw_plan || {};
                      const dataTypeStr = raw.productDataType === "daily" ? "Daily" : "Total";
                      const voiceStr = raw.productVoice === "YES" ? `${raw.productVoiceMinutes} Mins` : "None";
                      const smsStr = raw.productSms === "YES" ? `${raw.productSmsCount} Texts` : "None";
                      const localStr = raw.local === "true" ? `Yes (${raw.localCountry})` : "No";

                      return (
                        <React.Fragment key={p.plan_id}>
                          <tr className={`hover:bg-slate-50 transition-colors ${isExpanded ? 'bg-slate-50' : ''}`}>
                            <td className="p-4 text-center">
                              <button 
                                onClick={() => toggleRow(p.plan_id)}
                                className="p-1.5 rounded-full bg-white border border-slate-200 text-slate-500 hover:bg-slate-100 hover:text-slate-800 transition-colors shadow-sm"
                              >
                                {isExpanded ? <ChevronUp size={16}/> : <ChevronDown size={16}/>}
                              </button>
                            </td>
                            <td className="p-4">
                              <p className="font-extrabold text-slate-800 flex items-center gap-2">
                                {p.plan_name} 
                                {raw.productType && (
                                  <span 
                                    className={`text-[9px] font-bold px-1.5 py-0.5 rounded tracking-wider border ${
                                      parseInt(raw.productType) > 2 
                                        ? "text-red-600 bg-red-50 border-red-100" 
                                        : "text-slate-600 bg-slate-100 border-slate-200"
                                    }`}
                                  >
                                    TYPE {raw.productType}
                                  </span>
                                )}
                              </p>
                              <p className="text-xs text-slate-400 font-mono mt-0.5">{p.plan_id}</p>
                            </td>
                            <td className="p-4 text-sm font-medium">
                              <p className="text-blue-600 font-bold">{p.data} {p.data_unit} {dataTypeStr}</p>
                              <p className="text-slate-500 text-xs mt-0.5">Validity: {p.validity_days} Days</p>
                            </td>
                            <td className="p-4 text-center">
                              {p.public_release_status ? (
                                <span className="text-[11px] bg-green-100 text-green-700 px-2.5 py-1 rounded-md font-bold">Live (x{p.public_multiplier})</span>
                              ) : (
                                <span className="text-[11px] bg-slate-100 text-slate-500 px-2.5 py-1 rounded-md font-bold">Hidden</span>
                              )}
                            </td>
                            
                            <td className="p-4 text-sm font-bold text-slate-500 bg-gray-50/50 border-l border-gray-100">
                              ${basePrice.toFixed(2)}
                            </td>

                            <td className="p-4 bg-orange-50/30 border-l border-orange-100 text-center">
                              <label className="relative inline-flex items-center cursor-pointer">
                                <input 
                                  type="checkbox" className="sr-only peer" checked={editState.is_released}
                                  onChange={(e) => handleEdit(p.plan_id, "is_released", e.target.checked)}
                                />
                                <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#ec5b13]"></div>
                              </label>
                            </td>
                            
                            <td className="p-4 bg-orange-50/30 border-r border-orange-100">
                              <input 
                                type="number" step="0.1" min="1" max="10"
                                required={editState.is_released} disabled={!editState.is_released}
                                className="w-24 border border-orange-200 bg-white rounded-lg px-3 py-1.5 text-sm font-bold text-slate-800 disabled:bg-slate-100 disabled:text-slate-400 disabled:border-slate-200 focus:border-[#ec5b13] focus:ring-1 focus:ring-[#ec5b13] outline-none transition-all"
                                value={editState.partner_multiplier}
                                onChange={(e) => handleEdit(p.plan_id, "partner_multiplier", e.target.value)}
                                onBlur={(e) => {
                                  const val = parseFloat(e.target.value);
                                  if (isNaN(val) || val < 1) handleEdit(p.plan_id, "partner_multiplier", 1);
                                }}
                              />
                            </td>

                            <td className="p-4 text-sm font-bold text-purple-700 bg-purple-50/30">${calculatedDelta.toFixed(2)}</td>
                            <td className="p-4 text-sm font-extrabold text-blue-700 bg-blue-50/30">${finalPrice.toFixed(2)}</td>
                            <td className="p-4 text-sm font-extrabold text-emerald-600 bg-emerald-50/30">${profit.toFixed(2)}</td>
                          </tr>

                          {isExpanded && (
                            <tr>
                              <td colSpan="10" className="p-0 border-b border-slate-100 bg-slate-50/80">
                                <div className="px-8 py-6 animate-in slide-in-from-top-2 duration-200">
                                  <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                                    
                                    <div className="space-y-4">
                                      <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                                        <Info size={14}/> Network Specs
                                      </h4>
                                      <div className="bg-white border border-slate-200 rounded-xl p-4 space-y-3 shadow-sm">
                                        <div className="flex justify-between items-center text-sm">
                                          <span className="text-slate-500 font-medium">Operator:</span>
                                          <span className="font-bold text-slate-800">{raw.operatorName || 'N/A'}</span>
                                        </div>
                                        <div className="flex justify-between items-center text-sm">
                                          <span className="text-slate-500 font-medium">Voice:</span>
                                          <span className="font-bold text-slate-800">{voiceStr}</span>
                                        </div>
                                        <div className="flex justify-between items-center text-sm">
                                          <span className="text-slate-500 font-medium">SMS:</span>
                                          <span className="font-bold text-slate-800">{smsStr}</span>
                                        </div>
                                      </div>
                                    </div>

                                    <div className="space-y-4">
                                      <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                                        <Tag size={14}/> Plan Identifiers
                                      </h4>
                                      <div className="bg-white border border-slate-200 rounded-xl p-4 space-y-3 shadow-sm">
                                        <div className="flex justify-between items-center text-sm">
                                          <span className="text-slate-500 font-medium">SKU:</span>
                                          <span className="font-mono font-bold text-slate-800">{raw.productSku || 'N/A'}</span>
                                        </div>
                                        <div className="flex justify-between items-center text-sm">
                                          <span className="text-slate-500 font-medium">Type ID:</span>
                                          <span className="font-bold text-slate-800">{raw.productType || 'N/A'}</span>
                                        </div>
                                        <div className="flex justify-between items-center text-sm">
                                          <span className="text-slate-500 font-medium">Local SIM:</span>
                                          <span className="font-bold text-slate-800">{localStr}</span>
                                        </div>
                                      </div>
                                    </div>

                                    <div className="space-y-4 lg:col-span-1">
                                      <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                                        <MapPin size={14}/> Supported Destinations ({raw.destinations?.length || 0})
                                      </h4>
                                      <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm max-h-[160px] overflow-y-auto custom-scrollbar">
                                        <div className="flex flex-wrap gap-2">
                                          {raw.destinations && raw.destinations.length > 0 ? (
                                            raw.destinations.map((d, i) => (
                                              <span key={i} className="px-2.5 py-1 bg-slate-50 border border-slate-200 rounded text-xs font-medium text-slate-600">
                                                {d}
                                              </span>
                                            ))
                                          ) : (
                                            <span className="text-sm text-slate-400 italic">No destinations listed.</span>
                                          )}
                                        </div>
                                      </div>
                                    </div>

                                  </div>
                                </div>
                              </td>
                            </tr>
                          )}
                        </React.Fragment>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
