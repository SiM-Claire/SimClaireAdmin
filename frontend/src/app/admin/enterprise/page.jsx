"use client";

import { useState, useEffect } from "react";
import axios from "axios";
import { 
  Building2, Search, Filter, Calendar, Mail, 
  CheckCircle2, Archive, Eye, X, Briefcase, Globe2, AlertCircle
} from "lucide-react";

// Helper to format dates cleanly
const formatDate = (dateString) => {
  if (!dateString) return "N/A";
  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric'
  }).format(new Date(dateString));
};

export default function EnterpriseAdminCMS() {
  const [leads, setLeads] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // 🌟 Backend-driven Filters
  const [statusFilter, setStatusFilter] = useState("all"); // 'all', 'active', 'inactive'
  const [timeFilter, setTimeFilter] = useState("all"); // 'all', 'thisMonth', 'last30days', 'custom'
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  
  // Client-side Search (for quickly finding a specific name/company in the fetched list)
  const [searchTerm, setSearchTerm] = useState("");

  // Modal State
  const [selectedLead, setSelectedLead] = useState(null);
  const [isUpdating, setIsUpdating] = useState(false);

  // 🌟 Fetch Leads with Dynamic Query Strings
  const fetchLeads = async () => {
    setLoading(true);
    setError("");
    
    try {
      // Build the query string based on selected filters
      let query = `?status=${statusFilter}`;
      
      if (timeFilter !== "all" && timeFilter !== "custom") {
        query += `&time_segment=${timeFilter}`;
      } else if (timeFilter === "custom" && fromDate && toDate) {
        query += `&from_date=${fromDate}&to_date=${toDate}`;
      }

      const res = await axios.get(`${process.env.NEXT_PUBLIC_API_URL}/b2b/leads${query}`, {
        withCredentials: true
      });
      
      // Assume data is nested in standard REST format (e.g., res.data.data)
      setLeads(res.data.data || res.data || []);
    } catch (err) {
      console.error("Failed to fetch enterprise leads:", err);
      setError("Failed to load leads. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  // Re-fetch whenever filters change
  useEffect(() => {
    // Only fetch for 'custom' if both dates are selected, otherwise wait
    if (timeFilter === "custom" && (!fromDate || !toDate)) return;
    
    fetchLeads();
  }, [statusFilter, timeFilter, fromDate, toDate]);

  // 🌟 PATCH Request to Toggle Lead Status
  const handleToggleStatus = async (id, currentStatus) => {
    if (!window.confirm(`Are you sure you want to mark this lead as ${currentStatus ? 'Inactive/Archived' : 'Active'}?`)) return;
    
    setIsUpdating(true);
    try {
      await axios.patch(`${process.env.NEXT_PUBLIC_API_URL}/b2b/leads/${id}`, 
        { is_active: !currentStatus }, 
        { withCredentials: true }
      );
      
      // Update local state instantly without full refresh
      setLeads(prevLeads => prevLeads.map(lead => 
        lead.id === id ? { ...lead, is_active: !currentStatus } : lead
      ));
      
      // If modal is open for this lead, update it too
      if (selectedLead && selectedLead.id === id) {
        setSelectedLead({ ...selectedLead, is_active: !currentStatus });
      }
    } catch (err) {
      alert("Failed to update lead status.");
    } finally {
      setIsUpdating(false);
    }
  };

  // Client-side search filtering
  const filteredLeads = leads.filter(lead => {
    const searchLower = searchTerm.toLowerCase();
    return (
      (lead.full_name && lead.full_name.toLowerCase().includes(searchLower)) ||
      (lead.company && lead.company.toLowerCase().includes(searchLower)) ||
      (lead.email && lead.email.toLowerCase().includes(searchLower))
    );
  });

  return (
    <div className="p-6 lg:p-10 max-w-7xl mx-auto font-sans pb-24">
      
      {/* Header & Description */}
      <div className="mb-8">
        <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">Enterprise Leads</h1>
        <p className="text-slate-500 mt-1 font-medium">Manage B2B inquiries, review requirements, and track enterprise deals.</p>
      </div>

      {/* 🌟 FILTER CONTROL BAR */}
      <div className="bg-white rounded-[1.5rem] p-5 shadow-sm border border-slate-200 mb-8 flex flex-col lg:flex-row gap-4 items-start lg:items-center justify-between">
        
        {/* Search */}
        <div className="relative w-full lg:w-72 shrink-0">
          <Search size={18} className="absolute left-4 top-3 text-slate-400" />
          <input 
            type="text" 
            placeholder="Search name, company, email..." 
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-11 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium outline-none focus:border-brand focus:ring-1 focus:ring-brand transition-all"
          />
        </div>

        {/* Backend Filters */}
        <div className="flex flex-wrap items-center gap-3 w-full lg:w-auto">
          
          <div className="flex items-center bg-slate-50 border border-slate-200 rounded-xl px-2 py-1 gap-1">
            <Filter size={14} className="text-slate-400 ml-2" />
            <select 
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="bg-transparent text-sm font-bold text-slate-700 py-1.5 px-2 outline-none cursor-pointer appearance-none"
            >
              <option value="all">All Statuses</option>
              <option value="active">Active Leads</option>
              <option value="inactive">Archived Leads</option>
            </select>
          </div>

          <div className="flex items-center bg-slate-50 border border-slate-200 rounded-xl px-2 py-1 gap-1">
            <Calendar size={14} className="text-slate-400 ml-2" />
            <select 
              value={timeFilter}
              onChange={(e) => {
                setTimeFilter(e.target.value);
                if (e.target.value !== 'custom') {
                  setFromDate(""); setToDate("");
                }
              }}
              className="bg-transparent text-sm font-bold text-slate-700 py-1.5 px-2 outline-none cursor-pointer appearance-none"
            >
              <option value="all">All Time</option>
              <option value="thisMonth">This Month</option>
              <option value="last30days">Last 30 Days</option>
              <option value="custom">Custom Date Range</option>
            </select>
          </div>

          {/* Custom Date Pickers show only if timeFilter is 'custom' */}
          {timeFilter === "custom" && (
            <div className="flex items-center gap-2 animate-in fade-in slide-in-from-right-4 duration-300">
              <input 
                type="date" 
                value={fromDate}
                onChange={(e) => setFromDate(e.target.value)}
                className="bg-slate-50 border border-slate-200 text-sm font-medium rounded-xl px-3 py-2 outline-none focus:border-brand"
              />
              <span className="text-slate-400 text-sm font-bold">to</span>
              <input 
                type="date" 
                value={toDate}
                onChange={(e) => setToDate(e.target.value)}
                className="bg-slate-50 border border-slate-200 text-sm font-medium rounded-xl px-3 py-2 outline-none focus:border-brand"
              />
            </div>
          )}

        </div>
      </div>

      {/* 🌟 DATA TABLE */}
      <div className="bg-white rounded-[2rem] shadow-sm border border-slate-200 overflow-hidden">
        
        {loading ? (
          <div className="flex flex-col items-center justify-center py-20">
             <div className="w-10 h-10 border-4 border-brand border-t-transparent rounded-full animate-spin mb-4"></div>
             <p className="text-slate-500 font-bold">Fetching leads...</p>
          </div>
        ) : error ? (
          <div className="p-10 text-center text-red-500 font-bold bg-red-50 m-6 rounded-2xl border border-red-100">{error}</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-100 text-xs uppercase tracking-widest text-slate-400 font-extrabold">
                  <th className="p-5 pl-6">Contact</th>
                  <th className="p-5">Company Details</th>
                  <th className="p-5">Scale</th>
                  <th className="p-5">Date</th>
                  <th className="p-5 text-center">Status</th>
                  <th className="p-5 text-right pr-6">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-sm">
                {filteredLeads.length === 0 ? (
                  <tr>
                    <td colSpan="6" className="p-12 text-center">
                      <div className="flex flex-col items-center justify-center text-slate-400">
                        <Archive size={40} className="mb-3 opacity-20" />
                        <p className="font-bold text-lg text-slate-600">No leads found</p>
                        <p className="font-medium">Try adjusting your search or filters.</p>
                      </div>
                    </td>
                  </tr>
                ) : (
                  filteredLeads.map((lead) => (
                    <tr 
                      key={lead.id} 
                      className={`transition-all duration-200 hover:bg-slate-50 group ${!lead.is_active ? 'opacity-60 bg-slate-50/50' : ''}`}
                    >
                      {/* Contact Info */}
                      <td className="p-5 pl-6">
                        <div className="flex items-center gap-3">
                          <div className={`w-10 h-10 rounded-full flex items-center justify-center font-extrabold shrink-0 ${lead.is_active ? 'bg-brand/10 text-brand' : 'bg-slate-200 text-slate-500'}`}>
                            {lead.full_name?.charAt(0) || "U"}
                          </div>
                          <div className="min-w-0">
                            <p className="font-extrabold text-slate-900 truncate text-base">{lead.full_name}</p>
                            <a href={`mailto:${lead.email}`} className="text-xs font-bold text-brand hover:underline flex items-center gap-1 mt-0.5 truncate">
                              <Mail size={12} /> {lead.email}
                            </a>
                          </div>
                        </div>
                      </td>

                      {/* Company Info */}
                      <td className="p-5">
                        <p className="font-bold text-slate-800 flex items-center gap-1.5 truncate">
                          <Building2 size={14} className="text-slate-400" /> {lead.company || "Not Provided"}
                        </p>
                        <p className="text-xs font-bold text-slate-500 mt-1 capitalize">
                          {lead.industry || "General"}
                        </p>
                      </td>

                      {/* Scale / Units */}
                      <td className="p-5">
                        <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-blue-50 text-blue-700 rounded-lg text-xs font-extrabold border border-blue-100">
                          <Briefcase size={12} /> {lead.units_range || "Unspecified"}
                        </span>
                      </td>

                      {/* Date */}
                      <td className="p-5">
                        <p className="font-bold text-slate-600">{formatDate(lead.created_at)}</p>
                      </td>

                      {/* Status */}
                      <td className="p-5 text-center">
                        {lead.is_active ? (
                          <span className="inline-flex items-center justify-center gap-1 text-emerald-700 bg-emerald-100 px-3 py-1.5 rounded-full text-[10px] font-extrabold uppercase tracking-wider border border-emerald-200 w-full max-w-[90px]">
                            <CheckCircle2 size={12} /> Active
                          </span>
                        ) : (
                          <span className="inline-flex items-center justify-center gap-1 text-slate-500 bg-slate-200 px-3 py-1.5 rounded-full text-[10px] font-extrabold uppercase tracking-wider border border-slate-300 w-full max-w-[90px]">
                            <Archive size={12} /> Archived
                          </span>
                        )}
                      </td>

                      {/* Actions */}
                      <td className="p-5 pr-6 text-right">
                        <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                          
                          <button 
                            onClick={() => setSelectedLead(lead)}
                            className="p-2 bg-white border border-slate-200 text-slate-600 hover:text-brand hover:border-brand rounded-xl transition-all shadow-sm tooltip-trigger cursor-pointer"
                            title="View Requirements"
                          >
                            <Eye size={18} />
                          </button>

                          <button 
                            onClick={() => handleToggleStatus(lead.id, lead.is_active)}
                            disabled={isUpdating}
                            className={`p-2 bg-white border border-slate-200 rounded-xl transition-all shadow-sm cursor-pointer disabled:opacity-50 ${lead.is_active ? 'text-red-500 hover:bg-red-50 hover:border-red-200' : 'text-emerald-600 hover:bg-emerald-50 hover:border-emerald-200'}`}
                            title={lead.is_active ? "Archive Lead" : "Restore Lead"}
                          >
                            {lead.is_active ? <Archive size={18} /> : <CheckCircle2 size={18} />}
                          </button>

                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* 🌟 MODAL: Detailed Lead View */}
      {selectedLead && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white rounded-[2rem] w-full max-w-3xl max-h-[90vh] overflow-y-auto shadow-2xl animate-in zoom-in-95 duration-200 flex flex-col">
            
            {/* Modal Header */}
            <div className="sticky top-0 z-10 bg-white border-b border-slate-100 p-6 flex justify-between items-center">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-brand/10 rounded-full flex items-center justify-center text-brand font-extrabold text-xl">
                  {selectedLead.full_name?.charAt(0)}
                </div>
                <div>
                  <h2 className="text-2xl font-extrabold text-slate-900 leading-tight">
                    {selectedLead.full_name}
                  </h2>
                  <p className="text-sm font-bold text-slate-500 flex items-center gap-1.5 mt-0.5">
                    <Building2 size={14} /> {selectedLead.company || "No Company Provided"}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                {selectedLead.is_active ? (
                  <span className="text-emerald-700 bg-emerald-100 px-3 py-1 rounded-full text-xs font-bold border border-emerald-200">Active Lead</span>
                ) : (
                  <span className="text-slate-500 bg-slate-200 px-3 py-1 rounded-full text-xs font-bold border border-slate-300">Archived</span>
                )}
                <button 
                  onClick={() => setSelectedLead(null)}
                  className="p-2 text-slate-400 hover:text-slate-900 bg-slate-50 hover:bg-slate-200 rounded-full transition-colors cursor-pointer"
                >
                  <X size={20} />
                </button>
              </div>
            </div>

            {/* Modal Body */}
            <div className="p-6 md:p-8 space-y-8 bg-slate-50/50">
              
              {/* Quick Meta Grid */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
                  <p className="text-[10px] text-slate-400 font-extrabold uppercase tracking-wider mb-1">Scale</p>
                  <p className="font-bold text-slate-800 text-sm">{selectedLead.units_range || "N/A"} Units</p>
                </div>
                <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
                  <p className="text-[10px] text-slate-400 font-extrabold uppercase tracking-wider mb-1">Industry</p>
                  <p className="font-bold text-slate-800 text-sm capitalize">{selectedLead.industry || "General"}</p>
                </div>
                <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm md:col-span-2">
                  <p className="text-[10px] text-slate-400 font-extrabold uppercase tracking-wider mb-1">Contact Email</p>
                  <a href={`mailto:${selectedLead.email}`} className="font-bold text-brand text-sm hover:underline flex items-center gap-1.5">
                    <Mail size={14} /> {selectedLead.email}
                  </a>
                </div>
              </div>

              {/* Target Regions */}
              <div>
                <h3 className="text-sm font-extrabold text-slate-900 uppercase tracking-widest flex items-center gap-2 mb-4">
                  <Globe2 size={16} className="text-brand" /> Target Regions
                </h3>
                <div className="flex flex-wrap gap-2">
                  {selectedLead.regions && Array.isArray(selectedLead.regions) && selectedLead.regions.length > 0 ? (
                    selectedLead.regions.map((region, idx) => (
                      <span key={idx} className="bg-white border border-slate-200 text-slate-700 px-4 py-2 rounded-xl text-sm font-bold shadow-sm">
                        {region}
                      </span>
                    ))
                  ) : (
                    <span className="text-slate-500 italic text-sm font-medium">No specific regions requested.</span>
                  )}
                </div>
              </div>

              {/* Requirements Box */}
              <div>
                <h3 className="text-sm font-extrabold text-slate-900 uppercase tracking-widest flex items-center gap-2 mb-4">
                  <AlertCircle size={16} className="text-brand" /> Project Requirements
                </h3>
                <div className="bg-white border border-slate-200 p-6 rounded-2xl shadow-sm text-slate-700 font-medium whitespace-pre-wrap leading-relaxed">
                  {selectedLead.requirements || <span className="italic text-slate-400">No additional details provided by the client.</span>}
                </div>
              </div>

            </div>

            {/* Modal Footer */}
            <div className="sticky bottom-0 bg-white border-t border-slate-100 p-6 flex justify-end gap-3 rounded-b-[2rem]">
              <button 
                onClick={() => handleToggleStatus(selectedLead.id, selectedLead.is_active)}
                className={`px-6 py-3 rounded-xl font-bold transition-all border cursor-pointer flex items-center gap-2 ${selectedLead.is_active ? 'bg-red-50 text-red-600 border-red-100 hover:bg-red-100' : 'bg-emerald-50 text-emerald-700 border-emerald-100 hover:bg-emerald-100'}`}
              >
                {selectedLead.is_active ? <Archive size={18} /> : <CheckCircle2 size={18} />}
                {selectedLead.is_active ? "Archive Lead" : "Restore Lead"}
              </button>
              <a 
                href={`mailto:${selectedLead.email}?subject=Re: Enterprise eSIM Inquiry - SiM Claire`}
                className="bg-slate-900 text-white px-8 py-3 rounded-xl font-bold hover:bg-black transition-all flex items-center gap-2 shadow-md cursor-pointer"
              >
                <Mail size={18} /> Reply via Email
              </a>
            </div>

          </div>
        </div>
      )}

    </div>
  );
}